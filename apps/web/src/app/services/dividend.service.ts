import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { PortfolioDividendResponse } from '../models/dividend.model';

@Injectable({
  providedIn: 'root'
})
export class DividendService {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = '/api/backend/portfolio/dividend';

  getDividendAnalytics(currency: 'USD' | 'THB' = 'THB', tabId: string = 'all'): Observable<PortfolioDividendResponse> {
    const params = new HttpParams()
      .set('currency', currency)
      .set('tab_id', tabId);

    return this.http.get<PortfolioDividendResponse>(this.apiUrl, { params });
  }
}
