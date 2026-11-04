import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, catchError, map, of } from 'rxjs';
import {
  AvgCostSimulationResult,
  PositionSnapshot,
  RebalancePlanResult,
  RebalanceSimulationInput,
  SimulatedStep,
  TargetAvgCostGoalInput,
  TargetAvgCostGoalResult,
} from '../models/tools.model';
import { PortfolioPosition } from '../models/portfolio.model';
import { PriceData } from './price.service';
import { simulateAvgCost, solveTargetAvgCostGoal } from '../utils/calculator.utils';
import { calculateRebalancePlan } from '../utils/rebalance-calculator.utils';

export interface BackendSimulateOrderRequest {
  initialPosition?: {
    symbol?: string;
    shares: number;
    avgCost: number;
    marketPrice: number;
    currency: string;
    totalCost?: number;
  };
  symbol?: string;
  steps: {
    action: 'BUY' | 'SELL';
    shares: number;
    price: number;
    feePercent: number;
  }[];
  currency: string;
}

export interface BackendSolveTargetCostRequest {
  initialPosition?: {
    symbol?: string;
    shares: number;
    avgCost: number;
    marketPrice: number;
    currency: string;
  };
  symbol?: string;
  targetAvgCost: number;
  purchasePrice: number;
  feePercent: number;
  currency: string;
}

@Injectable({
  providedIn: 'root',
})
export class ToolsService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = '/api/backend/portfolio/tools';

  /**
   * Simulates Buy / Sell order sequence via Backend API with local fallback
   */
  simulateOrder(
    initial: PositionSnapshot,
    steps: SimulatedStep[],
    currency: string = 'USD'
  ): Observable<AvgCostSimulationResult> {
    const payload: BackendSimulateOrderRequest = {
      initialPosition: {
        symbol: initial.symbol,
        shares: initial.totalShares,
        avgCost: initial.averageCost,
        marketPrice: initial.currentPrice,
        currency: initial.currency || currency,
        totalCost: initial.totalCost,
      },
      steps: steps.map((s) => ({
        action: s.action,
        shares: s.shares,
        price: s.price,
        feePercent: s.feePercent,
      })),
      currency: currency,
    };

    return this.http.post<any>(`${this.baseUrl}/simulate`, payload).pipe(
      map((res) => {
        return {
          initial: {
            ...initial,
            totalShares: res.initial.totalShares,
            averageCost: res.initial.averageCost,
            totalCost: res.initial.totalCost,
            currentPrice: res.initial.marketPrice,
            holdingValue: res.initial.holdingValue,
            unrealizedPL: res.initial.unrealizedPL,
            unrealizedPLPercent: res.initial.unrealizedPLPercent,
          },
          simulated: {
            totalShares: res.simulated.totalShares,
            averageCost: res.simulated.averageCost,
            totalCost: res.simulated.totalCost,
            currentPrice: res.simulated.marketPrice,
            holdingValue: res.simulated.holdingValue,
            unrealizedPL: res.simulated.unrealizedPL,
            unrealizedPLPercent: res.simulated.unrealizedPLPercent,
            realizedPL: res.simulated.realizedPL,
            totalOutlay: res.totalCapitalOutlay,
            totalProceeds: res.totalProceeds,
            totalFees: res.totalFees,
          },
          delta: {
            shares: res.delta.shares,
            sharesPercent: res.delta.sharesPercent,
            averageCost: res.delta.averageCost,
            averageCostPercent: res.delta.averageCostPercent,
            totalCost: res.delta.totalCost,
            holdingValue: res.delta.holdingValue,
            unrealizedPL: res.delta.unrealizedPL,
            unrealizedPLPercent: res.delta.unrealizedPLPercent,
            breakevenDistanceInitial: res.delta.breakevenDistanceInitial,
            breakevenDistanceSimulated: res.delta.breakevenDistanceSimulated,
          },
          steps,
        };
      }),
      catchError(() => {
        // Instant local fallback calculation
        return of(simulateAvgCost(initial, steps));
      })
    );
  }

  /**
   * Solves required shares/capital to achieve a target average cost via Backend API with local fallback
   */
  solveTargetCost(
    input: TargetAvgCostGoalInput,
    symbol: string = '',
    currency: string = 'USD'
  ): Observable<TargetAvgCostGoalResult> {
    const payload: BackendSolveTargetCostRequest = {
      initialPosition: {
        symbol,
        shares: input.currentShares,
        avgCost: input.currentAvgCost,
        marketPrice: input.purchasePrice,
        currency,
      },
      targetAvgCost: input.targetAvgCost,
      purchasePrice: input.purchasePrice,
      feePercent: input.feePercent || 0,
      currency,
    };

    return this.http.post<TargetAvgCostGoalResult>(`${this.baseUrl}/solve-target`, payload).pipe(
      catchError(() => {
        // Instant local fallback calculation
        return of(solveTargetAvgCostGoal(input));
      })
    );
  }

  /**
   * Calculates portfolio rebalance plan via Backend API with local fallback
   */
  calculateRebalance(
    positions: PortfolioPosition[],
    pricesMap: Map<string, PriceData>,
    input: RebalanceSimulationInput,
    displayCurrency: 'USD' | 'THB' = 'USD',
    exchangeRate: number = 1.0
  ): Observable<RebalancePlanResult> {
    const payload = {
      mode: input.mode,
      noSellSubMode: input.noSellSubMode,
      customCashDeposit: input.customCashDeposit,
      targetAllocations: input.targetAllocations,
      currency: displayCurrency,
    };

    return this.http.post<RebalancePlanResult>(`${this.baseUrl}/rebalance`, payload).pipe(
      catchError(() => {
        // Instant local fallback calculation
        return of(calculateRebalancePlan(positions, pricesMap, input, displayCurrency, exchangeRate));
      })
    );
  }
}

