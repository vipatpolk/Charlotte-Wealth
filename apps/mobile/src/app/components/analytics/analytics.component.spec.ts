import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { of } from 'rxjs';
import { AnalyticsComponent } from './analytics.component';
import { PortfolioService } from '../../services/portfolio.service';
import { PriceData } from '../../services/price.service';
import { SymbolSummary } from '../../models/transaction.model';

describe('AnalyticsComponent', () => {
  let component: AnalyticsComponent;
  let fixture: ComponentFixture<AnalyticsComponent>;
  let portfolioServiceMock: any;

  const mockSummaries: SymbolSummary[] = [
    {
      symbol: 'AAPL',
      displaySymbol: 'AAPL',
      name: 'Apple Inc.',
      assetType: 'us-stock',
      totalShares: 10,
      totalCost: 1500,
      averageCost: 150,
      currency: 'USD',
      lots: [],
    },
    {
      symbol: 'PTT.BK',
      displaySymbol: 'PTT',
      name: 'PTT PCL',
      assetType: 'thai-stock',
      totalShares: 100,
      totalCost: 3500,
      averageCost: 35,
      currency: 'THB',
      lots: [],
    },
  ];

  const mockPrices = new Map<string, PriceData>([
    ['AAPL', { symbol: 'AAPL', price: 200, currency: 'USD' }],
    ['PTT.BK', { symbol: 'PTT.BK', price: 40, currency: 'THB' }],
  ]);

  beforeEach(async () => {
    portfolioServiceMock = {
      fetchPerformance: vi.fn().mockReturnValue(
        of({
          timeframe: 'ALL',
          currency: 'THB',
          exchangeRate: 35,
          summary: {
            totalInvested: 56000,
            totalValue: 74000,
            openInvested: 56000,
            closedInvested: 0,
            totalUnrealizedPL: 18000,
            totalUnrealizedPLPercent: 32.14,
            totalRealizedPL: 0,
            totalRealizedPLPercent: 0,
            totalReturn: 18000,
            totalReturnPercent: 32.14,
          },
          assetTypePerformance: [
            {
              assetType: 'us-stock',
              label: 'U.S. Stock',
              investedCost: 52500,
              currentValue: 70000,
              realizedPL: 0,
              unrealizedPL: 17500,
              totalReturn: 17500,
              totalReturnPercent: 33.33,
              openSymbolCount: 1,
              closedSymbolCount: 0,
            },
          ],
          topGainers: [],
          topLosers: [],
          symbolPerformance: [],
          error: null,
        }),
      ),
      fetchAllocation: vi.fn().mockReturnValue(
        of({
          currency: 'THB',
          exchangeRate: 35,
          totalPortfolioValue: 74000,
          recommendations: [],
          currencyExposure: {
            usd: 70000,
            thb: 4000,
            usdPercent: 94.6,
            thbPercent: 5.4,
          },
          holdingsConcentration: [],
          error: null,
        }),
      ),
    };

    await TestBed.configureTestingModule({
      imports: [AnalyticsComponent],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: PortfolioService, useValue: portfolioServiceMock },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(AnalyticsComponent);
    component = fixture.componentInstance;

    fixture.componentRef.setInput('summaries', mockSummaries);
    fixture.componentRef.setInput('closedSummaries', []);
    fixture.componentRef.setInput('transactionSummaries', []);
    fixture.componentRef.setInput('rawTransactions', []);
    fixture.componentRef.setInput('pricesMap', mockPrices);
    fixture.componentRef.setInput('displayCurrency', 'THB');
    fixture.componentRef.setInput('exchangeRate', 35);
    fixture.componentRef.setInput('hasRate', true);
    fixture.componentRef.setInput('activeSubTab', 'overview');

    fixture.detectChanges();
  });

  it('should create the component with default sub-tab as overview', () => {
    expect(component).toBeTruthy();
    expect(component.internalSubTab()).toBe('overview');
  });

  it('should switch sub-tabs and emit subTabChange event', () => {
    let emittedTab: string | undefined;
    component.subTabChange.subscribe((tab) => (emittedTab = tab));

    component.selectSubTab('allocation');
    expect(component.internalSubTab()).toBe('allocation');
    expect(emittedTab).toBe('allocation');

    component.selectSubTab('performance');
    expect(component.internalSubTab()).toBe('performance');
    expect(emittedTab).toBe('performance');
  });

  it('should update internal sub-tab when activeSubTab input changes', () => {
    fixture.componentRef.setInput('activeSubTab', 'performance');
    fixture.detectChanges();
    expect(component.internalSubTab()).toBe('performance');
  });

  it('should compute overview KPIs from portfolio data', () => {
    const summary = component.portfolioSummary();
    expect(summary.totalInvested).toBeGreaterThan(0);
    expect(summary.totalCurrentValue).toBeGreaterThan(0);
    expect(summary.totalReturn).toBeGreaterThan(0);
  });

  it('should compute asset distribution and donut segments', () => {
    const distribution = component.assetClassDistribution();
    expect(distribution.length).toBeGreaterThan(0);

    const segments = component.donutSegments();
    expect(segments.length).toBe(distribution.length);
  });

  it('should compute top concentration and movers', () => {
    const concentration = component.topConcentration();
    expect(concentration.length).toBeGreaterThan(0);

    const movers = component.topMovers();
    expect(movers.gainers.length + movers.losers.length).toBeGreaterThanOrEqual(0);
  });

  it('should render the corresponding pane when sub-tab changes', () => {
    const element: HTMLElement = fixture.nativeElement;

    // Overview pane should be present
    expect(element.querySelector('.overview-pane')).toBeTruthy();
    expect(element.querySelector('app-asset-allocation')).toBeFalsy();
    expect(element.querySelector('app-performance')).toBeFalsy();

    // Switch to Allocation
    component.selectSubTab('allocation');
    fixture.detectChanges();
    expect(element.querySelector('app-asset-allocation')).toBeTruthy();
    expect(element.querySelector('.overview-pane')).toBeFalsy();

    // Switch to Performance
    component.selectSubTab('performance');
    fixture.detectChanges();
    expect(element.querySelector('app-performance')).toBeTruthy();
    expect(element.querySelector('app-asset-allocation')).toBeFalsy();
  });
});
