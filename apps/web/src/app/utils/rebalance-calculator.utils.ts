import { PortfolioPosition } from '../models/portfolio.model';
import { PriceData } from '../services/price.service';
import {
  AssetClassRebalanceGroup,
  NoSellSubMode,
  RebalanceActionType,
  RebalanceMode,
  RebalancePlanResult,
  RebalanceSimulationInput,
  RebalanceTradeOrder,
  SymbolRebalanceItem,
} from '../models/tools.model';
import { KNOWN_ASSET_TYPES } from '../config/asset.constants';
import {
  convertCurrency,
  displaySymbol,
  getAssetColor,
  getAssetType,
  getAssetTypeLabel,
  getSymbolColor,
  resolveSymbolName,
} from './format.utils';

export interface RawSymbolPosition {
  symbol: string;
  displaySymbol: string;
  name: string;
  assetType: string;
  assetTypeLabel: string;
  currency: string;
  totalShares: number;
  currentPrice: number;
  holdingValue: number;
  color: string;
}

/**
 * Standard ordered known asset classes for consistent UI grouping
 */
export const ORDERED_ASSET_CLASSES: readonly string[] = KNOWN_ASSET_TYPES;

/**
 * Converts value from original position currency to active display currency (USD / THB)
 */
export function convertToDisplayCurrency(
  amount: number,
  fromCurrency: string,
  displayCurrency: 'USD' | 'THB',
  exchangeRate: number
): number {
  if (!amount || amount === 0) return 0;
  const orig = (fromCurrency || displayCurrency).toUpperCase() === 'USDT' ? 'USD' : (fromCurrency || displayCurrency).toUpperCase();
  if (orig === displayCurrency) return amount;
  if (!exchangeRate || exchangeRate <= 0) return amount;
  return convertCurrency(amount, orig, displayCurrency, exchangeRate);
}

/**
 * Extracts and consolidates raw positions from portfolio data with converted prices and values
 */
export function extractRawPositions(
  positions: PortfolioPosition[],
  pricesMap: Map<string, PriceData>,
  displayCurrency: 'USD' | 'THB',
  exchangeRate: number
): RawSymbolPosition[] {
  return positions.map((p) => {
    const pd = pricesMap.get(p.symbol);
    const mktPrice = pd && pd.price > 0 ? pd.price : p.currentPrice || 0;
    const origCurrency = pd?.currency || p.currency || displayCurrency;
    const priceConverted = convertToDisplayCurrency(mktPrice, origCurrency, displayCurrency, exchangeRate);
    const rawVal = p.totalShares * mktPrice;
    const valueConverted = convertToDisplayCurrency(rawVal, origCurrency, displayCurrency, exchangeRate);

    return {
      symbol: p.symbol,
      displaySymbol: p.displaySymbol || displaySymbol(p.symbol),
      name: p.name || resolveSymbolName(p.symbol, pricesMap),
      assetType: getAssetType(p.assetType, p.symbol),
      assetTypeLabel: getAssetTypeLabel(p.assetType, p.symbol),
      currency: displayCurrency,
      totalShares: Math.max(0, p.totalShares || 0),
      currentPrice: priceConverted,
      holdingValue: Math.max(0, valueConverted || 0),
      color: getSymbolColor(p.symbol),
    };
  });
}

/**
 * Helper to generate Equal Weight allocation (summing to 100%) for an array of symbols
 */
export function getEqualWeightsForClass(symbols: string[]): Record<string, number> {
  const result: Record<string, number> = {};
  if (!symbols || symbols.length === 0) return result;

  const count = symbols.length;
  const baseWeight = Math.floor((100 / count) * 100) / 100;
  let remainder = parseFloat((100 - baseWeight * count).toFixed(2));

  for (let i = 0; i < count; i++) {
    const sym = symbols[i];
    let w = baseWeight;
    if (remainder > 0 && i === count - 1) {
      w = parseFloat((w + remainder).toFixed(2));
      remainder = 0;
    }
    result[sym] = w;
  }
  return result;
}

