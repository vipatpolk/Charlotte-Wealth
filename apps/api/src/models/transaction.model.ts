export interface Transaction {
  symbol: string;
  date: string;
  quantity: number;
  price: number;
  currency: string;
  assetType: string;
  exchangeFrom?: string | null;
  exchangeTo?: string | null;
  txType?: string | null;
  note?: string | null;
  employeeContribution?: number | null;
  employeeEarnings?: number | null;
  employerMatching?: number | null;
  employerEarnings?: number | null;
}

export interface ShareLot {
  symbol: string;
  purchaseDate: string;
  quantity: number;
  costBasis: number;
  totalCost: number;
  assetType: string;
  note?: string | null;
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
  totalShares: number;
  totalCost: number;
  averageCost: number;
  currency: string;
  lots: ShareLot[];
  assetType: string;
  employeeShares?: number | null;
  employerShares?: number | null;
  employeeContribution?: number | null;
  employeeEarnings?: number | null;
  employerMatching?: number | null;
  employerEarnings?: number | null;
}

export interface ClosedSymbolSummary {
  symbol: string;
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
  type: string; // 'BUY' | 'SELL' | 'EXCHANGE' | 'EXCHANGE_IN' | 'EXCHANGE_OUT' | 'DIVIDEND'
  quantity: number;
  rawQuantity: number;
  price: number;
  totalAmount: number;
  currency: string;
  assetType: string;
  runningShares: number;
  runningTotalCost: number;
  runningAverageCost: number;
  realizedPL?: number | null;
  realizedPLPercent?: number | null;
  exchangeFrom?: string | null;
  exchangeTo?: string | null;
}

export interface SymbolTransactionSummary {
  symbol: string;
  assetType: string;
  currency: string;
  totalTransactions: number;
  buyCount: number;
  sellCount: number;
  exchangeCount: number;
  totalBuyShares: number;
  totalSellShares: number;
  totalBuyAmount: number;
  totalSellAmount: number;
  averageBuyPrice: number;
  averageSellPrice: number;
  netShares: number;
  netInvested: number;
  currentStatus: string; // 'OPEN' | 'CLOSED'
  realizedPL: number;
  realizedPLPercent: number;
  firstTradeDate: string;
  lastTradeDate: string;
  transactions: SymbolTransaction[];
}

export interface SheetResult {
  summaries: SymbolSummary[];
  closedSummaries: ClosedSymbolSummary[];
  transactionSummaries?: SymbolTransactionSummary[] | null;
  rawTransactions?: Transaction[] | null;
  totalCostByCurrency: Record<string, number>;
  totalProceedsByCurrency: Record<string, number>;
  totalRealizedPLByCurrency: Record<string, number>;
  totalSymbols: number;
  totalLots: number;
  error?: string | null;
  isClosed?: boolean | null;
}

export interface PriceData {
  symbol: string;
  name?: string | null;
  price: number;
  currency: string;
}

