import {
  Component,
  input,
  output,
  signal,
  computed,
  effect,
  ChangeDetectionStrategy,
} from '@angular/core';
import {
  DecimalPipe,
  CurrencyPipe,
  DatePipe,
  NgIf,
} from '@angular/common';
import { DateRangePickerComponent, DateRange } from '../date-range-picker/date-range-picker.component';
import { SymbolIconComponent } from '../symbol-icon/symbol-icon.component';
import {
  SymbolTransaction,
  SymbolTransactionSummary,
  SymbolSummary,
} from '../../models/transaction.model';
import { PriceData } from '../../services/price.service';
import {
  getQuantityFormat,
  displaySymbol,
  getPriceFormat,
  getSymbolColor,
  getSymbolName,
  resolveSymbolName,
  convertCurrency,
  getAssetType,
  getAssetTypeLabel,
  getAssetTypeClass,
  generateAssetTypeOptions,
  getUnitLabel,
  getUnitLabelSingular,
} from '../../utils/format.utils';
import {
  generateTransactionsCsv,
  generateExportFilename,
  triggerFileDownload,
  ExportCsvOptions,
} from '../../utils/csv-exporter.utils';

export type TxTypeFilter = 'all' | 'buy' | 'sell' | 'exchange';
export type SortOrder = 'desc' | 'asc';

@Component({
  selector: 'app-transaction-history',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [DecimalPipe, CurrencyPipe, DatePipe, NgIf, DateRangePickerComponent, SymbolIconComponent],
  templateUrl: './transaction-history.component.html',
  styleUrl: './transaction-history.component.css',
})
export class TransactionHistoryComponent {
  /** Input transaction summaries per symbol */
  readonly transactionSummaries = input<SymbolTransactionSummary[]>([]);

  /** Input open position summaries (for current market value / NAV calculation) */
  readonly openSummaries = input<SymbolSummary[]>([]);

  /** Real-time market prices */
  readonly prices = input<Map<string, PriceData>>(new Map());

  /** Selected display currency ('USD' | 'THB') */
  readonly displayCurrency = input<'USD' | 'THB'>('THB');

  /** Exchange rate (USD -> THB) */
  readonly exchangeRate = input<number>(0);

  /** Currently selected symbol (or '' for unified all symbols view) */
  readonly selectedSymbol = input<string>('');

  /** Emitted when user selects a symbol or clicks back */
  readonly symbolSelected = output<string>();
  readonly backToHoldings = output<void>();

  /** Local state */
  readonly currentSymbol = signal<string>('');
  readonly typeFilter = signal<TxTypeFilter>('all');
  readonly assetFilter = signal<string>('all');
  readonly sortOrder = signal<SortOrder>('desc');
  readonly startDate = signal<string>('');
  readonly endDate = signal<string>('');
  readonly symbolSearchQuery = signal<string>('');
  readonly isSymbolDropdownOpen = signal<boolean>(false);
  readonly isMobileAssetFilterOpen = signal<boolean>(false);

  toggleMobileAssetFilter(): void {
    this.isMobileAssetFilterOpen.set(!this.isMobileAssetFilterOpen());
  }

  /** Pagination State */
  readonly pageSizeOptions = [10, 50, 100] as const;
  readonly pageSize = signal<number>(50);
  readonly currentPage = signal<number>(1);

  constructor() {
    effect(() => {
      const sym = this.selectedSymbol();
      this.currentSymbol.set(sym);
      this.typeFilter.set('all');
      this.assetFilter.set('all');
      this.startDate.set('');
      this.endDate.set('');
      this.currentPage.set(1);
    });

    // Guard: clamp currentPage when totalPages decreases
    effect(() => {
      const total = this.totalPages();
      const current = this.currentPage();
      if (current > total && total > 0) {
        this.currentPage.set(total);
      }
    });
  }

  selectSymbol(symbol: string): void {
    this.currentSymbol.set(symbol);
    this.typeFilter.set('all');
    this.assetFilter.set('all');
    this.symbolSelected.emit(symbol);
    this.isSymbolDropdownOpen.set(false);
    this.clearDateRange();
    this.currentPage.set(1);
  }