/**
 * Helper to normalize existing target percentage inputs to exactly 100%
 */
export function normalizeWeightsTo100(
  targets: Record<string, number>,
  symbols: string[]
): Record<string, number> {
  const result: Record<string, number> = {};
  if (!symbols || symbols.length === 0) return result;

  const total = symbols.reduce((sum, s) => sum + Math.max(0, targets[s] || 0), 0);
  if (total <= 0) {
    return getEqualWeightsForClass(symbols);
  }

  let allocated = 0;
  for (let i = 0; i < symbols.length; i++) {
    const sym = symbols[i];
    const rawTarget = Math.max(0, targets[sym] || 0);
    if (i === symbols.length - 1) {
      result[sym] = parseFloat((100 - allocated).toFixed(2));
    } else {
      const normalized = parseFloat(((rawTarget / total) * 100).toFixed(2));
      allocated += normalized;
      result[sym] = normalized;
    }
  }

  return result;
}

/**
 * Helper to generate target weights matching the current distribution
 */
export function getCurrentWeightsForClass(
  items: { symbol: string; currentClassPercent: number }[]
): Record<string, number> {
  const result: Record<string, number> = {};
  if (!items || items.length === 0) return result;

  let allocated = 0;
  for (let i = 0; i < items.length; i++) {
    const item = items[i];
    if (i === items.length - 1) {
      result[item.symbol] = parseFloat((100 - allocated).toFixed(2));
    } else {
      const val = parseFloat(item.currentClassPercent.toFixed(2));
      allocated += val;
      result[item.symbol] = val;
    }
  }
  return result;
}

/**
 * Standard Two-Way Rebalance Engine (Buy & Sell)
 */
export function calculateStandardGroupRebalance(
  groupItems: RawSymbolPosition[],
  classTotalValue: number,
  portfolioTotalValue: number,
  targets: Record<string, number>,
  threshold: number = 0.01
): { symbols: SymbolRebalanceItem[]; totalBuy: number; totalSell: number } {
  let totalBuy = 0;
  let totalSell = 0;

  const symbols: SymbolRebalanceItem[] = groupItems.map((item) => {
    const targetPct = Math.max(0, targets[item.symbol] ?? 0);
    const targetValue = classTotalValue > 0 ? (targetPct / 100) * classTotalValue : 0;
    const deltaValue = targetValue - item.holdingValue;
    const currentClassPct = classTotalValue > 0 ? (item.holdingValue / classTotalValue) * 100 : 0;
    const currentPortfolioPct = portfolioTotalValue > 0 ? (item.holdingValue / portfolioTotalValue) * 100 : 0;

    let action: RebalanceActionType = 'BALANCED';
    let deltaShares = 0;

    if (deltaValue > threshold) {
      action = 'BUY';
      totalBuy += deltaValue;
      deltaShares = item.currentPrice > 0 ? deltaValue / item.currentPrice : 0;
    } else if (deltaValue < -threshold) {
      action = 'SELL';
      totalSell += Math.abs(deltaValue);
      deltaShares = item.currentPrice > 0 ? -Math.abs(deltaValue) / item.currentPrice : 0;
    } else {
      action = 'BALANCED';
      deltaShares = 0;
    }

    return {
      symbol: item.symbol,
      displaySymbol: item.displaySymbol,
      name: item.name,
      assetType: item.assetType,
      assetTypeLabel: item.assetTypeLabel,
      currency: item.currency,
      currentShares: item.totalShares,
      currentPrice: item.currentPrice,
      currentValue: item.holdingValue,
      currentClassPercent: currentClassPct,
      currentPortfolioPercent: currentPortfolioPct,
      targetPercent: targetPct,
      targetValue,
      action,
      deltaValue,
      deltaShares,
      color: item.color,
    };
  });

  return { symbols, totalBuy, totalSell };
}

/**
 * No-Sell Minimum Inflow Solver (Exact Target Match without selling any asset)
 * Solves: V_new = max(V_i / (T_i / 100)) for all T_i > 0
 */
