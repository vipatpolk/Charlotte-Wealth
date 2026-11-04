import { Injectable } from '@nestjs/common';
import {
  CurrencyExposure,
  HoldingConcentration,
  PortfolioAllocationResponse,
  RebalanceRecommendation,
} from '../models/allocation.model.js';
import { PortfolioHoldingsResponse } from '../models/portfolio.model.js';
import { getAssetTypeLabel } from '../utils/format.util.js';
import { ValuationService } from './valuation.service.js';

export const DEFAULT_TARGETS: Record<string, number> = {
  'us-stock': 40.0,
  'thai-stock': 30.0,
  crypto: 15.0,
  'mutual-fund': 15.0,
  bond: 0.0,
  'provident-fund': 0.0,
};

@Injectable()
export class AllocationService {
  constructor(public readonly valuationService: ValuationService) {}

  async calculateAllocation(
    targets?: Record<string, number> | null,
    currency: string = 'THB',
  ): Promise<PortfolioAllocationResponse> {
    const targetCurrency = currency.toUpperCase();
    const targetAllocation = targets ? { ...DEFAULT_TARGETS, ...targets } : DEFAULT_TARGETS;

    const holdingsRes = await this.valuationService.getPortfolioHoldings(
      'all',
      targetCurrency,
    );
    if (holdingsRes.error) {
      return {
        currency: targetCurrency,
        exchangeRate: holdingsRes.exchangeRate,
        totalPortfolioValue: 0.0,
        recommendations: [],
        currencyExposure: {
          usd: 0.0,
          thb: 0.0,
          usdPercent: 0.0,
          thbPercent: 0.0,
        },
        holdingsConcentration: [],
        error: holdingsRes.error,
      };
    }

    return this.processAllocation(holdingsRes, targetAllocation);
  }

  processAllocation(
    holdingsRes: PortfolioHoldingsResponse,
    targets: Record<string, number>,
  ): PortfolioAllocationResponse {
    const currentValues: Record<string, number> = {};
    for (const k of Object.keys(DEFAULT_TARGETS)) {
      currentValues[k] = 0.0;
    }

    let usdVal = 0.0;
    let thbVal = 0.0;

    for (const pos of holdingsRes.openPositions) {
      const val = pos.holdingValue;
      const assetType = pos.assetType;
      currentValues[assetType] = (currentValues[assetType] || 0.0) + val;

      const orig = (pos.originalCurrency || '').toUpperCase();
      if (orig === 'USD' || orig === 'USDT') {
        usdVal += val;
      } else if (orig === 'THB') {
        thbVal += val;
      }
    }

    const totalValue = Object.values(currentValues).reduce((a, b) => a + b, 0.0);

    const allKeys = Array.from(
      new Set([...Object.keys(DEFAULT_TARGETS), ...Object.keys(currentValues), ...Object.keys(targets)]),
    );

    const recommendations: RebalanceRecommendation[] = [];
    for (const k of allKeys) {
      const val = currentValues[k] || 0.0;
      const actualPct = totalValue > 0 ? (val / totalValue) * 100.0 : 0.0;
      const targetPct = targets[k] || 0.0;
      const targetVal = (targetPct / 100.0) * totalValue;
      const rebalanceAmount = targetVal - val;
      const deviationPct = actualPct - targetPct;

      let action: 'BUY' | 'SELL' | 'BALANCED';
      if (Math.abs(rebalanceAmount) < 0.01) {
        action = 'BALANCED';
      } else if (rebalanceAmount > 0) {
        action = 'BUY';
      } else {
        action = 'SELL';
      }

      recommendations.push({
        assetType: k,
        label: getAssetTypeLabel(k),
        currentValue: val,
        actualPercent: actualPct,
        targetPercent: targetPct,
        rebalanceAmount,
        deviationPercent: deviationPct,
        action,
      });
    }

    const totCurr = usdVal + thbVal;
    const currencyExposure: CurrencyExposure = {
      usd: usdVal,
      thb: thbVal,
      usdPercent: totCurr > 0 ? (usdVal / totCurr) * 100.0 : 0.0,
      thbPercent: totCurr > 0 ? (thbVal / totCurr) * 100.0 : 0.0,
    };

    const holdingsConcentration: HoldingConcentration[] = [];
    for (const pos of holdingsRes.openPositions) {
      if (pos.holdingValue > 0 || pos.totalShares > 0) {
        const classTot = currentValues[pos.assetType] || 0.0;
        const portPct = totalValue > 0 ? (pos.holdingValue / totalValue) * 100.0 : 0.0;
        const classPct = classTot > 0 ? (pos.holdingValue / classTot) * 100.0 : 0.0;

        holdingsConcentration.push({
          symbol: pos.symbol,
          displaySymbol: pos.displaySymbol,
          name: pos.name,
          assetType: pos.assetType,
          value: pos.holdingValue,
          portfolioPercent: portPct,
          classPercent: classPct,
        });
      }
    }

    holdingsConcentration.sort((a, b) => b.value - a.value);

    return {
      currency: holdingsRes.currency,
      exchangeRate: holdingsRes.exchangeRate,
      totalPortfolioValue: totalValue,
      recommendations,
      currencyExposure,
      holdingsConcentration,
      error: null,
    };
  }
}

