import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from './auth.service';
import { AppRole } from '../models/api.models';

export function requireRole(...roles: AppRole[]): CanActivateFn {
  return async (_route, state) => {
    const auth = inject(AuthService);
    const router = inject(Router);
    if (!auth.available())
      return router.createUrlTree(['/'], { queryParams: { auth: 'unavailable' } });
    if (!auth.authenticated()) {
      await auth.login(state.url);
      return false;
    }
    return auth.hasRole(...roles) ? true : router.createUrlTree(['/forbidden']);
  };
}
