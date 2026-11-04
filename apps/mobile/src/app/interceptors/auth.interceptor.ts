import { HttpInterceptorFn } from '@angular/common/http';
import { environment } from '../../environments/environment';

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const isBackendRequest =
    req.url.includes('/api/backend') ||
    req.url.startsWith('/portfolio') ||
    req.url.startsWith('/share-lot') ||
    req.url.startsWith('/price') ||
    req.url.startsWith('/nav');

  if (isBackendRequest) {
    const authReq = req.clone({
      setHeaders: {
        'X-API-Key': environment.apiKey,
        'X-App-Source': 'Charlotte-Wealth',
        'X-Requested-With': 'Charlotte-Wealth-Client',
      },
    });
    return next(authReq);
  }
  return next(req);
};
