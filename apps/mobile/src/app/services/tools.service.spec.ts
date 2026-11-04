import { TestBed } from '@angular/core/testing';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideHttpClient } from '@angular/common/http';
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { ToolsService } from './tools.service';
import { PositionSnapshot, SimulatedStep, TargetAvgCostGoalInput } from '../models/tools.model';

describe('ToolsService', () => {
  let service: ToolsService;
  let httpMock: HttpTestingController;

  const mockSnapshot: PositionSnapshot = {
    symbol: 'NVDA',
    displaySymbol: 'NVDA',
    name: 'NVIDIA Corporation',
    assetType: 'us-stock',
    assetTypeLabel: 'US Stock',
    currency: 'USD',
    totalShares: 100,
    averageCost: 150,
    totalCost: 15000,
    currentPrice: 140,
    holdingValue: 14000,
    unrealizedPL: -1000,
    unrealizedPLPercent: -6.67,
    hasPrice: true,
  };

  const mockStep: SimulatedStep = {
    id: 'step-1',
    action: 'BUY',
    shares: 100,
    price: 100,
    feePercent: 0,
    feeAmount: 0,
    totalCost: 10000,
  };

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [ToolsService, provideHttpClient(), provideHttpClientTesting()],
    });

    service = TestBed.inject(ToolsService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('should call backend simulate endpoint and map response', () => {
    const mockBackendResponse = {
      initial: {
        totalShares: 100,
        averageCost: 150,
        totalCost: 15000,
        marketPrice: 140,
        holdingValue: 14000,
        unrealizedPL: -1000,
        unrealizedPLPercent: -6.67,
      },
      simulated: {
        totalShares: 200,
        averageCost: 125,
        totalCost: 25000,
        marketPrice: 140,
        holdingValue: 28000,
        unrealizedPL: 3000,
        unrealizedPLPercent: 12.0,
        realizedPL: 0,
      },
      delta: {
        shares: 100,
        sharesPercent: 100,
        averageCost: -25,
        averageCostPercent: -16.67,
        totalCost: 10000,
        holdingValue: 14000,
        unrealizedPL: 4000,
        unrealizedPLPercent: 18.67,
        breakevenDistanceInitial: 7.14,
        breakevenDistanceSimulated: -10.71,
      },
      totalCapitalOutlay: 10000,
      totalProceeds: 0,
      totalFees: 0,
      currency: 'USD',
    };

    service.simulateOrder(mockSnapshot, [mockStep], 'USD').subscribe((result) => {
      expect(result.simulated.totalShares).toBe(200);
      expect(result.simulated.averageCost).toBe(125);
      expect(result.delta.averageCost).toBe(-25);
    });

    const req = httpMock.expectOne('/api/backend/portfolio/tools/simulate');
    expect(req.request.method).toBe('POST');
    req.flush(mockBackendResponse);
  });

  it('should fallback to local simulation when backend call fails', () => {
    service.simulateOrder(mockSnapshot, [mockStep], 'USD').subscribe((result) => {
      expect(result.simulated.totalShares).toBe(200);
      expect(result.simulated.averageCost).toBe(125);
      expect(result.delta.averageCost).toBe(-25);
    });

    const req = httpMock.expectOne('/api/backend/portfolio/tools/simulate');
    req.error(new ProgressEvent('error'));
  });

  it('should call backend solve-target endpoint and map response', () => {
    const input: TargetAvgCostGoalInput = {
      currentShares: 100,
      currentAvgCost: 150,
      targetAvgCost: 125,
      purchasePrice: 100,
      feePercent: 0,
    };

    const mockResponse = {
      isValid: true,
      requiredShares: 100,
      requiredCapital: 10000,
      feeAmount: 0,
      totalOutlay: 10000,
      newTotalShares: 200,
      newTotalCost: 25000,
      achievedAvgCost: 125,
    };

    service.solveTargetCost(input, 'NVDA', 'USD').subscribe((result) => {
      expect(result.isValid).toBe(true);
      expect(result.requiredShares).toBe(100);
      expect(result.achievedAvgCost).toBe(125);
    });

    const req = httpMock.expectOne('/api/backend/portfolio/tools/solve-target');
    expect(req.request.method).toBe('POST');
    req.flush(mockResponse);
  });

  it('should call backend rebalance endpoint or fallback to local calculation', () => {
    const mockPositions = [
      {
        symbol: 'NVDA',
        displaySymbol: 'NVDA',
        name: 'NVIDIA',
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
    ];

    const mockPrices = new Map([
      ['NVDA', { symbol: 'NVDA', name: 'NVIDIA', price: 150, currency: 'USD' }],
    ]);

    service
      .calculateRebalance(
        mockPositions,
        mockPrices,
        {
          mode: 'standard',
          noSellSubMode: 'min-inflow',
          customCashDeposit: 0,
          targetAllocations: { NVDA: 100 },
          selectedAssetClassFilter: 'all',
        },
        'USD',
        1.0
      )
      .subscribe((plan) => {
        expect(plan.mode).toBe('standard');
        expect(plan.groups.length).toBe(1);
        expect(plan.totalCurrentPortfolioValue).toBe(15000);
      });

    const req = httpMock.expectOne('/api/backend/portfolio/tools/rebalance');
    expect(req.request.method).toBe('POST');
    req.error(new ProgressEvent('error'));
  });
});

