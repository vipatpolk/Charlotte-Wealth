import { Injectable } from '@nestjs/common';
import {
  ClosedPortfolioPosition,
  PortfolioHoldingLot,
  PortfolioHoldingsResponse,
  PortfolioPosition,
  PortfolioSummary,
} from '../models/portfolio.model.js';
import {
  ClosedShareLot,
  PriceData,
  SheetResult,
} from '../models/transaction.model.js';
import { singleflight, ttlCache } from '../utils/cache.util.js';
import {
  convertCurrency,
  displaySymbol,
  getAssetType,
  getAssetTypeLabel,
} from '../utils/format.util.js';
import { NavService } from './nav.service.js';
import { PriceService } from './price.service.js';
import { ShareLotService } from './share-lot.service.js';

export const DEFAULT_PVD_NAMES: Record<string, string> = {
  PVDSP500: 'นโยบายกองทุนรวมต่างประเทศ หุ้นยูเอส',
  PVDWEQ: 'นโยบายกองทุนรวมต่างประเทศ World Equity',
  PVDMPAEM: 'นโยบายกองทุนรวมตราสารทุน เอเชียน อีเมอร์จิ้ง',
  PVDMPINC: 'นโยบายกองทุนรวมตราสารหนี้ต่างประเทศ อินคัม',
  PVDMGLDH: 'นโยบายกองทุนรวมโกลด์ THB เฮดจ์',
};

@Injectable()
export class ValuationService {
  constructor(
    public readonly shareLotService: ShareLotService,
    public readonly priceService: PriceService,
    public readonly navService: NavService,
  ) {}

  async getPortfolioHoldings(
    tabId: string = 'all',
    currency: string = 'THB',
  ): Promise<PortfolioHoldingsResponse> {
    const targetCurrency = currency.toUpperCase();
    const cacheKey = `valuation_${tabId}_${targetCurrency}`;
    const cached = ttlCache.get<PortfolioHoldingsResponse>(cacheKey);
    if (cached !== null) return cached;

    const baseCacheKey = `valuation_base_${tabId}`;
    const baseCached =
      ttlCache.get<[SheetResult, Record<string, PriceData>, number]>(baseCacheKey);

    let sheetResult: SheetResult;
    let priceDataMap: Record<string, PriceData>;
    let exchangeRate: number;

    if (baseCached !== null) {
      [sheetResult, priceDataMap, exchangeRate] = baseCached;
    } else {
      [sheetResult, priceDataMap, exchangeRate] = await singleflight.execute(
        `resolve_base_${tabId}`,
        async () => {
          const c =
            ttlCache.get<[SheetResult, Record<string, PriceData>, number]>(baseCacheKey);
          if (c !== null) return c;

          const sRes =
            tabId === 'all'
              ? await this.shareLotService.fetchAllSheets()
              : await this.shareLotService.fetchSheet(tabId);

          if (sRes.error) {
            return [sRes, {}, 1.0];
          }

          const candidates: { symbol: string; assetType: string }[] = [];
          const seen = new Set<string>();

          for (const oItem of sRes.summaries || []) {
            if (oItem.symbol && !seen.has(oItem.symbol)) {
              seen.add(oItem.symbol);
              candidates.push({ symbol: oItem.symbol, assetType: oItem.assetType });
            }
          }
          for (const cItem of sRes.closedSummaries || []) {
            if (cItem.symbol && !seen.has(cItem.symbol)) {
              seen.add(cItem.symbol);
              candidates.push({ symbol: cItem.symbol, assetType: cItem.assetType });
            }
          }
          for (const tItem of sRes.transactionSummaries || []) {
            if (tItem.symbol && !seen.has(tItem.symbol)) {
              seen.add(tItem.symbol);
              candidates.push({ symbol: tItem.symbol, assetType: tItem.assetType });
            }
          }

          let pMap: Record<string, PriceData> = {};
          let exRate = 1.0;

          if (candidates.length) {
            const marketRes = await this.priceService.fetchPricesAndRate(candidates);
            pMap = marketRes.prices || {};
            exRate = marketRes.rate || 1.0;
          } else {
            exRate = (await this.priceService.fetchExchangeRate('USD', 'THB')) || 1.0;
          }

          const hasPvd = candidates.some(
            (c) =>
              c.assetType === 'provident-fund' ||
              c.symbol.toUpperCase().startsWith('PVD'),
          );
          if (hasPvd) {
            try {
              const pvdPolicies = await this.navService.fetchPvdPolicies();
              for (const [symKey, policyInfo] of Object.entries(pvdPolicies)) {
                const secName = policyInfo.name || DEFAULT_PVD_NAMES[symKey] || '';
                if (!pMap[symKey]) {
                  pMap[symKey] = {
                    symbol: symKey,
                    name: secName,
                    price: 0.0,
                    currency: 'THB',
                  };
                } else if (!pMap[symKey].name) {
                  pMap[symKey].name = secName;
                }
              }
            } catch {
              // Ignore PVD policy factsheet error fallback
            }
          }

          const baseVal: [SheetResult, Record<string, PriceData>, number] = [
            sRes,
            pMap,
            exRate,
          ];
          ttlCache.set(baseCacheKey, baseVal, 60.0);
          return baseVal;
        },
      );
    }

    if (sheetResult.error) {
      return this.createEmptyResponse(tabId, targetCurrency, sheetResult.error);
    }

    const res = this.valueSheetResult(
      sheetResult,
      priceDataMap,
      exchangeRate,
      targetCurrency,
      tabId,
    );
    if (!res.error) {
      ttlCache.set(cacheKey, res, 60.0);
    }
    return res;
  }

