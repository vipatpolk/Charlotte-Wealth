import { Injectable } from '@nestjs/common';
import { parse } from 'csv-parse/sync';
import { ASSET_TABS, getSheetExportUrl } from '../config/sheet.config.js';
import {
  ClosedShareLot,
  ClosedSymbolSummary,
  ShareLot,
  SheetResult,
  SymbolSummary,
  SymbolTransaction,
  SymbolTransactionSummary,
  Transaction,
} from '../models/transaction.model.js';
import { singleflight, ttlCache } from '../utils/cache.util.js';
import { getAssetType, normalizeAssetType } from '../utils/format.util.js';

@Injectable()
export class ShareLotService {
  async fetchSheet(tabId: string): Promise<SheetResult> {
    const cacheKey = `sheet_${tabId}`;
    const cached = ttlCache.get<SheetResult>(cacheKey);
    if (cached !== null) {
      return cached;
    }

    return singleflight.execute(`fetch_sheet_${tabId}`, async () => {
      const c = ttlCache.get<SheetResult>(cacheKey);
      if (c !== null) {
        return c;
      }

      const tab = ASSET_TABS.find((t) => t.id === tabId);
      if (!tab || !tab.sheetGid) {
        return this.createEmptyResult(`Invalid tab id: ${tabId}`, false);
      }

      const url = getSheetExportUrl(tab.sheetGid, tab.id);
      const isClosed = tab.id === 'closed-position';
      const assetType = tab.id;

      try {
        const res = await fetch(url);
        if (!res.ok) {
          throw new Error(`HTTP ${res.status}: ${res.statusText}`);
        }
        const csvText = await res.text();
        const transactions = this.parseCsv(csvText, assetType);
        const { summaries, closedSummaries, transactionSummaries } =
          this.processTransactions(transactions);

        const result = this.buildResult(
          summaries,
          closedSummaries,
          transactionSummaries,
          transactions,
          isClosed,
        );
        ttlCache.set(cacheKey, result, 120.0);
        return result;
      } catch (err: any) {
        return this.createEmptyResult(
          `Failed to fetch data: ${err.message || err}`,
          isClosed,
        );
      }
    });
  }

  async fetchAllSheets(): Promise<SheetResult> {
    const cacheKey = 'sheet_all';
    const cached = ttlCache.get<SheetResult>(cacheKey);
    if (cached !== null) {
      return cached;
    }

    return singleflight.execute('fetch_sheet_all', async () => {
      const c = ttlCache.get<SheetResult>(cacheKey);
      if (c !== null) {
        return c;
      }

      const sheetTabs = ASSET_TABS.filter((t) => !!t.sheetGid);

      const fetchAndParse = async (tab: (typeof ASSET_TABS)[0]): Promise<Transaction[]> => {
        try {
          const res = await fetch(getSheetExportUrl(tab.sheetGid, tab.id));
          if (!res.ok) return [];
          const text = await res.text();
          return this.parseCsv(text, tab.id);
        } catch {
          return [];
        }
      };

      const results = await Promise.all(sheetTabs.map((t) => fetchAndParse(t)));
      const allTransactions = results.flat();

      const { summaries, closedSummaries, transactionSummaries } =
        this.processTransactions(allTransactions);

      const result = this.buildResult(
        summaries,
        closedSummaries,
        transactionSummaries,
        allTransactions,
        false,
      );
      ttlCache.set(cacheKey, result, 120.0);
      return result;
    });
  }

  createEmptyResult(error: string, isClosed: boolean): SheetResult {
    return {
      summaries: [],
      closedSummaries: [],
      transactionSummaries: [],
      rawTransactions: [],
      totalCostByCurrency: {},
      totalProceedsByCurrency: {},
      totalRealizedPLByCurrency: {},
      totalSymbols: 0,
      totalLots: 0,
      error,
      isClosed,
    };
  }

