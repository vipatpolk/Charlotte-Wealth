import { TestBed } from '@angular/core/testing';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideHttpClient } from '@angular/common/http';
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { DividendService } from './dividend.service';
import { PortfolioDividendResponse } from '../models/dividend.model';

describe('DividendService', () => {
  let service: DividendService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        DividendService,
        provideHttpClient(),
        provideHttpClientTesting(),
      ]
    });
    service = TestBed.inject(DividendService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('should fetch dividend analytics with default params', () => {
    const mockResponse: PortfolioDividendResponse = {
      currency: 'THB',
      exchangeRate: 35.0,
      totalGrossDividends: 5000,
      totalNetDividends: 4500,
      totalWithholdingTax: 500,
      effectiveTaxRate: 10,
      projectedAnnualDividends: 6000,
      portfolioDividendYield: 5.5,
      portfolioYieldOnCost: 6.2,
      annualDividends: [],
      monthlyDividends: [],
      assetTypeSummaries: [],
      symbolSummaries: [],
      records: [],
      error: null
    };

    service.getDividendAnalytics('THB', 'all').subscribe(res => {
      expect(res.currency).toBe('THB');
      expect(res.totalNetDividends).toBe(4500);
    });

    const req = httpMock.expectOne('/api/backend/portfolio/dividend?currency=THB&tab_id=all');
    expect(req.request.method).toBe('GET');
    req.flush(mockResponse);
  });
});
