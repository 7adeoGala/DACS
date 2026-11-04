import { TestBed } from '@angular/core/testing';
import {
  ActivatedRouteSnapshot,
  provideRouter,
  Router,
  RouterStateSnapshot,
} from '@angular/router';
import { AuthService } from './auth.service';
import { requireRole } from './require-role.guard';

describe('requireRole', () => {
  const auth = {
    available: () => true,
    authenticated: vi.fn(),
    hasRole: vi.fn(),
    login: vi.fn().mockResolvedValue(undefined),
    isPageReload: vi.fn().mockReturnValue(false),
    clearLocalSession: vi.fn(),
  };
  beforeEach(() => {
    auth.authenticated.mockReturnValue(true);
    auth.hasRole.mockReturnValue(false);
    auth.isPageReload.mockReturnValue(false);
    auth.login.mockClear();
    auth.clearLocalSession.mockClear();
    TestBed.configureTestingModule({
      providers: [provideRouter([]), { provide: AuthService, useValue: auth }],
    });
  });
  const run = () =>
    TestBed.runInInjectionContext(() =>
      requireRole('admin')({} as ActivatedRouteSnapshot, { url: '/admin' } as RouterStateSnapshot),
    );
  it('manda un usuario sin rol a acceso restringido', async () => {
    expect(await run()).toEqual(TestBed.inject(Router).createUrlTree(['/forbidden']));
  });
  it('permite el rol requerido', async () => {
    auth.hasRole.mockReturnValue(true);
    expect(await run()).toBe(true);
  });
  it('redirige a login si no esta autenticado', async () => {
    auth.authenticated.mockReturnValue(false);
    expect(await run()).toEqual(
      TestBed.inject(Router).createUrlTree(['/login'], { queryParams: { returnUrl: '/admin' } })
    );
  });
  it('redirige a login y limpia sesion local si se refresca la pantalla', async () => {
    auth.isPageReload.mockReturnValue(true);
    expect(await run()).toEqual(
      TestBed.inject(Router).createUrlTree(['/login'], { queryParams: { returnUrl: '/admin', reason: 'reload' } })
    );
    expect(auth.clearLocalSession).toHaveBeenCalled();
  });
});
