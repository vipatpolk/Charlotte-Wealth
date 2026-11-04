export interface FundDividendDistribution {
  projId: string;
  classAbbrName: string;
  bookCloseDate: string;
  dividendDate: string;
  dividendValue: number;
  lastUpdDate?: string;
}

export interface DividendRecord {
  id: string;
  symbol: string;
  displaySymbol: string;
  date: string;
  recordDate?: string | null;
  assetType: string;
  assetTypeLabel: string;
  shares: number;
  dividendPerShare: number;
  grossAmount: number;
  withholdingTax: number;
  withholdingTaxRate: number;
  netAmount: number;
  currency: string;
  convertedNetAmount: number;
  convertedGrossAmount: number;
  convertedWithholdingTax: number;
}

export interface MonthlyDividendSummary {
  yearMonth: string;
  year: number;
  month: number;
  grossAmount: number;
  netAmount: number;
  withholdingTax: number;
  byAssetType: Record<string, number>;
  recordCount: number;
}

export interface AnnualDividendSummary {
  year: number;
  grossAmount: number;
  netAmount: number;
  withholdingTax: number;
  byAssetType: Record<string, number>;
  recordCount: number;
  monthlyBreakdown: MonthlyDividendSummary[];
}

export interface AssetTypeDividendSummary {
  assetType: string;
  assetTypeLabel: string;
  totalGrossDividends: number;
  totalNetDividends: number;
  totalWithholdingTax: number;
  percentageOfTotal: number;
  symbolCount: number;
  recordCount: number;
  totalCostBasis: number;
  currentValue: number;
  projectedAnnualDividends: number;
  yieldOnCostPercent: number;
  currentYieldPercent: number;
}

export interface SymbolDividendSummary {
  symbol: string;
  displaySymbol: string;
  name: string;
  assetType: string;
  assetTypeLabel: string;
  currency: string;
  totalGrossDividends: number;
  totalNetDividends: number;
  totalWithholdingTax: number;
  convertedNetDividends: number;
  convertedGrossDividends: number;
  convertedWithholdingTax: number;
  dividendCount: number;
  firstDividendDate: string;
  lastDividendDate: string;
  currentShares: number;
  currentCostBasis: number;
  currentValue: number;
  trailingAnnualDPS: number;
  currentYieldPercent: number;
  yieldOnCostPercent: number;
  projectedAnnualIncome: number;
  recentDistributions: FundDividendDistribution[];
}

export interface PortfolioDividendResponse {
  currency: string;
  exchangeRate: number;
  totalGrossDividends: number;
  totalNetDividends: number;
  totalWithholdingTax: number;
  effectiveTaxRate: number;
  projectedAnnualDividends: number;
  portfolioDividendYield: number;
  portfolioYieldOnCost: number;
  annualDividends: AnnualDividendSummary[];
  monthlyDividends: MonthlyDividendSummary[];
  assetTypeSummaries: AssetTypeDividendSummary[];
  symbolSummaries: SymbolDividendSummary[];
  records: DividendRecord[];
  error?: string | null;
}