export function calculateNoSellMinimumInflowGroup(
  groupItems: RawSymbolPosition[],
  classTotalValue: number,
  portfolioTotalValue: number,
  targets: Record<string, number>
): {
  symbols: SymbolRebalanceItem[];
  minInflowRequired: number;
  newClassValue: number;
  anchorSymbol: string | null;
} {
  // Step 1: Find the anchor overweight position (max V_i / T_i)
  let maxRequiredClassValue = classTotalValue;
  let anchorSymbol: string | null = null;

  for (const item of groupItems) {
    const targetPct = Math.max(0, targets[item.symbol] ?? 0);
    if (targetPct > 0) {
      const requiredClassVal = item.holdingValue / (targetPct / 100);
      if (requiredClassVal > maxRequiredClassValue) {
        maxRequiredClassValue = requiredClassVal;
        anchorSymbol = item.symbol;
      }
    }
  }

  const minInflowRequired = Math.max(0, maxRequiredClassValue - classTotalValue);
  const newClassValue = maxRequiredClassValue;

  // Step 2: Compute Buy amounts to bring each underweight symbol to exact target
  const symbols: SymbolRebalanceItem[] = groupItems.map((item) => {
    const targetPct = Math.max(0, targets[item.symbol] ?? 0);
    const targetValue = (targetPct / 100) * newClassValue;
    const deltaValue = Math.max(0, targetValue - item.holdingValue);
    const currentClassPct = classTotalValue > 0 ? (item.holdingValue / classTotalValue) * 100 : 0;
    const currentPortfolioPct = portfolioTotalValue > 0 ? (item.holdingValue / portfolioTotalValue) * 100 : 0;
    const isAnchor = item.symbol === anchorSymbol || deltaValue < 0.01;

    const action: RebalanceActionType = deltaValue >= 0.01 ? 'BUY' : 'BALANCED';
    const deltaShares = deltaValue >= 0.01 && item.currentPrice > 0 ? deltaValue / item.currentPrice : 0;

    return {
      symbol: item.symbol,
      displaySymbol: item.displaySymbol,
      name: item.name,
      assetType: item.assetType,
      assetTypeLabel: item.assetTypeLabel,
      currency: item.currency,
      currentShares: item.totalShares,
      currentPrice: item.currentPrice,
      currentValue: item.holdingValue,
      currentClassPercent: currentClassPct,
      currentPortfolioPercent: currentPortfolioPct,
      targetPercent: targetPct,
      targetValue,
      action,
      deltaValue,
      deltaShares,
      color: item.color,
      isAnchorPosition: isAnchor && targetPct > 0,
    };
  });

  return { symbols, minInflowRequired, newClassValue, anchorSymbol };
}

/**
 * Smart Cash Deposit Allocator (Water-Filling / Deficit-based Buy-Only Allocation)
 * Allocates user-supplied cash budget C_deposit across underweight symbols without selling.
 */
