export type ToolId = 'avg-cost-calculator' | 'tvm-calculator' | 'rebalance-planner';

export interface ToolDefinition {
  id: ToolId;
  title: string;
  shortTitle: string;
  description: string;
  icon: string;
  badge?: string;
  isReady: boolean;
}

export type CompoundingFrequency =
  | 'daily'
  | 'weekly'
  | 'biweekly'
  | 'semimonthly'
  | 'monthly'
  | 'quarterly'
  | 'semiannually'
  | 'annually';

export type TvmSolveMode = 'FV' | 'PMT' | 'PV' | 'N' | 'RATE';
export type PaymentTiming = 'end' | 'beginning';

export interface TvmInputParams {
  mode: TvmSolveMode;
  presentValue: number;
  payment: number;
  annualRatePct: number;
  years: number;
  compounding: CompoundingFrequency;
  timing: PaymentTiming;
  targetFutureValue?: number;
}

export interface TvmScheduleEntry {
  period: number;
  year: number;
  startBalance: number;
  contributions: number;
  interestEarned: number;
  endBalance: number;
  totalContributionsToDate: number;
  totalInterestToDate: number;
}

export interface TvmCalculationResult {
  mode: TvmSolveMode;
  futureValue: number;
  presentValue: number;
  payment: number;
  annualRatePct: number;
  years: number;
  compounding: CompoundingFrequency;
  compoundingPeriodsPerYear: number;
  totalPeriods: number;
  totalPrincipal: number;
  totalContributions: number;
  totalInvested: number;
  totalInterestEarned: number;
  effectiveAnnualRatePct: number;
  multiplier: number;
  schedule: TvmScheduleEntry[];
  isValid: boolean;
  errorMessage?: string;
}

export type SimulationAction = 'BUY' | 'SELL';

export interface SimulatedStep {
  id: string;
  action: SimulationAction;
  shares: number;
  price: number;
  feePercent: number;
  feeAmount: number;
  totalCost: number; // Gross + fee for BUY, Gross - fee for SELL
}

export interface PositionSnapshot {
  symbol: string;
  displaySymbol: string;
  name: string;
  assetType: string;
  assetTypeLabel: string;
  currency: string;
  totalShares: number;
  averageCost: number;
  totalCost: number;
  currentPrice: number;
  holdingValue: number;
  unrealizedPL: number;
  unrealizedPLPercent: number;
  hasPrice: boolean;
}

export interface SimulationStateMetrics {
  totalShares: number;
  averageCost: number;
  totalCost: number;
  currentPrice: number;
  holdingValue: number;
  unrealizedPL: number;
  unrealizedPLPercent: number;
  realizedPL: number;
  totalOutlay: number;
  totalProceeds: number;
  totalFees: number;
}

export interface SimulationDeltaMetrics {
  shares: number;
  sharesPercent: number;
  averageCost: number;
  averageCostPercent: number;
  totalCost: number;
  holdingValue: number;
  unrealizedPL: number;
  unrealizedPLPercent: number;
  breakevenDistanceInitial: number; // % needed to reach avgCost from currentPrice
  breakevenDistanceSimulated: number;
}

export interface AvgCostSimulationResult {
  initial: PositionSnapshot;
  simulated: SimulationStateMetrics;
  delta: SimulationDeltaMetrics;
  steps: SimulatedStep[];
}

export interface TargetAvgCostGoalInput {
  currentShares: number;
  currentAvgCost: number;
  targetAvgCost: number;
  purchasePrice: number;
  feePercent?: number;
}

export interface TargetAvgCostGoalResult {
  isValid: boolean;
  errorMessage?: string;
  requiredShares: number;
  requiredCapital: number;
  feeAmount: number;
  totalOutlay: number;
  newTotalShares: number;
  newTotalCost: number;
  achievedAvgCost: number;
}

export type RebalanceMode = 'standard' | 'no-sell';
export type NoSellSubMode = 'min-inflow' | 'custom-deposit';
export type RebalanceActionType = 'BUY' | 'SELL' | 'BALANCED';

export interface SymbolRebalanceItem {
  symbol: string;
  displaySymbol: string;
  name: string;
  assetType: string;
  assetTypeLabel: string;
  currency: string;
  currentShares: number;
  currentPrice: number;
  currentValue: number;
  currentClassPercent: number;
  currentPortfolioPercent: number;
  targetPercent: number;
  targetValue: number;
  action: RebalanceActionType;
  deltaValue: number;
  deltaShares: number;
  color: string;
  isAnchorPosition?: boolean;
}

export interface AssetClassRebalanceGroup {
  assetType: string;
  label: string;
  color: string;
  currentValue: number;
  currentPortfolioPercent: number;
  targetTotalPercent: number;
  isValid: boolean;
  minInflowRequired: number;
  totalBuyAmount: number;
  totalSellAmount: number;
  symbols: SymbolRebalanceItem[];
}

export interface RebalanceTradeOrder {
  id: string;
  symbol: string;
  displaySymbol: string;
  name: string;
  assetType: string;
  action: 'BUY' | 'SELL';
  shares: number;
  price: number;
  amount: number;
  currency: string;
}

export interface RebalancePlanResult {
  mode: RebalanceMode;
  noSellSubMode: NoSellSubMode;
  displayCurrency: 'USD' | 'THB';
  totalCurrentPortfolioValue: number;
  totalTargetPortfolioValue: number;
  cashContribution: number;
  totalBuyAmount: number;
  totalSellAmount: number;
  netCashDifference: number;
  groups: AssetClassRebalanceGroup[];
  orders: RebalanceTradeOrder[];
  isValid: boolean;
  errorMessage?: string;
}

export interface RebalanceSimulationInput {
  mode: RebalanceMode;
  noSellSubMode: NoSellSubMode;
  customCashDeposit: number;
  targetAllocations: Record<string, number>; // symbol -> targetPercent (0-100 within its class)
  selectedAssetClassFilter?: string; // 'all' or specific assetType
}

