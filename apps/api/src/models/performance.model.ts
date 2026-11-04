import { PortfolioSummary } from './portfolio.model.js';

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
  status: string; // 'OPEN' | 'CLOSED' | 'BOTH'
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
  currency: string;
  exchangeRate: number;
  summary: PortfolioSummary;
  assetTypePerformance: AssetClassPerformance[];
  topGainers: SymbolPerformance[];
  topLosers: SymbolPerformance[];
  symbolPerformance: SymbolPerformance[];
  error?: string | null;
}