export function allocateCashDepositGroup(
  groupItems: RawSymbolPosition[],
  classTotalValue: number,
  portfolioTotalValue: number,
  targets: Record<string, number>,
  cashDeposit: number
): { symbols: SymbolRebalanceItem[]; allocatedCash: number } {
  const deposit = Math.max(0, cashDeposit);
  const targetClassValue = classTotalValue + deposit;

  // Calculate ideal deficit for each symbol: Deficit_i = max(0, (Target% * V_target) - V_current)
  const deficits = groupItems.map((item) => {
    const targetPct = Math.max(0, targets[item.symbol] ?? 0);
    const idealVal = (targetPct / 100) * targetClassValue;
    const deficit = Math.max(0, idealVal - item.holdingValue);
    return { symbol: item.symbol, targetPct, idealVal, deficit };
  });

  const totalDeficit = deficits.reduce((sum, d) => sum + d.deficit, 0);

  let allocatedCash = 0;
  const symbols: SymbolRebalanceItem[] = groupItems.map((item) => {
    const dInfo = deficits.find((d) => d.symbol === item.symbol)!;
    let buyAmount = 0;

    if (totalDeficit > 0 && deposit > 0) {
      if (totalDeficit <= deposit) {
        // We have enough cash to satisfy all deficits, allocate full deficit
        // and distribute surplus proportional to target weights
        const surplus = deposit - totalDeficit;
        buyAmount = dInfo.deficit + (dInfo.targetPct / 100) * surplus;
      } else {
        // We have less cash than needed to satisfy all deficits, allocate proportionally
        buyAmount = deposit * (dInfo.deficit / totalDeficit);
      }
    }

    allocatedCash += buyAmount;
    const targetValue = item.holdingValue + buyAmount;
    const currentClassPct = classTotalValue > 0 ? (item.holdingValue / classTotalValue) * 100 : 0;
    const currentPortfolioPct = portfolioTotalValue > 0 ? (item.holdingValue / portfolioTotalValue) * 100 : 0;

    const action: RebalanceActionType = buyAmount >= 0.01 ? 'BUY' : 'BALANCED';
    const deltaShares = buyAmount >= 0.01 && item.currentPrice > 0 ? buyAmount / item.currentPrice : 0;

    return {
      symbol: item.symbol,
      displaySymbol: item.displaySymbol,
      name: item.name,
      assetType: item.assetType,
      assetTypeLabel: item.assetTypeLabel,
      currency: item.currency,
      currentShares: item.totalShares,
      currentPrice: item.currentPrice,
      currentValue: item.holdingValue,
      currentClassPercent: currentClassPct,
      currentPortfolioPercent: currentPortfolioPct,
      targetPercent: dInfo.targetPct,
      targetValue,
      action,
      deltaValue: buyAmount,
      deltaShares,
      color: item.color,
      isAnchorPosition: buyAmount < 0.01 && dInfo.targetPct > 0,
    };
  });

  return { symbols, allocatedCash };
}

/**
 * Master Rebalance Calculation Engine: Orchestrates grouping, solving, and generating orders
 */
