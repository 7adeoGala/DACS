import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from './auth.service';
import { AppRole } from '../models/api.models';

export function requireRole(...roles: AppRole[]): CanActivateFn {
  return async (_route, state) => {
    const auth = inject(AuthService);
    const router = inject(Router);

    if (!auth.authenticated()) {
      if (!auth.available()) {
        return router.createUrlTree(['/'], { queryParams: { auth: 'unavailable' } });
      }
      const queryParams: Record<string, string> = { returnUrl: state.url };
      if (auth.sessionExpired?.()) {
        queryParams['reason'] = 'expired';
      }
      return router.createUrlTree(['/login'], { queryParams });
    }
    return auth.hasRole(...roles) ? true : router.createUrlTree(['/forbidden']);
  };
}
