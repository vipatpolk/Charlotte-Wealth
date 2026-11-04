import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { catchError, throwError } from 'rxjs';

export const errorInterceptor: HttpInterceptorFn = (req, next) => {
  return next(req).pipe(
    catchError((error: HttpErrorResponse) => {
      if (error.status === 401) {
        console.error('[HTTP 401] Unauthorized: Missing or invalid API key.', error.url);
      } else if (error.status === 429) {
        console.error('[HTTP 429] Too Many Requests: Rate limit exceeded.', error.url);
      } else if (error.status === 422) {
        console.error(
          '[HTTP 422] Unprocessable Entity: Request validation failed (payload limit exceeded).',
          error.url
        );
      }
      return throwError(() => error);
    })
  );
};
