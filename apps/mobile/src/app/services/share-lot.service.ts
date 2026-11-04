import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, catchError, of } from 'rxjs';
import {
  Transaction,
  SymbolSummary,
  ClosedSymbolSummary,
  SymbolTransactionSummary,
} from '../models/transaction.model';

export interface SheetResult {
  summaries: SymbolSummary[];
  closedSummaries: ClosedSymbolSummary[];
  transactionSummaries?: SymbolTransactionSummary[];
  rawTransactions?: Transaction[];
  totalCostByCurrency: Record<string, number>;
  totalProceedsByCurrency: Record<string, number>;
  totalRealizedPLByCurrency: Record<string, number>;
  totalSymbols: number;
  totalLots: number;
  error: string | null;
  isClosed?: boolean;
}

@Injectable({
  providedIn: 'root',
})
export class ShareLotService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = '/api/backend/share-lot';

  fetchSheet(tabId: string): Observable<SheetResult> {
    return this.http.get<SheetResult>(`${this.baseUrl}/sheet/${tabId}`).pipe(
      catchError(() => of(this.createEmptyResult('Failed to fetch data from backend.', false)))
    );
  }

  fetchAllSheets(): Observable<SheetResult> {
    return this.http.get<SheetResult>(`${this.baseUrl}/sheets`).pipe(
      catchError(() => of(this.createEmptyResult('Failed to fetch data from backend.', false)))
    );
  }

  private createEmptyResult(error: string, isClosed: boolean): SheetResult {
    return {
      summaries: [],
      closedSummaries: [],
      transactionSummaries: [],
      rawTransactions: [],
      totalCostByCurrency: {},
      totalProceedsByCurrency: {},
      totalRealizedPLByCurrency: {},
      totalSymbols: 0,
      totalLots: 0,
      error,
      isClosed,
    };
  }
}
