import { ComponentFixture, TestBed } from '@angular/core/testing';
import { describe, it, expect, beforeEach } from 'vitest';
import { ToolsComponent } from './tools.component';
import { PortfolioPosition } from '../../models/portfolio.model';
import { PriceData } from '../../services/price.service';

describe('ToolsComponent', () => {
  let component: ToolsComponent;
  let fixture: ComponentFixture<ToolsComponent>;

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
  ];

  const mockPrices = new Map<string, PriceData>([
    ['NVDA', { symbol: 'NVDA', name: 'NVIDIA Corporation', price: 140, currency: 'USD' }],
  ]);

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ToolsComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(ToolsComponent);
    component = fixture.componentInstance;

    fixture.componentRef.setInput('portfolioPositions', mockPositions);
    fixture.componentRef.setInput('pricesMap', mockPrices);
    fixture.componentRef.setInput('displayCurrency', 'USD');
    fixture.componentRef.setInput('exchangeRate', 35.0);
    fixture.componentRef.setInput('hasRate', true);
    fixture.componentRef.setInput('privacyMode', false);

    fixture.detectChanges();
  });

  it('should create ToolsComponent and default to avg-cost-calculator', () => {
    expect(component).toBeTruthy();
    expect(component.activeToolId()).toBe('avg-cost-calculator');
    expect(component.activeTool().id).toBe('avg-cost-calculator');
  });

  it('should list all tools definitions with their ready status', () => {
    expect(component.toolsList.length).toBeGreaterThanOrEqual(3);
    const avgCostTool = component.toolsList.find((t) => t.id === 'avg-cost-calculator');
    expect(avgCostTool?.isReady).toBe(true);

    const tvmTool = component.toolsList.find((t) => t.id === 'tvm-calculator');
    expect(tvmTool?.isReady).toBe(true);

    const rebalanceTool = component.toolsList.find((t) => t.id === 'rebalance-planner');
    expect(rebalanceTool?.isReady).toBe(true);
  });

  it('should switch to tvm-calculator when selected', () => {
    component.selectTool('tvm-calculator');
    expect(component.activeToolId()).toBe('tvm-calculator');
    expect(component.activeTool().id).toBe('tvm-calculator');
  });

  it('should switch to rebalance-planner when selected', () => {
    component.selectTool('rebalance-planner');
    expect(component.activeToolId()).toBe('rebalance-planner');
    expect(component.activeTool().id).toBe('rebalance-planner');
  });


  it('should toggle and close mobile dropdown menu', () => {
    expect(component.isDropdownOpen()).toBe(false);

    component.toggleDropdown();
    expect(component.isDropdownOpen()).toBe(true);

    component.selectTool('avg-cost-calculator');
    expect(component.isDropdownOpen()).toBe(false);

    component.toggleDropdown();
    expect(component.isDropdownOpen()).toBe(true);

    component.closeDropdown();
    expect(component.isDropdownOpen()).toBe(false);
  });
});