  clearSymbolSelection(): void {
    this.currentSymbol.set('');
    this.typeFilter.set('all');
    this.assetFilter.set('all');
    this.symbolSelected.emit('');
    this.isSymbolDropdownOpen.set(false);
    this.clearDateRange();
    this.currentPage.set(1);
  }

  clearDateRange(): void {
    this.startDate.set('');
    this.endDate.set('');
    this.currentPage.set(1);
  }

  onDateRangeChange(range: DateRange): void {
    this.startDate.set(range.startDate);
    this.endDate.set(range.endDate);
    this.currentPage.set(1);
  }

  setTypeFilter(type: TxTypeFilter): void {
    this.typeFilter.set(type);
    this.currentPage.set(1);
  }

  setAssetFilter(filter: string): void {
    this.assetFilter.set(filter);
    this.currentPage.set(1);
    this.isMobileAssetFilterOpen.set(false);
  }

  toggleSymbolDropdown(): void {
    this.isSymbolDropdownOpen.set(!this.isSymbolDropdownOpen());
    if (this.isSymbolDropdownOpen()) {
      this.symbolSearchQuery.set('');
    }
  }

  closeSymbolDropdown(): void {
    this.isSymbolDropdownOpen.set(false);
  }

  readonly tradeSummaries = computed<SymbolTransactionSummary[]>(() => {
    return this.transactionSummaries().filter(
      (s) => getAssetType(s.assetType, s.symbol) !== 'provident-fund'
    );
  });

  readonly assetTypeOptions = computed(() => {
    const list = this.tradeSummaries();
    return generateAssetTypeOptions(list);
  });

  /** Matched summaries based on assetFilter */
  readonly filteredSummaries = computed<SymbolTransactionSummary[]>(() => {
    const assetFilter = this.assetFilter();
    const all = this.tradeSummaries();
    if (assetFilter === 'all') return all;
    return all.filter(
      (s) => getAssetType(s.assetType, s.symbol) === assetFilter
    );
  });

  /** All available symbols list for selector, sorted by Open position then by symbol */
  readonly availableSymbols = computed(() => {
    const list = this.filteredSummaries();
    const query = this.symbolSearchQuery().trim().toUpperCase();

    let filtered = [...list];
    if (query) {
      filtered = filtered.filter(
        (s) =>
          s.symbol.toUpperCase().includes(query) ||
          this.getDisplaySymbol(s.symbol).toUpperCase().includes(query) ||
          this.getSymbolName(s.symbol).toUpperCase().includes(query)
      );
    }

    filtered.sort((a, b) => {
      // 1. Open positions first
      const aIsOpen = a.currentStatus === 'OPEN' ? 1 : 0;
      const bIsOpen = b.currentStatus === 'OPEN' ? 1 : 0;
      if (aIsOpen !== bIsOpen) {
        return bIsOpen - aIsOpen;
      }
      // 2. Alphabetical by display symbol
      const symA = this.getDisplaySymbol(a.symbol).toUpperCase();
      const symB = this.getDisplaySymbol(b.symbol).toUpperCase();
      return symA.localeCompare(symB);
    });

    return filtered;
  });

  /** Selected symbol summary data */
  readonly activeSummary = computed<SymbolTransactionSummary | null>(() => {
    const sym = this.currentSymbol();
    if (!sym) return null;
    return this.tradeSummaries().find((s) => s.symbol === sym) || null;
  });

  /** Open summary for the active symbol (if open) */
  readonly activeOpenSummary = computed<SymbolSummary | null>(() => {
    const sym = this.currentSymbol();
    if (!sym) return null;
    return this.openSummaries().find((s) => s.symbol === sym) || null;
  });

