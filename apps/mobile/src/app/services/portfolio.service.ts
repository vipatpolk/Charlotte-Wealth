import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, catchError, of } from 'rxjs';
import {
  PortfolioAllocationResponse,
  PortfolioHoldingsResponse,
  PortfolioPerformanceResponse,
  TargetAllocation,
} from '../models/portfolio.model';

@Injectable({
  providedIn: 'root',
})
export class PortfolioService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = '/api/backend/portfolio';

  fetchHoldings(
    tabId: string = 'all',
    currency: 'USD' | 'THB' = 'THB'
  ): Observable<PortfolioHoldingsResponse> {
    return this.http
      .get<PortfolioHoldingsResponse>(
        `${this.baseUrl}/holdings?tab_id=${encodeURIComponent(tabId)}&currency=${encodeURIComponent(currency)}`
      )
      .pipe(
        catchError(() =>
          of(this.createEmptyHoldingsResponse(tabId, currency, 'Failed to fetch portfolio holdings from backend.'))
        )
      );
  }

  fetchPerformance(
    timeframe: string = 'ALL',
    startDate: string = '',
    endDate: string = '',
    currency: 'USD' | 'THB' = 'THB'
  ): Observable<PortfolioPerformanceResponse> {
    let url = `${this.baseUrl}/performance?timeframe=${encodeURIComponent(timeframe)}&currency=${encodeURIComponent(currency)}`;
    if (startDate) url += `&start_date=${encodeURIComponent(startDate)}`;
    if (endDate) url += `&end_date=${encodeURIComponent(endDate)}`;

    return this.http.get<PortfolioPerformanceResponse>(url).pipe(
      catchError(() =>
        of(this.createEmptyPerformanceResponse(timeframe, currency, 'Failed to fetch performance analytics from backend.'))
      )
    );
  }

  fetchAllocation(
    targetAllocation?: TargetAllocation,
    currency: 'USD' | 'THB' = 'THB'
  ): Observable<PortfolioAllocationResponse> {
    const body = targetAllocation ? { targetAllocation } : {};
    return this.http
      .post<PortfolioAllocationResponse>(
        `${this.baseUrl}/allocation?currency=${encodeURIComponent(currency)}`,
        body
      )
      .pipe(
        catchError(() =>
          of(this.createEmptyAllocationResponse(currency, 'Failed to fetch allocation data from backend.'))
        )
      );
  }

  private createEmptyHoldingsResponse(
    tabId: string,
    currency: 'USD' | 'THB',
    error: string
  ): PortfolioHoldingsResponse {
    return {
      currency,
      exchangeRate: 1.0,
      tabId,
      summary: {
        totalInvested: 0,
        totalValue: 0,
        openInvested: 0,
        closedInvested: 0,
        totalUnrealizedPL: 0,
        totalUnrealizedPLPercent: 0,
        totalRealizedPL: 0,
        totalRealizedPLPercent: 0,
        totalReturn: 0,
        totalReturnPercent: 0,
      },
      openPositions: [],
      closedPositions: [],
      transactionSummaries: [],
      rawTransactions: [],
      error,
    };
  }

  private createEmptyPerformanceResponse(
    timeframe: string,
    currency: 'USD' | 'THB',
    error: string
  ): PortfolioPerformanceResponse {
    return {
      timeframe,
      startDate: '',
      endDate: '',
      currency,
      exchangeRate: 1.0,
      summary: {
        totalInvested: 0,
        totalValue: 0,
        openInvested: 0,
        closedInvested: 0,
        totalUnrealizedPL: 0,
        totalUnrealizedPLPercent: 0,
        totalRealizedPL: 0,
        totalRealizedPLPercent: 0,
        totalReturn: 0,
        totalReturnPercent: 0,
      },
      assetTypePerformance: [],
      topGainers: [],
      topLosers: [],
      symbolPerformance: [],
      error,
    };
  }

  private createEmptyAllocationResponse(
    currency: 'USD' | 'THB',
    error: string
  ): PortfolioAllocationResponse {
    return {
      currency,
      exchangeRate: 1.0,
      totalPortfolioValue: 0,
      recommendations: [],
      currencyExposure: {
        usd: 0,
        thb: 0,
        usdPercent: 0,
        thbPercent: 0,
      },
      holdingsConcentration: [],
      error,
    };
  }
}
