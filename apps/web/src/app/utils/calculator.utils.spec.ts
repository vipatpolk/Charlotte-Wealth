import { describe, it, expect } from 'vitest';
import {
  simulateAvgCost,
  solveTargetAvgCostGoal,
  getQuickAdjustedPrice,
} from './calculator.utils';
import { PositionSnapshot, SimulatedStep } from '../models/tools.model';

describe('calculator.utils', () => {
  const basePosition: PositionSnapshot = {
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
    unrealizedPLPercent: -6.66666667,
    hasPrice: true,
  };

  describe('simulateAvgCost', () => {
    it('should correctly simulate a single BUY transaction averaging down', () => {
      const steps: SimulatedStep[] = [
        {
          id: '1',
          action: 'BUY',
          shares: 100,
          price: 100,
          feePercent: 0,
          feeAmount: 0,
          totalCost: 10000,
        },
      ];

      const res = simulateAvgCost(basePosition, steps);

      expect(res.simulated.totalShares).toBe(200);
      expect(res.simulated.totalCost).toBe(25000);
      expect(res.simulated.averageCost).toBe(125);
      expect(res.simulated.holdingValue).toBe(28000);
      expect(res.simulated.unrealizedPL).toBe(3000); // 28000 - 25000 = +3000 at market price 140
      expect(res.delta.shares).toBe(100);
      expect(res.delta.averageCost).toBe(-25); // 125 - 150
      expect(res.delta.averageCostPercent).toBeCloseTo(-16.6667, 3);
    });

    it('should include fees in BUY transaction simulation', () => {
      const steps: SimulatedStep[] = [
        {
          id: '1',
          action: 'BUY',
          shares: 100,
          price: 100,
          feePercent: 1.0, // 1% fee -> 100 * 100 * 0.01 = 100
          feeAmount: 0,
          totalCost: 0,
        },
      ];

      const res = simulateAvgCost(basePosition, steps);

      expect(res.simulated.totalShares).toBe(200);
      expect(res.simulated.totalCost).toBe(25100); // 15000 + 10000 + 100
      expect(res.simulated.averageCost).toBe(125.5);
      expect(res.simulated.totalFees).toBe(100);
    });

    it('should correctly simulate a SELL transaction with realized P/L', () => {
      const steps: SimulatedStep[] = [
        {
          id: '1',
          action: 'SELL',
          shares: 40,
          price: 180,
          feePercent: 0,
          feeAmount: 0,
          totalCost: 7200,
        },
      ];

      const res = simulateAvgCost(basePosition, steps);

      expect(res.simulated.totalShares).toBe(60);
      // Cost basis of 40 sold shares @ $150 = $6000. Remaining cost: 15000 - 6000 = 9000.
      expect(res.simulated.totalCost).toBe(9000);
      expect(res.simulated.averageCost).toBe(150);
      // Realized PL = 40 * 180 (7200) - 6000 = +1200
      expect(res.simulated.realizedPL).toBe(1200);
      expect(res.simulated.totalProceeds).toBe(7200);
    });

    it('should handle multi-step consecutive transactions', () => {
      const steps: SimulatedStep[] = [
        { id: '1', action: 'BUY', shares: 50, price: 120, feePercent: 0, feeAmount: 0, totalCost: 6000 },
        { id: '2', action: 'BUY', shares: 50, price: 90, feePercent: 0, feeAmount: 0, totalCost: 4500 },
        { id: '3', action: 'SELL', shares: 100, price: 160, feePercent: 0, feeAmount: 0, totalCost: 16000 },
      ];

      const res = simulateAvgCost(basePosition, steps);

      // Step 1: 150 shares, $21,000, avg $140
      // Step 2: 200 shares, $25,500, avg $127.50
      // Step 3: Sell 100 shares @ $160 -> cost basis sold: 100 * 127.50 = 12750. Remaining: 100 shares, $12,750, avg $127.50.
      // Realized PL: 16,000 - 12,750 = +3,250
      expect(res.simulated.totalShares).toBe(100);
      expect(res.simulated.totalCost).toBe(12750);
      expect(res.simulated.averageCost).toBe(127.5);
      expect(res.simulated.realizedPL).toBe(3250);
    });

    it('should ignore steps with zero shares or zero price', () => {
      const steps: SimulatedStep[] = [
        { id: '1', action: 'BUY', shares: 0, price: 100, feePercent: 0, feeAmount: 0, totalCost: 0 },
        { id: '2', action: 'BUY', shares: 10, price: 0, feePercent: 0, feeAmount: 0, totalCost: 0 },
      ];

      const res = simulateAvgCost(basePosition, steps);
      expect(res.simulated.totalShares).toBe(100);
      expect(res.simulated.averageCost).toBe(150);
      expect(res.steps.length).toBe(0);
    });
  });

  describe('solveTargetAvgCostGoal', () => {
    it('should accurately calculate required shares and capital to lower average cost', () => {
      // Current: 100 shares @ $100. Target: $80. Purchase price: $60.
      const res = solveTargetAvgCostGoal({
        currentShares: 100,
        currentAvgCost: 100,
        targetAvgCost: 80,
        purchasePrice: 60,
      });

      expect(res.isValid).toBe(true);
      // Q_req = 100 * (100 - 80) / (80 - 60) = 2000 / 20 = 100 shares
      expect(res.requiredShares).toBe(100);
      expect(res.requiredCapital).toBe(6000);
      expect(res.newTotalShares).toBe(200);
      expect(res.achievedAvgCost).toBe(80);
    });

    it('should return error when purchase price is higher than target average cost when averaging down', () => {
      const res = solveTargetAvgCostGoal({
        currentShares: 100,
        currentAvgCost: 100,
        targetAvgCost: 80,
        purchasePrice: 90, // Cannot lower avg to $80 if buying at $90!
      });

      expect(res.isValid).toBe(false);
      expect(res.errorMessage).toBeDefined();
    });

    it('should handle zero initial shares cleanly', () => {
      const res = solveTargetAvgCostGoal({
        currentShares: 0,
        currentAvgCost: 0,
        targetAvgCost: 50,
        purchasePrice: 50,
      });

      expect(res.isValid).toBe(true);
      expect(res.requiredShares).toBe(1);
    });

    it('should handle target equal to current average cost', () => {
      const res = solveTargetAvgCostGoal({
        currentShares: 50,
        currentAvgCost: 100,
        targetAvgCost: 100,
        purchasePrice: 80,
      });

      expect(res.isValid).toBe(true);
      expect(res.requiredShares).toBe(0);
      expect(res.requiredCapital).toBe(0);
    });
  });

  describe('getQuickAdjustedPrice', () => {
    it('should calculate dip and rally prices correctly', () => {
      expect(getQuickAdjustedPrice(100, -5)).toBe(95);
      expect(getQuickAdjustedPrice(100, -10)).toBe(90);
      expect(getQuickAdjustedPrice(100, 10)).toBe(110);
      expect(getQuickAdjustedPrice(0, -5)).toBe(0);
    });
  });
});
