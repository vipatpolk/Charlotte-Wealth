import { ComponentFixture, TestBed } from '@angular/core/testing';
import { AssetAllocationComponent } from './asset-allocation.component';
import { ComponentRef } from '@angular/core';
import { SymbolSummary } from '../../models/transaction.model';
import { PriceData } from '../../services/price.service';

describe('AssetAllocationComponent', () => {
  let component: AssetAllocationComponent;
  let componentRef: ComponentRef<AssetAllocationComponent>;
  let fixture: ComponentFixture<AssetAllocationComponent>;

  const mockSummaries: SymbolSummary[] = [
    {
      symbol: 'AAPL',
      totalShares: 10,
      totalCost: 1500,
      averageCost: 150,
      currency: 'USD',
      assetType: 'us-stock',
      lots: [],
    },
    {
      symbol: 'PTT.BK',
      totalShares: 1000,
      totalCost: 35000,
      averageCost: 35,
      currency: 'THB',
      assetType: 'thai-stock',
      lots: [],
    },
  ];

  const mockPricesMap = new Map<string, PriceData>([
    ['AAPL', { symbol: 'AAPL', name: 'Apple Inc.', price: 180, currency: 'USD' }],
    ['PTT.BK', { symbol: 'PTT.BK', name: 'PTT Public Co.', price: 36, currency: 'THB' }],
  ]);

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AssetAllocationComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(AssetAllocationComponent);
    component = fixture.componentInstance;
    componentRef = fixture.componentRef;

    componentRef.setInput('summaries', mockSummaries);
    componentRef.setInput('pricesMap', mockPricesMap);
    componentRef.setInput('displayCurrency', 'USD');
    componentRef.setInput('exchangeRate', 35.0);
    componentRef.setInput('hasRate', true);

    fixture.detectChanges();
  });

  it('should create component with default target allocation', () => {
    expect(component).toBeTruthy();
    const targets = component.targetAllocation();
    expect(targets['us-stock']).toBe(40);
    expect(targets['thai-stock']).toBe(30);
    expect(targets['crypto']).toBe(15);
    expect(targets['mutual-fund']).toBe(15);
    expect(targets['bond']).toBe(0);
    expect(targets['provident-fund']).toBe(0);
  });

  it('should calculate current values converted to display currency (USD)', () => {
    const currentVals = component.currentValues();
    expect(currentVals['us-stock']).toBe(1800);
    expect(currentVals['thai-stock']).toBeCloseTo(1028.57, 1);
    expect(component.totalValue()).toBeCloseTo(2828.57, 1);
  });

  it('should filter by asset class using selectAssetType signal', () => {
    expect(component.selectedAssetType()).toBeNull();
    expect(component.selectedAssetLabel()).toBe('All Classes');

    component.selectAssetType('us-stock');
    expect(component.selectedAssetType()).toBe('us-stock');
    expect(component.selectedAssetLabel()).toBe('U.S. Stock');

    // Toggling same asset class clears filter
    component.selectAssetType('us-stock');
    expect(component.selectedAssetType()).toBeNull();
  });

  it('should compute enriched class holdings when filtered by asset class', () => {
    component.selectAssetType('us-stock');
    const enriched = component.enrichedClassHoldings();
    expect(enriched.length).toBe(1);
    expect(enriched[0].symbol).toBe('AAPL');
    expect(enriched[0].value).toBe(1800);
    expect(enriched[0].classPercent).toBe(100);
    expect(enriched[0].portfolioPercent).toBeCloseTo(63.63, 1);
  });

  it('should calculate asset class recommendations and actual breakdown', () => {
    const recs = component.recommendations();
    expect(recs.length).toBeGreaterThanOrEqual(2);

    const usStock = recs.find((r) => r.assetType === 'us-stock');
    expect(usStock).toBeDefined();
    expect(usStock?.currentValue).toBe(1800);
    expect(usStock?.actualPercent).toBeCloseTo(63.63, 1);

    const thaiStock = recs.find((r) => r.assetType === 'thai-stock');
    expect(thaiStock).toBeDefined();
    expect(thaiStock?.currentValue).toBeCloseTo(1028.57, 1);
    expect(thaiStock?.actualPercent).toBeCloseTo(36.36, 1);

    expect(component.actualTotal()).toBeCloseTo(100, 0);
  });
});
