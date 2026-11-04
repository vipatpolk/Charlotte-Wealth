import { ComponentFixture, TestBed } from '@angular/core/testing';
import { describe, it, expect, beforeEach } from 'vitest';
import { DividendComponent } from './dividend.component';
import { PortfolioDividendResponse } from '../../models/dividend.model';

describe('DividendComponent', () => {
  let component: DividendComponent;
  let fixture: ComponentFixture<DividendComponent>;

  const mockDividendData: PortfolioDividendResponse = {
    currency: 'THB',
    exchangeRate: 35.0,
    totalGrossDividends: 10000,
    totalNetDividends: 9000,
    totalWithholdingTax: 1000,
    effectiveTaxRate: 10,
    projectedAnnualDividends: 12000,
    portfolioDividendYield: 6.0,
    portfolioYieldOnCost: 7.5,
    annualDividends: [
      {
        year: 2026,
        grossAmount: 6000,
        netAmount: 5400,
        withholdingTax: 600,
        byAssetType: { 'thai-stock': 3000, 'us-stock': 2400 },
        recordCount: 2,
        monthlyBreakdown: []
      },
      {
        year: 2025,
        grossAmount: 4000,
        netAmount: 3600,
        withholdingTax: 400,
        byAssetType: { 'thai-stock': 3600 },
        recordCount: 1,
        monthlyBreakdown: []
      }
    ],
    monthlyDividends: [
      {
        yearMonth: '2026-03',
        year: 2026,
        month: 3,
        grossAmount: 6000,
        netAmount: 5400,
        withholdingTax: 600,
        byAssetType: { 'thai-stock': 3000, 'us-stock': 2400 },
        recordCount: 2
      }
    ],
    assetTypeSummaries: [
      {
        assetType: 'thai-stock',
        assetTypeLabel: 'Thai Stock',
        totalGrossDividends: 7000,
        totalNetDividends: 6300,
        totalWithholdingTax: 700,
        percentageOfTotal: 70,
        symbolCount: 1,
        recordCount: 2,
        totalCostBasis: 35000,
        currentValue: 38000,
        projectedAnnualDividends: 2600,
        yieldOnCostPercent: 7.43,
        currentYieldPercent: 6.84,
      },
      {
        assetType: 'us-stock',
        assetTypeLabel: 'U.S. Stock',
        totalGrossDividends: 3000,
        totalNetDividends: 2700,
        totalWithholdingTax: 300,
        percentageOfTotal: 30,
        symbolCount: 1,
        recordCount: 1,
        totalCostBasis: 65000,
        currentValue: 70000,
        projectedAnnualDividends: 350,
        yieldOnCostPercent: 0.54,
        currentYieldPercent: 0.50,
      }
    ],
    symbolSummaries: [
      {
        symbol: 'PTT.BK',
        displaySymbol: 'PTT',
        name: 'PTT Public Company',
        assetType: 'thai-stock',
        assetTypeLabel: 'Thai Stock',
        currency: 'THB',
        totalGrossDividends: 7000,
        totalNetDividends: 6300,
        totalWithholdingTax: 700,
        convertedNetDividends: 6300,
        convertedGrossDividends: 7000,
        convertedWithholdingTax: 700,
        dividendCount: 2,
        firstDividendDate: '2025-09-15',
        lastDividendDate: '2026-03-20',
        currentShares: 1000,
        currentCostBasis: 35000,
        currentValue: 38000,
        trailingAnnualDPS: 2.6,
        currentYieldPercent: 6.84,
        yieldOnCostPercent: 7.43,
        projectedAnnualIncome: 2600,
        recentDistributions: []
      },
      {
        symbol: 'AAPL',
        displaySymbol: 'AAPL',
        name: 'Apple Inc.',
        assetType: 'us-stock',
        assetTypeLabel: 'U.S. Stock',
        currency: 'USD',
        totalGrossDividends: 3000,
        totalNetDividends: 2700,
        totalWithholdingTax: 300,
        convertedNetDividends: 2700,
        convertedGrossDividends: 3000,
        convertedWithholdingTax: 300,
        dividendCount: 1,
        firstDividendDate: '2026-02-15',
        lastDividendDate: '2026-02-15',
        currentShares: 10,
        currentCostBasis: 65000,
        currentValue: 70000,
        trailingAnnualDPS: 1.0,
        currentYieldPercent: 0.50,
        yieldOnCostPercent: 0.54,
        projectedAnnualIncome: 350,
        recentDistributions: []
      },
      {
        symbol: 'K-USA-A(D).FUND',
        displaySymbol: 'K-USA-A(D)',
        name: 'K USA Fund',
        assetType: 'mutual-fund',
        assetTypeLabel: 'Mutual Fund',
        currency: 'THB',
        totalGrossDividends: 0,
        totalNetDividends: 0,
        totalWithholdingTax: 0,
        convertedNetDividends: 0,
        convertedGrossDividends: 0,
        convertedWithholdingTax: 0,
        dividendCount: 0,
        firstDividendDate: '',
        lastDividendDate: '',
        currentShares: 500,
        currentCostBasis: 10000,
        currentValue: 11000,
        trailingAnnualDPS: 0.5,
        currentYieldPercent: 2.27,
        yieldOnCostPercent: 2.5,
        projectedAnnualIncome: 250,
        recentDistributions: [
          {
            projId: 'M0159_2555',
            classAbbrName: 'K-USA-A(D)',
            bookCloseDate: '2026-04-30',
            dividendDate: '2026-05-15',
            dividendValue: 0.5,
            lastUpdDate: '2026-05-13'
          }
        ]
      }
    ],
    records: [
      {
        id: 'div-1',
        symbol: 'PTT.BK',
        displaySymbol: 'PTT',
        date: '2026-03-20',
        assetType: 'thai-stock',
        assetTypeLabel: 'Thai Stock',
        shares: 1000,
        dividendPerShare: 1.2,
        grossAmount: 1200,
        withholdingTax: 120,
        withholdingTaxRate: 10,
        netAmount: 1080,
        currency: 'THB',
        convertedNetAmount: 1080,
        convertedGrossAmount: 1200,
        convertedWithholdingTax: 120
      },
      {
        id: 'div-2',
        symbol: 'PTT.BK',
        displaySymbol: 'PTT',
        date: '2025-09-15',
        assetType: 'thai-stock',
        assetTypeLabel: 'Thai Stock',
        shares: 1000,
        dividendPerShare: 1.4,
        grossAmount: 1400,
        withholdingTax: 140,
        withholdingTaxRate: 10,
        netAmount: 1260,
        currency: 'THB',
        convertedNetAmount: 1260,
        convertedGrossAmount: 1400,
        convertedWithholdingTax: 140
      }
    ],
    error: null
  };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [DividendComponent]
    }).compileComponents();

    fixture = TestBed.createComponent(DividendComponent);
    component = fixture.componentInstance;

    // Set input signals
    fixture.componentRef.setInput('data', mockDividendData);
    fixture.componentRef.setInput('getSymbolColor', () => '#10B981');
    fixture.componentRef.setInput('getDisplaySymbol', (s: string) => s.replace('.BK', ''));
    fixture.componentRef.setInput('getSymbolName', () => 'Mock Name');
    fixture.componentRef.setInput('getAssetTypeClass', () => 'bg-emerald-500/10');
    fixture.componentRef.setInput('getAssetTypeLabel', () => 'Thai Stock');

    fixture.detectChanges();
  });

  it('should create DividendComponent', () => {
    expect(component).toBeTruthy();
  });

  it('should compute available historical years', () => {
    const years = component.availableYears();
    expect(years).toEqual(['2026', '2025']);
  });

  it('should filter records by year when selected', () => {
    component.setYear('2026');
    fixture.detectChanges();

    const filtered = component.filteredRecords();
    expect(filtered.length).toBe(1);
    expect(filtered[0].date).toContain('2026');
  });

  it('should calculate Yield on Cost for symbols', () => {
    const symbols = component.filteredSymbolSummaries();
    const ptt = symbols.find(s => s.symbol === 'PTT.BK');
    expect(ptt).toBeDefined();
    expect(ptt?.yieldOnCostPercent).toBeCloseTo(7.43, 2);
    expect(ptt?.trailingAnnualDPS).toBe(2.6);
  });

  it('should open and close SEC Fund distribution modal', () => {
    const fund = component.filteredSymbolSummaries().find(s => s.assetType === 'mutual-fund')!;
    component.openFundDistributions(fund);
    expect(component.selectedFundDistributions()).not.toBeNull();
    expect(component.selectedFundDistributions()?.distributions.length).toBe(1);

    component.closeFundDistributions();
    expect(component.selectedFundDistributions()).toBeNull();
  });

  it('should retrieve related ledger records and count for a holding symbol', () => {
    const records = component.getHoldingRecords('PTT.BK');
    expect(records.length).toBe(2);
    expect(component.getHoldingRecordsCount('PTT.BK')).toBe(2);

    const nonExistent = component.getHoldingRecords('AAPL');
    expect(nonExistent.length).toBe(0);
    expect(component.getHoldingRecordsCount('AAPL')).toBe(0);
  });

  it('should open and close Holding related dividend ledger modal with calculated totals', () => {
    const ptt = component.filteredSymbolSummaries().find(s => s.symbol === 'PTT.BK')!;
    component.openHoldingLedger(ptt);
    fixture.detectChanges();

    const selected = component.selectedHoldingLedger();
    expect(selected).not.toBeNull();
    expect(selected?.symbol).toBe('PTT.BK');
    expect(selected?.displaySymbol).toBe('PTT');
    expect(selected?.records.length).toBe(2);
    expect(selected?.totalGross).toBe(2600); // 1200 + 1400
    expect(selected?.totalNet).toBe(2340); // 1080 + 1260
    expect(selected?.totalWht).toBe(260); // 120 + 140

    // Check modal rendered in DOM with desktop table and mobile cards
    const compiled = fixture.nativeElement as HTMLElement;
    const modalDialog = compiled.querySelector('.modal-dialog-wide');
    expect(modalDialog).toBeTruthy();
    expect(modalDialog?.textContent).toContain('PTT');
    expect(modalDialog?.textContent).toContain('2 payouts');
    expect(modalDialog?.querySelector('.modal-desktop-table')).toBeTruthy();
    expect(modalDialog?.querySelector('.modal-mobile-cards')).toBeTruthy();
    expect(modalDialog?.querySelectorAll('.modal-record-card').length).toBe(2);

    // Close modal
    component.closeHoldingLedger();
    fixture.detectChanges();
    expect(component.selectedHoldingLedger()).toBeNull();
    expect(compiled.querySelector('.modal-dialog-wide')).toBeNull();
  });

  it('should filter Holdings table symbols and recalculate timeframe net dividends when year is selected', () => {
    component.setYear('2026');
    fixture.detectChanges();

    const symbols = component.filteredSymbolSummaries();
    // Only symbols with dividend payouts in 2026 should be included
    expect(symbols.length).toBe(1);
    expect(symbols[0].symbol).toBe('PTT.BK');
    expect(symbols[0].convertedNetDividends).toBe(1080); // 2026 payout only (not 6300 all-time)

    const assetSummaries = component.activeAssetTypeSummaries();
    const thaiStock = assetSummaries.find(a => a.assetType === 'thai-stock');
    expect(thaiStock?.totalNetDividends).toBe(1080);
  });

  it('should paginate ledger records properly', () => {
    expect(component.totalRecords()).toBe(2);
    expect(component.pageSize()).toBe(10);
    expect(component.totalPages()).toBe(1);
    expect(component.paginatedRecords().length).toBe(2);
    expect(component.startIndex()).toBe(1);
    expect(component.endIndex()).toBe(2);

    // Test changing page size
    component.setPageSize(25);
    expect(component.pageSize()).toBe(25);

    // Test navigation
    component.setPage(1);
    expect(component.currentPage()).toBe(1);
    component.nextPage();
    expect(component.currentPage()).toBe(1); // Since only 1 page
    component.prevPage();
    expect(component.currentPage()).toBe(1);
  });

  it('should compute monthlyChartData with bar heights and segments including Bonds', () => {
    const chartData = component.monthlyChartData();
    expect(chartData.length).toBe(2);
    expect(chartData[0].percentHeight).toBeGreaterThan(0);
    expect(chartData[0].thaiPercent + chartData[0].usPercent + chartData[0].fundPercent + chartData[0].bondPercent).toBeCloseTo(100);

    // Verify Bonds is present in the Monthly Cashflow Timeline legend
    const compiled = fixture.nativeElement as HTMLElement;
    const legend = compiled.querySelector('.div-legend');
    expect(legend).toBeTruthy();
    expect(legend?.textContent).toContain('Bonds');
    expect(legend?.textContent).toContain('U.S. Stocks');
    expect(legend?.textContent).toContain('Thai Stocks');
    expect(legend?.textContent).toContain('Mutual Funds');
  });

  it('should filter whole page metrics by global asset type', () => {
    component.setAssetType('thai-stock');
    fixture.detectChanges();

    expect(component.selectedAssetType()).toBe('thai-stock');
    const symbols = component.filteredSymbolSummaries();
    expect(symbols.every(s => s.assetType === 'thai-stock')).toBe(true);

    const records = component.filteredRecords();
    expect(records.every(r => r.assetType === 'thai-stock')).toBe(true);

    expect(component.activeProjectedAnnualDividends()).toBeGreaterThan(0);
    expect(component.activeYieldOnCost()).toBeGreaterThan(0);
  });

  it('should calculate accurate Yield on Cost for each asset type in activeYieldOnCost', () => {
    // All assets (default)
    component.setAssetType('all');
    expect(component.activeYieldOnCost()).toBe(7.5);

    // Thai Stocks: 2600 projected / 35000 cost = 7.428%
    component.setAssetType('thai-stock');
    expect(component.activeYieldOnCost()).toBeCloseTo(7.42857, 2);

    // U.S. Stocks: 350 projected / 65000 cost = 0.538% (verifying no 35x double currency distortion)
    component.setAssetType('us-stock');
    expect(component.activeYieldOnCost()).toBeCloseTo(0.53846, 2);

    // Mutual Funds: 250 projected / 10000 cost = 2.50%
    component.setAssetType('mutual-fund');
    expect(component.activeYieldOnCost()).toBeCloseTo(2.5, 2);

    // Bonds: 0 projected / 0 cost = 0.00%
    component.setAssetType('bond');
    expect(component.activeYieldOnCost()).toBe(0);
  });

  it('should populate per-asset-type Yield on Cost and Market Yield in activeAssetTypeSummaries', () => {
    const summaries = component.activeAssetTypeSummaries();

    const thai = summaries.find(a => a.assetType === 'thai-stock');
    expect(thai).toBeDefined();
    expect(thai?.totalCostBasis).toBe(35000);
    expect(thai?.currentValue).toBe(38000);
    expect(thai?.yieldOnCostPercent).toBeCloseTo(7.42857, 2);
    expect(thai?.currentYieldPercent).toBeCloseTo(6.8421, 2);

    const us = summaries.find(a => a.assetType === 'us-stock');
    expect(us).toBeDefined();
    expect(us?.totalCostBasis).toBe(65000);
    expect(us?.currentValue).toBe(70000);
    expect(us?.yieldOnCostPercent).toBeCloseTo(0.53846, 2);
    expect(us?.currentYieldPercent).toBeCloseTo(0.50, 2);

    const fund = summaries.find(a => a.assetType === 'mutual-fund');
    expect(fund).toBeDefined();
    expect(fund?.totalCostBasis).toBe(10000);
    expect(fund?.currentValue).toBe(11000);
    expect(fund?.yieldOnCostPercent).toBeCloseTo(2.5, 2);
    expect(fund?.currentYieldPercent).toBeCloseTo(2.2727, 2);

    const bond = summaries.find(a => a.assetType === 'bond');
    expect(bond).toBeDefined();
    expect(bond?.totalCostBasis).toBe(0);
    expect(bond?.yieldOnCostPercent).toBe(0);
    expect(bond?.currentYieldPercent).toBe(0);
  });

  it('should provide autocomplete suggestions and allow selection and clearing', () => {
    expect(component.isAutocompleteOpen()).toBe(false);

    // Focus / type
    component.onSearchFocus();
    expect(component.isAutocompleteOpen()).toBe(true);
    expect(component.autocompleteSuggestions().length).toBeGreaterThan(0);

    // Filter query
    component.searchQuery.set('PTT');
    const filteredSuggestions = component.autocompleteSuggestions();
    expect(filteredSuggestions.length).toBe(1);
    expect(filteredSuggestions[0].symbol).toBe('PTT.BK');

    // Keyboard navigation
    const eventDown = new KeyboardEvent('keydown', { key: 'ArrowDown' });
    component.onSearchKeyDown(eventDown);
    expect(component.highlightedIndex()).toBe(0);

    const eventEnter = new KeyboardEvent('keydown', { key: 'Enter' });
    component.onSearchKeyDown(eventEnter);
    expect(component.searchQuery()).toBe('PTT');
    expect(component.isAutocompleteOpen()).toBe(false);

    // Escape closes autocomplete
    component.onSearchFocus();
    const eventEscape = new KeyboardEvent('keydown', { key: 'Escape' });
    component.onSearchKeyDown(eventEscape);
    expect(component.isAutocompleteOpen()).toBe(false);

    // Clear search
    component.clearSearch();
    expect(component.searchQuery()).toBe('');
  });

  it('should handle pagination ellipsis and auto-reset to page 1 on filter changes', () => {
    // Test navigation methods
    component.setPage(1);
    component.firstPage();
    expect(component.currentPage()).toBe(1);
    component.lastPage();
    expect(component.currentPage()).toBe(1);

    // Filter changes should reset currentPage to 1
    component.currentPage.set(2);
    component.setYear('2025');
    expect(component.currentPage()).toBe(1);

    component.currentPage.set(2);
    component.setAssetType('us-stock');
    expect(component.currentPage()).toBe(1);

    component.currentPage.set(2);
    component.setPageSize(25);
    expect(component.currentPage()).toBe(1);
  });

  it('should sort symbol summaries properly', () => {
    component.setSort('yoc');
    fixture.detectChanges();
    expect(component.sortField()).toBe('yoc');
    expect(component.sortDirection()).toBe('desc');

    // Toggle direction
    component.setSort('yoc');
    expect(component.sortDirection()).toBe('asc');
  });
});
