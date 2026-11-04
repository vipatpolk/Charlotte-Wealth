export interface SimulatedStepModel {
  action: 'BUY' | 'SELL';
  shares: number;
  price: number;
  feePercent?: number;
  label?: string;
}

export interface PositionSnapshotModel {
  symbol?: string;
  shares?: number;
  avgCost?: number;
  marketPrice?: number;
  currency?: string;
  totalCost?: number | null;
}

export interface SimulateOrderRequest {
  initialPosition?: PositionSnapshotModel | null;
  symbol?: string | null;
  steps: SimulatedStepModel[];
  currency?: string;
  taxFeePercent?: number;
}

export interface SimulationStateMetrics {
  totalShares: number;
  averageCost: number;
  totalCost: number;
  marketPrice: number;
  holdingValue: number;
  unrealizedPL: number;
  unrealizedPLPercent: number;
  realizedPL: number;
}

export interface SimulationDeltaMetrics {
  shares: number;
  sharesPercent: number;
  averageCost: number;
  averageCostPercent: number;
  totalCost: number;
  totalCostPercent: number;
  holdingValue: number;
  holdingValuePercent: number;
  unrealizedPL: number;
  unrealizedPLPercent: number;
  breakevenDistanceInitial: number;
  breakevenDistanceSimulated: number;
  realizedPL: number;
}

export interface SimulateOrderResponse {
  initial: SimulationStateMetrics;
  simulated: SimulationStateMetrics;
  delta: SimulationDeltaMetrics;
  steps: SimulatedStepModel[];
  totalCapitalOutlay: number;
  totalProceeds: number;
  totalFees: number;
  currency: string;
}

export interface SolveTargetCostRequest {
  initialPosition?: PositionSnapshotModel | null;
  symbol?: string | null;
  targetAvgCost: number;
  purchasePrice: number;
  feePercent?: number;
  currency?: string;
}

export interface SolveTargetCostResponse {
  isValid: boolean;
  errorMessage: string;
  requiredShares: number;
  requiredCapital: number;
  feeAmount: number;
  totalOutlay: number;
  achievedAvgCost: number;
  newTotalShares: number;
  newTotalCost: number;
  currency: string;
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

export interface TvmScheduleEntryModel {
  period: number;
  year: number;
  startBalance: number;
  contributions: number;
  interestEarned: number;
  endBalance: number;
  totalContributionsToDate: number;
  totalInterestToDate: number;
}

export interface TvmCalculateRequest {
  mode?: TvmSolveMode;
  presentValue?: number;
  payment?: number;
  annualRatePct?: number;
  years?: number;
  compounding?: CompoundingFrequency;
  timing?: PaymentTiming;
  targetFutureValue?: number | null;
  currency?: string;
}

export interface TvmCalculateResponse {
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
  currency: string;
  schedule: TvmScheduleEntryModel[];
  isValid: boolean;
  errorMessage: string;
}

export type RebalanceMode = 'standard' | 'no-sell';
export type NoSellSubMode = 'min-inflow' | 'custom-deposit';
export type RebalanceAction = 'BUY' | 'SELL' | 'BALANCED';

export interface RebalanceTradeOrderModel {
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

export interface SymbolRebalanceItemModel {
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
  action: RebalanceAction;
  deltaValue: number;
  deltaShares: number;
  color: string;
  isAnchorPosition?: boolean;
}

export interface AssetClassRebalanceGroupModel {
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
  symbols: SymbolRebalanceItemModel[];
}

export interface RebalanceCalculateRequest {
  mode?: RebalanceMode;
  noSellSubMode?: NoSellSubMode;
  customCashDeposit?: number;
  targetAllocations?: Record<string, number>;
  currency?: string;
}

export interface RebalanceCalculateResponse {
  mode: RebalanceMode;
  noSellSubMode: NoSellSubMode;
  currency: string;
  totalCurrentPortfolioValue: number;
  totalTargetPortfolioValue: number;
  cashContribution: number;
  totalBuyAmount: number;
  totalSellAmount: number;
  netCashDifference: number;
  groups: AssetClassRebalanceGroupModel[];
  orders: RebalanceTradeOrderModel[];
  isValid: boolean;
  errorMessage: string;
}

