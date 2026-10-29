import { inject } from '@angular/core';
import { HttpInterceptorFn } from '@angular/common/http';
import { from, switchMap } from 'rxjs';
import Keycloak from 'keycloak-js';
import { environment } from '../../../environments/environment';
import { secureApiTarget } from './api-url';

export const authInterceptor: HttpInterceptorFn = (request, next) => {
  const keycloak = inject(Keycloak);
  const url = secureApiTarget(request.url, environment.apiUrl);
  if (!url) return next(request);
  const secured = request.clone({ url });

  const token =
    keycloak.token ||
    (typeof sessionStorage !== 'undefined' ? sessionStorage.getItem('apex_token') : null) ||
    (typeof localStorage !== 'undefined' ? localStorage.getItem('apex_token') : null);

  if (!token) return next(secured);

  if (keycloak.authenticated && typeof keycloak.updateToken === 'function') {
    return from(keycloak.updateToken(30)).pipe(
      switchMap(() =>
        next(secured.clone({ setHeaders: { Authorization: `Bearer ${keycloak.token || token}` } }))
      )
    );
  }

  const reqWithAuth = secured.clone({ setHeaders: { Authorization: `Bearer ${token}` } });
  return next(reqWithAuth);
};
