import { inject } from '@angular/core';
import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { catchError, throwError } from 'rxjs';
import { ErrorBannerService } from './error-banner.service';

const SILENT_URL_FRAGMENTS = ['/backendping', '/conectorping', '/ping', '/health', '/users/check-display-name', '/f1/'];

export const errorInterceptor: HttpInterceptorFn = (request, next) => {
  const banner = inject(ErrorBannerService);

  return next(request).pipe(
    catchError((error: unknown) => {
      if (error instanceof HttpErrorResponse) {
        const url = request.url || '';
        const isSilent = SILENT_URL_FRAGMENTS.some((fragment) => url.includes(fragment));
        const isLockTimeSubmit = error.status === 403 && url.includes('/predictions/session/');

        if (!isSilent && !isLockTimeSubmit) {
          if (error.status === 401) {
            banner.show('Tu sesión expiró o no es válida. Iniciá sesión nuevamente para continuar.');
          } else if (error.status === 403) {
            banner.show('No tenés permisos suficientes para realizar esta acción.');
          } else if (error.status === 429) {
            return throwError(() => error);
          } else if (error.status === 0 || error.status >= 500) {
            const backendDesc =
              typeof error.error === 'object' && error.error?.description
                ? String(error.error.description)
                : 'El servicio no está disponible temporalmente. Intentá nuevamente en unos instantes.';
            banner.show(backendDesc);
          }
        }
      }
      return throwError(() => error);
    })
  );
};
