import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, forkJoin, map, of } from 'rxjs';

import { environment } from '../../environments/environment';

export interface PriceData {
  symbol: string;
  name?: string;
  price: number;
  currency: string;
}

@Injectable({
  providedIn: 'root',
})
export class PriceService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = '/api/backend/price';

  fetchPricesAndRate(
    summaries: { symbol: string; assetType?: string }[],
  ): Observable<{ prices: Map<string, PriceData>; rate: number }> {
    if (!summaries || summaries.length === 0) {
      return of({ prices: new Map<string, PriceData>(), rate: 1 });
    }

    const batchSize = environment.maxBatchSize || 50;
    const chunks: { symbol: string; assetType?: string }[][] = [];

    for (let i = 0; i < summaries.length; i += batchSize) {
      chunks.push(summaries.slice(i, i + batchSize));
    }

    const requests$ = chunks.map((chunk) =>
      this.http.post<{ prices: { [key: string]: PriceData }; rate: number }>(
        `${this.baseUrl}/fetch-prices`,
        { summaries: chunk }
      )
    );

    return forkJoin(requests$).pipe(
      map((responses) => {
        const mergedPrices = new Map<string, PriceData>();
        let rate = 1;

        if (responses.length > 0) {
          rate = responses[0]?.rate ?? 1;
          for (const resp of responses) {
            if (resp && resp.prices) {
              for (const key of Object.keys(resp.prices)) {
                mergedPrices.set(key, resp.prices[key]);
              }
            }
          }
        }

        return { prices: mergedPrices, rate };
      })
    );
  }

  fetchExchangeRate(fromCurrency: string = 'USD', toCurrency: string = 'THB'): Observable<number> {
    return this.http
      .get<{ rate: number }>(
        `${this.baseUrl}/exchange-rate?from_currency=${fromCurrency}&to_currency=${toCurrency}`
      )
      .pipe(map((res) => (res ? res.rate : 1)));
  }
}
