import { Injectable } from '@nestjs/common';
import {
  AnnualDividendSummary,
  AssetTypeDividendSummary,
  DividendRecord,
  FundDividendDistribution,
  MonthlyDividendSummary,
  PortfolioDividendResponse,
  SymbolDividendSummary,
} from '../models/dividend.model.js';
import { PortfolioPosition } from '../models/portfolio.model.js';
import { Transaction } from '../models/transaction.model.js';
import { singleflight, ttlCache } from '../utils/cache.util.js';
import {
  convertCurrency,
  displaySymbol,
  getAssetTypeLabel,
} from '../utils/format.util.js';
import { NavService } from './nav.service.js';
import { PriceService } from './price.service.js';
import { ShareLotService } from './share-lot.service.js';
import { ValuationService } from './valuation.service.js';

export const WHT_RATES: Record<string, number> = {
  'thai-stock': 0.1,
  'mutual-fund': 0.1,
  'us-stock': 0.15,
  bond: 0.15,
};

export const YAHOO_DIVIDEND_ASSET_TYPES = ['us-stock', 'thai-stock', 'bond'] as const;
export const DIVIDEND_ASSET_TYPES = [
  'us-stock',
  'thai-stock',
  'mutual-fund',
  'bond',
] as const;

export function getTxShareChange(tx: Transaction): number {
  if (
    tx.txType &&
    ['DIVIDEND', 'DIV', 'INCOME', 'DISTRIBUTION'].some((kw) =>
      tx.txType!.toUpperCase().includes(kw),
    )
  ) {
    return 0.0;
  }

  let isOutflow = false;
  if (tx.exchangeTo) {
    isOutflow = true;
  } else if (tx.txType) {
    const tt = tx.txType.toUpperCase();
    if (
      [
        'SELL',
        'EXCHANGE_OUT',
        'EXCHANGE OUT',
        'EXCHNAGE OUT',
        'SWITCH_OUT',
        'SWITCH OUT',
        'EX-OUT',
        'SW-OUT',
      ].some((kw) => tt.includes(kw))
    ) {
      isOutflow = true;
    }
  }

  let isInflow = false;
  if (tx.exchangeFrom) {
    isInflow = true;
  } else if (tx.txType) {
    const tt = tx.txType.toUpperCase();
    if (
      [
        'BUY',
        'EXCHANGE_IN',
        'EXCHANGE IN',
        'EXCHNAGE IN',
        'SWITCH_IN',
        'SWITCH IN',
        'EX-IN',
        'SW-IN',
      ].some((kw) => tt.includes(kw))
    ) {
      isInflow = true;
    }
  }

  const qty = Math.abs(tx.quantity);
  if (isOutflow) return -qty;
  if (isInflow) return qty;
  return tx.quantity;
}

export function calculateSharesOnDate(
  txs: Transaction[],
  snapshotDate: string,
): number {
  const total = txs
    .filter((tx) => tx.date < snapshotDate)
    .reduce((acc, tx) => acc + getTxShareChange(tx), 0.0);
  return Math.round(total * 1e6) / 1e6;
}

@Injectable()
export class DividendService {
  constructor(
    public readonly valuationService: ValuationService,
    public readonly shareLotService: ShareLotService,
    public readonly priceService: PriceService,
    public readonly navService: NavService,
  ) {}