  /** Base transactions before type filter (respecting active symbol, asset filter, and date range) */
  readonly baseTransactions = computed<SymbolTransaction[]>(() => {
    const summary = this.activeSummary();
    let txs: SymbolTransaction[] = [];

    if (summary) {
      txs = [...summary.transactions];
    } else {
      txs = this.filteredSummaries().flatMap((s) => s.transactions);
    }

    const start = this.startDate().trim();
    const end = this.endDate().trim();
    if (start) {
      txs = txs.filter((t) => (t.date ? t.date >= start : true));
    }
    if (end) {
      txs = txs.filter((t) => (t.date ? t.date <= end : true));
    }

    return txs;
  });

  /** Filtered transactions for active symbol or unified feed */
  readonly filteredTransactions = computed<SymbolTransaction[]>(() => {
    let txs = [...this.baseTransactions()];

    // Filter by type (BUY / SELL / EXCHANGE)
    const type = this.typeFilter();
    if (type === 'buy') {
      txs = txs.filter((t) => t.type === 'BUY');
    } else if (type === 'sell') {
      txs = txs.filter((t) => t.type === 'SELL');
    } else if (type === 'exchange') {
      txs = txs.filter(
        (t) =>
          t.type === 'EXCHANGE' ||
          t.type === 'EXCHANGE_IN' ||
          t.type === 'EXCHANGE_OUT' ||
          !!t.exchangeFrom ||
          !!t.exchangeTo
      );
    }

    // Sort order
    const order = this.sortOrder();
    txs.sort((a, b) => {
      const cmp = a.date.localeCompare(b.date);
      return order === 'desc' ? -cmp : cmp;
    });

    return txs;
  });

  /** Counts for type filter pills */
  readonly allCount = computed<number>(() => {
    return this.baseTransactions().length;
  });

  readonly buyCount = computed<number>(() => {
    return this.baseTransactions().filter((t) => t.type === 'BUY').length;
  });

  readonly sellCount = computed<number>(() => {
    return this.baseTransactions().filter((t) => t.type === 'SELL').length;
  });

  readonly exchangeCount = computed<number>(() => {
    return this.baseTransactions().filter(
      (t) =>
        t.type === 'EXCHANGE' ||
        t.type === 'EXCHANGE_IN' ||
        t.type === 'EXCHANGE_OUT' ||
        !!t.exchangeFrom ||
        !!t.exchangeTo
    ).length;
  });

  readonly totalTxCount = computed<number>(() => {
    const summary = this.activeSummary();
    if (summary) return summary.totalTransactions;
    return this.filteredSummaries().reduce(
      (sum, s) => sum + s.totalTransactions,
      0
    );
  });

  /** Total realized P/L across all filtered symbols in display currency */
  readonly allSymbolsRealizedPL = computed<number>(() => {
    return this.filteredSummaries().reduce((sum, s) => {
      return sum + this.cx(s.realizedPL, s.currency);
    }, 0);
  });

  /** Total volume traded across all filtered symbols in display currency */
  readonly allSymbolsTradedVolume = computed<number>(() => {
    return this.filteredSummaries().reduce((sum, s) => {
      return sum + this.cx(s.totalBuyAmount + s.totalSellAmount, s.currency);
    }, 0);
  });

  /** Total open positions count in filtered feed */
  readonly allSymbolsOpenCount = computed<number>(() => {
    return this.filteredSummaries().filter((s) => s.currentStatus === 'OPEN').length;
  });

  /** Total closed positions count in filtered feed */
  readonly allSymbolsClosedCount = computed<number>(() => {
    return this.filteredSummaries().filter((s) => s.currentStatus === 'CLOSED').length;
  });

  /** Real-time market price for active symbol */
  readonly activeMarketPrice = computed<number>(() => {
    const sym = this.currentSymbol();
    if (!sym) return 0;
    return this.prices().get(sym)?.price ?? 0;
  });

  /** Holding value for active symbol in display currency */
  readonly activeHoldingValueConverted = computed<number>(() => {
    const summary = this.activeSummary();
    if (!summary || summary.netShares <= 0) return 0;
    const price = this.activeMarketPrice();
    if (price <= 0) return 0;
    const pd = this.prices().get(summary.symbol);
    const curr = pd?.currency || summary.currency;
    const rawVal = summary.netShares * price;
    return this.cx(rawVal, curr);
  });