  buildResult(
    summaries: SymbolSummary[],
    closedSummaries: ClosedSymbolSummary[],
    transactionSummaries: SymbolTransactionSummary[],
    rawTransactions: Transaction[],
    isClosed: boolean,
  ): SheetResult {
    const totalCostByCurrency: Record<string, number> = {};
    const totalProceedsByCurrency: Record<string, number> = {};
    const totalRealizedPLByCurrency: Record<string, number> = {};

    if (isClosed) {
      for (const s of closedSummaries) {
        totalCostByCurrency[s.currency] = (totalCostByCurrency[s.currency] || 0) + s.totalCost;
        totalProceedsByCurrency[s.currency] =
          (totalProceedsByCurrency[s.currency] || 0) + s.totalProceeds;
        totalRealizedPLByCurrency[s.currency] =
          (totalRealizedPLByCurrency[s.currency] || 0) + s.realizedPL;
      }

      return {
        summaries,
        closedSummaries,
        transactionSummaries,
        rawTransactions,
        totalCostByCurrency,
        totalProceedsByCurrency,
        totalRealizedPLByCurrency,
        totalSymbols: closedSummaries.length,
        totalLots: 0,
        isClosed: true,
      };
    }

    for (const openSum of summaries) {
      totalCostByCurrency[openSum.currency] =
        (totalCostByCurrency[openSum.currency] || 0) + openSum.totalCost;
    }

    for (const closedSum of closedSummaries) {
      totalProceedsByCurrency[closedSum.currency] =
        (totalProceedsByCurrency[closedSum.currency] || 0) + closedSum.totalProceeds;
      totalRealizedPLByCurrency[closedSum.currency] =
        (totalRealizedPLByCurrency[closedSum.currency] || 0) + closedSum.realizedPL;
    }

    return {
      summaries,
      closedSummaries,
      transactionSummaries,
      rawTransactions,
      totalCostByCurrency,
      totalProceedsByCurrency,
      totalRealizedPLByCurrency,
      totalSymbols: summaries.length,
      totalLots: summaries.reduce((acc, s) => acc + s.lots.length, 0),
      isClosed: false,
    };
  }

