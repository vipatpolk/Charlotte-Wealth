import { SymbolTransaction } from '../models/transaction.model';

export interface ExportCsvOptions {
  /** Filter by asset type: 'all' | 'us-stock' | 'thai-stock' | 'crypto' | 'mutual-fund' */
  assetTypeFilter?: string;
  /** Filter by position status: 'all' | 'open' | 'closed' */
  statusScope?: 'all' | 'open' | 'closed';
  /** Set of symbol names that are currently open positions */
  openSymbols?: Set<string>;
  /** Set of symbol names that are currently closed positions */
  closedSymbols?: Set<string>;
  /** Optional custom symbol override when exporting a single symbol */
  activeSymbol?: string;
  /** Custom display symbol resolver function */
  getDisplaySymbolFn?: (symbol: string) => string;
}

/**
 * Formats a date string into ISO YYYY-MM-DD.
 */
export function formatDateYMD(dateStr: string): string {
  if (!dateStr) return '';
  const trimmed = dateStr.trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
    return trimmed;
  }
  const d = new Date(trimmed);
  if (!isNaN(d.getTime())) {
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }
  return trimmed;
}

/**
 * Escapes a CSV cell value following RFC 4180 rules.
 */
export function escapeCsvCell(cell: string | number | undefined | null): string {
  const str = String(cell ?? '');
  if (str.includes(',') || str.includes('"') || str.includes('\n') || str.includes('\r')) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

/**
 * Filter transactions based on asset type and position status scope options.
 */
export function filterTransactionsForExport(
  transactions: SymbolTransaction[],
  options: ExportCsvOptions = {}
): SymbolTransaction[] {
  let list = [...transactions];

  // 1. Filter by Asset Type if specified and not 'all'
  const assetType = options.assetTypeFilter;
  if (assetType && assetType !== 'all') {
    list = list.filter((tx) => (tx.assetType || '').toLowerCase() === assetType.toLowerCase());
  }

  // 2. Filter by Position Status Scope
  const statusScope = options.statusScope || 'all';
  if (statusScope === 'open' && options.openSymbols) {
    list = list.filter((tx) => options.openSymbols!.has(tx.symbol));
  } else if (statusScope === 'closed' && options.closedSymbols) {
    list = list.filter((tx) => options.closedSymbols!.has(tx.symbol));
  }

  return list;
}

/**
 * Generates standard 5-column CSV string: Symbol,Date,Quantity,Price,Currency
 * Prepends UTF-8 BOM (\uFEFF) for native Excel compatibility.
 */
export function generateTransactionsCsv(
  transactions: SymbolTransaction[],
  options: ExportCsvOptions = {}
): string {
  const filtered = filterTransactionsForExport(transactions, options);
  const hasExchanges = filtered.some((tx) => tx.exchangeFrom || tx.exchangeTo);
  const headers = ['Symbol', 'Date', 'Quantity', 'Price', 'Currency'];
  if (hasExchanges) {
    headers.push('Exchange From', 'Exchange To');
  }

  const rows = filtered.map((tx) => {
    const qty =
      tx.rawQuantity !== undefined
        ? tx.rawQuantity
        : (tx.type === 'SELL' || tx.type === 'EXCHANGE_OUT')
        ? -tx.quantity
        : tx.quantity;
    const dateYMD = formatDateYMD(tx.date);
    const row: (string | number)[] = [tx.symbol, dateYMD, qty, tx.price, tx.currency];
    if (hasExchanges) {
      row.push(tx.exchangeFrom || '', tx.exchangeTo || '');
    }
    return row;
  });

  const csvRows = [
    headers.join(','),
    ...rows.map((row) => row.map((cell) => escapeCsvCell(cell)).join(',')),
  ];

  // Prepend UTF-8 BOM (\uFEFF)
  return '\uFEFF' + csvRows.join('\r\n');
}

/**
 * Constructs download filename for exported CSV.
 */
export function generateExportFilename(
  options: ExportCsvOptions = {},
  exportDate: Date = new Date()
): string {
  const dateStr = formatDateYMD(exportDate.toISOString());

  let symName = 'All';
  if (options.activeSymbol) {
    symName = options.getDisplaySymbolFn
      ? options.getDisplaySymbolFn(options.activeSymbol)
      : options.activeSymbol;
  } else if (options.assetTypeFilter && options.assetTypeFilter !== 'all') {
    symName = options.assetTypeFilter.toUpperCase();
  }

  const scopeSuffix =
    options.statusScope && options.statusScope !== 'all'
      ? `_${options.statusScope.toUpperCase()}`
      : '';

  const assetSuffix =
    options.assetTypeFilter && options.assetTypeFilter !== 'all' && options.activeSymbol
      ? `_${options.assetTypeFilter.toUpperCase()}`
      : '';

  return `ShareLot_Transactions_${symName}${assetSuffix}${scopeSuffix}_${dateStr}.csv`;
}

/**
 * Triggers browser file download of CSV content using Blob and ObjectURL.
 */
export function triggerFileDownload(csvContent: string, filename: string): void {
  if (typeof document === 'undefined') return;

  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', filename);

  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
