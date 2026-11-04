import { HttpClient, provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { firstValueFrom } from 'rxjs';

import { environment } from '../../environments/environment';
import { authInterceptor } from './auth.interceptor';
import { errorInterceptor } from './error.interceptor';

describe('HTTP Interceptors', () => {
  let http: HttpClient;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(withInterceptors([authInterceptor, errorInterceptor])),
        provideHttpClientTesting(),
      ],
    });
    http = TestBed.inject(HttpClient);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('should attach X-API-Key and application signature headers to backend API requests', async () => {
    const promise = firstValueFrom(http.get('/api/backend/share-lot/sheets'));

    const req = httpMock.expectOne('/api/backend/share-lot/sheets');
    expect(req.request.headers.has('X-API-Key')).toBe(true);
    expect(req.request.headers.get('X-API-Key')).toBe(environment.apiKey);
    expect(req.request.headers.get('X-App-Source')).toBe('Charlotte-Wealth');
    expect(req.request.headers.get('X-Requested-With')).toBe('Charlotte-Wealth-Client');

    req.flush({});
    await promise;
  });

  it('should handle 401 error response gracefully via errorInterceptor', async () => {
    const promise = firstValueFrom(http.get('/api/backend/share-lot/sheets'));

    const req = httpMock.expectOne('/api/backend/share-lot/sheets');
    req.flush({ detail: 'Unauthorized' }, { status: 401, statusText: 'Unauthorized' });

    try {
      await promise;
      throw new Error('Should have thrown error');
    } catch (err: any) {
      expect(err.status).toBe(401);
    }
  });
});
