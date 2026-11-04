import { DashboardComponent } from './components/dashboard/dashboard.component';
import { DividendComponent } from './components/dividend/dividend.component';
import { ToolsComponent } from './components/tools/tools.component';
import { AnalyticsComponent } from './components/analytics/analytics.component';
import { ToolId } from './models/tools.model';
import {
  Component,
  inject,
  signal,
  computed,
  ViewEncapsulation,
  effect,
  untracked,
  ChangeDetectionStrategy,
} from '@angular/core';
import { DecimalPipe, CurrencyPipe, NgTemplateOutlet } from '@angular/common';
import { SheetResult } from './services/share-lot.service';
import { PriceService, PriceData } from './services/price.service';
import { PortfolioService } from './services/portfolio.service';
import { DividendService } from './services/dividend.service';
import {
  PortfolioHoldingsResponse,
  PortfolioPosition,
  ClosedPortfolioPosition,
  PortfolioHoldingLot,
} from './models/portfolio.model';
import { PortfolioDividendResponse } from './models/dividend.model';
import {
  SymbolSummary,
  ClosedSymbolSummary,
  ShareLot,
  ClosedShareLot,
} from './models/transaction.model';
import { AssetTab, ASSET_TABS, AppView, AnalyticsSubTab } from './config/asset.constants';
import { TransactionHistoryComponent } from './components/transaction-history/transaction-history.component';
import { HeaderComponent } from './components/header/header.component';
import { TabBarComponent } from './components/tab-bar/tab-bar.component';
import { SearchBarComponent } from './components/search-bar/search-bar.component';
import { FiltersComponent } from './components/filters/filters.component';
import { SummaryCardComponent } from './components/summary-card/summary-card.component';
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
} from './utils/format.utils';

export interface SymbolAutocompleteItem {
  symbol: string;
  displaySymbol: string;
  name: string;
  color: string;
  assetType: string;
  assetTypeLabel: string;
  isClosed: boolean;
  totalShares: number;
  totalCost: number;
  currency: string;
  holdingValue?: number;
  unrealizedPL?: number;
  unrealizedPLPercent?: number;
  realizedPL?: number;
  realizedPLPercent?: number;
  hasPrice?: boolean;
}

@Component({
  selector: 'app-root',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    DecimalPipe,
    CurrencyPipe,
    NgTemplateOutlet,
    TransactionHistoryComponent,
    HeaderComponent,
    TabBarComponent,
    SearchBarComponent,
    FiltersComponent,
    SummaryCardComponent,
    DividendComponent,
    ToolsComponent,
    DashboardComponent,
    AnalyticsComponent,
  ],
  templateUrl: './app.html',
  styleUrl: './app.css',
  encapsulation: ViewEncapsulation.None,
})
export class App {
  readonly getSymbolColorFn = (symbol: string) => this.getSymbolColor(symbol);
  readonly getDisplaySymbolFn = (symbol: string) => this.getDisplaySymbol(symbol);
  readonly getSymbolNameFn = (symbol: string, rawName?: string) =>
    this.getSymbolName(symbol, rawName);
  readonly getAssetTypeClassFn = (assetType?: string, symbol?: string) =>
    this.getAssetTypeClass(assetType, symbol);
  readonly getAssetTypeLabelFn = (assetType?: string, symbol?: string) =>
    this.getAssetTypeLabel(assetType, symbol);
  readonly getQuantityFormatFn = (symbol: string, assetType?: string) =>
    this.getQuantityFormat(symbol, assetType);
  readonly getPriceFormatFn = (symbol: string, assetType?: string) =>
    this.getPriceFormat(symbol, assetType);
  readonly cxFn = (amount: number, fromCurrency: string) => this.cx(amount, fromCurrency);
  readonly dcFn = (originalCurrency?: string) => this.dc(originalCurrency);
  readonly getCurrentPriceConvertedFn = (summary: PortfolioPosition | SymbolSummary) =>
    this.getCurrentPriceConverted(summary);
  readonly getHoldingValueFn = (summary: PortfolioPosition | SymbolSummary) =>
    this.getHoldingValue(summary);
  readonly getUnrealizedPLFn = (summary: PortfolioPosition | SymbolSummary) =>
    this.getUnrealizedPL(summary);
  readonly getUnrealizedPLPercentFn = (summary: PortfolioPosition | SymbolSummary) =>
    this.getUnrealizedPLPercent(summary);
  readonly getLotHoldingValueFn = (
    lot: PortfolioHoldingLot | ShareLot,
    summary: PortfolioPosition | SymbolSummary,
  ) => this.getLotHoldingValue(lot, summary);
  readonly getLotUnrealizedPLFn = (
    lot: PortfolioHoldingLot | ShareLot,
    summary: PortfolioPosition | SymbolSummary,
  ) => this.getLotUnrealizedPL(lot, summary);
  private readonly portfolioService = inject(PortfolioService);
  private readonly priceService = inject(PriceService);
  private readonly dividendService = inject(DividendService);

