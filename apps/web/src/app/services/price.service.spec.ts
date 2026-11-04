import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { firstValueFrom } from 'rxjs';

import { PriceService } from './price.service';

describe('PriceService', () => {
  let service: PriceService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [PriceService, provideHttpClient(), provideHttpClientTesting()],
    });
    service = TestBed.inject(PriceService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('should fetch prices and rate via backend proxy', async () => {
    const summaries = [
      { symbol: 'BRK.B', assetType: 'us-stock' },
      { symbol: 'BTC.CRYPTO', assetType: 'crypto' },
    ];

    const promise = firstValueFrom(service.fetchPricesAndRate(summaries));

    const req = httpMock.expectOne('/api/backend/price/fetch-prices');
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual({ summaries });

    req.flush({
      prices: {
        'BRK.B': { symbol: 'BRK.B', price: 500, currency: 'USD', name: 'Berkshire' },
        'BTC.CRYPTO': { symbol: 'BTC.CRYPTO', price: 60000, currency: 'USD', name: 'Bitcoin' },
      },
      rate: 34.5,
    });

    const result = await promise;
    expect(result.rate).toBe(34.5);
    expect(result.prices.size).toBe(2);

    const brkData = result.prices.get('BRK.B');
    expect(brkData?.price).toBe(500);

    const btcData = result.prices.get('BTC.CRYPTO');
    expect(btcData?.price).toBe(60000);
  });

  it('should split requests exceeding maxBatchSize (e.g. 75 items into 50 + 25)', async () => {
    const summaries = Array.from({ length: 75 }, (_, i) => ({
      symbol: `SYM${i}`,
      assetType: 'us-stock',
    }));

    const promise = firstValueFrom(service.fetchPricesAndRate(summaries));

    const reqs = httpMock.match('/api/backend/price/fetch-prices');
    expect(reqs.length).toBe(2);
    expect(reqs[0].request.body.summaries.length).toBe(50);
    expect(reqs[1].request.body.summaries.length).toBe(25);

    reqs[0].flush({
      prices: { SYM0: { symbol: 'SYM0', price: 10, currency: 'USD' } },
      rate: 35.0,
    });
    reqs[1].flush({
      prices: { SYM50: { symbol: 'SYM50', price: 20, currency: 'USD' } },
      rate: 35.0,
    });

    const result = await promise;
    expect(result.prices.size).toBe(2);
    expect(result.prices.get('SYM0')?.price).toBe(10);
    expect(result.prices.get('SYM50')?.price).toBe(20);
  });

  it('should fetch live exchange rate', async () => {
    const promise = firstValueFrom(service.fetchExchangeRate('USD', 'THB'));

    const req = httpMock.expectOne(
      '/api/backend/price/exchange-rate?from_currency=USD&to_currency=THB'
    );
    expect(req.request.method).toBe('GET');

    req.flush({ rate: 35.0 });

    const rate = await promise;
    expect(rate).toBe(35.0);
  });
});
