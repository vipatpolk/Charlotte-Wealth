import { Injectable } from '@nestjs/common';
import {
  AssetClassPerformance,
  PortfolioPerformanceResponse,
  SymbolPerformance,
} from '../models/performance.model.js';
import { PortfolioHoldingsResponse, PortfolioSummary } from '../models/portfolio.model.js';
import { singleflight, ttlCache } from '../utils/cache.util.js';
import { getAssetTypeLabel } from '../utils/format.util.js';
import { ValuationService } from './valuation.service.js';

@Injectable()
export class PerformanceService {
  constructor(public readonly valuationService: ValuationService) {}

  resolveDateRange(
    timeframe: string,
    startDate?: string | null,
    endDate?: string | null,
  ): [string, string] {
    const today = new Date();
    const todayStr = today.toISOString().split('T')[0];
    const tf = (timeframe || 'ALL').toUpperCase().trim();

    if (tf === 'CUSTOM' || (startDate && endDate && tf !== 'ALL')) {
      return [(startDate || '').trim(), (endDate || '').trim()];
    }

    const fmtDate = (d: Date) => d.toISOString().split('T')[0];

    if (tf === 'YTD') {
      return [`${today.getFullYear()}-01-01`, todayStr];
    }
    if (tf === '1M') {
      const d = new Date(today.getTime() - 30 * 24 * 3600 * 1000);
      return [fmtDate(d), todayStr];
    }
    if (tf === '3M') {
      const d = new Date(today.getTime() - 90 * 24 * 3600 * 1000);
      return [fmtDate(d), todayStr];
    }
    if (tf === '6M') {
      const d = new Date(today.getTime() - 180 * 24 * 3600 * 1000);
      return [fmtDate(d), todayStr];
    }
    if (tf === '1Y') {
      const d = new Date(today.getTime() - 365 * 24 * 3600 * 1000);
      return [fmtDate(d), todayStr];
    }

    return [(startDate || '').trim(), (endDate || '').trim()];
  }

  async getPerformanceAnalytics(
    timeframe: string = 'ALL',
    startDate?: string | null,
    endDate?: string | null,
    currency: string = 'THB',
  ): Promise<PortfolioPerformanceResponse> {
    const [resolvedStart, resolvedEnd] = this.resolveDateRange(
      timeframe,
      startDate,
      endDate,
    );
    const targetCurrency = currency.toUpperCase();
    const cacheKey = `perf_${timeframe}_${resolvedStart}_${resolvedEnd}_${targetCurrency}`;
    const cached = ttlCache.get<PortfolioPerformanceResponse>(cacheKey);
    if (cached !== null) return cached;

    return singleflight.execute(cacheKey, async () => {
      const c = ttlCache.get<PortfolioPerformanceResponse>(cacheKey);
      if (c !== null) return c;

      const holdingsRes = await this.valuationService.getPortfolioHoldings(
        'all',
        targetCurrency,
      );
      if (holdingsRes.error) {
        return {
          timeframe,
          startDate: resolvedStart,
          endDate: resolvedEnd,
          currency: targetCurrency,
          exchangeRate: holdingsRes.exchangeRate,
          summary: holdingsRes.summary,
          assetTypePerformance: [],
          topGainers: [],
          topLosers: [],
          symbolPerformance: [],
          error: holdingsRes.error,
        };
      }

      const res = this.calculatePerformance(
        holdingsRes,
        timeframe,
        resolvedStart,
        resolvedEnd,
      );
      if (!res.error) {
        ttlCache.set(cacheKey, res, 60.0);
      }
      return res;
    });
  }