  readonly tabs = ASSET_TABS;
  readonly activeTab = signal<AssetTab>(ASSET_TABS[0]);

  /** View Mode: Dashboard vs Holdings / Positions vs Transactions History vs Allocation vs Dividends vs Tools */
  readonly currentView = signal<AppView>('dashboard');
  readonly analyticsSubTab = signal<AnalyticsSubTab>('overview');
  readonly selectedToolId = signal<ToolId>('avg-cost-calculator');
  readonly selectedHistorySymbol = signal<string>('');

  readonly loading = signal(true);
  readonly error = signal<string | null>(null);
  readonly portfolioData = signal<PortfolioHoldingsResponse | null>(null);
  readonly dividendData = signal<PortfolioDividendResponse | null>(null);
  readonly dividendLoading = signal<boolean>(false);
  readonly prices = signal<Map<string, PriceData>>(new Map());
  readonly pricesLoading = signal(false);

  /** Per-tab cache to avoid redundant network requests on tab switch */
  private readonly tabCache = new Map<
    string,
    {
      portfolioData: PortfolioHoldingsResponse;
      prices: Map<string, PriceData>;
      timestamp: number;
    }
  >();

  /** Currency conversion */
  readonly displayCurrency = signal<'USD' | 'THB'>('THB');
  readonly exchangeRate = signal<number>(0);

  /** Theme (dark/light) */
  readonly theme = signal<'dark' | 'light'>('dark');

  /** Privacy Mode (Hide sensitive amounts & shares) */
  readonly privacyMode = signal<boolean>(false);

  readonly expandedSymbols = signal<Set<string>>(new Set());
  readonly searchQuery = signal('');
  readonly isSearchFocused = signal<boolean>(false);
  readonly isSearchDropdownOpen = signal<boolean>(false);
  readonly searchActiveIndex = signal<number>(-1);

  readonly sortField = signal<string>('totalCost');
  readonly sortDirection = signal<'asc' | 'desc'>('desc');
  readonly selectedClosedAssetType = signal<string>('all');

  readonly isTabDropdownOpen = signal<boolean>(false);
  readonly isMobileSortDropdownOpen = signal<boolean>(false);
  readonly isMobileFilterDropdownOpen = signal<boolean>(false);

  toggleTabDropdown(): void {
    this.isTabDropdownOpen.set(!this.isTabDropdownOpen());
  }

  toggleMobileSortDropdown(): void {
    this.isMobileSortDropdownOpen.set(!this.isMobileSortDropdownOpen());
  }

  toggleMobileFilterDropdown(): void {
    this.isMobileFilterDropdownOpen.set(!this.isMobileFilterDropdownOpen());
  }

  readonly isClosedTab = computed<boolean>(() => this.activeTab().id === 'closed-position');
  readonly isAllTab = computed<boolean>(() => this.activeTab().id === 'all');

  readonly tabCounts = computed<Record<string, number>>(() => {
    const data = this.portfolioData();
    if (!data) return {};
    const open = data.openPositions || [];
    const closed = data.closedPositions || [];
    const counts: Record<string, number> = {
      all: open.length,
      'closed-position': closed.length,
    };
    for (const pos of open) {
      const type = pos.assetType || 'us-stock';
      counts[type] = (counts[type] || 0) + 1;
    }
    return counts;
  });

