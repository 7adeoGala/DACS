import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import Keycloak from 'keycloak-js';
import { AuthService } from './auth.service';

function makeJwt(payload: Record<string, unknown>): string {
  const header = btoa(JSON.stringify({ alg: 'none', typ: 'JWT' }));
  const body = btoa(JSON.stringify(payload));
  return `${header}.${body}.sig`;
}

describe('AuthService', () => {
  let keycloakMock: any;
  let fetchSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    localStorage.clear();
    sessionStorage.clear();
    keycloakMock = {
      init: vi.fn().mockResolvedValue(false),
      clearToken: vi.fn(),
      login: vi.fn().mockResolvedValue(undefined),
      logout: vi.fn().mockResolvedValue(undefined),
      register: vi.fn().mockResolvedValue(undefined),
    };

    fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(JSON.stringify({}), { status: 200, headers: { 'Content-Type': 'application/json' } }),
    );

    TestBed.configureTestingModule({
      providers: [
        provideRouter([]),
        { provide: Keycloak, useValue: keycloakMock },
      ],
    });
  });

  afterEach(() => {
    fetchSpy.mockRestore();
    localStorage.clear();
    sessionStorage.clear();
  });

  it('restaura la sesion al recargar si esta dentro de los 7 dias y renueva access token vencido', async () => {
    const expiredAccess = makeJwt({
      preferred_username: 'TadeoF1',
      realm_access: { roles: ['player'] },
      exp: Math.floor(Date.now() / 1000) - 120,
    });
    const freshAccess = makeJwt({
      preferred_username: 'TadeoF1',
      realm_access: { roles: ['player'] },
      exp: Math.floor(Date.now() / 1000) + 1800,
    });
    const validRefresh = makeJwt({
      exp: Math.floor(Date.now() / 1000) + 6 * 24 * 60 * 60,
    });

    localStorage.setItem('apex_token', expiredAccess);
    localStorage.setItem('apex_refresh_token', validRefresh);
    localStorage.setItem('apex_username', 'TadeoF1');
    localStorage.setItem('apex_session_expires_at', String(Date.now() + 5 * 24 * 60 * 60 * 1000));

    fetchSpy.mockImplementation(async (input: RequestInfo | URL) => {
      const url = typeof input === 'string' ? input : input.toString();
      if (url.includes('/protocol/openid-connect/token')) {
        return new Response(
          JSON.stringify({ access_token: freshAccess, refresh_token: validRefresh }),
          { status: 200, headers: { 'Content-Type': 'application/json' } },
        );
      }
      return new Response(JSON.stringify({}), { status: 200 });
    });

    const auth = TestBed.inject(AuthService);
    await auth.initialize();

    expect(auth.authenticated()).toBe(true);
    expect(auth.username()).toBe('TadeoF1');
    expect(auth.hasRole('player')).toBe(true);
    expect(localStorage.getItem('apex_token')).toBe(freshAccess);
    expect(keycloakMock.clientId).toBe('apexpredict-web');
  });

  it('cierra y limpia la sesion cuando supero la ventana de 7 dias', async () => {
    const token = makeJwt({
      preferred_username: 'TadeoF1',
      realm_access: { roles: ['player'] },
      exp: Math.floor(Date.now() / 1000) + 300,
    });
    localStorage.setItem('apex_token', token);
    localStorage.setItem('apex_refresh_token', token);
    localStorage.setItem('apex_username', 'TadeoF1');
    localStorage.setItem('apex_session_expires_at', String(Date.now() - 1000));

    const auth = TestBed.inject(AuthService);
    await auth.initialize();

    expect(auth.authenticated()).toBe(false);
    expect(auth.sessionExpired()).toBe(true);
    expect(localStorage.getItem('apex_token')).toBeNull();
    expect(localStorage.getItem('apex_session_expires_at')).toBeNull();
  });
});

