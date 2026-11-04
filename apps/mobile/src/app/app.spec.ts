import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { of } from 'rxjs';
import { PortfolioService } from './services/portfolio.service';
import { DividendService } from './services/dividend.service';
import { PortfolioDividendResponse } from './models/dividend.model';
import { App } from './app';
import { ASSET_TABS } from './config/asset.constants';

describe('App', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [App],
      providers: [provideHttpClient()],
    }).compileComponents();
  });

  it('should create the app', () => {
    const fixture = TestBed.createComponent(App);
    const app = fixture.componentInstance;
    expect(app).toBeTruthy();
  });

  it('should render title', async () => {
    const fixture = TestBed.createComponent(App);
    await fixture.whenStable();
    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.querySelector('h1')?.textContent).toContain('Charlotte Wealth');
  });

  it('should have closed position tab in tabs list', () => {
    const fixture = TestBed.createComponent(App);
    const app = fixture.componentInstance;
    const closedTab = app.tabs.find((t) => t.id === 'closed-position');
    expect(closedTab).toBeDefined();
    expect(closedTab?.label).toBe('Closed Position');
  });

  it('should select tab and update active tab', () => {
    const fixture = TestBed.createComponent(App);
    const app = fixture.componentInstance;
    const closedTab = app.tabs.find((t) => t.id === 'closed-position')!;

    app.selectTab(closedTab);

    expect(app.activeTab().id).toBe('closed-position');
  });

  it('should toggle between dark and light themes', () => {
    const fixture = TestBed.createComponent(App);
    const app = fixture.componentInstance;

    app.setTheme('dark');
    expect(app.theme()).toBe('dark');
    expect(document.documentElement.getAttribute('data-theme')).toBe('dark');

    app.toggleTheme();
    expect(app.theme()).toBe('light');
    expect(document.documentElement.getAttribute('data-theme')).toBe('light');

    app.toggleTheme();
    expect(app.theme()).toBe('dark');
    expect(document.documentElement.getAttribute('data-theme')).toBe('dark');
  });

  it('should toggle privacy mode and set data-privacy attribute', () => {
    const fixture = TestBed.createComponent(App);
    const app = fixture.componentInstance;

    app.setPrivacyMode(false);
    expect(app.privacyMode()).toBe(false);
    expect(document.documentElement.getAttribute('data-privacy')).toBe('false');

    app.togglePrivacyMode();
    expect(app.privacyMode()).toBe(true);
    expect(document.documentElement.getAttribute('data-privacy')).toBe('true');

    app.togglePrivacyMode();
    expect(app.privacyMode()).toBe(false);
    expect(document.documentElement.getAttribute('data-privacy')).toBe('false');
  });

  it('should handle sort dropdown change and sort direction toggle on mobile', () => {
    const fixture = TestBed.createComponent(App);
    const app = fixture.componentInstance;

    app.setSort('symbol');
    expect(app.sortField()).toBe('symbol');

    // For 'symbol', default direction is asc, toggle to desc
    expect(app.sortDirection()).toBe('asc');
    app.toggleSortDirection();
    expect(app.sortDirection()).toBe('desc');
    app.toggleSortDirection();
    expect(app.sortDirection()).toBe('asc');
  });

  it('should handle asset filter dropdown change on mobile', () => {
    const fixture = TestBed.createComponent(App);
    const app = fixture.componentInstance;

    app.setClosedAssetTypeFilter('crypto');
    expect(app.selectedClosedAssetType()).toBe('crypto');
  });

  it('should filter closed summaries by asset type', () => {
    const fixture = TestBed.createComponent(App);
    const app = fixture.componentInstance;

    // Switch to closed position tab
    const closedTab = app.tabs.find((t) => t.id === 'closed-position')!;
    app.activeTab.set(closedTab);

    // Set mock portfolioData
    app.portfolioData.set({
      currency: 'USD',
      exchangeRate: 1.0,
      tabId: 'closed-position',
      summary: {
        totalInvested: 16500,
        totalValue: 0,
        openInvested: 0,
        closedInvested: 16500,
        totalUnrealizedPL: 0,
        totalUnrealizedPLPercent: 0,
        totalRealizedPL: 1800,
        totalRealizedPLPercent: 10.9,
        totalReturn: 1800,
        totalReturnPercent: 10.9,
      },
      openPositions: [],
      closedPositions: [
        {
          symbol: 'AAPL',
          displaySymbol: 'AAPL',
          name: 'Apple Inc.',
          totalShares: 0,
          closedShares: 10,
          totalCost: 1500,
          totalProceeds: 1800,
          realizedPL: 300,
          realizedPLPercent: 20,
          averageBuyPrice: 150,
          averageSellPrice: 180,
          currency: 'USD',
          originalCurrency: 'USD',
          assetType: 'us-stock',
          assetTypeLabel: 'U.S. Stock',
          lots: [],
        },
        {
          symbol: 'TISCO.BK',
          displaySymbol: 'TISCO',
          name: 'Tisco Financial Group',
          totalShares: 0,
          closedShares: 100,
          totalCost: 10000,
          totalProceeds: 11000,
          realizedPL: 1000,
          realizedPLPercent: 10,
          averageBuyPrice: 100,
          averageSellPrice: 110,
          currency: 'THB',
          originalCurrency: 'THB',
          assetType: 'thai-stock',
          assetTypeLabel: 'Thai Stock',
          lots: [],
        },
        {
          symbol: 'ES-GTECHSSF.FUND',
          displaySymbol: 'ES-GTECHSSF',
          name: 'Eastspring Global Tech',
          totalShares: 0,
          closedShares: 500,
          totalCost: 5000,
          totalProceeds: 5500,
          realizedPL: 500,
          realizedPLPercent: 10,
          averageBuyPrice: 10,
          averageSellPrice: 11,
          currency: 'THB',
          originalCurrency: 'THB',
          assetType: 'mutual-fund',
          assetTypeLabel: 'Mutual Fund',
          lots: [],
        },
      ],
      error: null,
    });

    // Default 'all'
    expect(app.filteredClosedSummaries().length).toBe(3);
    expect(app.closedAssetTypeOptions().find((o) => o.id === 'all')?.count).toBe(3);
    expect(app.closedAssetTypeOptions().find((o) => o.id === 'mutual-fund')?.count).toBe(1);

    // Filter by mutual-fund
    app.setClosedAssetTypeFilter('mutual-fund');
    expect(app.filteredClosedSummaries().length).toBe(1);
    expect(app.filteredClosedSummaries()[0].symbol).toBe('ES-GTECHSSF.FUND');

    // Filter by us-stock
    app.setClosedAssetTypeFilter('us-stock');
    expect(app.filteredClosedSummaries().length).toBe(1);
    expect(app.filteredClosedSummaries()[0].symbol).toBe('AAPL');

    // Filter by thai-stock
    app.setClosedAssetTypeFilter('thai-stock');
    expect(app.filteredClosedSummaries().length).toBe(1);
    expect(app.filteredClosedSummaries()[0].symbol).toBe('TISCO.BK');
  });

  it('should correctly access server-computed holding values and P/L for crypto positions', () => {
    const fixture = TestBed.createComponent(App);
    const app = fixture.componentInstance;

    app.exchangeRate.set(33.0);
    app.displayCurrency.set('THB');

    const paxgPosition = {
      symbol: 'PAXG.CRYPTO',
      displaySymbol: 'PAXG',
      name: 'PAX Gold',
      assetType: 'crypto',
      assetTypeLabel: 'Cryptocurrency',
      totalShares: 0.01,
      totalCost: 1300,
      averageCost: 130000,
      currentPrice: 132000,
      holdingValue: 1320,
      unrealizedPL: 20,
      unrealizedPLPercent: 1.538,
      currency: 'THB',
      originalCurrency: 'THB',
      hasPrice: true,
      lots: [
        {
          purchaseDate: '2026-01-01',
          quantity: 0.01,
          costBasis: 130000,
          totalCost: 1300,
          currentPrice: 132000,
          holdingValue: 1320,
          unrealizedPL: 20,
          unrealizedPLPercent: 1.538,
          assetType: 'crypto',
          currency: 'THB',
          originalCostBasis: 130000,
          originalCurrency: 'THB',
        },
      ],
    };

    app.portfolioData.set({
      currency: 'THB',
      exchangeRate: 33.0,
      tabId: 'crypto',
      summary: {
        totalInvested: 1300,
        totalValue: 1320,
        openInvested: 1300,
        closedInvested: 0,
        totalUnrealizedPL: 20,
        totalUnrealizedPLPercent: 1.538,
        totalRealizedPL: 0,
        totalRealizedPLPercent: 0,
        totalReturn: 20,
        totalReturnPercent: 1.538,
      },
      openPositions: [paxgPosition],
      closedPositions: [],
      error: null,
    });

    // 1. Current Price in summary currency (THB): 132,000 THB
    expect(app.getCurrentPriceConverted(paxgPosition)).toBe(132000);

    // 2. Holding Value in summary currency (THB): 1,320 THB
    expect(app.getHoldingValue(paxgPosition)).toBe(1320);

    // 3. Unrealized P/L in summary currency (THB): 1,320 - 1,300 = +20 THB
    expect(app.getUnrealizedPL(paxgPosition)).toBe(20);
    expect(app.getUnrealizedPLPercent(paxgPosition)).toBeCloseTo(1.538, 2);

    // 4. Lot holding value & P/L
    expect(app.getLotHoldingValue(paxgPosition.lots[0], paxgPosition)).toBe(1320);
    expect(app.getLotUnrealizedPL(paxgPosition.lots[0], paxgPosition)).toBe(20);
    expect(app.getLotUnrealizedPLPercent(paxgPosition.lots[0], paxgPosition)).toBeCloseTo(1.538, 2);

    // 5. Portfolio Totals in THB
    expect(app.totalHoldingConverted()).toBe(1320);
    expect(app.totalCostConverted()).toBe(1300);
    expect(app.totalPL()).toBe(20);
  });

  it('should compute totalCostConverted from openInvested on open tabs and closedInvested on closed tab', () => {
    const fixture = TestBed.createComponent(App);
    const app = fixture.componentInstance;

    app.portfolioData.set({
      currency: 'USD',
      exchangeRate: 1.0,
      tabId: 'all',
      summary: {
        totalInvested: 15000,
        totalValue: 12000,
        openInvested: 10000,
        closedInvested: 5000,
        totalUnrealizedPL: 2000,
        totalUnrealizedPLPercent: 20,
        totalRealizedPL: 1000,
        totalRealizedPLPercent: 20,
        totalReturn: 3000,
        totalReturnPercent: 20,
      },
      openPositions: [],
      closedPositions: [],
      error: null,
    });

    // On open/all tab: totalCostConverted must be openInvested ($10,000) not totalInvested ($15,000)
    expect(app.isClosedTab()).toBe(false);
    expect(app.totalCostConverted()).toBe(10000);
    expect(app.totalHoldingConverted()).toBe(12000);
    expect(app.totalPL()).toBe(2000);

    // On closed tab: totalCostConverted must be closedInvested ($5,000)
    app.activeTab.set(ASSET_TABS.find((t: any) => t.id === 'closed-position')!);
    expect(app.isClosedTab()).toBe(true);
    expect(app.totalCostConverted()).toBe(5000);
  });

  it('should format display symbols correctly stripping .FUND, .BKFUND, .BK, and .CRYPTO suffixes', () => {
    const fixture = TestBed.createComponent(App);
    const app = fixture.componentInstance;

    expect(app.getDisplaySymbol('ES-GTECHSSF.FUND')).toBe('ES-GTECHSSF');
    expect(app.getDisplaySymbol('SCBSFF.FUND')).toBe('SCBSFF');
    expect(app.getDisplaySymbol('ES-GTECHSSF.BKFUND')).toBe('ES-GTECHSSF');
    expect(app.getDisplaySymbol('SCBSFF.BKFUND')).toBe('SCBSFF');
    expect(app.getDisplaySymbol('PTT.BK')).toBe('PTT');
    expect(app.getDisplaySymbol('BTC.CRYPTO')).toBe('BTC');
    expect(app.getDisplaySymbol('AAPL')).toBe('AAPL');
  });

  it('should provide autocomplete suggestions and handle item selection and keyboard navigation', () => {
    const fixture = TestBed.createComponent(App);
    const app = fixture.componentInstance;

    app.portfolioData.set({
      currency: 'USD',
      exchangeRate: 1.0,
      tabId: 'all',
      summary: {
        totalInvested: 34000,
        totalValue: 31000,
        openInvested: 31000,
        closedInvested: 3000,
        totalUnrealizedPL: 0,
        totalUnrealizedPLPercent: 0,
        totalRealizedPL: 600,
        totalRealizedPLPercent: 20,
        totalReturn: 600,
        totalReturnPercent: 1.76,
      },
      openPositions: [
        {
          symbol: 'NVDA',
          displaySymbol: 'NVDA',
          name: 'NVIDIA Corporation',
          assetType: 'us-stock',
          assetTypeLabel: 'U.S. Stock',
          totalShares: 10,
          totalCost: 1000,
          averageCost: 100,
          currentPrice: 100,
          holdingValue: 1000,
          unrealizedPL: 0,
          unrealizedPLPercent: 0,
          currency: 'USD',
          originalCurrency: 'USD',
          hasPrice: true,
          lots: [],
        },
        {
          symbol: 'BTC.CRYPTO',
          displaySymbol: 'BTC',
          name: 'Bitcoin',
          assetType: 'crypto',
          assetTypeLabel: 'Cryptocurrency',
          totalShares: 0.5,
          totalCost: 30000,
          averageCost: 60000,
          currentPrice: 60000,
          holdingValue: 30000,
          unrealizedPL: 0,
          unrealizedPLPercent: 0,
          currency: 'USD',
          originalCurrency: 'USD',
          hasPrice: true,
          lots: [],
        },
      ],
      closedPositions: [
        {
          symbol: 'AAPL',
          displaySymbol: 'AAPL',
          name: 'Apple Inc.',
          assetType: 'us-stock',
          assetTypeLabel: 'U.S. Stock',
          totalShares: 0,
          closedShares: 20,
          totalCost: 3000,
          totalProceeds: 3600,
          averageBuyPrice: 150,
          averageSellPrice: 180,
          realizedPL: 600,
          realizedPLPercent: 20,
          currency: 'USD',
          originalCurrency: 'USD',
          lots: [],
        },
      ],
      error: null,
    });

    // 1. Initial state when query is empty on All tab -> suggests all available symbols
    expect(app.autocompleteSuggestions().length).toBe(3);

    // 2. Filter by search query 'NV'
    app.onSearchInput('NV');
    expect(app.isSearchDropdownOpen()).toBe(true);
    const nvMatches = app.autocompleteSuggestions();
    expect(nvMatches.length).toBe(1);
    expect(nvMatches[0].symbol).toBe('NVDA');
    expect(nvMatches[0].displaySymbol).toBe('NVDA');

    // 3. Filter by search query 'BTC'
    app.onSearchInput('BTC');
    const btcMatches = app.autocompleteSuggestions();
    expect(btcMatches.length).toBe(1);
    expect(btcMatches[0].displaySymbol).toBe('BTC');

    // 4. Keyboard navigation (ArrowDown, ArrowUp, Enter)
    app.onSearchInput('');
    expect(app.searchActiveIndex()).toBe(-1);

    const downEvent = new KeyboardEvent('keydown', { key: 'ArrowDown' });
    app.onSearchKeydown(downEvent);
    expect(app.searchActiveIndex()).toBe(0);

    app.onSearchKeydown(downEvent);
    expect(app.searchActiveIndex()).toBe(1);

    const upEvent = new KeyboardEvent('keydown', { key: 'ArrowUp' });
    app.onSearchKeydown(upEvent);
    expect(app.searchActiveIndex()).toBe(0);

    // 5. Selecting an autocomplete item
    const selectedItem = app.autocompleteSuggestions()[0];
    app.selectAutocompleteItem(selectedItem);
    expect(app.searchQuery()).toBe(selectedItem.displaySymbol);
    expect(app.isSearchDropdownOpen()).toBe(false);
    expect(app.isExpanded(selectedItem.symbol)).toBe(true);

    // 6. Clear search query
    app.clearSearchQuery();
    expect(app.searchQuery()).toBe('');
    expect(app.searchActiveIndex()).toBe(-1);

    // 7. Escape key closes dropdown
    app.onSearchFocus();
    expect(app.isSearchDropdownOpen()).toBe(true);
    const escEvent = new KeyboardEvent('keydown', { key: 'Escape' });
    app.onSearchKeydown(escEvent);
    expect(app.isSearchDropdownOpen()).toBe(false);
  });

  it('should default to dashboard view and switch view mode to analytics and holdings', () => {
    const fixture = TestBed.createComponent(App);
    const app = fixture.componentInstance;

    expect(app.currentView()).toBe('dashboard');

    app.setView('analytics');
    expect(app.currentView()).toBe('analytics');
    expect(app.activeTab().id).toBe('all');

    app.setView('performance');
    expect(app.currentView()).toBe('analytics');
    expect(app.analyticsSubTab()).toBe('performance');

    app.setView('allocation');
    expect(app.currentView()).toBe('analytics');
    expect(app.analyticsSubTab()).toBe('allocation');

    app.setView('holdings');
    expect(app.currentView()).toBe('holdings');

    app.openDashboardView();
    expect(app.currentView()).toBe('dashboard');
  });

  it('should switch to tools view and reset active tab to all', () => {
    const fixture = TestBed.createComponent(App);
    const app = fixture.componentInstance;

    app.setView('tools');
    expect(app.currentView()).toBe('tools');
    expect(app.activeTab().id).toBe('all');
  });

  it('should resolve symbol name from rawName, prices map, or portfolioData closed positions', () => {
    const fixture = TestBed.createComponent(App);
    const app = fixture.componentInstance;

    // 1. Using rawName parameter
    expect(app.getSymbolName('TTB.BK', 'TMBThanachart Bank')).toBe('TMBThanachart Bank');

    // 2. From portfolioData closedPositions
    app.portfolioData.set({
      currency: 'THB',
      exchangeRate: 1,
      tabId: 'closed-position',
      summary: {
        totalInvested: 100,
        totalValue: 0,
        openInvested: 0,
        closedInvested: 100,
        totalUnrealizedPL: 0,
        totalUnrealizedPLPercent: 0,
        totalRealizedPL: 20,
        totalRealizedPLPercent: 20,
        totalReturn: 20,
        totalReturnPercent: 20,
      },
      openPositions: [],
      closedPositions: [
        {
          symbol: 'tsp5-gogetter-SSF.FUND',
          displaySymbol: 'tsp5-gogetter-SSF',
          name: 'ttb smart port 5 go-getter Super Savings Fund',
          assetType: 'mutual-fund',
          assetTypeLabel: 'Mutual Fund',
          totalShares: 0,
          closedShares: 10,
          totalCost: 100,
          totalProceeds: 120,
          realizedPL: 20,
          realizedPLPercent: 20,
          averageBuyPrice: 10,
          averageSellPrice: 12,
          currency: 'THB',
          originalCurrency: 'THB',
          lots: [],
        },
      ],
      error: null,
    });

    expect(app.getSymbolName('tsp5-gogetter-SSF.FUND')).toBe(
      'ttb smart port 5 go-getter Super Savings Fund',
    );
  });

  it('should seamlessly switch currency without setting loading state or destroying portfolioData', () => {
    const fixture = TestBed.createComponent(App);
    const app = fixture.componentInstance;

    app.exchangeRate.set(35.0);
    app.portfolioData.set({
      currency: 'USD',
      exchangeRate: 35.0,
      tabId: 'all',
      summary: {
        totalInvested: 1000,
        totalValue: 1200,
        openInvested: 1000,
        closedInvested: 0,
        totalUnrealizedPL: 200,
        totalUnrealizedPLPercent: 20,
        totalRealizedPL: 0,
        totalRealizedPLPercent: 0,
        totalReturn: 200,
        totalReturnPercent: 20,
      },
      openPositions: [],
      closedPositions: [],
      error: null,
    });
    app.loading.set(false);

    // Initial USD stats
    app.displayCurrency.set('USD');
    expect(app.totalCostConverted()).toBe(1000);
    expect(app.totalHoldingConverted()).toBe(1200);
    expect(app.totalPL()).toBe(200);

    // Switch to THB
    app.displayCurrency.set('THB');
    // Verify loading remains false and data is retained
    expect(app.loading()).toBe(false);
    expect(app.portfolioData()).not.toBeNull();
    // Verify stats instantly convert to THB (1000 * 35 = 35000, 1200 * 35 = 42000)
    expect(app.totalCostConverted()).toBe(35000);
    expect(app.totalHoldingConverted()).toBe(42000);
    expect(app.totalPL()).toBe(7000);
  });

  it('should preserve expanded symbols across currency toggle', () => {
    const fixture = TestBed.createComponent(App);
    const app = fixture.componentInstance;

    app.expandedSymbols.set(new Set(['AAPL', 'MSFT']));
    expect(app.isExpanded('AAPL')).toBe(true);
    expect(app.isExpanded('MSFT')).toBe(true);

    // Switch currency
    app.displayCurrency.set('THB');
    expect(app.isExpanded('AAPL')).toBe(true);
    expect(app.isExpanded('MSFT')).toBe(true);

    app.displayCurrency.set('USD');
    expect(app.isExpanded('AAPL')).toBe(true);
    expect(app.isExpanded('MSFT')).toBe(true);
  });

  it('should not cause infinite loop when portfolioData updates or currency changes', async () => {
    const portfolioService = TestBed.inject(PortfolioService);
    const dividendService = TestBed.inject(DividendService);

    const fetchHoldingsSpy = vi.spyOn(portfolioService, 'fetchHoldings').mockReturnValue(
      of({
        currency: 'USD',
        exchangeRate: 35.0,
        tabId: 'all',
        summary: {
          totalInvested: 100,
          totalValue: 120,
          openInvested: 100,
          closedInvested: 0,
          totalUnrealizedPL: 20,
          totalUnrealizedPLPercent: 20,
          totalRealizedPL: 0,
          totalRealizedPLPercent: 0,
          totalReturn: 20,
          totalReturnPercent: 20,
        },
        openPositions: [],
        closedPositions: [],
        error: null,
      }),
    );
    const mockDividendResponse: PortfolioDividendResponse = {
      currency: 'USD',
      exchangeRate: 35.0,
      totalGrossDividends: 0,
      totalNetDividends: 0,
      totalWithholdingTax: 0,
      effectiveTaxRate: 0,
      projectedAnnualDividends: 0,
      portfolioDividendYield: 0,
      portfolioYieldOnCost: 0,
      annualDividends: [],
      monthlyDividends: [],
      assetTypeSummaries: [],
      symbolSummaries: [],
      records: [],
      error: null,
    };
    const dividendSpy = vi
      .spyOn(dividendService, 'getDividendAnalytics')
      .mockReturnValue(of(mockDividendResponse));

    const fixture = TestBed.createComponent(App);
    const app = fixture.componentInstance;
    await fixture.whenStable();

    const initialFetchCount = fetchHoldingsSpy.mock.calls.length;
    const initialDividendCount = dividendSpy.mock.calls.length;

    // Mutating portfolioData should NOT trigger the effect or any more API calls
    app.portfolioData.set({
      currency: 'USD',
      exchangeRate: 35.0,
      tabId: 'all',
      summary: {
        totalInvested: 200,
        totalValue: 250,
        openInvested: 200,
        closedInvested: 0,
        totalUnrealizedPL: 50,
        totalUnrealizedPLPercent: 25,
        totalRealizedPL: 0,
        totalRealizedPLPercent: 0,
        totalReturn: 50,
        totalReturnPercent: 25,
      },
      openPositions: [],
      closedPositions: [],
      error: null,
    });

    await fixture.whenStable();
    expect(fetchHoldingsSpy.mock.calls.length).toBe(initialFetchCount);
    expect(dividendSpy.mock.calls.length).toBe(initialDividendCount);

    // Toggling currency triggers background sync once, not an infinite loop
    app.displayCurrency.set('USD');
    await fixture.whenStable();

    expect(fetchHoldingsSpy.mock.calls.length).toBe(initialFetchCount + 1);
    expect(dividendSpy.mock.calls.length).toBe(initialDividendCount + 1);
  });
});