  async getDividendAnalytics(
    currency: string = 'THB',
    tabId: string = 'all',
  ): Promise<PortfolioDividendResponse> {
    const targetCurrency = currency.toUpperCase();
    const cacheKey = `dividend_${tabId}_${targetCurrency}`;
    const cached = ttlCache.get<PortfolioDividendResponse>(cacheKey);
    if (cached !== null) return cached;

    return singleflight.execute(
      `calc_dividend_${tabId}_${targetCurrency}`,
      async () => {
        const c = ttlCache.get<PortfolioDividendResponse>(cacheKey);
        if (c !== null) return c;

        const holdingsRes = await this.valuationService.getPortfolioHoldings(
          tabId,
          targetCurrency,
        );
        const exchangeRate = holdingsRes.exchangeRate || 1.0;

        if (holdingsRes.error) {
          return {
            currency: targetCurrency,
            exchangeRate,
            totalGrossDividends: 0.0,
            totalNetDividends: 0.0,
            totalWithholdingTax: 0.0,
            effectiveTaxRate: 0.0,
            projectedAnnualDividends: 0.0,
            portfolioDividendYield: 0.0,
            portfolioYieldOnCost: 0.0,
            annualDividends: [],
            monthlyDividends: [],
            assetTypeSummaries: [],
            symbolSummaries: [],
            records: [],
            error: holdingsRes.error,
          };
        }

        const openPositions = holdingsRes.openPositions.filter(
          (pos) => pos.assetType !== 'crypto',
        );
        const closedPositions = (holdingsRes.closedPositions || []).filter(
          (pos) => pos.assetType !== 'crypto',
        );
        const allPositions = [...openPositions, ...closedPositions];

        const stockSymbols = Array.from(
          new Set(
            allPositions
              .filter((pos) =>
                (YAHOO_DIVIDEND_ASSET_TYPES as readonly string[]).includes(
                  pos.assetType,
                ),
              )
              .map((pos) => pos.symbol),
          ),
        );

        const fundSymbols = Array.from(
          new Set(
            allPositions
              .filter((pos) => pos.assetType === 'mutual-fund')
              .map((pos) => pos.symbol),
          ),
        );

        const [stockDivData, fundDivData] = await Promise.all([
          this.priceService.fetchStockDividends(stockSymbols),
          this.navService.fetchAllFundDividends(fundSymbols),
        ]);

        const res = this.calculateDividendAnalytics(
          openPositions,
          closedPositions,
          holdingsRes.rawTransactions || [],
          stockDivData,
          fundDivData,
          exchangeRate,
          targetCurrency,
          holdingsRes.summary.totalValue,
          holdingsRes.summary.openInvested,
        );

        if (!res.error) {
          ttlCache.set(cacheKey, res, 120.0);
        }
        return res;
      },
    );
  }