  parseCsv(csvText: string, tabAssetType: string): Transaction[] {
    let rows: string[][];
    try {
      rows = parse(csvText, {
        skip_empty_lines: true,
        relax_column_count: true,
      });
    } catch {
      return [];
    }

    if (!rows || rows.length < 2) {
      return [];
    }

    const header = rows[0].map((h) => String(h || '').trim().toLowerCase());
    const isPvd =
      tabAssetType === 'provident-fund' ||
      header.some((h) => h.includes('employee')) ||
      header.some((h) => h.includes('employer'));

    if (isPvd) {
      return this.parsePvdCsv(rows);
    }

    const findIdx = (...names: string[]): number => {
      for (let i = 0; i < header.length; i++) {
        if (names.some((n) => header[i] === n || header[i].includes(n))) {
          return i;
        }
      }
      return -1;
    };

    const symIdx = Math.max(0, findIdx('symbol'));
    const dateIdx = Math.max(1, findIdx('date'));
    const qtyIdx = Math.max(2, findIdx('quantity', 'qty'));
    const priceIdx = Math.max(3, findIdx('price'));
    const currIdx = Math.max(4, findIdx('currency', 'curr'));
    const typeIdx = findIdx('assettype', 'asset type', 'asset');
    const txTypeIdx = findIdx(
      'transaction type',
      'tx_type',
      'txtype',
      'action',
      'trade type',
      'trade_type',
      'type',
    );
    const exFromIdx = findIdx(
      'exchange from',
      'exchnage from',
      'exchange_from',
      'switch from',
      'switch_from',
      'from fund',
      'from_fund',
      'from symbol',
      'source fund',
      'from',
    );
    const exToIdx = findIdx(
      'exchange to',
      'exchnage to',
      'exchange_to',
      'switch to',
      'switch_to',
      'to fund',
      'to_fund',
      'to symbol',
      'target fund',
      'to',
    );

    const transactions: Transaction[] = [];

    for (let r = 1; r < rows.length; r++) {
      const row = rows[r];
      if (row.length < 4) continue;

      const symbol = row[symIdx]?.trim();
      const date = row[dateIdx]?.trim();
      if (!symbol || !date) continue;

      const qtyStr = row[qtyIdx]?.trim().replace(/,/g, '') || '';
      const priceStr = row[priceIdx]?.trim().replace(/,/g, '') || '';
      const quantity = parseFloat(qtyStr);
      const price = parseFloat(priceStr);

      if (isNaN(quantity) || isNaN(price)) continue;

      const currency =
        currIdx !== -1 && row[currIdx]?.trim() ? row[currIdx].trim() : 'USD';

      const rawType = typeIdx !== -1 ? row[typeIdx]?.trim() : '';
      const parsedType = normalizeAssetType(rawType);
      const assetType = parsedType || getAssetType(tabAssetType, symbol);

      const exFrom = exFromIdx !== -1 && row[exFromIdx]?.trim() ? row[exFromIdx].trim() : null;
      const exTo = exToIdx !== -1 && row[exToIdx]?.trim() ? row[exToIdx].trim() : null;
      let parsedTxType =
        txTypeIdx !== -1 && row[txTypeIdx]?.trim() ? row[txTypeIdx].trim().toUpperCase() : null;

      if (!parsedTxType && rawType) {
        parsedTxType = rawType.trim().toUpperCase();
      }

      const rowStr = row.map((c) => (c || '').trim().toUpperCase()).join(' ');
      if (
        ['EXCHANGE OUT', 'EXCHNAGE OUT', 'SWITCH OUT', 'EX-OUT', 'SW-OUT', 'EXCHANGE_OUT'].some(
          (kw) => rowStr.includes(kw),
        )
      ) {
        parsedTxType = 'EXCHANGE_OUT';
      } else if (
        ['EXCHANGE IN', 'EXCHNAGE IN', 'SWITCH IN', 'EX-IN', 'SW-IN', 'EXCHANGE_IN'].some((kw) =>
          rowStr.includes(kw),
        )
      ) {
        parsedTxType = 'EXCHANGE_IN';
      } else if (['DIVIDEND', 'DIV', 'INCOME', 'DISTRIBUTION'].some((kw) => rowStr.includes(kw))) {
        parsedTxType = 'DIVIDEND';
      } else if (
        ['EXCHANGE', 'EXCHNAGE', 'SWITCH', 'SWTICH'].some((kw) => rowStr.includes(kw)) &&
        !parsedTxType
      ) {
        parsedTxType = 'EXCHANGE';
      }

      transactions.push({
        symbol,
        date,
        quantity,
        price,
        currency,
        assetType,
        exchangeFrom: exFrom,
        exchangeTo: exTo,
        txType: parsedTxType,
      });
    }

    return transactions;
  }

