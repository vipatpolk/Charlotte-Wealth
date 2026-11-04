import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, forkJoin, map, of } from 'rxjs';

import { environment } from '../../environments/environment';
import { PriceData } from './price.service';

@Injectable({
  providedIn: 'root',
})
export class NavService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = '/api/backend/nav';

  fetchFundNAVs(symbols: string[]): Observable<Map<string, PriceData>> {
    if (!symbols || symbols.length === 0) {
      return of(new Map<string, PriceData>());
    }

    const batchSize = environment.maxBatchSize || 50;
    const chunks: string[][] = [];

    for (let i = 0; i < symbols.length; i += batchSize) {
      chunks.push(symbols.slice(i, i + batchSize));
    }

    const requests$ = chunks.map((chunk) =>
      this.http.post<{ [key: string]: PriceData }>(`${this.baseUrl}/fetch`, { symbols: chunk })
    );

    return forkJoin(requests$).pipe(
      map((responses) => {
        const mergedMap = new Map<string, PriceData>();
        for (const resp of responses) {
          if (resp) {
            for (const key of Object.keys(resp)) {
              mergedMap.set(key, resp[key]);
            }
          }
        }
        return mergedMap;
      })
    );
  }
}