  /** Unrealized P/L for active symbol */
  readonly activeUnrealizedPL = computed<number>(() => {
    const summary = this.activeSummary();
    if (!summary || summary.netShares <= 0) return 0;
    const mktVal = this.activeHoldingValueConverted();
    if (mktVal <= 0) return 0;
    const costBasis = this.cx(summary.netInvested, summary.currency);
    return mktVal - costBasis;
  });

  readonly activeUnrealizedPLPercent = computed<number>(() => {
    const summary = this.activeSummary();
    if (!summary || summary.netInvested <= 0) return 0;
    const pl = this.activeUnrealizedPL();
    const cost = this.cx(summary.netInvested, summary.currency);
    if (cost === 0) return 0;
    return (pl / cost) * 100;
  });

  /** Currency helpers */
  convertCurrency(
    amount: number,
    fromCurrency: string,
    toCurrency: string
  ): number {
    return convertCurrency(amount, fromCurrency, toCurrency, this.exchangeRate());
  }

  cx(amount: number, fromCurrency: string): number {
    return this.convertCurrency(amount, fromCurrency, this.displayCurrency());
  }

  dc(originalCurrency?: string): string {
    if (this.exchangeRate() <= 0 && originalCurrency) {
      return originalCurrency === 'USDT' ? 'USD' : originalCurrency;
    }
    return this.displayCurrency();
  }

  /** Utility formatters */
  getDisplaySymbol(symbol: string): string {
    const priceData = this.prices().get(symbol);
    if (priceData?.symbol && priceData.symbol !== symbol) {
      return priceData.symbol;
    }
    return displaySymbol(symbol);
  }

  getSymbolName(symbol: string): string {
    return resolveSymbolName(symbol, this.prices());
  }

  getSymbolColor(symbol: string): string {
    return getSymbolColor(symbol);
  }

  getQuantityFormat(symbol: string, assetType?: string): string {
    return getQuantityFormat(symbol, assetType);
  }

  getPriceFormat(symbol: string, assetType?: string): string {
    return getPriceFormat(symbol, assetType);
  }

  getAssetTypeLabel(assetType?: string, symbol?: string): string {
    return getAssetTypeLabel(assetType, symbol);
  }

  getAssetTypeClass(assetType?: string, symbol?: string): string {
    return getAssetTypeClass(assetType, symbol);
  }

  getUnitLabel(symbol?: string, assetType?: string): string {
    return getUnitLabel(symbol, assetType);
  }

  getUnitLabelSingular(symbol?: string, assetType?: string): string {
    return getUnitLabelSingular(symbol, assetType);
  }

  /** Pagination Computeds */
  readonly totalPages = computed<number>(() => {
    const total = this.filteredTransactions().length;
    const size = this.pageSize();
    return Math.max(1, Math.ceil(total / size));
  });

  /** Paginated transactions subset for current page */
  readonly paginatedTransactions = computed<SymbolTransaction[]>(() => {
    const txs = this.filteredTransactions();
    const page = this.currentPage();
    const size = this.pageSize();
    const startIndex = (page - 1) * size;
    return txs.slice(startIndex, startIndex + size);
  });

  readonly startIndex = computed<number>(() => {
    if (this.filteredTransactions().length === 0) return 0;
    return (this.currentPage() - 1) * this.pageSize() + 1;
  });

  readonly endIndex = computed<number>(() => {
    return Math.min(this.currentPage() * this.pageSize(), this.filteredTransactions().length);
  });

  /** Page number items for rendering (with ellipsis for large page counts) */
  readonly displayedPageNumbers = computed<(number | '...')[]>(() => {
    const current = this.currentPage();
    const total = this.totalPages();
    if (total <= 7) {
      return Array.from({ length: total }, (_, i) => i + 1);
    }

    const pages: (number | '...')[] = [];
    if (current <= 4) {
      for (let i = 1; i <= 5; i++) pages.push(i);
      pages.push('...');
      pages.push(total);
    } else if (current >= total - 3) {
      pages.push(1);
      pages.push('...');
      for (let i = total - 4; i <= total; i++) pages.push(i);
    } else {
      pages.push(1);
      pages.push('...');
      pages.push(current - 1);
      pages.push(current);
      pages.push(current + 1);
      pages.push('...');
      pages.push(total);
    }
    return pages;
  });