export function calculateRebalancePlan(
  positions: PortfolioPosition[],
  pricesMap: Map<string, PriceData>,
  input: RebalanceSimulationInput,
  displayCurrency: 'USD' | 'THB',
  exchangeRate: number
): RebalancePlanResult {
  const rawPositions = extractRawPositions(positions, pricesMap, displayCurrency, exchangeRate);
  const totalPortfolioValue = rawPositions.reduce((sum, p) => sum + p.holdingValue, 0);

  // Group raw positions by asset class
  const classMap = new Map<string, RawSymbolPosition[]>();
  for (const pos of rawPositions) {
    const list = classMap.get(pos.assetType) || [];
    list.push(pos);
    classMap.set(pos.assetType, list);
  }

  // Determine asset class ordering
  const classKeys = Array.from(classMap.keys());
  const orderedKeys = [
    ...ORDERED_ASSET_CLASSES.filter((k) => classKeys.includes(k)),
    ...classKeys.filter((k) => !ORDERED_ASSET_CLASSES.includes(k)),
  ];

  const groups: AssetClassRebalanceGroup[] = [];
  const allOrders: RebalanceTradeOrder[] = [];
  let totalBuyAmount = 0;
  let totalSellAmount = 0;
  let totalTargetPortfolioValue = totalPortfolioValue;
  let totalInflowContribution = 0;

  for (const assetType of orderedKeys) {
    const groupItems = classMap.get(assetType) || [];
    const classTotalValue = groupItems.reduce((sum, p) => sum + p.holdingValue, 0);
    const classPortfolioPct = totalPortfolioValue > 0 ? (classTotalValue / totalPortfolioValue) * 100 : 0;

    // Sum of target percentages in this group
    const targetSum = groupItems.reduce((sum, p) => sum + Math.max(0, input.targetAllocations[p.symbol] ?? 0), 0);
    const isValid = Math.abs(targetSum - 100) <= 0.1 || (targetSum === 0 && groupItems.length === 0);

    let symbols: SymbolRebalanceItem[] = [];
    let groupBuy = 0;
    let groupSell = 0;
    let minInflowReq = 0;

    if (input.mode === 'standard') {
      const res = calculateStandardGroupRebalance(
        groupItems,
        classTotalValue,
        totalPortfolioValue,
        input.targetAllocations
      );
      symbols = res.symbols;
      groupBuy = res.totalBuy;
      groupSell = res.totalSell;
    } else {
      // No-Sell mode
      if (input.noSellSubMode === 'min-inflow') {
        const res = calculateNoSellMinimumInflowGroup(
          groupItems,
          classTotalValue,
          totalPortfolioValue,
          input.targetAllocations
        );
        symbols = res.symbols;
        minInflowReq = res.minInflowRequired;
        groupBuy = minInflowReq;
        groupSell = 0;
        totalInflowContribution += minInflowReq;
      } else {
        // Custom Cash Deposit mode
        const groupShareOfDeposit =
          totalPortfolioValue > 0 ? (classTotalValue / totalPortfolioValue) * input.customCashDeposit : input.customCashDeposit / Math.max(1, orderedKeys.length);
        const res = allocateCashDepositGroup(
          groupItems,
          classTotalValue,
          totalPortfolioValue,
          input.targetAllocations,
          groupShareOfDeposit
        );
        symbols = res.symbols;
        groupBuy = res.allocatedCash;
        groupSell = 0;
        totalInflowContribution += res.allocatedCash;
      }
    }

    totalBuyAmount += groupBuy;
    totalSellAmount += groupSell;

    // Collect orders
    for (const s of symbols) {
      if (s.action === 'BUY' && s.deltaValue >= 0.01) {
        allOrders.push({
          id: `order-buy-${s.symbol}`,
          symbol: s.symbol,
          displaySymbol: s.displaySymbol,
          name: s.name,
          assetType: s.assetType,
          action: 'BUY',
          shares: parseFloat(s.deltaShares.toFixed(4)),
          price: s.currentPrice,
          amount: parseFloat(s.deltaValue.toFixed(2)),
          currency: displayCurrency,
        });
      } else if (s.action === 'SELL' && s.deltaValue <= -0.01) {
        allOrders.push({
          id: `order-sell-${s.symbol}`,
          symbol: s.symbol,
          displaySymbol: s.displaySymbol,
          name: s.name,
          assetType: s.assetType,
          action: 'SELL',
          shares: parseFloat(Math.abs(s.deltaShares).toFixed(4)),
          price: s.currentPrice,
          amount: parseFloat(Math.abs(s.deltaValue).toFixed(2)),
          currency: displayCurrency,
        });
      }
    }

    groups.push({
      assetType,
      label: getAssetTypeLabel(assetType),
      color: getAssetColor(assetType),
      currentValue: classTotalValue,
      currentPortfolioPercent: classPortfolioPct,
      targetTotalPercent: targetSum,
      isValid,
      minInflowRequired: minInflowReq,
      totalBuyAmount: groupBuy,
      totalSellAmount: groupSell,
      symbols,
    });
  }

  if (input.mode === 'standard') {
    totalTargetPortfolioValue = totalPortfolioValue;
  } else {
    totalTargetPortfolioValue = totalPortfolioValue + totalInflowContribution;
  }

  const netCashDifference = totalBuyAmount - totalSellAmount;
  const isOverallValid = groups.every((g) => g.isValid);

  return {
    mode: input.mode,
    noSellSubMode: input.noSellSubMode,
    displayCurrency,
    totalCurrentPortfolioValue: totalPortfolioValue,
    totalTargetPortfolioValue,
    cashContribution: input.mode === 'no-sell' ? totalInflowContribution : 0,
    totalBuyAmount,
    totalSellAmount,
    netCashDifference,
    groups,
    orders: allOrders.sort((a, b) => (a.action === b.action ? b.amount - a.amount : a.action === 'BUY' ? -1 : 1)),
    isValid: isOverallValid,
    errorMessage: isOverallValid ? undefined : 'Target percentages in one or more asset classes do not sum to 100%.',
  };
}
