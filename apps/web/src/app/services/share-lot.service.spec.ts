import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { firstValueFrom } from 'rxjs';
import { ShareLotService } from './share-lot.service';

describe('ShareLotService', () => {
  let service: ShareLotService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [ShareLotService, provideHttpClient(), provideHttpClientTesting()],
    });
    service = TestBed.inject(ShareLotService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('should fetch specific sheet data via backend proxy', async () => {
    const promise = firstValueFrom(service.fetchSheet('12345'));

    const req = httpMock.expectOne('/api/backend/share-lot/sheet/12345');
    expect(req.request.method).toBe('GET');
    
    req.flush({
      summaries: [],
      closedSummaries: [],
      totalCostByCurrency: {},
      totalProceedsByCurrency: {},
      totalRealizedPLByCurrency: {},
      totalSymbols: 0,
      totalLots: 0,
      error: null
    });

    const result = await promise;
    expect(result.error).toBeNull();
  });

  it('should fetch all sheets data via backend proxy', async () => {
    const promise = firstValueFrom(service.fetchAllSheets());

    const req = httpMock.expectOne('/api/backend/share-lot/sheets');
    expect(req.request.method).toBe('GET');
    
    req.flush({
      summaries: [],
      closedSummaries: [],
      totalCostByCurrency: {},
      totalProceedsByCurrency: {},
      totalRealizedPLByCurrency: {},
      totalSymbols: 0,
      totalLots: 0,
      error: null
    });

    const result = await promise;
    expect(result.error).toBeNull();
  });

  it('should handle network errors gracefully', async () => {
    const promise = firstValueFrom(service.fetchSheet('12345'));

    const req = httpMock.expectOne('/api/backend/share-lot/sheet/12345');
    req.error(new ProgressEvent('Network error'));

    const result = await promise;
    expect(result.error).toBe('Failed to fetch data from backend.');
  });
});
