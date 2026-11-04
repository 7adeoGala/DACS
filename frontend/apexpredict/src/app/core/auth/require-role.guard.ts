import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from './auth.service';
import { AppRole } from '../models/api.models';

export function requireRole(...roles: AppRole[]): CanActivateFn {
  return async (_route, state) => {
    const auth = inject(AuthService);
    const router = inject(Router);
    // Al refrescar o actualizar cualquier página protegida, se redirige automáticamente al login por seguridad
    if (auth.isPageReload()) {
      auth.clearLocalSession();
      return router.createUrlTree(['/login'], {
        queryParams: { returnUrl: state.url, reason: 'reload' },
      });
    }

    if (!auth.available())
      return router.createUrlTree(['/'], { queryParams: { auth: 'unavailable' } });
    if (!auth.authenticated()) {
      return router.createUrlTree(['/login'], {
        queryParams: { returnUrl: state.url },
      });
    }
    return auth.hasRole(...roles) ? true : router.createUrlTree(['/forbidden']);
  };
}
