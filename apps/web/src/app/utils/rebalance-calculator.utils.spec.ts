import { describe, it, expect } from 'vitest';
import { PortfolioPosition } from '../models/portfolio.model';
import { PriceData } from '../services/price.service';
import {
  allocateCashDepositGroup,
  calculateNoSellMinimumInflowGroup,
  calculateRebalancePlan,
  calculateStandardGroupRebalance,
  extractRawPositions,
  getCurrentWeightsForClass,
  getEqualWeightsForClass,
  normalizeWeightsTo100,
  RawSymbolPosition,
} from './rebalance-calculator.utils';

describe('rebalance-calculator.utils', () => {
  const mockPositions: PortfolioPosition[] = [
    {
      symbol: 'NVDA',
      displaySymbol: 'NVDA',
      name: 'NVIDIA Corp',
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
    {
      symbol: 'PTT.BK',
      displaySymbol: 'PTT',
      name: 'PTT PCL',
      assetType: 'thai-stock',
      assetTypeLabel: 'Thai Stock',
      currency: 'THB',
      originalCurrency: 'THB',
      totalShares: 1000,
      averageCost: 30,
      totalCost: 30000,
      currentPrice: 35,
      holdingValue: 35000,
      unrealizedPL: 5000,
      unrealizedPLPercent: 16.67,
      hasPrice: true,
      lots: [],
    },
  ];

  const mockPrices = new Map<string, PriceData>([
    ['NVDA', { symbol: 'NVDA', name: 'NVIDIA Corp', price: 150, currency: 'USD' }],
    ['AAPL', { symbol: 'AAPL', name: 'Apple Inc', price: 250, currency: 'USD' }],
    ['PTT.BK', { symbol: 'PTT.BK', name: 'PTT PCL', price: 35, currency: 'THB' }],
  ]);

  describe('extractRawPositions', () => {
    it('should extract and convert raw positions properly to USD', () => {
      const raw = extractRawPositions(mockPositions, mockPrices, 'USD', 35.0);
      expect(raw.length).toBe(3);

      const nvda = raw.find((r) => r.symbol === 'NVDA');
      expect(nvda?.currentPrice).toBe(150);
      expect(nvda?.holdingValue).toBe(15000);

      const ptt = raw.find((r) => r.symbol === 'PTT.BK');
      expect(ptt?.currentPrice).toBeCloseTo(35 / 35.0, 2);
      expect(ptt?.holdingValue).toBeCloseTo(35000 / 35.0, 2);
    });

    it('should extract and convert raw positions properly to THB', () => {
      const raw = extractRawPositions(mockPositions, mockPrices, 'THB', 35.0);
      const nvda = raw.find((r) => r.symbol === 'NVDA');
      expect(nvda?.currentPrice).toBe(150 * 35.0);
      expect(nvda?.holdingValue).toBe(15000 * 35.0);

      const ptt = raw.find((r) => r.symbol === 'PTT.BK');
      expect(ptt?.currentPrice).toBe(35);
      expect(ptt?.holdingValue).toBe(35000);
    });
  });

  describe('Weight Presets', () => {
    it('should generate equal weights summing to 100%', () => {
      const weights3 = getEqualWeightsForClass(['A', 'B', 'C']);
      const sum3 = Object.values(weights3).reduce((a, b) => a + b, 0);
      expect(sum3).toBeCloseTo(100, 2);
      expect(weights3['A']).toBe(33.33);
      expect(weights3['C']).toBe(33.34);

      const weights2 = getEqualWeightsForClass(['A', 'B']);
      expect(weights2['A']).toBe(50);
      expect(weights2['B']).toBe(50);
    });

    it('should normalize arbitrary weights to 100%', () => {
      const normalized = normalizeWeightsTo100({ A: 10, B: 30 }, ['A', 'B']);
      expect(normalized['A']).toBe(25);
      expect(normalized['B']).toBe(75);
      expect(normalized['A'] + normalized['B']).toBe(100);
    });

    it('should get current weights for class', () => {
      const items = [
        { symbol: 'A', currentClassPercent: 37.5 },
        { symbol: 'B', currentClassPercent: 62.5 },
      ];
      const cur = getCurrentWeightsForClass(items);
      expect(cur['A'] + cur['B']).toBe(100);
    });
  });

  describe('calculateStandardGroupRebalance', () => {
    const usItems: RawSymbolPosition[] = [
      {
        symbol: 'NVDA',
        displaySymbol: 'NVDA',
        name: 'NVIDIA',
        assetType: 'us-stock',
        assetTypeLabel: 'US Stock',
        currency: 'USD',
        totalShares: 100,
        currentPrice: 150,
        holdingValue: 15000, // 37.5% of 40,000
        color: '#76b900',
      },
      {
        symbol: 'AAPL',
        displaySymbol: 'AAPL',
        name: 'Apple',
        assetType: 'us-stock',
        assetTypeLabel: 'US Stock',
        currency: 'USD',
        totalShares: 100,
        currentPrice: 250,
        holdingValue: 25000, // 62.5% of 40,000
        color: '#a2aaad',
      },
    ];

    it('should calculate correct BUY and SELL orders for 50/50 target', () => {
      const targets = { NVDA: 50, AAPL: 50 }; // Each should be 20,000
      const res = calculateStandardGroupRebalance(usItems, 40000, 40000, targets);

      expect(res.symbols.length).toBe(2);
      const nvda = res.symbols.find((s) => s.symbol === 'NVDA')!;
      expect(nvda.action).toBe('BUY');
      expect(nvda.deltaValue).toBe(5000);
      expect(nvda.deltaShares).toBeCloseTo(5000 / 150, 4);

      const aapl = res.symbols.find((s) => s.symbol === 'AAPL')!;
      expect(aapl.action).toBe('SELL');
      expect(aapl.deltaValue).toBe(-5000);
      expect(aapl.deltaShares).toBeCloseTo(-5000 / 250, 4);

      expect(res.totalBuy).toBe(5000);
      expect(res.totalSell).toBe(5000);
    });
  });

  describe('calculateNoSellMinimumInflowGroup', () => {
    const usItems: RawSymbolPosition[] = [
      {
        symbol: 'NVDA',
        displaySymbol: 'NVDA',
        name: 'NVIDIA',
        assetType: 'us-stock',
        assetTypeLabel: 'US Stock',
        currency: 'USD',
        totalShares: 100,
        currentPrice: 150,
        holdingValue: 15000, // Currently 37.5%
        color: '#76b900',
      },
      {
        symbol: 'AAPL',
        displaySymbol: 'AAPL',
        name: 'Apple',
        assetType: 'us-stock',
        assetTypeLabel: 'US Stock',
        currency: 'USD',
        totalShares: 100,
        currentPrice: 250,
        holdingValue: 25000, // Currently 62.5%
        color: '#a2aaad',
      },
    ];

    it('should find anchor position and compute minimum cash inflow needed without selling', () => {
      // If Target is 50% NVDA, 50% AAPL:
      // AAPL is currently 25,000 (representing 50% of the new portfolio).
      // Required new class value = 25,000 / 0.50 = 50,000.
      // Minimum inflow needed = 50,000 - 40,000 = 10,000.
      // NVDA needs to be bought with 10,000 (target = 25,000, current = 15,000).
      // AAPL needs 0 buys (anchor).
      const targets = { NVDA: 50, AAPL: 50 };
      const res = calculateNoSellMinimumInflowGroup(usItems, 40000, 40000, targets);

      expect(res.anchorSymbol).toBe('AAPL');
      expect(res.minInflowRequired).toBe(10000);
      expect(res.newClassValue).toBe(50000);

      const nvda = res.symbols.find((s) => s.symbol === 'NVDA')!;
      expect(nvda.action).toBe('BUY');
      expect(nvda.deltaValue).toBe(10000);
      expect(nvda.deltaShares).toBeCloseTo(10000 / 150, 4);

      const aapl = res.symbols.find((s) => s.symbol === 'AAPL')!;
      expect(aapl.action).toBe('BALANCED');
      expect(aapl.deltaValue).toBe(0);
      expect(aapl.isAnchorPosition).toBe(true);
    });
  });

  describe('allocateCashDepositGroup', () => {
    const usItems: RawSymbolPosition[] = [
      {
        symbol: 'NVDA',
        displaySymbol: 'NVDA',
        name: 'NVIDIA',
        assetType: 'us-stock',
        assetTypeLabel: 'US Stock',
        currency: 'USD',
        totalShares: 100,
        currentPrice: 150,
        holdingValue: 15000,
        color: '#76b900',
      },
      {
        symbol: 'AAPL',
        displaySymbol: 'AAPL',
        name: 'Apple',
        assetType: 'us-stock',
        assetTypeLabel: 'US Stock',
        currency: 'USD',
        totalShares: 100,
        currentPrice: 250,
        holdingValue: 25000,
        color: '#a2aaad',
      },
    ];

    it('should allocate partial cash deposit strictly to underweight asset', () => {
      // Total current = 40,000. Deposit = 5,000. New Total = 45,000.
      // Targets: 50% NVDA (ideal 22,500), 50% AAPL (ideal 22,500).
      // NVDA deficit = 22,500 - 15,000 = 7,500.
      // AAPL deficit = max(0, 22,500 - 25,000) = 0.
      // 100% of 5,000 deposit goes to NVDA.
      const targets = { NVDA: 50, AAPL: 50 };
      const res = allocateCashDepositGroup(usItems, 40000, 40000, targets, 5000);

      const nvda = res.symbols.find((s) => s.symbol === 'NVDA')!;
      expect(nvda.action).toBe('BUY');
      expect(nvda.deltaValue).toBe(5000);
      expect(nvda.deltaShares).toBeCloseTo(5000 / 150, 4);

      const aapl = res.symbols.find((s) => s.symbol === 'AAPL')!;
      expect(aapl.action).toBe('BALANCED');
      expect(aapl.deltaValue).toBe(0);
    });
  });

  describe('calculateRebalancePlan Master Orchestrator', () => {
    it('should generate complete plan and orders across multiple asset classes', () => {
      const plan = calculateRebalancePlan(
        mockPositions,
        mockPrices,
        {
          mode: 'standard',
          noSellSubMode: 'min-inflow',
          customCashDeposit: 0,
          targetAllocations: {
            NVDA: 50,
            AAPL: 50,
            'PTT.BK': 100,
          },
        },
        'USD',
        35.0
      );

      expect(plan.isValid).toBe(true);
      expect(plan.groups.length).toBe(2);
      expect(plan.orders.length).toBeGreaterThanOrEqual(2);
    });
  });
});
