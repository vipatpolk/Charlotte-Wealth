import { ClosedShareLot, SymbolTransactionSummary, Transaction } from './transaction.model';

export interface PortfolioHoldingLot {
  purchaseDate: string;
  quantity: number;
  costBasis: number;
  totalCost: number;
  currentPrice: number;
  holdingValue: number;
  unrealizedPL: number;
  unrealizedPLPercent: number;
  assetType: string;
  currency: string;
  originalCostBasis: number;
  originalCurrency: string;
  note?: string;
}

export interface PortfolioPosition {
  symbol: string;
  displaySymbol: string;
  name: string;
  assetType: string;
  assetTypeLabel: string;
  totalShares: number;
  totalCost: number;
  averageCost: number;
  currentPrice: number;
  holdingValue: number;
  unrealizedPL: number;
  unrealizedPLPercent: number;
  currency: string;
  originalCurrency: string;
  hasPrice: boolean;
  lots: PortfolioHoldingLot[];
  employeeShares?: number;
  employerShares?: number;
  employeeContribution?: number;
  employeeEarnings?: number;
  employerMatching?: number;
  employerEarnings?: number;
  policyName?: string;
  aimcType?: string;
  riskLevel?: string;
}

export interface ClosedPortfolioPosition {
  symbol: string;
  displaySymbol: string;
  name: string;
  assetType: string;
  assetTypeLabel: string;
  totalShares: number;
  closedShares: number;
  totalCost: number;
  totalProceeds: number;
  realizedPL: number;
  realizedPLPercent: number;
  averageBuyPrice: number;
  averageSellPrice: number;
  currency: string;
  originalCurrency: string;
  lots: ClosedShareLot[];
}

export interface PortfolioSummary {
  totalInvested: number;
  totalValue: number;
  openInvested: number;
  closedInvested: number;
  totalUnrealizedPL: number;
  totalUnrealizedPLPercent: number;
  totalRealizedPL: number;
  totalRealizedPLPercent: number;
  totalReturn: number;
  totalReturnPercent: number;
}

export interface PortfolioHoldingsResponse {
  currency: 'USD' | 'THB';
  exchangeRate: number;
  tabId: string;
  summary: PortfolioSummary;
  openPositions: PortfolioPosition[];
  closedPositions: ClosedPortfolioPosition[];
  transactionSummaries?: SymbolTransactionSummary[];
  rawTransactions?: Transaction[];
  error: string | null;
}

export interface AssetClassPerformance {
  assetType: string;
  label: string;
  investedCost: number;
  currentValue: number;
  unrealizedPL: number;
  realizedPL: number;
  totalReturn: number;
  totalReturnPercent: number;
  openSymbolCount: number;
  closedSymbolCount: number;
}

export interface SymbolPerformance {
  symbol: string;
  displaySymbol: string;
  name: string;
  assetType: string;
  assetTypeLabel: string;
  status: 'OPEN' | 'CLOSED' | 'BOTH';
  investedCost: number;
  currentValue: number;
  unrealizedPL: number;
  realizedPL: number;
  totalReturnAmount: number;
  totalReturn: number;
  totalReturnPercent: number;
  hasPrice: boolean;
}

export interface PortfolioPerformanceResponse {
  timeframe: string;
  startDate: string;
  endDate: string;
  currency: 'USD' | 'THB';
  exchangeRate: number;
  summary: PortfolioSummary;
  assetTypePerformance: AssetClassPerformance[];
  topGainers: SymbolPerformance[];
  topLosers: SymbolPerformance[];
  symbolPerformance: SymbolPerformance[];
  error: string | null;
}

export interface RebalanceRecommendation {
  assetType: string;
  label: string;
  currentValue: number;
  actualPercent: number;
  targetPercent: number;
  rebalanceAmount: number;
  deviationPercent: number;
  action: 'BUY' | 'SELL' | 'BALANCED';
}

export interface CurrencyExposure {
  usd: number;
  thb: number;
  usdPercent: number;
  thbPercent: number;
}

export interface HoldingConcentration {
  symbol: string;
  displaySymbol: string;
  name: string;
  assetType: string;
  value: number;
  portfolioPercent: number;
  classPercent: number;
}

export interface TargetAllocation {
  [assetType: string]: number;
}

export interface PortfolioAllocationResponse {
  currency: 'USD' | 'THB';
  exchangeRate: number;
  totalPortfolioValue: number;
  recommendations: RebalanceRecommendation[];
  currencyExposure: CurrencyExposure;
  holdingsConcentration: HoldingConcentration[];
  error: string | null;
}
