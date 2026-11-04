import {
  ClosedShareLot,
  SymbolTransactionSummary,
  Transaction,
} from './transaction.model.js';

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
  note?: string | null;
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
  employeeShares?: number | null;
  employerShares?: number | null;
  employeeContribution?: number | null;
  employeeEarnings?: number | null;
  employerMatching?: number | null;
  employerEarnings?: number | null;
  policyName?: string | null;
  aimcType?: string | null;
  riskLevel?: string | null;
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
  currency: string;
  exchangeRate: number;
  tabId: string;
  summary: PortfolioSummary;
  openPositions: PortfolioPosition[];
  closedPositions: ClosedPortfolioPosition[];
  transactionSummaries?: SymbolTransactionSummary[] | null;
  rawTransactions?: Transaction[] | null;
  error?: string | null;
}

