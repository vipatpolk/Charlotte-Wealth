import { ComponentFixture, TestBed } from '@angular/core/testing';
import { describe, it, expect, beforeEach } from 'vitest';
import { TvmCalculatorComponent } from './tvm-calculator.component';
import { PortfolioPosition, PortfolioSummary } from '../../../models/portfolio.model';

describe('TvmCalculatorComponent', () => {
  let component: TvmCalculatorComponent;
  let fixture: ComponentFixture<TvmCalculatorComponent>;

  const mockPositions: PortfolioPosition[] = [
    {
      symbol: 'AAPL',
      displaySymbol: 'AAPL',
      name: 'Apple Inc.',
      assetType: 'us-stock',
      assetTypeLabel: 'US Stock',
      currency: 'USD',
      originalCurrency: 'USD',
      totalShares: 100,
      averageCost: 150,
      totalCost: 15000,
      currentPrice: 180,
      holdingValue: 18000,
      unrealizedPL: 3000,
      unrealizedPLPercent: 20,
      hasPrice: true,
      lots: [],
    },
    {
      symbol: 'BTC.CRYPTO',
      displaySymbol: 'BTC',
      name: 'Bitcoin',
      assetType: 'crypto',
      assetTypeLabel: 'Cryptocurrency',
      currency: 'USD',
      originalCurrency: 'USD',
      totalShares: 0.1,
      averageCost: 40000,
      totalCost: 4000,
      currentPrice: 50000,
      holdingValue: 5000,
      unrealizedPL: 1000,
      unrealizedPLPercent: 25,
      hasPrice: true,
      lots: [],
    },
  ];

  const mockSummary: PortfolioSummary = {
    totalInvested: 19000,
    totalValue: 23000,
    openInvested: 19000,
    closedInvested: 0,
    totalUnrealizedPL: 4000,
    totalUnrealizedPLPercent: 21.05,
    totalRealizedPL: 0,
    totalRealizedPLPercent: 0,
    totalReturn: 4000,
    totalReturnPercent: 21.05,
  };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [TvmCalculatorComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(TvmCalculatorComponent);
    component = fixture.componentInstance;

    fixture.componentRef.setInput('portfolioPositions', mockPositions);
    fixture.componentRef.setInput('portfolioSummary', mockSummary);
    fixture.componentRef.setInput('displayCurrency', 'USD');
    fixture.componentRef.setInput('exchangeRate', 35.0);
    fixture.componentRef.setInput('hasRate', true);
    fixture.componentRef.setInput('privacyMode', false);

    fixture.detectChanges();
  });

  it('should create TvmCalculatorComponent and default to FV mode with portfolio value', () => {
    expect(component).toBeTruthy();
    expect(component.solveMode()).toBe('FV');
    expect(component.portfolioMarketValue()).toBe(23000);
    expect(component.effectivePresentValue()).toBe(23000);
  });

  it('should list all available asset type options with aggregated values', () => {
    const options = component.assetTypeOptions();
    expect(options.length).toBe(2);
    expect(options.find((o) => o.id === 'us-stock')?.holdingValue).toBe(18000);
    expect(options.find((o) => o.id === 'crypto')?.holdingValue).toBe(5000);
  });

  it('should allow filtering Present Value by specific asset type', () => {
    component.toggleAssetType('crypto');
    expect(component.isAssetTypeSelected('crypto')).toBe(true);
    expect(component.isAssetTypeSelected('all')).toBe(false);
    expect(component.effectivePresentValue()).toBe(5000);
  });

  it('should allow multi-selecting asset types to combine Present Value', () => {
    component.toggleAssetType('crypto');
    component.toggleAssetType('us-stock');
    expect(component.isAssetTypeSelected('crypto')).toBe(true);
    expect(component.isAssetTypeSelected('us-stock')).toBe(true);
    expect(component.effectivePresentValue()).toBe(23000);
  });

  it('should reset to All Classes when all chip is clicked', () => {
    component.toggleAssetType('crypto');
    expect(component.effectivePresentValue()).toBe(5000);

    component.toggleAssetType('all');
    expect(component.isAssetTypeSelected('all')).toBe(true);
    expect(component.effectivePresentValue()).toBe(23000);
  });

  it('should compute future value reactively based on default parameters', () => {
    const res = component.calculationResult();
    expect(res.isValid).toBe(true);
    expect(res.futureValue).toBeGreaterThan(0);
    expect(res.totalPrincipal).toBe(23000);
  });

  it('should switch solve modes and update results', () => {
    component.setSolveMode('PMT');
    expect(component.solveMode()).toBe('PMT');

    component.targetFutureValue.set(100000);
    const res = component.calculationResult();
    expect(res.isValid).toBe(true);
    expect(res.payment).toBeGreaterThan(0);
  });

  it('should switch PV source mode between portfolio, invested cost, and custom', () => {
    component.setPvSource('invested');
    expect(component.effectivePresentValue()).toBe(19000);

    component.setPvSource('custom');
    component.customPresentValue.set(50000);
    expect(component.effectivePresentValue()).toBe(50000);
  });

  it('should update compounding frequency and close dropdown', () => {
    component.toggleCompoundingDropdown();
    expect(component.isCompoundingDropdownOpen()).toBe(true);

    component.setCompounding('annually');
    expect(component.compounding()).toBe('annually');
    expect(component.isCompoundingDropdownOpen()).toBe(false);
  });

  it('should toggle schedule table expansion', () => {
    expect(component.isScheduleExpanded()).toBe(false);
    component.toggleSchedule();
    expect(component.isScheduleExpanded()).toBe(true);
  });

  it('should generate accurate SVG growth chart data and paths', () => {
    const chart = component.growthChartData();
    expect(chart.points.length).toBe(11); // Year 0 to Year 10
    expect(chart.points[0].year).toBe(0);
    expect(chart.points[0].balance).toBe(23000);
    expect(chart.points[10].year).toBe(10);
    expect(chart.pathTotalBalance).toContain('M');
    expect(chart.pathTotalBalanceArea).toContain('Z');
    expect(chart.gridLines.length).toBe(5);
    expect(chart.xTicks.length).toBeGreaterThanOrEqual(3);
  });

  it('should handle chart hover and area mode toggle', () => {
    expect(component.hoveredPoint()).toBeNull();
    const chart = component.growthChartData();
    component.setHoveredPoint(chart.points[5]);
    expect(component.hoveredPoint()?.year).toBe(5);

    expect(component.isAreaChartMode()).toBe(true);
    component.toggleAreaChartMode();
    expect(component.isAreaChartMode()).toBe(false);
  });

  it('should provide accurate pvSourceDescription based on selected asset classes and basis', () => {
    expect(component.pvSourceDescription()).toBe('All Portfolio Assets (Market Value)');

    component.setPvSource('invested');
    expect(component.pvSourceDescription()).toBe('All Portfolio Assets (Invested Cost)');

    component.toggleAssetType('crypto');
    expect(component.pvSourceDescription()).toBe('Cryptocurrency (Invested Cost)');

    component.setPvSource('custom');
    expect(component.pvSourceDescription()).toBe('Custom manual value');
  });

  it('should support solving for PV, N, and RATE', () => {
    // Solve PV
    component.setSolveMode('PV');
    component.payment.set(1000);
    component.targetFutureValue.set(500000);
    let res = component.calculationResult();
    expect(res.mode).toBe('PV');
    expect(res.presentValue).toBeGreaterThan(0);

    // Solve N (Periods)
    component.setSolveMode('N');
    component.targetFutureValue.set(1000000);
    res = component.calculationResult();
    expect(res.mode).toBe('N');
    expect(res.years).toBeGreaterThan(0);

    // Solve RATE (CAGR)
    component.setSolveMode('RATE');
    component.targetFutureValue.set(2000000);
    res = component.calculationResult();
    expect(res.mode).toBe('RATE');
    expect(res.annualRatePct).toBeGreaterThan(0);
  });

  it('should handle payment timing switch between end and beginning of period', () => {
    component.setSolveMode('FV');
    component.setPaymentTiming('end');
    const fvOrdinary = component.calculationResult().futureValue;

    component.setPaymentTiming('beginning');
    const fvAnnuityDue = component.calculationResult().futureValue;

    expect(fvAnnuityDue).toBeGreaterThan(fvOrdinary);
  });

  it('should adjust values with steppers and helper methods', () => {
    const initPv = component.customPresentValue();
    component.adjustPresentValue(10000);
    expect(component.customPresentValue()).toBe(initPv + 10000);
    expect(component.pvSource()).toBe('custom');

    const initPmt = component.payment();
    component.adjustPayment(5000);
    expect(component.payment()).toBe(initPmt + 5000);

    const initRate = component.annualRatePct();
    component.adjustAnnualRate(1.5);
    expect(component.annualRatePct()).toBe(initRate + 1.5);

    const initYears = component.years();
    component.adjustYears(5);
    expect(component.years()).toBe(initYears + 5);

    const initTargetFv = component.targetFutureValue();
    component.adjustTargetFv(500000);
    expect(component.targetFutureValue()).toBe(initTargetFv + 500000);

    component.closeCompoundingDropdown();
    expect(component.isCompoundingDropdownOpen()).toBe(false);
  });

  it('should handle edge cases in growthChartData gracefully', () => {
    component.years.set(0);
    const chart = component.growthChartData();
    expect(chart.points.length).toBe(0);
    expect(chart.pathTotalBalance).toBe('');
  });

  it('should reactively convert portfolioMarketValue and portfolioInvestedCost when displayCurrency changes', () => {
    fixture.componentRef.setInput('displayCurrency', 'USD');
    fixture.componentRef.setInput('exchangeRate', 35.0);
    fixture.componentRef.setInput('hasRate', true);
    fixture.detectChanges();

    // mockSummary has totalValue: 23000, openInvested: 19000 (in USD)
    expect(component.portfolioMarketValue()).toBe(23000);
    expect(component.portfolioInvestedCost()).toBe(19000);

    // Switch to THB
    fixture.componentRef.setInput('displayCurrency', 'THB');
    fixture.detectChanges();

    expect(component.portfolioMarketValue()).toBe(23000 * 35);
    expect(component.portfolioInvestedCost()).toBe(19000 * 35);
  });
});
