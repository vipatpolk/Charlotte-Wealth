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

export interface TargetAllocationRequest {
  targetAllocation?: Record<string, number>;
}

export interface PortfolioAllocationResponse {
  currency: string;
  exchangeRate: number;
  totalPortfolioValue: number;
  recommendations: RebalanceRecommendation[];
  currencyExposure: CurrencyExposure;
  holdingsConcentration: HoldingConcentration[];
  error?: string | null;
}