  parsePvdCsv(rows: string[][]): Transaction[] {
    const header = rows[0].map((h) => String(h || '').trim().toLowerCase());

    const findIdx = (...names: string[]): number => {
      for (let i = 0; i < header.length; i++) {
        if (names.some((n) => header[i] === n || header[i].includes(n))) {
          return i;
        }
      }
      return -1;
    };

    const symIdx = Math.max(0, findIdx('ticker', 'symbol'));
    const empUnitIdx = findIdx("employee's unit", 'employee unit', 'emp unit');
    const emprUnitIdx = findIdx("employer's unit", 'employer unit', 'co unit');
    const empContribIdx = findIdx(
      "employee's contribution",
      'employee contribution',
      'emp contrib',
      'emp contribution',
    );
    const empEarningsIdx = findIdx(
      "employee's earnings",
      'employee earnings',
      'emp earnings',
      'emp gain',
    );
    const emprMatchingIdx = findIdx(
      "employer's matching",
      'employer matching',
      "employer's contribution",
      'employer contribution',
      'co matching',
      'co contribution',
    );
    const emprEarningsIdx = findIdx(
      "employer's earnings",
      'employer earnings',
      'co earnings',
      'co gain',
    );
    const valIdx = findIdx('total value', 'value', 'amount');
    const currIdx = findIdx('currency', 'curr');

    const hasUnits = empUnitIdx !== -1 && emprUnitIdx !== -1;
    const hasValues = valIdx !== -1 || (empContribIdx !== -1 && emprMatchingIdx !== -1);
    if (!hasUnits || !hasValues) {
      return [];
    }

    const todayStr = new Date().toISOString().split('T')[0];
    const transactions: Transaction[] = [];

    for (let r = 1; r < rows.length; r++) {
      const row = rows[r];
      if (row.length <= symIdx) continue;
      const symbol = row[symIdx]?.trim();
      if (!symbol) continue;

      const parseFloatCol = (idx: number): number => {
        if (idx !== -1 && row[idx]) {
          const valStr = row[idx].trim().replace(/,/g, '');
          const val = parseFloat(valStr);
          return isNaN(val) ? 0.0 : val;
        }
        return 0.0;
      };

      const empUnits = parseFloatCol(empUnitIdx);
      const emprUnits = parseFloatCol(emprUnitIdx);
      const empContrib = parseFloatCol(empContribIdx);
      const empEarnings = parseFloatCol(empEarningsIdx);
      const emprMatching = parseFloatCol(emprMatchingIdx);
      const emprEarnings = parseFloatCol(emprEarningsIdx);
      let totalVal = parseFloatCol(valIdx);

      if (totalVal === 0.0) {
        totalVal = empContrib + empEarnings + emprMatching + emprEarnings;
      }

      const totalUnits = empUnits + emprUnits;
      const navPrice = totalUnits > 0 ? totalVal / totalUnits : 0.0;
      const currency = currIdx !== -1 && row[currIdx]?.trim() ? row[currIdx].trim() : 'THB';

      const empCostBasis =
        empUnits > 0 && empContrib > 0 ? empContrib / empUnits : navPrice;
      const emprCostBasis =
        emprUnits > 0 && emprMatching > 0 ? emprMatching / emprUnits : navPrice;

      if (empUnits > 0) {
        transactions.push({
          symbol,
          date: todayStr,
          quantity: empUnits,
          price: empCostBasis,
          currency,
          assetType: 'provident-fund',
          txType: 'BUY',
          note: 'Employee Contribution',
          employeeContribution: empContrib > 0 ? empContrib : null,
          employeeEarnings: empEarnings !== 0 ? empEarnings : null,
        });
      }

      if (emprUnits > 0) {
        transactions.push({
          symbol,
          date: todayStr,
          quantity: emprUnits,
          price: emprCostBasis,
          currency,
          assetType: 'provident-fund',
          txType: 'BUY',
          note: 'Employer Matching',
          employerMatching: emprMatching > 0 ? emprMatching : null,
          employerEarnings: emprEarnings !== 0 ? emprEarnings : null,
        });
      }
    }

    return transactions;
  }