  calculatePerformance(
    holdingsRes: PortfolioHoldingsResponse,
    timeframe: string,
    startDate: string = '',
    endDate: string = '',
  ): PortfolioPerformanceResponse {
    const typeMap: Record<
      string,
      {
        type: string;
        investedCost: number;
        currentValue: number;
        realizedPL: number;
        unrealizedPL: number;
        openSymbolCount: number;
        closedSymbolCount: number;
      }
    > = {};

    const symbolMap: Record<
      string,
      {
        symbol: string;
        displaySymbol: string;
        name: string;
        assetType: string;
        assetTypeLabel: string;
        status: string;
        investedCost: number;
        currentValue: number;
        realizedPL: number;
        unrealizedPL: number;
        hasPrice: boolean;
      }
    > = {};

    let openInvestedTotal = 0.0;
    let openValueTotal = 0.0;
    let closedInvestedTotal = 0.0;
    let closedRealizedTotal = 0.0;

    // 1. Process Open Positions
    for (const pos of holdingsRes.openPositions) {
      const assetType = pos.assetType;
      const sym = pos.symbol;

      openInvestedTotal += pos.totalCost;
      openValueTotal += pos.holdingValue;

      if (!typeMap[assetType]) {
        typeMap[assetType] = {
          type: assetType,
          investedCost: 0.0,
          currentValue: 0.0,
          realizedPL: 0.0,
          unrealizedPL: 0.0,
          openSymbolCount: 0,
          closedSymbolCount: 0,
        };
      }
      const t = typeMap[assetType];
      t.investedCost += pos.totalCost;
      t.currentValue += pos.holdingValue;
      t.unrealizedPL += pos.unrealizedPL;
      t.openSymbolCount += 1;

      symbolMap[sym] = {
        symbol: sym,
        displaySymbol: pos.displaySymbol,
        name: pos.name,
        assetType,
        assetTypeLabel: pos.assetTypeLabel,
        status: 'OPEN',
        investedCost: pos.totalCost,
        currentValue: pos.holdingValue,
        realizedPL: 0.0,
        unrealizedPL: pos.unrealizedPL,
        hasPrice: pos.hasPrice,
      };
    }

    // 2. Process Closed Positions with Date Range Filtering
    for (const closed of holdingsRes.closedPositions) {
      const assetType = closed.assetType;
      const sym = closed.symbol;

      if (!typeMap[assetType]) {
        typeMap[assetType] = {
          type: assetType,
          investedCost: 0.0,
          currentValue: 0.0,
          realizedPL: 0.0,
          unrealizedPL: 0.0,
          openSymbolCount: 0,
          closedSymbolCount: 0,
        };
      }
      typeMap[assetType].closedSymbolCount += 1;

      let closedInvested = 0.0;
      let closedProceeds = 0.0;
      let realizedPL = 0.0;

      for (const lot of closed.lots) {
        let inRange = true;
        if (startDate && endDate) {
          inRange = startDate <= lot.closeDate && lot.closeDate <= endDate;
        }

        if (inRange) {
          closedInvested += lot.totalCost;
          closedProceeds += lot.totalProceeds || lot.totalCost + lot.realizedPL;
          realizedPL += lot.realizedPL;
        }
      }

      closedInvestedTotal += closedInvested;
      closedRealizedTotal += realizedPL;

      typeMap[assetType].investedCost += closedInvested;
      typeMap[assetType].realizedPL += realizedPL;

      if (symbolMap[sym]) {
        const existing = symbolMap[sym];
        existing.status = 'BOTH';
        existing.investedCost += closedInvested;
        existing.currentValue += closedProceeds;
        existing.realizedPL += realizedPL;
      } else {
        symbolMap[sym] = {
          symbol: sym,
          displaySymbol: closed.displaySymbol,
          name: closed.name,
          assetType,
          assetTypeLabel: closed.assetTypeLabel,
          status: 'CLOSED',
          investedCost: closedInvested,
          currentValue: closedProceeds,
          realizedPL,
          unrealizedPL: 0.0,
          hasPrice: false,
        };
      }
    }

    // 3. Assemble Asset Class Performance
    const assetTypePerformance: AssetClassPerformance[] = [];
    for (const t of Object.values(typeMap)) {
      const totReturn = t.realizedPL + t.unrealizedPL;
      const totReturnPct = t.investedCost > 0 ? (totReturn / t.investedCost) * 100.0 : 0.0;

      assetTypePerformance.push({
        assetType: t.type,
        label: getAssetTypeLabel(t.type),
        investedCost: t.investedCost,
        currentValue: t.currentValue,
        unrealizedPL: t.unrealizedPL,
        realizedPL: t.realizedPL,
        totalReturn: totReturn,
        totalReturnPercent: totReturnPct,
        openSymbolCount: t.openSymbolCount,
        closedSymbolCount: t.closedSymbolCount,
      });
    }
    assetTypePerformance.sort((a, b) => b.totalReturnPercent - a.totalReturnPercent);

    // 4. Assemble Symbol Performance
    const symbolPerformance: SymbolPerformance[] = [];
    for (const s of Object.values(symbolMap)) {
      const totReturn = s.realizedPL + s.unrealizedPL;
      const totReturnPct = s.investedCost > 0 ? (totReturn / s.investedCost) * 100.0 : 0.0;

      symbolPerformance.push({
        symbol: s.symbol,
        displaySymbol: s.displaySymbol,
        name: s.name,
        assetType: s.assetType,
        assetTypeLabel: s.assetTypeLabel,
        status: s.status,
        investedCost: s.investedCost,
        currentValue: s.currentValue,
        unrealizedPL: s.unrealizedPL,
        realizedPL: s.realizedPL,
        totalReturnAmount: totReturn,
        totalReturn: totReturn,
        totalReturnPercent: totReturnPct,
        hasPrice: s.hasPrice,
      });
    }

    symbolPerformance.sort((a, b) => b.totalReturnPercent - a.totalReturnPercent);

    const topGainers = symbolPerformance.filter((s) => s.totalReturnPercent > 0).slice(0, 5);
    const topLosers = symbolPerformance
      .filter((s) => s.totalReturnPercent < 0)
      .sort((a, b) => a.totalReturnPercent - b.totalReturnPercent)
      .slice(0, 5);

    const totalUnrealizedPL = openValueTotal - openInvestedTotal;
    const totalUnrealizedPLPercent =
      openInvestedTotal > 0 ? (totalUnrealizedPL / openInvestedTotal) * 100.0 : 0.0;
    const totalRealizedPLPercent =
      closedInvestedTotal > 0
        ? (closedRealizedTotal / closedInvestedTotal) * 100.0
        : 0.0;
    const totalInvested = openInvestedTotal + closedInvestedTotal;
    const totalReturn = totalUnrealizedPL + closedRealizedTotal;
    const totalReturnPercent =
      totalInvested > 0 ? (totalReturn / totalInvested) * 100.0 : 0.0;

    const summary: PortfolioSummary = {
      totalInvested,
      totalValue: openValueTotal,
      openInvested: openInvestedTotal,
      closedInvested: closedInvestedTotal,
      totalUnrealizedPL,
      totalUnrealizedPLPercent,
      totalRealizedPL: closedRealizedTotal,
      totalRealizedPLPercent,
      totalReturn,
      totalReturnPercent,
    };

    return {
      timeframe,
      startDate,
      endDate,
      currency: holdingsRes.currency,
      exchangeRate: holdingsRes.exchangeRate,
      summary,
      assetTypePerformance,
      topGainers,
      topLosers,
      symbolPerformance,
      error: null,
    };
  }
}