  valueSheetResult(
    sheetResult: SheetResult,
    priceDataMap: Record<string, PriceData>,
    exchangeRate: number,
    targetCurrency: string = 'THB',
    tabId: string = 'all',
  ): PortfolioHoldingsResponse {
    const openPositions: PortfolioPosition[] = [];
    const closedPositions: ClosedPortfolioPosition[] = [];

    let openInvestedTotal = 0.0;
    let openValueTotal = 0.0;
    let closedInvestedTotal = 0.0;
    let closedRealizedTotal = 0.0;

    // 1. Open Positions
    for (const openSummary of sheetResult.summaries || []) {
      const sym = openSummary.symbol;
      const origCurr = openSummary.currency;
      const pd = priceDataMap[sym];
      const isPvd =
        openSummary.assetType === 'provident-fund' ||
        sym.toUpperCase().startsWith('PVD');

      let hasPrice = Boolean(pd && pd.price > 0);
      let pvdTotalVal = 0.0;
      let rawPrice = 0.0;
      let priceCurr = origCurr;

      if (isPvd) {
        hasPrice = true;
        priceCurr = origCurr;
        const empVal =
          (openSummary.employeeContribution || 0.0) +
          (openSummary.employeeEarnings || 0.0);
        const emprVal =
          (openSummary.employerMatching || 0.0) +
          (openSummary.employerEarnings || 0.0);
        pvdTotalVal = empVal + emprVal;
        if (pvdTotalVal <= 0) {
          pvdTotalVal = openSummary.totalCost;
        }
        rawPrice =
          openSummary.totalShares > 0
            ? pvdTotalVal / openSummary.totalShares
            : openSummary.averageCost;
      } else {
        rawPrice =
          hasPrice && pd ? pd.price : openSummary.averageCost;
        priceCurr = hasPrice && pd?.currency ? pd.currency : origCurr;
      }

      const currentPriceConverted = convertCurrency(
        rawPrice,
        priceCurr,
        targetCurrency,
        exchangeRate,
      );
      const totalCostConverted = convertCurrency(
        openSummary.totalCost,
        origCurr,
        targetCurrency,
        exchangeRate,
      );
      const averageCostConverted =
        openSummary.totalShares > 0
          ? totalCostConverted / openSummary.totalShares
          : 0.0;

      let holdingValueConverted = 0.0;
      let unrealizedPL = 0.0;
      let unrealizedPLPercent = 0.0;

      if (isPvd) {
        holdingValueConverted = convertCurrency(
          pvdTotalVal,
          origCurr,
          targetCurrency,
          exchangeRate,
        );
        unrealizedPL = holdingValueConverted - totalCostConverted;
        unrealizedPLPercent =
          totalCostConverted > 0
            ? (unrealizedPL / totalCostConverted) * 100.0
            : 0.0;
      } else {
        holdingValueConverted = openSummary.totalShares * currentPriceConverted;
        unrealizedPL = holdingValueConverted - totalCostConverted;
        unrealizedPLPercent =
          totalCostConverted > 0
            ? (unrealizedPL / totalCostConverted) * 100.0
            : 0.0;
      }

      openInvestedTotal += totalCostConverted;
      openValueTotal += holdingValueConverted;

      // Lot valuations
      const valuedLots: PortfolioHoldingLot[] = [];
      for (const lot of openSummary.lots) {
        const lotCostConverted = convertCurrency(
          lot.totalCost,
          origCurr,
          targetCurrency,
          exchangeRate,
        );
        const lotCostBasisConverted =
          lot.quantity > 0 ? lotCostConverted / lot.quantity : 0.0;
        const lotHoldingValue = lot.quantity * currentPriceConverted;
        const lotUnrealizedPL = lotHoldingValue - lotCostConverted;
        const lotUnrealizedPLPercent =
          lotCostConverted > 0
            ? (lotUnrealizedPL / lotCostConverted) * 100.0
            : 0.0;

        valuedLots.push({
          purchaseDate: lot.purchaseDate,
          quantity: lot.quantity,
          costBasis: lotCostBasisConverted,
          totalCost: lotCostConverted,
          currentPrice: currentPriceConverted,
          holdingValue: lotHoldingValue,
          unrealizedPL: lotUnrealizedPL,
          unrealizedPLPercent: lotUnrealizedPLPercent,
          assetType: lot.assetType,
          currency: targetCurrency,
          originalCostBasis: lot.costBasis,
          originalCurrency: origCurr,
          note: lot.note,
        });
      }

      let name = pd?.name || '';
      if (!name && isPvd) {
        name = DEFAULT_PVD_NAMES[sym.toUpperCase()] || '';
      }

      const empContribC =
        openSummary.employeeContribution !== null &&
        openSummary.employeeContribution !== undefined
          ? convertCurrency(
              openSummary.employeeContribution,
              origCurr,
              targetCurrency,
              exchangeRate,
            )
          : null;

      const empEarningsC =
        openSummary.employeeEarnings !== null &&
        openSummary.employeeEarnings !== undefined
          ? convertCurrency(
              openSummary.employeeEarnings,
              origCurr,
              targetCurrency,
              exchangeRate,
            )
          : null;

      const emprMatchingC =
        openSummary.employerMatching !== null &&
        openSummary.employerMatching !== undefined
          ? convertCurrency(
              openSummary.employerMatching,
              origCurr,
              targetCurrency,
              exchangeRate,
            )
          : null;

      const emprEarningsC =
        openSummary.employerEarnings !== null &&
        openSummary.employerEarnings !== undefined
          ? convertCurrency(
              openSummary.employerEarnings,
              origCurr,
              targetCurrency,
              exchangeRate,
            )
          : null;

      openPositions.push({
        symbol: sym,
        displaySymbol: displaySymbol(sym),
        name,
        assetType: getAssetType(openSummary.assetType, sym),
        assetTypeLabel: getAssetTypeLabel(openSummary.assetType, sym),
        totalShares: openSummary.totalShares,
        totalCost: totalCostConverted,
        averageCost: averageCostConverted,
        currentPrice: currentPriceConverted,
        holdingValue: holdingValueConverted,
        unrealizedPL,
        unrealizedPLPercent,
        currency: targetCurrency,
        originalCurrency: origCurr,
        hasPrice,
        lots: valuedLots,
        employeeShares: openSummary.employeeShares,
        employerShares: openSummary.employerShares,
        employeeContribution: empContribC,
        employeeEarnings: empEarningsC,
        employerMatching: emprMatchingC,
        employerEarnings: emprEarningsC,
      });
    }

    // 2. Closed Positions
    for (const closedSummary of sheetResult.closedSummaries || []) {
      const sym = closedSummary.symbol;
      const origCurr = closedSummary.currency;
      const pd = priceDataMap[sym];

      const costConverted = convertCurrency(
        closedSummary.totalCost,
        origCurr,
        targetCurrency,
        exchangeRate,
      );
      const proceedsConverted = convertCurrency(
        closedSummary.totalProceeds,
        origCurr,
        targetCurrency,
        exchangeRate,
      );
      const realizedPLConverted = convertCurrency(
        closedSummary.realizedPL,
        origCurr,
        targetCurrency,
        exchangeRate,
      );
      const realizedPLPercent =
        costConverted > 0 ? (realizedPLConverted / costConverted) * 100.0 : 0.0;

      const avgBuyConverted =
        closedSummary.closedShares > 0
          ? costConverted / closedSummary.closedShares
          : 0.0;
      const avgSellConverted =
        closedSummary.closedShares > 0
          ? proceedsConverted / closedSummary.closedShares
          : 0.0;

      closedInvestedTotal += costConverted;
      closedRealizedTotal += realizedPLConverted;

      const valuedClosedLots: ClosedShareLot[] = [];
      for (const cLot of closedSummary.lots) {
        const lotCurr = cLot.currency || origCurr;
        const lotCost = convertCurrency(
          cLot.totalCost,
          lotCurr,
          targetCurrency,
          exchangeRate,
        );
        const lotProceeds = convertCurrency(
          cLot.totalProceeds,
          lotCurr,
          targetCurrency,
          exchangeRate,
        );
        const lotPL = convertCurrency(
          cLot.realizedPL,
          lotCurr,
          targetCurrency,
          exchangeRate,
        );
        const lotPLPercent = lotCost > 0 ? (lotPL / lotCost) * 100.0 : 0.0;
        const lotBasis = cLot.quantity > 0 ? lotCost / cLot.quantity : 0.0;
        const lotSell = cLot.quantity > 0 ? lotProceeds / cLot.quantity : 0.0;

        valuedClosedLots.push({
          symbol: cLot.symbol,
          purchaseDate: cLot.purchaseDate,
          closeDate: cLot.closeDate,
          quantity: cLot.quantity,
          costBasis: lotBasis,
          sellPrice: lotSell,
          totalCost: lotCost,
          totalProceeds: lotProceeds,
          realizedPL: lotPL,
          realizedPLPercent: lotPLPercent,
          currency: targetCurrency,
          assetType: cLot.assetType,
        });
      }

      closedPositions.push({
        symbol: sym,
        displaySymbol: displaySymbol(sym),
        name: pd?.name || '',
        assetType: getAssetType(closedSummary.assetType, sym),
        assetTypeLabel: getAssetTypeLabel(closedSummary.assetType, sym),
        totalShares: 0.0,
        closedShares: closedSummary.closedShares,
        totalCost: costConverted,
        totalProceeds: proceedsConverted,
        realizedPL: realizedPLConverted,
        realizedPLPercent,
        averageBuyPrice: avgBuyConverted,
        averageSellPrice: avgSellConverted,
        currency: targetCurrency,
        originalCurrency: origCurr,
        lots: valuedClosedLots,
      });
    }

    // 3. High-level Summary KPIs
    const totalUnrealizedPL = openValueTotal - openInvestedTotal;
    const totalUnrealizedPLPercent =
      openInvestedTotal > 0
        ? (totalUnrealizedPL / openInvestedTotal) * 100.0
        : 0.0;
    const totalRealizedPLPercent =
      closedInvestedTotal > 0
        ? (closedRealizedTotal / closedInvestedTotal) * 100.0
        : 0.0;
    const totalInvested = openInvestedTotal + closedInvestedTotal;
    const totalReturn = closedRealizedTotal + totalUnrealizedPL;
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
      currency: targetCurrency,
      exchangeRate,
      tabId,
      summary,
      openPositions,
      closedPositions,
      transactionSummaries: sheetResult.transactionSummaries,
      rawTransactions: sheetResult.rawTransactions,
      error: null,
    };
  }

  createEmptyResponse(
    tabId: string,
    currency: string,
    error: string,
  ): PortfolioHoldingsResponse {
    return {
      currency,
      exchangeRate: 1.0,
      tabId,
      summary: {
        totalInvested: 0.0,
        totalValue: 0.0,
        openInvested: 0.0,
        closedInvested: 0.0,
        totalUnrealizedPL: 0.0,
        totalUnrealizedPLPercent: 0.0,
        totalRealizedPL: 0.0,
        totalRealizedPLPercent: 0.0,
        totalReturn: 0.0,
        totalReturnPercent: 0.0,
      },
      openPositions: [],
      closedPositions: [],
      transactionSummaries: [],
      rawTransactions: [],
      error,
    };
  }
}