  processTransactions(transactions: Transaction[]): {
    summaries: SymbolSummary[];
    closedSummaries: ClosedSymbolSummary[];
    transactionSummaries: SymbolTransactionSummary[];
  } {
    const symbolMap = new Map<string, Transaction[]>();
    for (const tx of transactions) {
      if (!symbolMap.has(tx.symbol)) {
        symbolMap.set(tx.symbol, []);
      }
      symbolMap.get(tx.symbol)!.push(tx);
    }

    const summaries: SymbolSummary[] = [];
    const closedSummaries: ClosedSymbolSummary[] = [];
    const transactionSummaries: SymbolTransactionSummary[] = [];
    const EPSILON = 1e-7;

    for (const [symbol, txs] of symbolMap.entries()) {
      txs.sort((a, b) => a.date.localeCompare(b.date));
      const currency = txs[0].currency;
      const assetType = txs[0].assetType;

      const openLots: ShareLot[] = [];
      const closedLots: ClosedShareLot[] = [];
      const processedTxList: SymbolTransaction[] = [];

      let runningShares = 0.0;
      let runningTotalCost = 0.0;
      let totalBuyShares = 0.0;
      let totalSellShares = 0.0;
      let totalBuyAmount = 0.0;
      let totalSellAmount = 0.0;
      let buyCount = 0;
      let sellCount = 0;
      let exchangeCount = 0;
      let totalRealizedPL = 0.0;
      let totalRealizedCostBasis = 0.0;

      for (let i = 0; i < txs.length; i++) {
        const tx = txs[i];
        const isBuy = tx.quantity > 0;
        const qty = Math.abs(tx.quantity);
        const price = tx.price;
        const totalAmount = qty * price;
        const txId = `${symbol}-${tx.date}-${i + 1}`;

        const { txType, isExchange } = this.classifyTransactionType(tx, isBuy);
        if (isExchange) {
          exchangeCount++;
        }

        if (txType === 'DIVIDEND') {
          const runningAvg = runningShares > 0 ? runningTotalCost / runningShares : 0;
          processedTxList.push({
            id: txId,
            symbol: tx.symbol,
            date: tx.date,
            type: 'DIVIDEND',
            quantity: qty,
            rawQuantity: tx.quantity,
            price,
            totalAmount,
            currency: tx.currency,
            assetType: tx.assetType,
            runningShares,
            runningTotalCost,
            runningAverageCost: runningAvg,
            exchangeFrom: tx.exchangeFrom,
            exchangeTo: tx.exchangeTo,
          });
          continue;
        }

        if (txType === 'BUY' || txType === 'EXCHANGE_IN' || (isBuy && txType !== 'EXCHANGE_OUT')) {
          if (!isExchange) {
            buyCount++;
          }
          totalBuyShares += qty;
          totalBuyAmount += totalAmount;
          runningShares += qty;
          runningTotalCost += totalAmount;
          const runningAvg = runningShares > 0 ? runningTotalCost / runningShares : 0;

          openLots.push({
            symbol: tx.symbol,
            purchaseDate: tx.date,
            quantity: qty,
            costBasis: price,
            totalCost: totalAmount,
            assetType: tx.assetType,
            note: tx.note,
          });

          processedTxList.push({
            id: txId,
            symbol: tx.symbol,
            date: tx.date,
            type: txType,
            quantity: qty,
            rawQuantity: tx.quantity,
            price,
            totalAmount,
            currency: tx.currency,
            assetType: tx.assetType,
            runningShares,
            runningTotalCost,
            runningAverageCost: runningAvg,
            exchangeFrom: tx.exchangeFrom,
            exchangeTo: tx.exchangeTo,
          });
        } else {
          if (!isExchange) {
            sellCount++;
          }
          totalSellShares += qty;
          totalSellAmount += totalAmount;

          let remainingToSell = qty;
          let matchedCost = 0.0;

          for (const lot of openLots) {
            if (remainingToSell <= EPSILON) break;
            if (lot.quantity <= EPSILON) continue;

            const matchedQty = Math.min(lot.quantity, remainingToSell);
            const buyCost = matchedQty * lot.costBasis;
            const sellProceeds = matchedQty * price;
            const lotRealizedPL = sellProceeds - buyCost;
            const lotRealizedPLPct = buyCost > 0 ? (lotRealizedPL / buyCost) * 100.0 : 0.0;

            closedLots.push({
              symbol: tx.symbol,
              purchaseDate: lot.purchaseDate,
              closeDate: tx.date,
              quantity: matchedQty,
              costBasis: lot.costBasis,
              sellPrice: price,
              totalCost: buyCost,
              totalProceeds: sellProceeds,
              realizedPL: lotRealizedPL,
              realizedPLPercent: lotRealizedPLPct,
              currency: tx.currency,
              assetType: tx.assetType,
            });

            lot.quantity -= matchedQty;
            lot.totalCost = lot.quantity * lot.costBasis;
            remainingToSell -= matchedQty;
            matchedCost += buyCost;
          }

          let txRealizedPL: number | null = null;
          let txRealizedPLPct: number | null = null;

          if (matchedCost > 0) {
            txRealizedPL = totalAmount - matchedCost;
            txRealizedPLPct = (txRealizedPL / matchedCost) * 100.0;
            totalRealizedPL += txRealizedPL;
            totalRealizedCostBasis += matchedCost;
          }

          runningShares = Math.max(0.0, runningShares - qty);
          runningTotalCost = Math.max(0.0, runningTotalCost - matchedCost);
          if (runningShares <= EPSILON) {
            runningShares = 0.0;
            runningTotalCost = 0.0;
          }
          const runningAvg = runningShares > 0 ? runningTotalCost / runningShares : 0;

          processedTxList.push({
            id: txId,
            symbol: tx.symbol,
            date: tx.date,
            type: txType,
            quantity: qty,
            rawQuantity: tx.quantity,
            price,
            totalAmount,
            currency: tx.currency,
            assetType: tx.assetType,
            runningShares,
            runningTotalCost,
            runningAverageCost: runningAvg,
            realizedPL: txRealizedPL,
            realizedPLPercent: txRealizedPLPct,
            exchangeFrom: tx.exchangeFrom,
            exchangeTo: tx.exchangeTo,
          });
        }
      }

      const remainingLots = openLots.filter((lot) => lot.quantity > EPSILON);

      if (remainingLots.length > 0) {
        const totalShares = remainingLots.reduce((acc, l) => acc + l.quantity, 0);
        const totalCost = remainingLots.reduce((acc, l) => acc + l.totalCost, 0);
        const avgCost = totalShares > 0 ? totalCost / totalShares : 0;

        const empShares = remainingLots
          .filter((l) => l.note === 'Employee Contribution')
          .reduce((acc, l) => acc + l.quantity, 0);
        const emprShares = remainingLots
          .filter((l) => l.note === 'Employer Matching')
          .reduce((acc, l) => acc + l.quantity, 0);

        const empContribVals = txs
          .map((t) => t.employeeContribution)
          .filter((v): v is number => v !== null && v !== undefined);
        const empContrib = empContribVals.length
          ? empContribVals.reduce((a, b) => a + b, 0)
          : null;

        const empEarningsVals = txs
          .map((t) => t.employeeEarnings)
          .filter((v): v is number => v !== null && v !== undefined);
        const empEarnings = empEarningsVals.length
          ? empEarningsVals.reduce((a, b) => a + b, 0)
          : null;

        const emprMatchingVals = txs
          .map((t) => t.employerMatching)
          .filter((v): v is number => v !== null && v !== undefined);
        const emprMatching = emprMatchingVals.length
          ? emprMatchingVals.reduce((a, b) => a + b, 0)
          : null;

        const emprEarningsVals = txs
          .map((t) => t.employerEarnings)
          .filter((v): v is number => v !== null && v !== undefined);
        const emprEarnings = emprEarningsVals.length
          ? emprEarningsVals.reduce((a, b) => a + b, 0)
          : null;

        summaries.push({
          symbol,
          totalShares,
          totalCost,
          averageCost: avgCost,
          currency,
          lots: remainingLots,
          assetType,
          employeeShares: empShares > 0 ? empShares : null,
          employerShares: emprShares > 0 ? emprShares : null,
          employeeContribution: empContrib,
          employeeEarnings: empEarnings,
          employerMatching: emprMatching,
          employerEarnings: emprEarnings,
        });
      } else if (closedLots.length > 0) {
        const closedShares = closedLots.reduce((acc, l) => acc + l.quantity, 0);
        const totalCost = closedLots.reduce((acc, l) => acc + l.totalCost, 0);
        const totalProceeds = closedLots.reduce((acc, l) => acc + l.totalProceeds, 0);
        const realizedPL = totalProceeds - totalCost;
        const realizedPLPercent = totalCost > 0 ? (realizedPL / totalCost) * 100 : 0;
        const avgBuy = closedShares > 0 ? totalCost / closedShares : 0;
        const avgSell = closedShares > 0 ? totalProceeds / closedShares : 0;

        closedSummaries.push({
          symbol,
          totalShares: 0,
          closedShares,
          totalCost,
          totalProceeds,
          realizedPL,
          realizedPLPercent,
          averageBuyPrice: avgBuy,
          averageSellPrice: avgSell,
          currency,
          lots: closedLots,
          assetType,
        });
      }

      const avgBuy = totalBuyShares > 0 ? totalBuyAmount / totalBuyShares : 0;
      const avgSell = totalSellShares > 0 ? totalSellAmount / totalSellShares : 0;
      const overallRealizedPLPercent =
        totalRealizedCostBasis > 0 ? (totalRealizedPL / totalRealizedCostBasis) * 100 : 0;
      const currentStatus = runningShares > EPSILON ? 'OPEN' : 'CLOSED';

      transactionSummaries.push({
        symbol,
        assetType,
        currency,
        totalTransactions: txs.length,
        buyCount,
        sellCount,
        exchangeCount,
        totalBuyShares,
        totalSellShares,
        totalBuyAmount,
        totalSellAmount,
        averageBuyPrice: avgBuy,
        averageSellPrice: avgSell,
        netShares: runningShares,
        netInvested: runningTotalCost,
        currentStatus,
        realizedPL: totalRealizedPL,
        realizedPLPercent: overallRealizedPLPercent,
        firstTradeDate: txs[0].date,
        lastTradeDate: txs[txs.length - 1].date,
        transactions: processedTxList,
      });
    }

    summaries.sort((a, b) => b.totalCost - a.totalCost);
    closedSummaries.sort((a, b) => b.realizedPL - a.realizedPL);
    transactionSummaries.sort(
      (a, b) => b.totalTransactions - a.totalTransactions || a.symbol.localeCompare(b.symbol),
    );

    return { summaries, closedSummaries, transactionSummaries };
  }

