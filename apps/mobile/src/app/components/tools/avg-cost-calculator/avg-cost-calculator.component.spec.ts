import { ComponentFixture, TestBed } from '@angular/core/testing';
import { describe, it, expect, beforeEach } from 'vitest';
import { AvgCostCalculatorComponent } from './avg-cost-calculator.component';
import { PortfolioPosition } from '../../../models/portfolio.model';
import { PriceData } from '../../../services/price.service';

describe('AvgCostCalculatorComponent', () => {
  let component: AvgCostCalculatorComponent;
  let fixture: ComponentFixture<AvgCostCalculatorComponent>;

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
      averageCost: 150,
      totalCost: 15000,
      currentPrice: 140,
      holdingValue: 14000,
      unrealizedPL: -1000,
      unrealizedPLPercent: -6.67,
      hasPrice: true,
      lots: [],
    },
    {
      symbol: 'PTT.BK',
      displaySymbol: 'PTT',
      name: 'PTT Public Company Limited',
      assetType: 'thai-stock',
      assetTypeLabel: 'Thai Stock',
      currency: 'THB',
      originalCurrency: 'THB',
      totalShares: 1000,
      averageCost: 35,
      totalCost: 35000,
      currentPrice: 33,
      holdingValue: 33000,
      unrealizedPL: -2000,
      unrealizedPLPercent: -5.71,
      hasPrice: true,
      lots: [],
    },
  ];

  const mockPrices = new Map<string, PriceData>([
    ['NVDA', { symbol: 'NVDA', name: 'NVIDIA Corporation', price: 140, currency: 'USD' }],
    ['PTT.BK', { symbol: 'PTT.BK', name: 'PTT Public Company Limited', price: 33, currency: 'THB' }],
  ]);

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AvgCostCalculatorComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(AvgCostCalculatorComponent);
    component = fixture.componentInstance;

    fixture.componentRef.setInput('portfolioPositions', mockPositions);
    fixture.componentRef.setInput('pricesMap', mockPrices);
    fixture.componentRef.setInput('displayCurrency', 'USD');
    fixture.componentRef.setInput('exchangeRate', 35.0);
    fixture.componentRef.setInput('hasRate', true);
    fixture.componentRef.setInput('privacyMode', false);
    fixture.componentRef.setInput('initialSymbol', 'NVDA');

    fixture.detectChanges();
  });

  it('should initialize with provided initial symbol', () => {
    expect(component).toBeTruthy();
    expect(component.selectedSymbol()).toBe('NVDA');
    expect(component.hasSelectedSymbol()).toBe(true);
    expect(component.positionSnapshot().totalShares).toBe(100);
    expect(component.positionSnapshot().averageCost).toBe(150);
  });

  it('should default to Select symbol and disable calculation when no symbol is selected', () => {
    const unselectedFixture = TestBed.createComponent(AvgCostCalculatorComponent);
    const unselectedComp = unselectedFixture.componentInstance;
    unselectedFixture.componentRef.setInput('portfolioPositions', mockPositions);
    unselectedFixture.componentRef.setInput('pricesMap', mockPrices);
    unselectedFixture.componentRef.setInput('displayCurrency', 'USD');
    unselectedFixture.componentRef.setInput('initialSymbol', '');
    unselectedFixture.detectChanges();

    expect(unselectedComp.selectedSymbol()).toBe('');
    expect(unselectedComp.hasSelectedSymbol()).toBe(false);
    expect(unselectedComp.positionSnapshot().symbol).toBe('NONE');
    expect(unselectedComp.positionSnapshot().displaySymbol).toBe('Select symbol');

    // Selecting a symbol enables calculator
    unselectedComp.selectSymbol('NVDA');
    expect(unselectedComp.hasSelectedSymbol()).toBe(true);
    expect(unselectedComp.selectedSymbol()).toBe('NVDA');
  });

  it('should compute forward simulation results correctly when BUY is simulated', () => {
    component.inputShares.set(100);
    component.inputPrice.set(100);
    component.inputFeePercent.set(0);
    fixture.detectChanges();

    const res = component.simulationResult();
    expect(res.simulated.totalShares).toBe(200);
    expect(res.simulated.averageCost).toBe(125);
    expect(res.delta.averageCost).toBe(-25);
  });

  it('should handle custom simulation mode', () => {
    component.enableCustomMode();
    component.customSymbol.set('TSLA');
    component.customShares.set(50);
    component.customAvgCost.set(200);
    component.customMarketPrice.set(180);
    component.inputShares.set(50);
    component.inputPrice.set(150);
    fixture.detectChanges();

    expect(component.isCustomMode()).toBe(true);
    const snap = component.positionSnapshot();
    expect(snap.symbol).toBe('TSLA');
    expect(snap.totalShares).toBe(50);

    const sim = component.simulationResult();
    expect(sim.simulated.totalShares).toBe(100);
    // (50*200 + 50*150) / 100 = 17,500 / 100 = 175
    expect(sim.simulated.averageCost).toBe(175);
  });

  it('should queue multiple steps and remove steps', () => {
    component.inputShares.set(20);
    component.inputPrice.set(100);
    component.addStepToQueue();
    fixture.detectChanges();

    expect(component.queuedSteps().length).toBe(1);

    const stepId = component.queuedSteps()[0].id;
    component.removeQueuedStep(stepId);
    fixture.detectChanges();

    expect(component.queuedSteps().length).toBe(0);
  });

  it('should compute reverse target cost goal correctly', () => {
    component.mode.set('reverse');
    component.targetAvgCost.set(130);
    component.targetBuyPrice.set(110);
    component.targetFeePercent.set(0);
    fixture.detectChanges();

    const goal = component.reverseGoalResult();
    expect(goal.isValid).toBe(true);
    // 100 * (150 - 130) / (130 - 110) = 2000 / 20 = 100 shares
    expect(goal.requiredShares).toBe(100);
    expect(goal.achievedAvgCost).toBe(130);
  });

  it('should apply reverse goal to simulation mode', () => {
    component.mode.set('reverse');
    component.targetAvgCost.set(130);
    component.targetBuyPrice.set(110);
    fixture.detectChanges();

    component.applyReverseGoalToSimulation();
    fixture.detectChanges();

    expect(component.mode()).toBe('forward');
    expect(component.inputShares()).toBe(100);
    expect(component.inputPrice()).toBe(110);
  });

  it('should support inputting buy order by amount and calculate shares correctly', () => {
    component.setInputMode('amount');
    expect(component.inputMode()).toBe('amount');

    // NVDA price is 140, let's set price to 100 and amount to 10,000 -> 100 shares
    component.onPriceInput(100);
    component.onAmountInput(10000);
    fixture.detectChanges();

    expect(component.inputShares()).toBe(100);
    expect(component.inputAmount()).toBe(10000);

    const sim = component.simulationResult();
    expect(sim.simulated.totalShares).toBe(200); // 100 initial + 100 new
    expect(sim.simulated.totalCost).toBe(25000);
    expect(sim.simulated.averageCost).toBe(125);
  });

  it('should handle amount chips and max sell amount', () => {
    component.setInputMode('amount');
    component.onPriceInput(100);

    component.applyAmountAddition(5000);
    expect(component.inputAmount()).toBe(5000);
    expect(component.inputShares()).toBe(50);

    // Initial position has 100 shares @ $140 market price = $14,000
    component.applyAmountMultiplier(0.5);
    expect(component.inputAmount()).toBe(7000);
    expect(component.inputShares()).toBe(70);

    component.applyMaxSellAmount();
    expect(component.inputAmount()).toBe(10000); // 100 shares * 100 price
    expect(component.inputShares()).toBe(100);
  });

  it('should trigger calculate method and refresh simulation results', () => {
    let emittedSim: any = null;
    component.simulationChange.subscribe((sim) => (emittedSim = sim));

    component.onSharesInput(50);
    component.onPriceInput(100);
    component.calculate();

    expect(component.isCalculating()).toBe(true);
  });

  it('should apply quick price dip adjustments and market price', () => {
    // Current price is 140
    component.applyMarketPrice();
    expect(component.inputPrice()).toBe(140);

    // 5% dip of 140 = 133
    component.applyPriceQuickDip(-5);
    expect(component.inputPrice()).toBe(133);

    // 10% premium of 140 = 154
    component.applyPriceQuickDip(10);
    expect(component.inputPrice()).toBe(154);
  });

  it('should apply share multiplier chips and max sell shares', () => {
    // 100 shares held
    component.applyShareMultiplier(0.5);
    expect(component.inputShares()).toBe(50);

    component.applyShareMultiplier(2);
    expect(component.inputShares()).toBe(200);

    component.applyMaxSellShares();
    expect(component.inputShares()).toBe(100);
  });

  it('should clear all queued steps', () => {
    component.inputShares.set(25);
    component.inputPrice.set(120);
    component.addStepToQueue();
    expect(component.queuedSteps().length).toBe(1);

    component.clearAllSteps();
    expect(component.queuedSteps().length).toBe(0);
    expect(component.inputShares()).toBe(50);
  });

  it('should return error when reverse target cost is mathematically infeasible', () => {
    component.mode.set('reverse');
    // Trying to average down to 120 when buying at 130 (impossible)
    component.targetAvgCost.set(120);
    component.targetBuyPrice.set(130);
    fixture.detectChanges();

    const goal = component.reverseGoalResult();
    expect(goal.isValid).toBe(false);
    expect(goal.errorMessage).toContain('cannot average down');
  });

  it('should reactively convert position snapshot when displayCurrency switches', () => {
    // Initial in USD (NVDA averageCost=150, currentPrice=140, totalCost=15000)
    fixture.componentRef.setInput('displayCurrency', 'USD');
    fixture.componentRef.setInput('exchangeRate', 35.0);
    fixture.componentRef.setInput('hasRate', true);
    fixture.detectChanges();

    expect(component.positionSnapshot().currency).toBe('USD');
    expect(component.positionSnapshot().averageCost).toBe(150);
    expect(component.positionSnapshot().totalCost).toBe(15000);

    // Switch to THB
    fixture.componentRef.setInput('displayCurrency', 'THB');
    fixture.detectChanges();

    expect(component.positionSnapshot().currency).toBe('THB');
    expect(component.positionSnapshot().averageCost).toBe(150 * 35);
    expect(component.positionSnapshot().totalCost).toBe(15000 * 35);
    expect(component.positionSnapshot().currentPrice).toBe(140 * 35);
  });
});