  calculateDividendAnalytics(
    openPositions: PortfolioPosition[],
    closedPositions: any[],
    rawTransactions: Transaction[],
    stockDivData: Record<string, any>,
    fundDivData: Record<string, any[]>,
    exchangeRate: number,
    targetCurrency: string = 'THB',
    totalPortfolioValue: number = 0.0,
    totalOpenInvested: number = 0.0,
  ): PortfolioDividendResponse {
    const txsBySym = new Map<string, Transaction[]>();
    for (const tx of rawTransactions) {
      if (tx.assetType === 'crypto') continue;
      if (!txsBySym.has(tx.symbol)) {
        txsBySym.set(tx.symbol, []);
      }
      txsBySym.get(tx.symbol)!.push(tx);
    }
    for (const txs of txsBySym.values()) {
      txs.sort((a, b) => a.date.localeCompare(b.date));
    }

    const records: DividendRecord[] = [];
    const symbolSummaryMap = new Map<string, SymbolDividendSummary>();
    const monthlyMap = new Map<
      string,
      {
        yearMonth: string;
        year: number;
        month: number;
        gross: number;
        net: number;
        wht: number;
        byAssetType: Record<string, number>;
        recordCount: number;
      }
    >();
    const annualMap = new Map<
      number,
      {
        year: number;
        gross: number;
        net: number;
        wht: number;
        byAssetType: Record<string, number>;
        recordCount: number;
      }
    >();

    const assetTypeMap: Record<
      string,
      {
        gross: number;
        net: number;
        wht: number;
        symbols: Set<string>;
        records: number;
        costBasis: number;
        currentValue: number;
        projectedDividends: number;
      }
    > = {};

    for (const at of DIVIDEND_ASSET_TYPES) {
      assetTypeMap[at] = {
        gross: 0.0,
        net: 0.0,
        wht: 0.0,
        symbols: new Set(),
        records: 0,
        costBasis: 0.0,
        currentValue: 0.0,
        projectedDividends: 0.0,
      };
    }

    const allPositions = [...openPositions, ...closedPositions];
    const seenSyms = new Set<string>();
    const uniquePositions = [];
    for (const pos of allPositions) {
      if (!seenSyms.has(pos.symbol)) {
        seenSyms.add(pos.symbol);
        uniquePositions.push(pos);
      }
    }

    for (const pos of uniquePositions) {
      const sym = pos.symbol;
      const assetType = pos.assetType;
      if (assetType === 'crypto') continue;

      const curr = pos.originalCurrency;

      const events: [string, string, number][] = [];
      const seenEvents = new Set<string>();

      if ((YAHOO_DIVIDEND_ASSET_TYPES as readonly string[]).includes(assetType)) {
        const stockRes = stockDivData[sym] || {};
        for (const evt of stockRes.dividends || []) {
          const amt = parseFloat(evt.amount || 0.0);
          const ts = evt.date;
          const dtStr = ts ? new Date(ts * 1000).toISOString().split('T')[0] : '';
          if (dtStr && amt > 0) {
            const evtKey = `${dtStr}|${dtStr}|${amt}`;
            if (!seenEvents.has(evtKey)) {
              seenEvents.add(evtKey);
              events.push([dtStr, dtStr, amt]);
            }
          }
        }
      } else if (assetType === 'mutual-fund') {
        const rawDists = fundDivData[sym] || [];
        for (const dItem of rawDists) {
          const dVal = parseFloat(dItem.dividend_value || 0.0);
          const bDate = String(dItem.book_close_date || '').split(' ')[0].trim();
          const dDate = String(dItem.dividend_date || '').split(' ')[0].trim();
          const payoutDate = dDate || bDate;
          const snapshotDate = bDate || dDate;
          if (payoutDate && dVal > 0) {
            const evtKey = `${payoutDate}|${snapshotDate}|${dVal}`;
            if (!seenEvents.has(evtKey)) {
              seenEvents.add(evtKey);
              events.push([payoutDate, snapshotDate, dVal]);
            }
          }
        }
      }

      const whtRate = WHT_RATES[assetType] !== undefined ? WHT_RATES[assetType] : 0.15;

      for (let idx = 0; idx < events.length; idx++) {
        const [payoutDate, snapshotDate, mDps] = events[idx];
        let sharesOnDate = 0.0;

        if (txsBySym.has(sym)) {
          sharesOnDate = calculateSharesOnDate(txsBySym.get(sym)!, snapshotDate);
        } else {
          sharesOnDate = pos.totalShares || pos.closedShares || 0.0;
        }

        if (Math.abs(sharesOnDate) < 1e-6 || sharesOnDate <= 0) {
          continue;
        }

        sharesOnDate = Math.round(sharesOnDate * 1e6) / 1e6;
        const mGross = sharesOnDate * mDps;
        const mWht = mGross * whtRate;
        const mNet = mGross - mWht;
        const mConvGross = convertCurrency(mGross, curr, targetCurrency, exchangeRate);
        const mConvNet = convertCurrency(mNet, curr, targetCurrency, exchangeRate);
        const mConvWht = convertCurrency(mWht, curr, targetCurrency, exchangeRate);

        const rec: DividendRecord = {
          id: `api-${sym}-${payoutDate}-${idx + 1}`,
          symbol: sym,
          displaySymbol: displaySymbol(sym),
          date: payoutDate,
          recordDate: snapshotDate !== payoutDate ? snapshotDate : null,
          assetType,
          assetTypeLabel: getAssetTypeLabel(assetType),
          shares: sharesOnDate,
          dividendPerShare: mDps,
          grossAmount: mGross,
          withholdingTax: mWht,
          withholdingTaxRate: whtRate * 100.0,
          netAmount: mNet,
          currency: curr,
          convertedNetAmount: mConvNet,
          convertedGrossAmount: mConvGross,
          convertedWithholdingTax: mConvWht,
        };
        records.push(rec);

        const ym = payoutDate.length >= 7 ? payoutDate.slice(0, 7) : 'Unknown';
        const year =
          payoutDate.length >= 4 && !isNaN(parseInt(payoutDate.slice(0, 4), 10))
            ? parseInt(payoutDate.slice(0, 4), 10)
            : 0;
        const month =
          payoutDate.length >= 7 && !isNaN(parseInt(payoutDate.slice(5, 7), 10))
            ? parseInt(payoutDate.slice(5, 7), 10)
            : 0;

        if (!monthlyMap.has(ym)) {
          monthlyMap.set(ym, {
            yearMonth: ym,
            year,
            month,
            gross: 0.0,
            net: 0.0,
            wht: 0.0,
            byAssetType: {},
            recordCount: 0,
          });
        }
        const mObj = monthlyMap.get(ym)!;
        mObj.gross += mConvGross;
        mObj.net += mConvNet;
        mObj.wht += mConvWht;
        mObj.recordCount += 1;
        mObj.byAssetType[assetType] = (mObj.byAssetType[assetType] || 0.0) + mConvNet;

        if (!annualMap.has(year)) {
          annualMap.set(year, {
            year,
            gross: 0.0,
            net: 0.0,
            wht: 0.0,
            byAssetType: {},
            recordCount: 0,
          });
        }
        const aObj = annualMap.get(year)!;
        aObj.gross += mConvGross;
        aObj.net += mConvNet;
        aObj.wht += mConvWht;
        aObj.recordCount += 1;
        aObj.byAssetType[assetType] = (aObj.byAssetType[assetType] || 0.0) + mConvNet;

        if (assetTypeMap[assetType]) {
          assetTypeMap[assetType].gross += mConvGross;
          assetTypeMap[assetType].net += mConvNet;
          assetTypeMap[assetType].wht += mConvWht;
          assetTypeMap[assetType].symbols.add(sym);
          assetTypeMap[assetType].records += 1;
        }

        if (!symbolSummaryMap.has(sym)) {
          symbolSummaryMap.set(sym, {
            symbol: sym,
            displaySymbol: pos.displaySymbol,
            name: pos.name,
            assetType,
            assetTypeLabel: pos.assetTypeLabel,
            currency: curr,
            totalGrossDividends: 0.0,
            totalNetDividends: 0.0,
            totalWithholdingTax: 0.0,
            convertedNetDividends: 0.0,
            convertedGrossDividends: 0.0,
            convertedWithholdingTax: 0.0,
            dividendCount: 0,
            firstDividendDate: payoutDate,
            lastDividendDate: payoutDate,
            currentShares: 0.0,
            currentCostBasis: 0.0,
            currentValue: 0.0,
            trailingAnnualDPS: 0.0,
            currentYieldPercent: 0.0,
            yieldOnCostPercent: 0.0,
            projectedAnnualIncome: 0.0,
            recentDistributions: [],
          });
        }

        const symS = symbolSummaryMap.get(sym)!;
        symS.totalGrossDividends += mGross;
        symS.totalNetDividends += mNet;
        symS.totalWithholdingTax += mWht;
        symS.convertedGrossDividends += mConvGross;
        symS.convertedNetDividends += mConvNet;
        symS.convertedWithholdingTax += mConvWht;
        symS.dividendCount += 1;
        if (!symS.firstDividendDate || payoutDate < symS.firstDividendDate) {
          symS.firstDividendDate = payoutDate;
        }
        if (!symS.lastDividendDate || payoutDate > symS.lastDividendDate) {
          symS.lastDividendDate = payoutDate;
        }
      }
    }

    let projectedAnnualTotal = 0.0;

    for (const pos of openPositions) {
      const sym = pos.symbol;
      const assetType = pos.assetType;
      if (assetType === 'crypto') continue;

      const curr = pos.originalCurrency;
      const shares = pos.totalShares;
      const costBasis = pos.totalCost;
      const val = pos.holdingValue;
      const name = pos.name;

      let trailingDps = 0.0;
      const recentDists: FundDividendDistribution[] = [];

      if (assetType === 'mutual-fund') {
        const rawDists = fundDivData[sym] || [];
        const nowDt = new Date();
        const oneYearAgoStr = new Date(
          nowDt.getTime() - 365 * 24 * 3600 * 1000,
        )
          .toISOString()
          .split('T')[0];

        const seenDistKeys = new Set<string>();
        const parsedDists: any[] = [];
        for (const d of rawDists) {
          const dVal = parseFloat(d.dividend_value || 0.0);
          const dDate = String(d.dividend_date || '').split(' ')[0].trim();
          const bDate = String(d.book_close_date || '').split(' ')[0].trim();
          const pId = d.proj_id || '';
          const distKey = `${pId}|${bDate}|${dDate}|${dVal}`;
          if (seenDistKeys.has(distKey)) continue;
          seenDistKeys.add(distKey);
          parsedDists.push({
            projId: pId,
            classAbbrName: d.class_abbr_name || d.fund_class_name || sym,
            bookCloseDate: bDate,
            dividendDate: dDate,
            dividendValue: dVal,
            lastUpdDate: String(d.last_upd_date || ''),
          });
        }

        const dates = parsedDists
          .map((p) => p.dividendDate || p.bookCloseDate)
          .filter(Boolean);
        let cutoffStr = oneYearAgoStr;
        if (dates.length) {
          const newestDate = dates.reduce((a, b) => (a > b ? a : b));
          try {
            const newestDt = new Date(newestDate);
            const newestOneYr = new Date(
              newestDt.getTime() - 365 * 24 * 3600 * 1000,
            )
              .toISOString()
              .split('T')[0];
            cutoffStr = newestDate < oneYearAgoStr ? newestOneYr : oneYearAgoStr;
          } catch {
            cutoffStr = oneYearAgoStr;
          }
        }

        for (const p of parsedDists) {
          recentDists.push({
            projId: p.projId,
            classAbbrName: p.classAbbrName,
            bookCloseDate: p.bookCloseDate,
            dividendDate: p.dividendDate,
            dividendValue: p.dividendValue,
            lastUpdDate: p.lastUpdDate,
          });
          const refD = p.dividendDate || p.bookCloseDate;
          if (refD && refD >= cutoffStr && p.dividendValue > 0) {
            trailingDps += p.dividendValue;
          }
        }

        recentDists.sort((a, b) =>
          (b.dividendDate || b.bookCloseDate).localeCompare(
            a.dividendDate || a.bookCloseDate,
          ),
        );
      } else if (
        (YAHOO_DIVIDEND_ASSET_TYPES as readonly string[]).includes(assetType)
      ) {
        const stockRes = stockDivData[sym] || {};
        trailingDps = parseFloat(stockRes.trailing_12m_dps || 0.0);
      }

      const projOrigIncome = shares * trailingDps;
      const convProjIncome = convertCurrency(
        projOrigIncome,
        curr,
        targetCurrency,
        exchangeRate,
      );
      projectedAnnualTotal += convProjIncome;

      const currentPrice = pos.currentPrice;
      const avgCost = pos.averageCost;
      const convTrailingDps = convertCurrency(
        trailingDps,
        curr,
        targetCurrency,
        exchangeRate,
      );
      const currYieldPct =
        currentPrice > 0 ? (convTrailingDps / currentPrice) * 100.0 : 0.0;
      const yocPct =
        costBasis > 0
          ? (convProjIncome / costBasis) * 100.0
          : avgCost > 0
            ? (trailingDps / avgCost) * 100.0
            : 0.0;

      if (!symbolSummaryMap.has(sym)) {
        symbolSummaryMap.set(sym, {
          symbol: sym,
          displaySymbol: pos.displaySymbol,
          name,
          assetType,
          assetTypeLabel: pos.assetTypeLabel,
          currency: curr,
          totalGrossDividends: 0.0,
          totalNetDividends: 0.0,
          totalWithholdingTax: 0.0,
          convertedNetDividends: 0.0,
          convertedGrossDividends: 0.0,
          convertedWithholdingTax: 0.0,
          dividendCount: 0,
          firstDividendDate: '',
          lastDividendDate: '',
          currentShares: 0.0,
          currentCostBasis: 0.0,
          currentValue: 0.0,
          trailingAnnualDPS: 0.0,
          currentYieldPercent: 0.0,
          yieldOnCostPercent: 0.0,
          projectedAnnualIncome: 0.0,
          recentDistributions: [],
        });
      }

      const entry = symbolSummaryMap.get(sym)!;
      entry.name = name;
      entry.currentShares = shares;
      entry.currentCostBasis = costBasis;
      entry.currentValue = val;
      entry.trailingAnnualDPS = trailingDps;
      entry.currentYieldPercent = currYieldPct;
      entry.yieldOnCostPercent = yocPct;
      entry.projectedAnnualIncome = convProjIncome;
      entry.recentDistributions = recentDists;

      if (assetTypeMap[assetType]) {
        assetTypeMap[assetType].costBasis += costBasis;
        assetTypeMap[assetType].currentValue += val;
        assetTypeMap[assetType].projectedDividends += convProjIncome;
        assetTypeMap[assetType].symbols.add(sym);
      }
    }

    records.sort((a, b) => b.date.localeCompare(a.date));

    const totalNetDividends = records.reduce((acc, r) => acc + r.convertedNetAmount, 0);
    const totalGrossDividends = records.reduce(
      (acc, r) => acc + r.convertedGrossAmount,
      0,
    );
    const totalWht = records.reduce(
      (acc, r) => acc + r.convertedWithholdingTax,
      0,
    );

    const assetTypeSummaries: AssetTypeDividendSummary[] = [];
    for (const atKey of DIVIDEND_ASSET_TYPES) {
      const atData = assetTypeMap[atKey];
      const pct =
        totalNetDividends > 0 ? (atData.net / totalNetDividends) * 100.0 : 0.0;
      const costB = atData.costBasis;
      const currV = atData.currentValue;
      const projD = atData.projectedDividends;
      const atYoc = costB > 0 ? (projD / costB) * 100.0 : 0.0;
      const atYield = currV > 0 ? (projD / currV) * 100.0 : 0.0;

      assetTypeSummaries.push({
        assetType: atKey,
        assetTypeLabel: getAssetTypeLabel(atKey),
        totalGrossDividends: atData.gross,
        totalNetDividends: atData.net,
        totalWithholdingTax: atData.wht,
        percentageOfTotal: pct,
        symbolCount: atData.symbols.size,
        recordCount: atData.records,
        totalCostBasis: costB,
        currentValue: currV,
        projectedAnnualDividends: projD,
        yieldOnCostPercent: atYoc,
        currentYieldPercent: atYield,
      });
    }

    const monthlySummaries: MonthlyDividendSummary[] = Array.from(
      monthlyMap.values(),
    ).map((v) => ({
      yearMonth: v.yearMonth,
      year: v.year,
      month: v.month,
      grossAmount: v.gross,
      netAmount: v.net,
      withholdingTax: v.wht,
      byAssetType: v.byAssetType,
      recordCount: v.recordCount,
    }));
    monthlySummaries.sort((a, b) => b.yearMonth.localeCompare(a.yearMonth));

    const annualSummaries: AnnualDividendSummary[] = Array.from(
      annualMap.entries(),
    ).map(([y, v]) => ({
      year: y,
      grossAmount: v.gross,
      netAmount: v.net,
      withholdingTax: v.wht,
      byAssetType: v.byAssetType,
      recordCount: v.recordCount,
      monthlyBreakdown: monthlySummaries.filter((m) => m.year === y),
    }));
    annualSummaries.sort((a, b) => b.year - a.year);

    const effectiveTaxRate =
      totalGrossDividends > 0 ? (totalWht / totalGrossDividends) * 100.0 : 0.0;
    const portfolioYoc =
      totalOpenInvested > 0
        ? (projectedAnnualTotal / totalOpenInvested) * 100.0
        : 0.0;
    const portfolioYield =
      totalPortfolioValue > 0
        ? (projectedAnnualTotal / totalPortfolioValue) * 100.0
        : 0.0;

    const sortedSymbols = Array.from(symbolSummaryMap.values());
    sortedSymbols.sort(
      (a, b) =>
        b.convertedNetDividends - a.convertedNetDividends ||
        b.projectedAnnualIncome - a.projectedAnnualIncome,
    );

    return {
      currency: targetCurrency,
      exchangeRate,
      totalGrossDividends,
      totalNetDividends,
      totalWithholdingTax: totalWht,
      effectiveTaxRate,
      projectedAnnualDividends: projectedAnnualTotal,
      portfolioDividendYield: portfolioYield,
      portfolioYieldOnCost: portfolioYoc,
      annualDividends: annualSummaries,
      monthlyDividends: monthlySummaries,
      assetTypeSummaries,
      symbolSummaries: sortedSymbols,
      records,
      error: null,
    };
  }
}

