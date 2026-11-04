import { TestBed } from '@angular/core/testing';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideHttpClient } from '@angular/common/http';
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { PortfolioService } from './portfolio.service';

describe('PortfolioService', () => {
  let service: PortfolioService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        PortfolioService,
        provideHttpClient(),
        provideHttpClientTesting(),
      ],
    });
    service = TestBed.inject(PortfolioService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('should fetch holdings for a tab', () => {
    const mockResponse = {
      currency: 'THB' as const,
      exchangeRate: 35.0,
      tabId: 'us-stock',
      summary: {
        totalInvested: 1000,
        totalValue: 1200,
        openInvested: 1000,
        closedInvested: 0,
        totalUnrealizedPL: 200,
        totalUnrealizedPLPercent: 20,
        totalRealizedPL: 0,
        totalRealizedPLPercent: 0,
        totalReturn: 200,
        totalReturnPercent: 20,
      },
      openPositions: [],
      closedPositions: [],
      error: null,
    };

    service.fetchHoldings('us-stock', 'THB').subscribe((res) => {
      expect(res.tabId).toBe('us-stock');
      expect(res.summary.totalValue).toBe(1200);
    });

    const req = httpMock.expectOne('/api/backend/portfolio/holdings?tab_id=us-stock&currency=THB');
    expect(req.request.method).toBe('GET');
    req.flush(mockResponse);
  });

  it('should fetch performance analytics', () => {
    service.fetchPerformance('YTD', '2024-01-01', '2024-12-31', 'USD').subscribe((res) => {
      expect(res.timeframe).toBe('YTD');
    });

    const req = httpMock.expectOne(
      '/api/backend/portfolio/performance?timeframe=YTD&currency=USD&start_date=2024-01-01&end_date=2024-12-31'
    );
    expect(req.request.method).toBe('GET');
    req.flush({ timeframe: 'YTD', currency: 'USD', summary: {} });
  });

  it('should fetch allocation recommendations', () => {
    service.fetchAllocation({ 'us-stock': 50, 'thai-stock': 50 }, 'THB').subscribe((res) => {
      expect(res.currency).toBe('THB');
    });

    const req = httpMock.expectOne('/api/backend/portfolio/allocation?currency=THB');
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual({ targetAllocation: { 'us-stock': 50, 'thai-stock': 50 } });
    req.flush({ currency: 'THB', totalPortfolioValue: 5000, recommendations: [] });
  });
});
