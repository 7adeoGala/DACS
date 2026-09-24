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
  if (!keycloak.authenticated) return next(secured);
  // Token en memoria, sin localStorage ni cookies accesibles desde JavaScript.
  return from(keycloak.updateToken(30)).pipe(
    switchMap(() =>
      next(secured.clone({ setHeaders: { Authorization: `Bearer ${keycloak.token}` } })),
    ),
  );
};