  openTransactionHistory(symbol: string = ''): void {
    this.selectedHistorySymbol.set(symbol);
    this.currentView.set('transactions');
    if (this.activeTab().id !== 'all') {
      this.selectTab(ASSET_TABS[0]);
    }
    if (typeof window !== 'undefined') {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }

  openDashboardView(): void {
    this.setView('dashboard');
  }

  openHoldingsView(): void {
    this.setView('holdings');
  }

  navigateToTool(toolId: ToolId): void {
    this.selectedToolId.set(toolId);
    this.setView('tools');
  }

  setView(view: AppView, subTab?: AnalyticsSubTab): void {
    if (view === 'allocation') {
      this.currentView.set('analytics');
      this.analyticsSubTab.set('allocation');
    } else if (view === 'performance') {
      this.currentView.set('analytics');
      this.analyticsSubTab.set('performance');
    } else if (view === 'analytics') {
      this.currentView.set('analytics');
      if (subTab) {
        this.analyticsSubTab.set(subTab);
      }
    } else {
      this.currentView.set(view);
    }

    if (view !== 'holdings') {
      if (view === 'transactions') {
        this.selectedHistorySymbol.set('');
      }
      this.selectTab(ASSET_TABS[0]);
    }
    if (view === 'dividends' || view === 'dashboard') {
      this.loadDividendData();
    }
    if (typeof window !== 'undefined') {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }

  /** Adapter for result signal to maintain backward compatibility with components */
  readonly result = computed<SheetResult | null>(() => {
    const data = this.portfolioData();
    if (!data) return null;

    const summaries: SymbolSummary[] = data.openPositions.map((p) => ({
      symbol: p.symbol,
      displaySymbol: p.displaySymbol,
      name: p.name,
      totalShares: p.totalShares,
      totalCost: p.totalCost,
      averageCost: p.averageCost,
      currency: p.currency,
      assetType: p.assetType,
      lots: p.lots.map((l) => ({
        symbol: p.symbol,
        purchaseDate: l.purchaseDate,
        quantity: l.quantity,
        costBasis: l.costBasis,
        totalCost: l.totalCost,
        assetType: l.assetType,
      })),
    }));

    const closedSummaries: ClosedSymbolSummary[] = data.closedPositions.map((c) => ({
      symbol: c.symbol,
      displaySymbol: c.displaySymbol,
      name: c.name,
      totalShares: 0,
      closedShares: c.closedShares,
      totalCost: c.totalCost,
      totalProceeds: c.totalProceeds,
      realizedPL: c.realizedPL,
      realizedPLPercent: c.realizedPLPercent,
      averageBuyPrice: c.averageBuyPrice,
      averageSellPrice: c.averageSellPrice,
      currency: c.currency,
      assetType: c.assetType,
      lots: c.lots,
    }));

    return {
      summaries,
      closedSummaries,
      transactionSummaries: data.transactionSummaries,
      rawTransactions: data.rawTransactions,
      totalCostByCurrency: { [data.currency]: data.summary.totalInvested },
      totalProceedsByCurrency: { [data.currency]: data.summary.totalValue },
      totalRealizedPLByCurrency: { [data.currency]: data.summary.totalRealizedPL },
      totalSymbols: summaries.length + closedSummaries.length,
      totalLots: summaries.reduce((acc, s) => acc + s.lots.length, 0),
      error: data.error,
      isClosed: this.isClosedTab(),
    };
  });

  readonly closedAssetTypeOptions = computed(() => {
    const data = this.portfolioData();
    const list = data?.closedPositions || [];
    return generateAssetTypeOptions(list);
  });

  readonly openSortOptions = [
    { field: 'symbol', label: 'Symbol' },
    { field: 'totalCost', label: 'Total Cost' },
    { field: 'avgCost', label: 'Avg Cost' },
    { field: 'holdingValue', label: 'Holding Value' },
    { field: 'pl', label: 'P/L %' },
  ];

  readonly closedSortOptions = [
    { field: 'symbol', label: 'Symbol' },
    { field: 'pl', label: 'Realized P/L %' },
    { field: 'realizedPL', label: 'Realized P/L $' },
    { field: 'totalCost', label: 'Total Cost' },
    { field: 'totalProceeds', label: 'Total Proceeds' },
    { field: 'closedShares', label: 'Closed Shares' },
  ];

  readonly sortOptions = computed(() => {
    return this.isClosedTab() ? this.closedSortOptions : this.openSortOptions;
  });

  readonly totalCostConverted = computed<number>(() => {
    const data = this.portfolioData();
    if (!data) return 0;
    const target = this.displayCurrency();
    const serverCurr = data.currency;
    const rate = this.exchangeRate();

    let cost = 0;
    if (this.isClosedTab()) {
      cost =
        data.summary.closedInvested ??
        data.closedPositions.reduce((acc, c) => acc + c.totalCost, 0);
    } else {
      cost =
        data.summary.openInvested ?? data.openPositions.reduce((acc, p) => acc + p.totalCost, 0);
    }
    return convertCurrency(cost, serverCurr, target, rate);
  });

  readonly totalProceedsConverted = computed<number>(() => {
    const data = this.portfolioData();
    if (!data) return 0;
    const proceeds = data.closedPositions.reduce((acc, c) => acc + c.totalProceeds, 0);
    return convertCurrency(proceeds, data.currency, this.displayCurrency(), this.exchangeRate());
  });

  readonly totalRealizedPLConverted = computed<number>(() => {
    const data = this.portfolioData();
    if (!data) return 0;
    const pl = data.summary.totalRealizedPL || 0;
    return convertCurrency(pl, data.currency, this.displayCurrency(), this.exchangeRate());
  });

  readonly totalRealizedPLPercent = computed<number>(() => {
    return this.portfolioData()?.summary.totalRealizedPLPercent || 0;
  });

  readonly totalHoldingConverted = computed<number>(() => {
    if (this.isClosedTab()) return 0;
    const data = this.portfolioData();
    if (!data) return 0;
    const val = data.summary.totalValue || 0;
    return convertCurrency(val, data.currency, this.displayCurrency(), this.exchangeRate());
  });

  readonly totalPL = computed<number>(() => {
    if (this.isClosedTab()) {
      return this.totalRealizedPLConverted();
    }
    const data = this.portfolioData();
    if (!data) return 0;
    const pl = data.summary.totalUnrealizedPL || 0;
    return convertCurrency(pl, data.currency, this.displayCurrency(), this.exchangeRate());
  });

  readonly totalPLPercent = computed<number>(() => {
    if (this.isClosedTab()) {
      return this.totalRealizedPLPercent();
    }
    return this.portfolioData()?.summary.totalUnrealizedPLPercent || 0;
  });

  readonly hasRate = computed<boolean>(() => this.exchangeRate() > 0);

  private prevCurrency: 'USD' | 'THB' | null = null;

  constructor() {
    this.initTheme();
    this.initPrivacyMode();

    // Initial load of active tab & dividend analytics
    this.loadTab(this.activeTab(), this.displayCurrency());
    this.loadDividendData(this.displayCurrency());
    this.prevCurrency = this.displayCurrency();

    // Seamless, non-blocking background synchronization on currency toggle
    effect(() => {
      const curr = this.displayCurrency();
      if (this.prevCurrency !== null && this.prevCurrency !== curr) {
        this.prevCurrency = curr;
        untracked(() => {
          this.syncCurrencyChange(curr);
        });
      }
    });
  }

  private syncCurrencyChange(currency: 'USD' | 'THB'): void {
    untracked(() => {
      if (this.portfolioData()) {
        this.portfolioService.fetchHoldings(this.activeTab().id, currency).subscribe({
          next: (res) => {
            if (!res.error) {
              this.portfolioData.set(res);
              if (res.exchangeRate > 0) {
                this.exchangeRate.set(res.exchangeRate);
              }
            }
          },
        });
      }

      if (this.dividendData()) {
        this.dividendService.getDividendAnalytics(currency, 'all').subscribe({
          next: (res) => {
            if (!res.error) {
              this.dividendData.set(res);
            }
          },
        });
      }
    });
  }

  private initTheme(): void {
    if (typeof window !== 'undefined') {
      try {
        const savedTheme = localStorage.getItem('sharelot_theme') as 'dark' | 'light' | null;
        if (savedTheme === 'light' || savedTheme === 'dark') {
          this.setTheme(savedTheme);
        } else {
          this.setTheme('dark');
        }
      } catch {
        this.setTheme('dark');
      }
    }
  }

  toggleTheme(): void {
    const nextTheme = this.theme() === 'dark' ? 'light' : 'dark';
    this.setTheme(nextTheme);
  }

  setTheme(theme: 'dark' | 'light'): void {
    this.theme.set(theme);
    if (typeof document !== 'undefined') {
      document.documentElement.setAttribute('data-theme', theme);
    }
    if (typeof localStorage !== 'undefined') {
      try {
        localStorage.setItem('sharelot_theme', theme);
      } catch {
        // Ignore localStorage errors
      }
    }
  }

  private initPrivacyMode(): void {
    if (typeof window !== 'undefined') {
      try {
        const savedPrivacy = localStorage.getItem('sharelot_privacy_mode');
        if (savedPrivacy === 'true') {
          this.setPrivacyMode(true);
        } else {
          this.setPrivacyMode(false);
        }
      } catch {
        this.setPrivacyMode(false);
      }
    }
  }

  togglePrivacyMode(): void {
    this.setPrivacyMode(!this.privacyMode());
  }

  setPrivacyMode(privacy: boolean): void {
    this.privacyMode.set(privacy);
    if (typeof document !== 'undefined') {
      document.documentElement.setAttribute('data-privacy', privacy ? 'true' : 'false');
    }
    if (typeof localStorage !== 'undefined') {
      try {
        localStorage.setItem('sharelot_privacy_mode', privacy ? 'true' : 'false');
      } catch {
        // Ignore localStorage errors
      }
    }
  }

  convertCurrency(amount: number, fromCurrency: string, toCurrency: string): number {
    return convertCurrency(amount, fromCurrency, toCurrency, this.exchangeRate());
  }

  cx(amount: number, fromCurrency: string): number {
    return this.convertCurrency(amount, fromCurrency, this.displayCurrency());
  }

  dc(originalCurrency?: string): string {
    return this.displayCurrency();
  }

  readonly filteredSummaries = computed<PortfolioPosition[]>(() => {
    const data = this.portfolioData();
    if (!data) return [];
    const query = this.searchQuery().trim().toUpperCase();
    let list = query
      ? data.openPositions.filter(
          (s) =>
            s.symbol.toUpperCase().includes(query) ||
            s.displaySymbol.toUpperCase().includes(query) ||
            s.name.toUpperCase().includes(query),
        )
      : [...data.openPositions];

    const field = this.sortField();
    const dir = this.sortDirection() === 'asc' ? 1 : -1;

    list.sort((a, b) => {
      let va: number | string = 0;
      let vb: number | string = 0;

      switch (field) {
        case 'symbol':
          va = a.symbol;
          vb = b.symbol;
          return dir * (va < vb ? -1 : va > vb ? 1 : 0);
        case 'totalCost':
          va = a.totalCost;
          vb = b.totalCost;
          break;
        case 'avgCost':
          va = a.averageCost;
          vb = b.averageCost;
          break;
        case 'holdingValue':
          va = a.holdingValue;
          vb = b.holdingValue;
          break;
        case 'pl':
          va = a.unrealizedPLPercent;
          vb = b.unrealizedPLPercent;
          break;
        default:
          va = a.totalCost;
          vb = b.totalCost;
          break;
      }

      return dir * ((va as number) - (vb as number));
    });

    return list;
  });

  readonly filteredClosedSummaries = computed<ClosedPortfolioPosition[]>(() => {
    const data = this.portfolioData();
    if (!data || !data.closedPositions) return [];

    let list = [...data.closedPositions];

    const typeFilter = this.selectedClosedAssetType();
    if (this.isClosedTab() && typeFilter !== 'all') {
      list = list.filter((s) => getAssetType(s.assetType, s.symbol) === typeFilter);
    }

    const query = this.searchQuery().trim().toUpperCase();
    if (query) {
      list = list.filter(
        (s) =>
          s.symbol.toUpperCase().includes(query) ||
          s.displaySymbol.toUpperCase().includes(query) ||
          s.name.toUpperCase().includes(query),
      );
    }

    const field = this.sortField();
    const dir = this.sortDirection() === 'asc' ? 1 : -1;

    list.sort((a, b) => {
      let va: number | string = 0;
      let vb: number | string = 0;

      switch (field) {
        case 'symbol':
          va = a.symbol;
          vb = b.symbol;
          return dir * (va < vb ? -1 : va > vb ? 1 : 0);
        case 'totalCost':
          va = a.totalCost;
          vb = b.totalCost;
          break;
        case 'avgCost':
          va = a.averageBuyPrice;
          vb = b.averageBuyPrice;
          break;
        case 'holdingValue':
        case 'totalProceeds':
          va = a.totalProceeds;
          vb = b.totalProceeds;
          break;
        case 'realizedPL':
          va = a.realizedPL;
          vb = b.realizedPL;
          break;
        case 'pl':
          va = a.realizedPLPercent;
          vb = b.realizedPLPercent;
          break;
        case 'totalShares':
        case 'closedShares':
          va = a.closedShares;
          vb = b.closedShares;
          break;
        default:
          va = a.realizedPL;
          vb = b.realizedPL;
          break;
      }

      return dir * ((va as number) - (vb as number));
    });

    return list;
  });

  readonly autocompleteSuggestions = computed<SymbolAutocompleteItem[]>(() => {
    const data = this.portfolioData();
    if (!data) return [];

    const query = this.searchQuery().trim().toUpperCase();
    const isClosed = this.isClosedTab();
    const isAll = this.isAllTab();

    const items: SymbolAutocompleteItem[] = [];
    const seenSymbols = new Set<string>();

    if (!isClosed || isAll) {
      for (const s of data.openPositions || []) {
        const displaySym = s.displaySymbol || this.getDisplaySymbol(s.symbol);
        const name = s.name || this.getSymbolName(s.symbol);
        const type = s.assetType;
        const typeLabel = s.assetTypeLabel;

        const matches =
          !query ||
          s.symbol.toUpperCase().includes(query) ||
          displaySym.toUpperCase().includes(query) ||
          name.toUpperCase().includes(query) ||
          typeLabel.toUpperCase().includes(query);

        if (matches) {
          seenSymbols.add(s.symbol);
          items.push({
            symbol: s.symbol,
            displaySymbol: displaySym,
            name,
            color: this.getSymbolColor(s.symbol),
            assetType: type,
            assetTypeLabel: typeLabel,
            isClosed: false,
            totalShares: s.totalShares,
            totalCost: s.totalCost,
            currency: s.currency,
            holdingValue: s.holdingValue,
            unrealizedPL: s.unrealizedPL,
            unrealizedPLPercent: s.unrealizedPLPercent,
            hasPrice: s.hasPrice,
          });
        }
      }
    }

    if (isClosed || isAll) {
      for (const s of data.closedPositions || []) {
        if (seenSymbols.has(s.symbol)) continue;

        const displaySym = s.displaySymbol || this.getDisplaySymbol(s.symbol);
        const name = s.name || this.getSymbolName(s.symbol);
        const type = s.assetType;
        const typeLabel = s.assetTypeLabel;

        const matches =
          !query ||
          s.symbol.toUpperCase().includes(query) ||
          displaySym.toUpperCase().includes(query) ||
          name.toUpperCase().includes(query) ||
          typeLabel.toUpperCase().includes(query);

        if (matches) {
          items.push({
            symbol: s.symbol,
            displaySymbol: displaySym,
            name,
            color: this.getSymbolColor(s.symbol),
            assetType: type,
            assetTypeLabel: typeLabel,
            isClosed: true,
            totalShares: s.closedShares,
            totalCost: s.totalCost,
            currency: s.currency,
            realizedPL: s.realizedPL,
            realizedPLPercent: s.realizedPLPercent,
            hasPrice: false,
          });
        }
      }
    }

    if (query) {
      items.sort((a, b) => {
        const aSym = a.symbol.toUpperCase();
        const bSym = b.symbol.toUpperCase();
        const aDisp = a.displaySymbol.toUpperCase();
        const bDisp = b.displaySymbol.toUpperCase();

        const aExact = aSym === query || aDisp === query;
        const bExact = bSym === query || bDisp === query;
        if (aExact && !bExact) return -1;
        if (!aExact && bExact) return 1;

        const aStarts = aSym.startsWith(query) || aDisp.startsWith(query);
        const bStarts = bSym.startsWith(query) || bDisp.startsWith(query);
        if (aStarts && !bStarts) return -1;
        if (!aStarts && bStarts) return 1;

        return 0;
      });
    }

    return items.slice(0, 10);
  });

  onSearchInput(value: string): void {
    this.searchQuery.set(value);
    this.isSearchDropdownOpen.set(true);
    this.searchActiveIndex.set(-1);
  }

  onSearchFocus(): void {
    this.isSearchFocused.set(true);
    this.isSearchDropdownOpen.set(true);
  }

  closeSearchDropdown(): void {
    this.isSearchDropdownOpen.set(false);
    this.isSearchFocused.set(false);
    this.searchActiveIndex.set(-1);
  }

  clearSearchQuery(inputEl?: HTMLInputElement): void {
    this.searchQuery.set('');
    this.searchActiveIndex.set(-1);
    this.isSearchDropdownOpen.set(true);
    if (inputEl) {
      inputEl.focus();
    }
  }

  selectAutocompleteItem(item: SymbolAutocompleteItem): void {
    this.searchQuery.set(item.displaySymbol || item.symbol);
    this.closeSearchDropdown();

    this.expandedSymbols.update((set) => {
      const next = new Set(set);
      next.add(item.symbol);
      return next;
    });

    if (typeof window !== 'undefined') {
      setTimeout(() => {
        const cardId = item.isClosed ? `closed-card-${item.symbol}` : `card-${item.symbol}`;
        const el = document.getElementById(cardId);
        if (el) {
          el.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
      }, 60);
    }
  }

  onSearchKeydown(event: KeyboardEvent): void {
    const suggestions = this.autocompleteSuggestions();
    const isOpen = this.isSearchDropdownOpen();

    if (event.key === 'ArrowDown') {
      event.preventDefault();
      if (!isOpen) {
        this.isSearchDropdownOpen.set(true);
        this.searchActiveIndex.set(0);
        return;
      }
      if (suggestions.length > 0) {
        const nextIndex = (this.searchActiveIndex() + 1) % suggestions.length;
        this.searchActiveIndex.set(nextIndex);
        this.scrollActiveSuggestionIntoView(nextIndex);
      }
    } else if (event.key === 'ArrowUp') {
      event.preventDefault();
      if (!isOpen) {
        this.isSearchDropdownOpen.set(true);
        this.searchActiveIndex.set(suggestions.length - 1);
        return;
      }
      if (suggestions.length > 0) {
        const nextIndex =
          this.searchActiveIndex() <= 0 ? suggestions.length - 1 : this.searchActiveIndex() - 1;
        this.searchActiveIndex.set(nextIndex);
        this.scrollActiveSuggestionIntoView(nextIndex);
      }
    } else if (event.key === 'Enter') {
      if (
        isOpen &&
        this.searchActiveIndex() >= 0 &&
        this.searchActiveIndex() < suggestions.length
      ) {
        event.preventDefault();
        this.selectAutocompleteItem(suggestions[this.searchActiveIndex()]);
      } else {
        this.closeSearchDropdown();
      }
    } else if (event.key === 'Escape') {
      event.preventDefault();
      this.closeSearchDropdown();
    }
  }

  private scrollActiveSuggestionIntoView(index: number): void {
    if (typeof document !== 'undefined') {
      setTimeout(() => {
        const itemEl = document.getElementById(`autocomplete-item-${index}`);
        if (itemEl) {
          itemEl.scrollIntoView({ block: 'nearest' });
        }
      }, 10);
    }
  }

  setClosedAssetTypeFilter(type: string): void {
    this.selectedClosedAssetType.set(type);
    this.isMobileFilterDropdownOpen.set(false);
  }

  setSort(field: string): void {
    if (this.sortField() === field) {
      this.sortDirection.set(this.sortDirection() === 'asc' ? 'desc' : 'asc');
    } else {
      this.sortField.set(field);
      this.sortDirection.set(field === 'symbol' ? 'asc' : 'desc');
    }
    this.isMobileSortDropdownOpen.set(false);
  }

  toggleSortDirection(): void {
    this.sortDirection.set(this.sortDirection() === 'asc' ? 'desc' : 'asc');
  }

  selectTab(tab: AssetTab): void {
    this.isTabDropdownOpen.set(false);
    if (tab.id === this.activeTab().id) return;
    this.activeTab.set(tab);
    this.searchQuery.set('');
    this.closeSearchDropdown();
    this.selectedClosedAssetType.set('all');
    this.expandedSymbols.set(new Set());
    if (tab.id === 'closed-position') {
      this.sortField.set('realizedPL');
      this.sortDirection.set('desc');
    } else {
      this.sortField.set('totalCost');
      this.sortDirection.set('desc');
    }

    const cached = this.tabCache.get(tab.id);
    if (cached) {
      this.error.set(null);
      this.portfolioData.set(cached.portfolioData);
      this.prices.set(cached.prices);
      if (cached.portfolioData.exchangeRate > 0) {
        this.exchangeRate.set(cached.portfolioData.exchangeRate);
      }
      this.loading.set(false);
      this.pricesLoading.set(false);
      return;
    }

    this.loadTab(tab, this.displayCurrency());
  }

  loadTab(tab: AssetTab, currency: 'USD' | 'THB' = this.displayCurrency()): void {
    this.loading.set(true);
    this.error.set(null);
    this.portfolioData.set(null);

    this.portfolioService.fetchHoldings(tab.id, currency).subscribe({
      next: (res) => {
        if (res.error) {
          this.error.set(res.error);
          this.loading.set(false);
        } else {
          this.portfolioData.set(res);
          if (res.exchangeRate > 0) {
            this.exchangeRate.set(res.exchangeRate);
          }

          // Populate price map for child components
          const pMap = new Map<string, PriceData>();
          for (const pos of res.openPositions || []) {
            pMap.set(pos.symbol, {
              symbol: pos.symbol,
              name: pos.name,
              price: pos.currentPrice,
              currency: pos.currency,
            });
          }
          for (const pos of res.closedPositions || []) {
            if (!pMap.has(pos.symbol) || !pMap.get(pos.symbol)?.name) {
              const existing = pMap.get(pos.symbol);
              pMap.set(pos.symbol, {
                symbol: pos.symbol,
                name: pos.name || existing?.name || '',
                price: existing?.price ?? 0,
                currency: pos.currency || existing?.currency || '',
              });
            }
          }
          this.prices.set(pMap);

          this.tabCache.set(tab.id, {
            portfolioData: res,
            prices: pMap,
            timestamp: Date.now(),
          });

          this.loading.set(false);
          this.pricesLoading.set(false);
        }
      },
      error: (err) => {
        this.error.set(err?.message || 'Failed to load portfolio holdings');
        this.loading.set(false);
      },
    });
  }

  loadDividendData(currency: 'USD' | 'THB' = this.displayCurrency()): void {
    if (!this.dividendData()) {
      this.dividendLoading.set(true);
    }
    this.dividendService.getDividendAnalytics(currency, 'all').subscribe({
      next: (res) => {
        this.dividendData.set(res);
        this.dividendLoading.set(false);
      },
      error: () => {
        this.dividendLoading.set(false);
      },
    });
  }

  refresh(): void {
    this.tabCache.delete(this.activeTab().id);
    this.loadTab(this.activeTab(), this.displayCurrency());
    this.loadDividendData(this.displayCurrency());
  }

  toggleExpand(symbol: string): void {
    const current = new Set(this.expandedSymbols());
    if (current.has(symbol)) {
      current.delete(symbol);
    } else {
      current.add(symbol);
    }
    this.expandedSymbols.set(current);
  }

  isExpanded(symbol: string): boolean {
    return this.expandedSymbols().has(symbol);
  }

  expandAll(): void {
    const data = this.portfolioData();
    if (!data) return;
    const symbols = new Set<string>();
    if (!this.isClosedTab()) {
      data.openPositions.forEach((s) => symbols.add(s.symbol));
    }
    if (this.isClosedTab() || this.isAllTab()) {
      data.closedPositions.forEach((s) => symbols.add(s.symbol));
    }
    this.expandedSymbols.set(symbols);
  }

  collapseAll(): void {
    this.expandedSymbols.set(new Set());
  }

  getCurrentPrice(symbol: string): number {
    return this.prices().get(symbol)?.price ?? 0;
  }

  getCurrentPriceConverted(summary: PortfolioPosition | SymbolSummary): number {
    if ('currentPrice' in summary && summary.currentPrice) {
      return convertCurrency(
        summary.currentPrice,
        summary.currency,
        this.displayCurrency(),
        this.exchangeRate(),
      );
    }
    const pd = this.prices().get(summary.symbol);
    const price = pd?.price ?? 0;
    const curr = pd?.currency || summary.currency;
    return convertCurrency(price, curr, this.displayCurrency(), this.exchangeRate());
  }

  readonly symbolNameMap = computed<Map<string, string>>(() => {
    const map = new Map<string, string>();
    const prices = this.prices();
    for (const [sym, pd] of prices.entries()) {
      if (pd.name) map.set(sym, pd.name);
    }
    const data = this.portfolioData();
    if (data) {
      for (const p of data.openPositions || []) {
        if (p.name && !map.has(p.symbol)) map.set(p.symbol, getSymbolName(p.symbol, p.name));
      }
      for (const c of data.closedPositions || []) {
        if (c.name && !map.has(c.symbol)) map.set(c.symbol, getSymbolName(c.symbol, c.name));
      }
    }
    return map;
  });

  getDisplaySymbol(symbol: string): string {
    return displaySymbol(symbol);
  }

  getSymbolName(symbol: string, rawName?: string): string {
    if (rawName) {
      return getSymbolName(symbol, rawName);
    }
    return this.symbolNameMap().get(symbol) || resolveSymbolName(symbol, this.prices());
  }

  getHoldingValue(summary: PortfolioPosition | SymbolSummary): number {
    if ('holdingValue' in summary && summary.holdingValue) {
      return convertCurrency(
        summary.holdingValue,
        summary.currency,
        this.displayCurrency(),
        this.exchangeRate(),
      );
    }
    const price = this.getCurrentPriceConverted(summary);
    return summary.totalShares * price;
  }

  getUnrealizedPL(summary: PortfolioPosition | SymbolSummary): number {
    if ('unrealizedPL' in summary && summary.unrealizedPL !== undefined) {
      return convertCurrency(
        summary.unrealizedPL,
        summary.currency,
        this.displayCurrency(),
        this.exchangeRate(),
      );
    }
    const cost = convertCurrency(
      summary.totalCost,
      summary.currency,
      this.displayCurrency(),
      this.exchangeRate(),
    );
    return this.getHoldingValue(summary) - cost;
  }

  getUnrealizedPLPercent(summary: PortfolioPosition | SymbolSummary): number {
    if ('unrealizedPLPercent' in summary && summary.unrealizedPLPercent !== undefined) {
      return summary.unrealizedPLPercent;
    }
    const cost = convertCurrency(
      summary.totalCost,
      summary.currency,
      this.displayCurrency(),
      this.exchangeRate(),
    );
    if (cost === 0) return 0;
    return (this.getUnrealizedPL(summary) / cost) * 100;
  }

  getLotHoldingValue(
    lot: PortfolioHoldingLot | ShareLot,
    summary: PortfolioPosition | SymbolSummary,
  ): number {
    if ('holdingValue' in lot && lot.holdingValue) {
      const lotCurr = ('currency' in lot ? lot.currency : summary.currency) || summary.currency;
      return convertCurrency(
        lot.holdingValue,
        lotCurr,
        this.displayCurrency(),
        this.exchangeRate(),
      );
    }
    const price = this.getCurrentPriceConverted(summary);
    return lot.quantity * price;
  }

  getLotUnrealizedPL(
    lot: PortfolioHoldingLot | ShareLot,
    summary: PortfolioPosition | SymbolSummary,
  ): number {
    if ('unrealizedPL' in lot && lot.unrealizedPL !== undefined) {
      const lotCurr = ('currency' in lot ? lot.currency : summary.currency) || summary.currency;
      return convertCurrency(
        lot.unrealizedPL,
        lotCurr,
        this.displayCurrency(),
        this.exchangeRate(),
      );
    }
    const lotCurr = ('currency' in lot ? lot.currency : summary.currency) || summary.currency;
    const lotCost = convertCurrency(
      lot.totalCost,
      lotCurr,
      this.displayCurrency(),
      this.exchangeRate(),
    );
    return this.getLotHoldingValue(lot, summary) - lotCost;
  }

  getLotUnrealizedPLPercent(
    lot: PortfolioHoldingLot | ShareLot,
    summary: PortfolioPosition | SymbolSummary,
  ): number {
    if ('unrealizedPLPercent' in lot && lot.unrealizedPLPercent !== undefined) {
      return lot.unrealizedPLPercent;
    }
    const lotCurr = ('currency' in lot ? lot.currency : summary.currency) || summary.currency;
    const lotCost = convertCurrency(
      lot.totalCost,
      lotCurr,
      this.displayCurrency(),
      this.exchangeRate(),
    );
    if (lotCost === 0) return 0;
    return (this.getLotUnrealizedPL(lot, summary) / lotCost) * 100;
  }

  hasPriceData(symbol: string): boolean {
    const data = this.portfolioData();
    if (data) {
      const pos = data.openPositions.find((p) => p.symbol === symbol);
      if (pos) return pos.hasPrice;
    }
    return this.prices().has(symbol) && this.getCurrentPrice(symbol) > 0;
  }

  getQuantityFormat(symbol: string, assetType?: string): string {
    return getQuantityFormat(symbol, assetType);
  }

  getPriceFormat(symbol: string, assetType?: string): string {
    return getPriceFormat(symbol, assetType);
  }

  getSymbolColor(symbol: string): string {
    return getSymbolColor(symbol);
  }

  getAssetTypeLabel(assetType?: string, symbol?: string): string {
    return getAssetTypeLabel(assetType, symbol);
  }

  getAssetTypeClass(assetType?: string, symbol?: string): string {
    return getAssetTypeClass(assetType, symbol);
  }
}
