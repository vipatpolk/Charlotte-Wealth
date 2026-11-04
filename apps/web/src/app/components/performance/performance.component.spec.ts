import { ComponentFixture, TestBed } from '@angular/core/testing';
import { PerformanceComponent } from './performance.component';
import { ComponentRef } from '@angular/core';
import { SymbolSummary, ClosedSymbolSummary } from '../../models/transaction.model';
import { PriceData } from '../../services/price.service';

describe('PerformanceComponent', () => {
  let component: PerformanceComponent;
  let fixture: ComponentFixture<PerformanceComponent>;
  let componentRef: ComponentRef<PerformanceComponent>;

  const mockPrices = new Map<string, PriceData>([
    ['AAPL', { symbol: 'AAPL', name: 'Apple Inc.', price: 140, currency: 'USD' }],
    ['PTT.BK', { symbol: 'PTT.BK', name: 'PTT PCL', price: 35, currency: 'THB' }]
  ]);

  const mockSummaries: SymbolSummary[] = [
    {
      symbol: 'AAPL',
      assetType: 'us-stock',
      currency: 'USD',
      totalShares: 10,
      totalCost: 1000,
      averageCost: 100,
      lots: []
    },
    {
      symbol: 'PTT.BK',
      assetType: 'thai-stock',
      currency: 'THB',
      totalShares: 100,
      totalCost: 3000,
      averageCost: 30,
      lots: []
    }
  ];

  const mockClosedSummaries: ClosedSymbolSummary[] = [
    {
      symbol: 'TSLA',
      assetType: 'us-stock',
      currency: 'USD',
      totalShares: 0,
      closedShares: 5,
      totalCost: 1000,
      totalProceeds: 1500,
      realizedPL: 500,
      realizedPLPercent: 50,
      averageBuyPrice: 200,
      averageSellPrice: 300,
      lots: [
        {
          symbol: 'TSLA',
          purchaseDate: '2023-01-01',
          closeDate: '2023-06-01',
          quantity: 5,
          costBasis: 200,
          sellPrice: 300,
          totalCost: 1000,
          totalProceeds: 1500,
          realizedPL: 500,
          realizedPLPercent: 50,
          currency: 'USD',
          assetType: 'us-stock'
        }
      ]
    }
  ];

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PerformanceComponent]
    }).compileComponents();

    fixture = TestBed.createComponent(PerformanceComponent);
    component = fixture.componentInstance;
    componentRef = fixture.componentRef;

    componentRef.setInput('summaries', mockSummaries);
    componentRef.setInput('closedSummaries', mockClosedSummaries);
    componentRef.setInput('transactionSummaries', []);
    componentRef.setInput('rawTransactions', []);
    componentRef.setInput('pricesMap', mockPrices);
    componentRef.setInput('displayCurrency', 'USD');
    componentRef.setInput('exchangeRate', 35);
    componentRef.setInput('hasRate', true);

    fixture.detectChanges();
  });

  it('should create component', () => {
    expect(component).toBeTruthy();
  });

  it('should calculate portfolio summary with total invested, return, and realized PL', () => {
    // Invested: AAPL (1000 USD) + PTT (3000 THB / 35 = ~85.71 USD) + TSLA (1000 USD)
    // AAPL: Value = 1400 USD, Unrealized = +400
    // PTT: Value = 3500 THB / 35 = 100 USD, Unrealized = +14.29
    // TSLA: Realized = +500 USD
    const summary = component.portfolioSummary();
    expect(summary.totalInvested).toBeCloseTo(2085.71, 2);
    expect(summary.totalCurrentValue).toBeCloseTo(1500, 2); // open positions current value
    expect(summary.totalRealizedPL).toBe(500);
    expect(summary.totalRealizedPLPercent).toBeCloseTo(50, 2);
    expect(summary.totalUnrealizedPL).toBeCloseTo(414.29, 2);
    expect(summary.totalUnrealizedPLPercent).toBeCloseTo(38.16, 2);
    expect(summary.totalReturn).toBeCloseTo(914.29, 2);
    expect(summary.totalReturnPercent).toBeCloseTo(43.84, 2);
  });

  it('should compute asset type performance grouped by asset class', () => {
    const perf = component.assetTypePerformance();
    expect(perf.length).toBe(2); // us-stock, thai-stock
    
    const usStock = perf.find(p => p.type === 'us-stock');
    expect(usStock).toBeDefined();
    expect(usStock?.investedCost).toBe(2000); // AAPL 1000 + TSLA 1000
    
    const thaiStock = perf.find(p => p.type === 'thai-stock');
    expect(thaiStock).toBeDefined();
    expect(thaiStock?.investedCost).toBeCloseTo(85.71, 2);
  });

  it('should compute symbol performance for open, closed, and both statuses', () => {
    const symPerf = component.symbolPerformance();
    expect(symPerf.length).toBe(3);
    
    const aapl = symPerf.find(s => s.symbol === 'AAPL');
    expect(aapl?.status).toBe('OPEN');
    expect(aapl?.unrealizedPL).toBe(400);
    
    const tsla = symPerf.find(s => s.symbol === 'TSLA');
    expect(tsla?.status).toBe('CLOSED');
    expect(tsla?.realizedPL).toBe(500);
  });

  it('should filter symbol performance by asset type', () => {
    component.setAssetTypeFilter('us-stock');
    fixture.detectChanges();
    
    const filtered = component.symbolPerformance();
    expect(filtered.length).toBe(2);
    expect(filtered.every(s => s.assetType === 'us-stock')).toBe(true);
  });

  it('should filter symbol performance by status', () => {
    component.setStatusFilter('open');
    fixture.detectChanges();
    
    const filtered = component.symbolPerformance();
    expect(filtered.length).toBe(2);
    expect(filtered.every(s => s.status === 'OPEN' || s.status === 'BOTH')).toBe(true);
  });

  it('should sort symbol performance by different fields', () => {
    component.setSort('symbol');
    component.sortDirection.set('asc');
    fixture.detectChanges();
    
    let symPerf = component.symbolPerformance();
    expect(symPerf[0].symbol).toBe('AAPL');
    expect(symPerf[1].symbol).toBe('PTT.BK');
    
    component.setSort('symbol'); // will toggle to desc
    fixture.detectChanges();
    symPerf = component.symbolPerformance();
    expect(symPerf[0].symbol).toBe('TSLA');
  });

  it('should filter by search query', () => {
    component.onSearchInput('tsla');
    fixture.detectChanges();
    
    const symPerf = component.symbolPerformance();
    expect(symPerf.length).toBe(1);
    expect(symPerf[0].symbol).toBe('TSLA');
  });

  it('should identify top gainers and losers correctly', () => {
    const gainers = component.topGainers();
    expect(gainers.length).toBeGreaterThan(0);
    expect(gainers[0].symbol).toBe('TSLA'); // 500 / 1000 = 50%
    
    const losers = component.topLosers();
    expect(losers.length).toBe(0); // No losers in mock data
  });

  it('should handle date range filtering for closed positions', () => {
    component.startDate.set('2024-01-01');
    component.endDate.set('2024-12-31');
    fixture.detectChanges();
    
    const symPerf = component.symbolPerformance();
    const tsla = symPerf.find(s => s.symbol === 'TSLA');
    // TSLA close date is 2023-06-01, so it shouldn't be included in range
    expect(tsla?.realizedPL).toBe(0);
  });

  it('should provide autocomplete suggestions and support selection & keyboard navigation', () => {
    // 1. Initial state (empty query) returns available symbols
    expect(component.autocompleteSuggestions().length).toBe(3);

    // 2. Typing into search opens dropdown and filters suggestions
    component.onSearchInput('AAP');
    expect(component.isSearchDropdownOpen()).toBe(true);
    expect(component.searchQuery()).toBe('AAP');
    const suggestions = component.autocompleteSuggestions();
    expect(suggestions.length).toBe(1);
    expect(suggestions[0].symbol).toBe('AAPL');

    // 3. Keyboard navigation with ArrowDown and ArrowUp
    component.onSearchInput('');
    expect(component.searchActiveIndex()).toBe(-1);

    const downEvent = new KeyboardEvent('keydown', { key: 'ArrowDown' });
    component.onSearchKeydown(downEvent);
    expect(component.searchActiveIndex()).toBe(0);

    component.onSearchKeydown(downEvent);
    expect(component.searchActiveIndex()).toBe(1);

    const upEvent = new KeyboardEvent('keydown', { key: 'ArrowUp' });
    component.onSearchKeydown(upEvent);
    expect(component.searchActiveIndex()).toBe(0);

    // 4. Enter selects active suggestion
    const enterEvent = new KeyboardEvent('keydown', { key: 'Enter' });
    component.onSearchKeydown(enterEvent);
    expect(component.searchQuery()).toBe('AAPL');
    expect(component.isSearchDropdownOpen()).toBe(false);

    // 5. Focus opens dropdown
    component.onSearchFocus();
    expect(component.isSearchFocused()).toBe(true);
    expect(component.isSearchDropdownOpen()).toBe(true);

    // 6. Escape closes dropdown
    const escEvent = new KeyboardEvent('keydown', { key: 'Escape' });
    component.onSearchKeydown(escEvent);
    expect(component.isSearchDropdownOpen()).toBe(false);

    // 7. Clear search resets query
    component.searchQuery.set('AAPL');
    component.clearSearch();
    expect(component.searchQuery()).toBe('');
    expect(component.isSearchDropdownOpen()).toBe(true);
  });

  it('should correctly calculate performance for crypto with THB transactions and USD price data', () => {
    const cryptoSummary: SymbolSummary = {
      symbol: 'BTC.CRYPTO',
      assetType: 'crypto',
      currency: 'THB',
      totalShares: 0.1,
      totalCost: 300000, // 300,000 THB invested
      averageCost: 3000000,
      lots: []
    };

    const cryptoPrices = new Map<string, PriceData>([
      ['BTC.CRYPTO', { symbol: 'BTC.CRYPTO', name: 'Bitcoin', price: 100000, currency: 'USDT' }]
    ]);

    componentRef.setInput('summaries', [cryptoSummary]);
    componentRef.setInput('closedSummaries', []);
    componentRef.setInput('pricesMap', cryptoPrices);
    componentRef.setInput('displayCurrency', 'THB');
    componentRef.setInput('exchangeRate', 35);
    fixture.detectChanges();

    const symPerf = component.symbolPerformance();
    expect(symPerf.length).toBe(1);
    const btc = symPerf[0];
    
    // Invested: 300,000 THB
    expect(btc.investedCost).toBe(300000);
    
    // Current Value: 0.1 * 100,000 USDT = 10,000 USD * 35 = 350,000 THB
    expect(btc.currentValue).toBe(350000);
    
    // Unrealized P/L: 350,000 - 300,000 = +50,000 THB
    expect(btc.unrealizedPL).toBe(50000);
    
    // Return %: 50,000 / 300,000 * 100 = 16.67%
    expect(btc.totalReturnPercent).toBeCloseTo(16.67, 2);
  });

  it('should render perf-amount and perf-return-pct elements in performance table', () => {
    fixture.detectChanges();
    const compiled = fixture.nativeElement as HTMLElement;
    const perfAmount = compiled.querySelector('.perf-amount');
    const perfReturnPct = compiled.querySelector('.perf-return-pct');

    expect(perfAmount).toBeTruthy();
    expect(perfReturnPct).toBeTruthy();
  });
});