  private classifyTransactionType(
    tx: Transaction,
    isBuy: boolean,
  ): { txType: string; isExchange: boolean } {
    if (
      tx.txType &&
      ['DIVIDEND', 'DIV', 'INCOME', 'DISTRIBUTION'].some((kw) => tx.txType!.includes(kw))
    ) {
      return { txType: 'DIVIDEND', isExchange: false };
    }

    const isExchangeOut = Boolean(
      tx.exchangeTo ||
        (tx.txType &&
          [
            'EXCHANGE_OUT',
            'EXCHANGE OUT',
            'EXCHNAGE OUT',
            'SWITCH_OUT',
            'SWITCH OUT',
            'EX-OUT',
            'SW-OUT',
          ].some((kw) => tx.txType!.includes(kw))),
    );

    const isExchangeIn = Boolean(
      tx.exchangeFrom ||
        (tx.txType &&
          [
            'EXCHANGE_IN',
            'EXCHANGE IN',
            'EXCHNAGE IN',
            'SWITCH_IN',
            'SWITCH IN',
            'EX-IN',
            'SW-IN',
          ].some((kw) => tx.txType!.includes(kw))),
    );

    const isGenericExchange = Boolean(
      tx.txType &&
        ['EXCHANGE', 'EXCHNAGE', 'SWITCH', 'SWTICH'].some((kw) => tx.txType!.includes(kw)) &&
        !isExchangeOut &&
        !isExchangeIn,
    );

    const isExchange = isExchangeOut || isExchangeIn || isGenericExchange;

    let txType: string;
    if (isExchangeOut || (isGenericExchange && !isBuy)) {
      txType = 'EXCHANGE_OUT';
    } else if (isExchangeIn || (isGenericExchange && isBuy)) {
      txType = 'EXCHANGE_IN';
    } else {
      txType = isBuy ? 'BUY' : 'SELL';
    }

    return { txType, isExchange };
  }
}

