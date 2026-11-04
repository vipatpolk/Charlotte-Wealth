export interface Transaction {
  symbol: string;
  date: string;
  quantity: number;
  price: number;
  currency: string;
  assetType: string;
  exchangeFrom?: string;
  exchangeTo?: string;
  txType?: string;
  note?: string;
}

export interface ShareLot {
  symbol: string;
  purchaseDate: string;
  quantity: number;
  costBasis: number;
  totalCost: number;
  assetType: string;
  note?: string;
}

export interface ClosedShareLot {
  symbol: string;
  purchaseDate: string;
  closeDate: string;
  quantity: number;
  costBasis: number;
  sellPrice: number;
  totalCost: number;
  totalProceeds: number;
  realizedPL: number;
  realizedPLPercent: number;
  currency: string;
  assetType: string;
}

export interface SymbolSummary {
  symbol: string;
  displaySymbol?: string;
  name?: string;
  totalShares: number;
  totalCost: number;
  averageCost: number;
  currency: string;
  lots: ShareLot[];
  assetType: string;
  employeeShares?: number;
  employerShares?: number;
}

export interface ClosedSymbolSummary {
  symbol: string;
  displaySymbol?: string;
  name?: string;
  totalShares: number;
  closedShares: number;
  totalCost: number;
  totalProceeds: number;
  realizedPL: number;
  realizedPLPercent: number;
  averageBuyPrice: number;
  averageSellPrice: number;
  currency: string;
  lots: ClosedShareLot[];
  assetType: string;
}

export interface SymbolTransaction {
  id: string;
  symbol: string;
  date: string;
  type: 'BUY' | 'SELL' | 'EXCHANGE' | 'EXCHANGE_IN' | 'EXCHANGE_OUT';
  quantity: number;
  rawQuantity: number;
  price: number;
  totalAmount: number;
  currency: string;
  assetType: string;
  runningShares: number;
  runningTotalCost: number;
  runningAverageCost: number;
  realizedPL?: number;
  realizedPLPercent?: number;
  exchangeFrom?: string;
  exchangeTo?: string;
}

export interface SymbolTransactionSummary {
  symbol: string;
  assetType: string;
  currency: string;
  totalTransactions: number;
  buyCount: number;
  sellCount: number;
  exchangeCount?: number;
  totalBuyShares: number;
  totalSellShares: number;
  totalBuyAmount: number;
  totalSellAmount: number;
  averageBuyPrice: number;
  averageSellPrice: number;
  netShares: number;
  netInvested: number;
  currentStatus: 'OPEN' | 'CLOSED';
  realizedPL: number;
  realizedPLPercent: number;
  firstTradeDate: string;
  lastTradeDate: string;
  transactions: SymbolTransaction[];
}

export interface TargetAllocation {
  [assetType: string]: number;
}

export interface RebalanceRecommendation {
  assetType: string;
  currentValue: number;
  actualPercent: number;
  targetPercent: number;
  rebalanceAmount: number;
  deviationPercent: number;
}

