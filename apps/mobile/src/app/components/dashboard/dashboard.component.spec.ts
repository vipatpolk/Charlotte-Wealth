import { ComponentFixture, TestBed } from '@angular/core/testing';
import { describe, it, expect, beforeEach } from 'vitest';
import { DashboardComponent } from './dashboard.component';
import { PortfolioHoldingsResponse, PortfolioPosition } from '../../models/portfolio.model';
import { PortfolioDividendResponse } from '../../models/dividend.model';

describe('DashboardComponent', () => {
  let component: DashboardComponent;
  let fixture: ComponentFixture<DashboardComponent>;

  const mockPortfolioPositions: PortfolioPosition[] = [
    {
      symbol: 'AAPL',
      displaySymbol: 'AAPL',
      name: 'Apple Inc.',
      assetType: 'us-stock',
      assetTypeLabel: 'U.S. Stocks',
      totalShares: 10,
      totalCost: 1500,
      averageCost: 150,
      currentPrice: 200,
      holdingValue: 2000,
      unrealizedPL: 500,
      unrealizedPLPercent: 33.33,
      currency: 'USD',
      originalCurrency: 'USD',
      hasPrice: true,
      lots: [
        {
          purchaseDate: '2025-01-01',
          quantity: 10,
          costBasis: 150,
          totalCost: 1500,
          currentPrice: 200,
          holdingValue: 2000,
          unrealizedPL: 500,
          unrealizedPLPercent: 33.33,
          assetType: 'us-stock',
          currency: 'USD',
          originalCostBasis: 150,
          originalCurrency: 'USD',
        },
      ],
    },
    {
      symbol: 'TSLA',
      displaySymbol: 'TSLA',
      name: 'Tesla Inc.',
      assetType: 'us-stock',
      assetTypeLabel: 'U.S. Stocks',
      totalShares: 5,
      totalCost: 1000,
      averageCost: 200,
      currentPrice: 160,
      holdingValue: 800,
      unrealizedPL: -200,
      unrealizedPLPercent: -20,
      currency: 'USD',
      originalCurrency: 'USD',
      hasPrice: true,
      lots: [],
    },
    {
      symbol: 'PTT.BK',
      displaySymbol: 'PTT',
      name: 'PTT Public Company',
      assetType: 'thai-stock',
      assetTypeLabel: 'Thai Stocks',
      totalShares: 1000,
      totalCost: 34000,
      averageCost: 34,
      currentPrice: 35,
      holdingValue: 35000,
      unrealizedPL: 1000,
      unrealizedPLPercent: 2.94,
      currency: 'THB',
      originalCurrency: 'THB',
      hasPrice: true,
      lots: [],
    },
  ];

  const mockPortfolioData: PortfolioHoldingsResponse = {
    currency: 'USD',
    exchangeRate: 35.0,
    tabId: 'all',
    summary: {
      totalInvested: 2500,
      totalValue: 2800,
      openInvested: 2500,
      closedInvested: 0,
      totalUnrealizedPL: 300,
      totalUnrealizedPLPercent: 12.0,
      totalRealizedPL: 150,
      totalRealizedPLPercent: 6.0,
      totalReturn: 450,
      totalReturnPercent: 18.0,
    },
    openPositions: mockPortfolioPositions,
    closedPositions: [],
    rawTransactions: [
      {
        date: '2025-01-01',
        txType: 'BUY',
        symbol: 'AAPL',
        quantity: 10,
        price: 150,
        currency: 'USD',
        assetType: 'us-stock',
      },
    ],
    error: null,
  };

  const mockDividendData: PortfolioDividendResponse = {
    currency: 'USD',
    exchangeRate: 35.0,
    totalGrossDividends: 120,
    totalNetDividends: 108,
    totalWithholdingTax: 12,
    effectiveTaxRate: 10,
    projectedAnnualDividends: 120,
    portfolioDividendYield: 4.28,
    portfolioYieldOnCost: 4.8,
    annualDividends: [],
    monthlyDividends: [],
    assetTypeSummaries: [],
    symbolSummaries: [],
    records: [],
    error: null,
  };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [DashboardComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(DashboardComponent);
    component = fixture.componentInstance;
  });

  it('should create the dashboard component', () => {
    expect(component).toBeTruthy();
  });

  it('should calculate net portfolio value, invested cost and returns correctly', () => {
    fixture.componentRef.setInput('portfolioData', mockPortfolioData);
    fixture.componentRef.setInput('displayCurrency', 'USD');
    fixture.componentRef.setInput('exchangeRate', 35.0);
    fixture.componentRef.setInput('hasRate', true);
    fixture.detectChanges();

    expect(component.netPortfolioValue()).toBe(2800);
    expect(component.totalInvested()).toBe(2500);
    expect(component.unrealizedPL()).toBe(300);
    expect(component.unrealizedPLPercent()).toBe(12.0);
    expect(component.realizedPL()).toBe(150);
    expect(component.totalReturn()).toBe(450);
    expect(component.secondaryNetValue()).toBe(2800 * 35.0);
  });

  it('should identify top gainers and top losers properly', () => {
    fixture.componentRef.setInput('portfolioData', mockPortfolioData);
    fixture.detectChanges();

    const gainers = component.topGainers();
    const losers = component.topLosers();

    expect(gainers.length).toBeGreaterThan(0);
    expect(gainers[0].symbol).toBe('AAPL');
    expect(gainers[0].unrealizedPLPercent).toBe(33.33);

    expect(losers.length).toBe(1);
    expect(losers[0].symbol).toBe('TSLA');
    expect(losers[0].unrealizedPLPercent).toBe(-20);
  });

  it('should compute asset allocation breakdown with positive values', () => {
    fixture.componentRef.setInput('portfolioData', mockPortfolioData);
    fixture.componentRef.setInput('displayCurrency', 'USD');
    fixture.detectChanges();

    const allocations = component.assetAllocationList();
    expect(allocations.length).toBeGreaterThan(0);

    const totalPct = allocations.reduce((sum, item) => sum + item.percentage, 0);
    expect(Math.round(totalPct)).toBe(100);
  });

  it('should extract recent transactions list', () => {
    fixture.componentRef.setInput('portfolioData', mockPortfolioData);
    fixture.detectChanges();

    const recent = component.recentTransactions();
    expect(recent.length).toBe(1);
    expect(recent[0].symbol).toBe('AAPL');
    expect(recent[0].type).toBe('BUY');
  });

  it('should emit navigateView event when onNavigate is called', () => {
    let targetView: string | null = null;
    component.navigateView.subscribe((v) => (targetView = v));

    component.onNavigate('allocation');
    expect(targetView).toBe('allocation');

    component.onNavigate('performance');
    expect(targetView).toBe('performance');

    component.onNavigate('analytics');
    expect(targetView).toBe('analytics');

    component.onNavigate('dividends');
    expect(targetView).toBe('dividends');
  });

  it('should emit toolSelected event when onToolClick is called', () => {
    let selectedTool: string | null = null;
    component.toolSelected.subscribe((t) => (selectedTool = t));

    component.onToolClick('rebalance-planner');
    expect(selectedTool).toBe('rebalance-planner');

    component.onToolClick('tvm-calculator');
    expect(selectedTool).toBe('tvm-calculator');
  });

  it('should emit symbolSelected event when onSymbolClick is called', () => {
    let clickedSym: string | null = null;
    component.symbolSelected.subscribe((s) => (clickedSym = s));

    component.onSymbolClick('AAPL');
    expect(clickedSym).toBe('AAPL');
  });

  it('should handle null portfolioData gracefully without throwing errors', () => {
    fixture.componentRef.setInput('portfolioData', null);
    fixture.detectChanges();

    expect(component.netPortfolioValue()).toBe(0);
    expect(component.totalInvested()).toBe(0);
    expect(component.topGainers().length).toBe(0);
    expect(component.topLosers().length).toBe(0);
    expect(component.recentTransactions().length).toBe(0);
    expect(component.assetAllocationList().length).toBe(0);
  });

  it('should only include provident-fund assets in pvdPositions and ignore other asset types', () => {
    const mixedPositions: PortfolioPosition[] = [
      {
        symbol: 'PVD-EQ',
        displaySymbol: 'PVD-EQ',
        name: 'Provident Equity Fund',
        assetType: 'provident-fund',
        assetTypeLabel: 'Provident Fund',
        totalShares: 100,
        totalCost: 10000,
        averageCost: 100,
        currentPrice: 110,
        holdingValue: 11000,
        unrealizedPL: 1000,
        unrealizedPLPercent: 10,
        currency: 'THB',
        originalCurrency: 'THB',
        hasPrice: true,
        lots: [],
        employeeContribution: 5000,
        employerMatching: 5000,
      },
      {
        symbol: 'AAPL',
        displaySymbol: 'AAPL',
        name: 'Apple Inc.',
        assetType: 'us-stock',
        assetTypeLabel: 'U.S. Stocks',
        totalShares: 10,
        totalCost: 1500,
        averageCost: 150,
        currentPrice: 200,
        holdingValue: 2000,
        unrealizedPL: 500,
        unrealizedPLPercent: 33.33,
        currency: 'USD',
        originalCurrency: 'USD',
        hasPrice: true,
        lots: [],
        employeeShares: 10, // Non-PVD asset that might have employeeShares defined
      },
    ];

    fixture.componentRef.setInput('portfolioData', {
      currency: 'THB',
      exchangeRate: 1.0,
      tabId: 'all',
      summary: { totalInvested: 11500, totalValue: 13000 } as any,
      openPositions: mixedPositions,
      closedPositions: [],
    });
    fixture.detectChanges();

    expect(component.hasPvd()).toBe(true);
    expect(component.pvdPositions().length).toBe(1);
    expect(component.pvdPositions()[0].symbol).toBe('PVD-EQ');
    expect(component.pvdPositions()[0].assetType).toBe('provident-fund');
    expect(component.pvdEmployeeContribution()).toBe(5000);
    expect(component.pvdEmployerMatching()).toBe(5000);
  });

  it('should exclude provident-fund records from recentTransactions and only show real trades', () => {
    fixture.componentRef.setInput('portfolioData', {
      currency: 'USD',
      exchangeRate: 35.0,
      tabId: 'all',
      summary: {} as any,
      openPositions: [],
      closedPositions: [],
      rawTransactions: [
        {
          date: '2026-03-01',
          txType: 'BUY',
          symbol: 'PVD-FUND',
          quantity: 100,
          price: 15,
          currency: 'THB',
          assetType: 'provident-fund',
        },
        {
          date: '2026-02-15',
          txType: 'SELL',
          symbol: 'BTC.CRYPTO',
          quantity: 0.5,
          price: 90000,
          currency: 'USD',
          assetType: 'crypto',
        },
        {
          date: '2026-01-10',
          txType: 'BUY',
          symbol: 'NVDA',
          quantity: 20,
          price: 120,
          currency: 'USD',
          assetType: 'us-stock',
        },
      ],
    });
    fixture.detectChanges();

    const recent = component.recentTransactions();
    expect(recent.length).toBe(2);
    // PVD-FUND must be omitted
    expect(recent.find((tx) => tx.symbol === 'PVD-FUND')).toBeUndefined();
    // Sorted descending by date
    expect(recent[0].symbol).toBe('BTC.CRYPTO');
    expect(recent[0].type).toBe('SELL');
    expect(recent[1].symbol).toBe('NVDA');
    expect(recent[1].type).toBe('BUY');
  });

  it('should exclude provident-fund summaries and invalid quantities from transactionSummaries', () => {
    fixture.componentRef.setInput('portfolioData', {
      currency: 'USD',
      exchangeRate: 35.0,
      tabId: 'all',
      summary: {} as any,
      openPositions: [],
      closedPositions: [],
      transactionSummaries: [
        {
          symbol: 'PVD-BOND',
          assetType: 'provident-fund',
          transactions: [
            {
              id: 'pvd-1',
              date: '2026-03-01',
              type: 'BUY',
              quantity: 200,
              price: 10,
              currency: 'THB',
            } as any,
          ],
        } as any,
        {
          symbol: 'SCB.BK',
          assetType: 'thai-stock',
          transactions: [
            {
              id: 'tx-scb-0',
              date: '2026-01-01',
              type: 'BUY',
              quantity: 0, // Zero quantity should be omitted
              price: 100,
              currency: 'THB',
            } as any,
            {
              id: 'tx-scb-1',
              date: '2026-02-01',
              type: 'BUY',
              quantity: 100,
              price: 105,
              currency: 'THB',
            } as any,
          ],
        } as any,
      ],
    });
    fixture.detectChanges();

    const recent = component.recentTransactions();
    expect(recent.length).toBe(1);
    expect(recent[0].symbol).toBe('SCB.BK');
    expect(recent[0].quantity).toBe(100);
  });
});
