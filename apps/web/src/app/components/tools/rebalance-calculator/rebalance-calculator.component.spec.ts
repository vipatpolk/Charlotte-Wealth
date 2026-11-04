import { ComponentFixture, TestBed } from '@angular/core/testing';
import { describe, it, expect, beforeEach } from 'vitest';
import { RebalanceCalculatorComponent } from './rebalance-calculator.component';
import { PortfolioPosition } from '../../../models/portfolio.model';
import { PriceData } from '../../../services/price.service';

describe('RebalanceCalculatorComponent', () => {
  let component: RebalanceCalculatorComponent;
  let fixture: ComponentFixture<RebalanceCalculatorComponent>;

  const mockPositions: PortfolioPosition[] = [
    {
      symbol: 'NVDA',
      displaySymbol: 'NVDA',
      name: 'NVIDIA Corporation',
      assetType: 'us-stock',
      assetTypeLabel: 'US Stock',
      currency: 'USD',
      originalCurrency: 'USD',
      totalShares: 100,
      averageCost: 100,
      totalCost: 10000,
      currentPrice: 150,
      holdingValue: 15000,
      unrealizedPL: 5000,
      unrealizedPLPercent: 50,
      hasPrice: true,
      lots: [],
    },
    {
      symbol: 'AAPL',
      displaySymbol: 'AAPL',
      name: 'Apple Inc',
      assetType: 'us-stock',
      assetTypeLabel: 'US Stock',
      currency: 'USD',
      originalCurrency: 'USD',
      totalShares: 100,
      averageCost: 200,
      totalCost: 20000,
      currentPrice: 250,
      holdingValue: 25000,
      unrealizedPL: 5000,
      unrealizedPLPercent: 25,
      hasPrice: true,
      lots: [],
    },
  ];

  const mockPrices = new Map<string, PriceData>([
    ['NVDA', { symbol: 'NVDA', name: 'NVIDIA Corporation', price: 150, currency: 'USD' }],
    ['AAPL', { symbol: 'AAPL', name: 'Apple Inc', price: 250, currency: 'USD' }],
  ]);

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [RebalanceCalculatorComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(RebalanceCalculatorComponent);
    component = fixture.componentInstance;

    fixture.componentRef.setInput('portfolioPositions', mockPositions);
    fixture.componentRef.setInput('pricesMap', mockPrices);
    fixture.componentRef.setInput('displayCurrency', 'USD');
    fixture.componentRef.setInput('exchangeRate', 35.0);
    fixture.componentRef.setInput('hasRate', true);
    fixture.componentRef.setInput('privacyMode', false);

    fixture.detectChanges();
  });

  it('should create RebalanceCalculatorComponent and default to standard mode', () => {
    expect(component).toBeTruthy();
    expect(component.mode()).toBe('standard');
    expect(component.noSellSubMode()).toBe('min-inflow');
    expect(component.selectedAssetClassFilter()).toBe('all');
  });

  it('should group positions by asset class and calculate current class weights', () => {
    const plan = component.masterPlan();
    expect(plan.groups.length).toBe(1);
    const usGroup = plan.groups[0];
    expect(usGroup.assetType).toBe('us-stock');
    expect(usGroup.currentValue).toBe(40000);
    expect(usGroup.symbols.length).toBe(2);

    const nvda = usGroup.symbols.find((s) => s.symbol === 'NVDA')!;
    expect(nvda.currentClassPercent).toBe(37.5);

    const aapl = usGroup.symbols.find((s) => s.symbol === 'AAPL')!;
    expect(aapl.currentClassPercent).toBe(62.5);
  });

  it('should calculate standard buy/sell orders when target is set to 50/50', () => {
    component.updateTarget('NVDA', 50);
    component.updateTarget('AAPL', 50);

    const plan = component.masterPlan();
    const nvda = plan.groups[0].symbols.find((s) => s.symbol === 'NVDA')!;
    expect(nvda.action).toBe('BUY');
    expect(nvda.deltaValue).toBe(5000);

    const aapl = plan.groups[0].symbols.find((s) => s.symbol === 'AAPL')!;
    expect(aapl.action).toBe('SELL');
    expect(aapl.deltaValue).toBe(-5000);

    expect(plan.totalBuyAmount).toBe(5000);
    expect(plan.totalSellAmount).toBe(5000);
  });

  it('should switch to no-sell mode and compute minimum inflow needed', () => {
    component.setMode('no-sell');
    component.setNoSellSubMode('min-inflow');
    component.updateTarget('NVDA', 50);
    component.updateTarget('AAPL', 50);

    const plan = component.masterPlan();
    expect(plan.mode).toBe('no-sell');
    expect(plan.cashContribution).toBe(10000);
    expect(plan.totalBuyAmount).toBe(10000);
    expect(plan.totalSellAmount).toBe(0);

    const nvda = plan.groups[0].symbols.find((s) => s.symbol === 'NVDA')!;
    expect(nvda.action).toBe('BUY');
    expect(nvda.deltaValue).toBe(10000);

    const aapl = plan.groups[0].symbols.find((s) => s.symbol === 'AAPL')!;
    expect(aapl.action).toBe('BALANCED');
    expect(aapl.isAnchorPosition).toBe(true);
  });

  it('should handle custom cash deposit in no-sell mode', () => {
    component.setMode('no-sell');
    component.setNoSellSubMode('custom-deposit');
    component.setCustomCashDeposit(5000);
    component.updateTarget('NVDA', 50);
    component.updateTarget('AAPL', 50);

    const plan = component.masterPlan();
    expect(plan.cashContribution).toBe(5000);
    expect(plan.totalBuyAmount).toBe(5000);
    expect(plan.totalSellAmount).toBe(0);
  });

  it('should adjust targets with steppers and helper methods', () => {
    component.adjustTarget('NVDA', 5);
    expect(component.targetAllocations()['NVDA']).toBe(55);

    component.adjustTarget('NVDA', -10);
    expect(component.targetAllocations()['NVDA']).toBe(45);
  });

  it('should apply quick actions: Equal Weight, Current Weight, and Normalize', () => {
    const group = component.masterPlan().groups[0];

    component.applyEqualWeight(group);
    expect(component.targetAllocations()['NVDA']).toBe(50);
    expect(component.targetAllocations()['AAPL']).toBe(50);

    component.applyCurrentWeight(group);
    expect(component.targetAllocations()['NVDA']).toBe(37.5);
    expect(component.targetAllocations()['AAPL']).toBe(62.5);

    component.updateTarget('NVDA', 20);
    component.updateTarget('AAPL', 60);
    component.normalizeGroup(group);
    expect(component.targetAllocations()['NVDA']).toBe(25);
    expect(component.targetAllocations()['AAPL']).toBe(75);
  });

  it('should toggle orders drawer expansion and filter asset classes', () => {
    expect(component.isOrdersExpanded()).toBe(true);
    component.toggleOrdersExpanded();
    expect(component.isOrdersExpanded()).toBe(false);

    component.setAssetClassFilter('us-stock');
    expect(component.selectedAssetClassFilter()).toBe('us-stock');
    expect(component.displayedGroups().length).toBe(1);

    component.setAssetClassFilter('crypto');
    expect(component.displayedGroups().length).toBe(0);
  });

  it('should refresh KPI grid and orders checklist to reflect the selected asset class filter', () => {
    // NVDA (15k) and AAPL (25k) -> US Stock total = 40k
    component.updateTarget('NVDA', 50);
    component.updateTarget('AAPL', 50);

    // All classes filter
    component.setAssetClassFilter('all');
    expect(component.filteredCurrentValue()).toBe(40000);
    expect(component.filteredBuyAmount()).toBe(5000);
    expect(component.filteredSellAmount()).toBe(5000);
    expect(component.filteredOrders().length).toBe(2);
    expect(component.currentValueLabel()).toBe('Current Portfolio Value');
    expect(component.targetValueLabel()).toBe('Resulting Portfolio Value');

    // Filter to 'us-stock'
    component.setAssetClassFilter('us-stock');
    expect(component.filteredCurrentValue()).toBe(40000);
    expect(component.filteredBuyAmount()).toBe(5000);
    expect(component.filteredSellAmount()).toBe(5000);
    expect(component.filteredOrders().length).toBe(2);
    expect(component.currentValueLabel()).toBe('Current Class Value');
    expect(component.targetValueLabel()).toBe('Resulting Class Value');


    // Filter to an asset class with no holdings (e.g. 'crypto')
    component.setAssetClassFilter('crypto');
    expect(component.filteredCurrentValue()).toBe(0);
    expect(component.filteredBuyAmount()).toBe(0);
    expect(component.filteredSellAmount()).toBe(0);
    expect(component.filteredOrders().length).toBe(0);
  });
});