  /** Pagination Methods */
  setPage(page: number): void {
    if (page >= 1 && page <= this.totalPages()) {
      this.currentPage.set(page);
      this.scrollToTableTop();
    }
  }

  setPageSize(size: number | string): void {
    const numSize = Number(size);
    if ([10, 50, 100].includes(numSize)) {
      this.pageSize.set(numSize);
      this.currentPage.set(1);
      this.scrollToTableTop();
    }
  }

  onPageSizeChange(event: Event): void {
    const value = (event.target as HTMLSelectElement).value;
    this.setPageSize(value);
  }

  nextPage(): void {
    if (this.currentPage() < this.totalPages()) {
      this.setPage(this.currentPage() + 1);
    }
  }

  prevPage(): void {
    if (this.currentPage() > 1) {
      this.setPage(this.currentPage() - 1);
    }
  }

  firstPage(): void {
    this.setPage(1);
  }

  lastPage(): void {
    this.setPage(this.totalPages());
  }

  private scrollToTableTop(): void {
    if (typeof document !== 'undefined') {
      const el = document.getElementById('tx-table-section');
      if (el && typeof el.scrollIntoView === 'function') {
        el.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    }
  }

  toggleSort(): void {
    this.sortOrder.set(this.sortOrder() === 'desc' ? 'asc' : 'desc');
    this.currentPage.set(1);
  }

  readonly isExportDropdownOpen = signal<boolean>(false);
  readonly exportAssetTypeFilter = signal<string>('all');
  readonly exportStatusScope = signal<'all' | 'open' | 'closed'>('all');

  toggleExportDropdown(): void {
    this.isExportDropdownOpen.set(!this.isExportDropdownOpen());
  }

  closeExportDropdown(): void {
    this.isExportDropdownOpen.set(false);
  }

  setExportAssetType(assetType: string): void {
    this.exportAssetTypeFilter.set(assetType);
  }

  setExportStatusScope(scope: 'all' | 'open' | 'closed'): void {
    this.exportStatusScope.set(scope);
  }

  exportCsv(
    modeOrAssetType: string = 'all',
    statusScope?: 'all' | 'open' | 'closed'
  ): void {
    this.isExportDropdownOpen.set(false);

    let assetTypeFilter = this.exportAssetTypeFilter();
    let scope: 'all' | 'open' | 'closed' = statusScope || this.exportStatusScope();

    if (statusScope === undefined) {
      if (modeOrAssetType === 'open' || modeOrAssetType === 'closed') {
        scope = modeOrAssetType;
        assetTypeFilter = 'all';
      } else if (modeOrAssetType !== 'all') {
        assetTypeFilter = modeOrAssetType;
      }
    } else {
      assetTypeFilter = modeOrAssetType;
    }

    const txs = this.filteredTransactions();
    if (!txs || txs.length === 0) return;

    const openSymbols = new Set(
      this.tradeSummaries()
        .filter((s) => s.currentStatus === 'OPEN')
        .map((s) => s.symbol)
    );

    const closedSymbols = new Set(
      this.tradeSummaries()
        .filter((s) => s.currentStatus === 'CLOSED')
        .map((s) => s.symbol)
    );

    const options: ExportCsvOptions = {
      assetTypeFilter,
      statusScope: scope,
      openSymbols,
      closedSymbols,
      activeSymbol: this.currentSymbol(),
      getDisplaySymbolFn: (sym) => this.getDisplaySymbol(sym),
    };

    const csvContent = generateTransactionsCsv(txs, options);
    const filename = generateExportFilename(options);

    triggerFileDownload(csvContent, filename);
  }
}
