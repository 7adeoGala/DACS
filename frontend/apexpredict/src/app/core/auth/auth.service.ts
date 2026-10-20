import { Injectable, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import Keycloak from 'keycloak-js';
import { AppRole } from '../models/api.models';
import { environment } from '../../../environments/environment';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly keycloak = inject(Keycloak);
  private readonly router = inject(Router);
  readonly authenticated = signal(false);
  readonly isAuthenticated = this.authenticated;
  readonly available = signal(true);
  readonly username = signal('');
  readonly userPoints = signal(0);
  readonly roles = signal<readonly string[]>([]);

  private decodeJwt(token: string): any {
    try {
      const base64Url = token.split('.')[1];
      const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
      const jsonPayload = decodeURIComponent(
        atob(base64)
          .split('')
          .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
          .join('')
      );
      return JSON.parse(jsonPayload);
    } catch {
      return {};
    }
  }

  async initialize(): Promise<void> {
    const sync = () => {
      const hasToken = !!(this.keycloak.token || localStorage.getItem('apex_token') || sessionStorage.getItem('apex_token'));
      const isAuth = !!this.keycloak.authenticated || hasToken;
      this.authenticated.set(isAuth);
      if (isAuth) {
        this.available.set(true);
      }
      const parsed = this.keycloak.tokenParsed || (this.keycloak.token ? this.decodeJwt(this.keycloak.token) : null);
      if (parsed) {
        this.username.set(parsed['preferred_username'] || localStorage.getItem('apex_username') || sessionStorage.getItem('apex_username') || '');
        this.roles.set(parsed.realm_access?.roles ?? []);
      }
      if (this.keycloak.authenticated && this.keycloak.token) {
        sessionStorage.setItem('apex_token', this.keycloak.token);
        localStorage.setItem('apex_token', this.keycloak.token);
        if (this.keycloak.refreshToken) {
          sessionStorage.setItem('apex_refresh_token', this.keycloak.refreshToken);
          localStorage.setItem('apex_refresh_token', this.keycloak.refreshToken);
        }
        const u = parsed?.['preferred_username'];
        if (u) {
          localStorage.setItem('apex_username', u);
        }
        this.provisionUserInBackend(this.keycloak.token);
      }
    };
    this.keycloak.onAuthSuccess = sync;
    this.keycloak.onAuthLogout = sync;
    this.keycloak.onAuthRefreshSuccess = sync;
    this.keycloak.onAuthRefreshError = () => {
      this.keycloak.clearToken();
      sessionStorage.removeItem('apex_token');
      sessionStorage.removeItem('apex_refresh_token');
      sessionStorage.removeItem('apex_username');
      localStorage.removeItem('apex_token');
      localStorage.removeItem('apex_refresh_token');
      localStorage.removeItem('apex_username');
      sync();
    };

    // Restaurar token si se inició sesión previamente (soporta localStorage y sessionStorage)
    const savedToken = localStorage.getItem('apex_token') || sessionStorage.getItem('apex_token');
    const savedRefresh = localStorage.getItem('apex_refresh_token') || sessionStorage.getItem('apex_refresh_token');
    if (savedToken) {
      try {
        (this.keycloak as any).token = savedToken;
        (this.keycloak as any).refreshToken = savedRefresh || undefined;
        (this.keycloak as any).authenticated = true;
        (this.keycloak as any).tokenParsed = this.decodeJwt(savedToken);
        (this.keycloak as any).realmAccess = (this.keycloak as any).tokenParsed?.realm_access;
        (this.keycloak as any).timeSkew = 0;
        if (!(this.keycloak as any).endpoints) {
          (this.keycloak as any).endpoints = {
            token: () => `${environment.keycloak.url}/realms/${environment.keycloak.realm}/protocol/openid-connect/token`
          };
        }
        this.available.set(true);
        sync();
        this.provisionUserInBackend(savedToken);
      } catch (e) {
        console.warn('Error restaurando token de sesión:', e);
      }
    }

    const hasOAuthCallback = typeof window !== 'undefined' && 
      (window.location.search.includes('code=') || window.location.hash.includes('code='));

    const initPromise = this.keycloak.init({
      pkceMethod: 'S256',
      checkLoginIframe: false,
    });

    if (hasOAuthCallback) {
      try {
        await initPromise;
        (this.keycloak as any).timeSkew = 0;
        this.available.set(true);
        sync();
        if (typeof window !== 'undefined' && window.history && window.history.replaceState) {
          const cleanUrl = window.location.pathname;
          window.history.replaceState({}, document.title, cleanUrl);
        }
      } catch (err) {
        console.warn('Keycloak no disponible para SSO silencioso:', err);
        if (!this.authenticated()) {
          this.available.set(false);
        }
        sync();
      }
    } else {
      try {
        const timeoutPromise = new Promise((_, reject) =>
          setTimeout(() => reject(new Error('Keycloak init timeout')), 2500)
        );
        await Promise.race([initPromise, timeoutPromise]);
        (this.keycloak as any).timeSkew = 0;
        this.available.set(true);
        sync();
      } catch (err) {
        console.warn('Keycloak init continuará en segundo plano (arranque rápido):', err);
        initPromise.then(() => {
          (this.keycloak as any).timeSkew = 0;
          this.available.set(true);
          sync();
        }).catch(() => {});
        sync();
      }
    }
  }

  hasRole(...roles: AppRole[]): boolean {
    return this.authenticated() && roles.some((role) => this.roles().includes(role));
  }

  async loginWithCredentials(
    username: string,
    password: string,
    rememberMe = true,
    statusCallback?: (msg: string) => void
  ): Promise<boolean> {
    const tokenUrl = `${environment.keycloak.url}/realms/${environment.keycloak.realm}/protocol/openid-connect/token`;

    const attemptFetch = async (userParam: string) => {
      const body = new URLSearchParams({
        client_id: environment.keycloak.clientId,
        username: userParam.trim(),
        password: password,
        grant_type: 'password',
        scope: 'openid profile email',
      });

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 20000);

      try {
        const res = await fetch(tokenUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          body: body.toString(),
          signal: controller.signal
        });
        clearTimeout(timeoutId);
        return res;
      } catch (err: any) {
        clearTimeout(timeoutId);
        throw err;
      }
    };

    let userToTry = username.trim();
    if (userToTry.includes('@')) {
      userToTry = userToTry.toLowerCase();
    }

    const startTime = Date.now();
    const maxDurationMs = 50000;
    let lastError: any = null;
    let attemptCount = 0;

    while (Date.now() - startTime < maxDurationMs) {
      attemptCount++;
      try {
        if (attemptCount > 1) {
          statusCallback?.('Conectando con servidores de autenticación... Aguardá un instante mientras arranca el servicio.');
        }

        const res = await attemptFetch(userToTry);

        if (res.ok) {
          const data = await res.json();
          (this.keycloak as any).token = data.access_token;
          (this.keycloak as any).refreshToken = data.refresh_token;
          (this.keycloak as any).idToken = data.id_token;
          (this.keycloak as any).authenticated = true;
          (this.keycloak as any).tokenParsed = this.decodeJwt(data.access_token);
          (this.keycloak as any).realmAccess = (this.keycloak as any).tokenParsed?.realm_access;
          (this.keycloak as any).timeSkew = 0;
          if (!(this.keycloak as any).endpoints) {
            (this.keycloak as any).endpoints = {
              token: () => tokenUrl
            };
          }

          sessionStorage.setItem('apex_token', data.access_token);
          if (data.refresh_token) {
            sessionStorage.setItem('apex_refresh_token', data.refresh_token);
          }

          const finalUsername = (this.keycloak as any).tokenParsed?.['preferred_username'] || userToTry;

          if (rememberMe) {
            localStorage.setItem('apex_token', data.access_token);
            if (data.refresh_token) {
              localStorage.setItem('apex_refresh_token', data.refresh_token);
            }
            localStorage.setItem('apex_username', finalUsername);
          } else {
            localStorage.removeItem('apex_token');
            localStorage.removeItem('apex_refresh_token');
            localStorage.removeItem('apex_username');
          }

          this.available.set(true);
          this.authenticated.set(true);
          this.username.set(finalUsername);
          this.roles.set((this.keycloak as any).realmAccess?.roles ?? []);

          this.provisionUserInBackend(data.access_token);
          return true;
        }

        // Si falló con 400/401 y el usuario no tenía '@', probar con '@gmail.com' por si el usuario ingresó el prefijo de su correo
        if ((res.status === 400 || res.status === 401) && !userToTry.includes('@')) {
          try {
            const fallbackRes = await attemptFetch(userToTry.toLowerCase() + '@gmail.com');
            if (fallbackRes.ok) {
              const data = await fallbackRes.json();
              (this.keycloak as any).token = data.access_token;
              (this.keycloak as any).refreshToken = data.refresh_token;
              (this.keycloak as any).idToken = data.id_token;
              (this.keycloak as any).authenticated = true;
              (this.keycloak as any).tokenParsed = this.decodeJwt(data.access_token);
              (this.keycloak as any).realmAccess = (this.keycloak as any).tokenParsed?.realm_access;
              (this.keycloak as any).timeSkew = 0;
              if (!(this.keycloak as any).endpoints) {
                (this.keycloak as any).endpoints = { token: () => tokenUrl };
              }
              sessionStorage.setItem('apex_token', data.access_token);
              if (data.refresh_token) sessionStorage.setItem('apex_refresh_token', data.refresh_token);
              const finalUsername = (this.keycloak as any).tokenParsed?.['preferred_username'] || userToTry;
              if (rememberMe) {
                localStorage.setItem('apex_token', data.access_token);
                if (data.refresh_token) localStorage.setItem('apex_refresh_token', data.refresh_token);
                localStorage.setItem('apex_username', finalUsername);
              }
              this.available.set(true);
              this.authenticated.set(true);
              this.username.set(finalUsername);
              this.roles.set((this.keycloak as any).realmAccess?.roles ?? []);
              this.provisionUserInBackend(data.access_token);
              return true;
            }
          } catch {}
          throw new Error('Credenciales no válidas. Revisá tu usuario/correo y contraseña.');
        }

        if (res.status === 400 || res.status === 401) {
          throw new Error('Credenciales no válidas. Revisá tu usuario/correo y contraseña.');
        }

        // Si es 502, 503, 504: Render se está despertando en frío
        statusCallback?.('Servidor de autenticación iniciándose en Render... Aguardá unos segundos.');
        await new Promise((r) => setTimeout(r, 2500));
      } catch (err: any) {
        lastError = err;
        if (err.message && err.message.includes('Credenciales no válidas')) {
          throw err;
        }
        statusCallback?.('Conectando con servidores seguros... Aguardá unos segundos.');
        await new Promise((r) => setTimeout(r, 2500));
      }
    }

    throw lastError || new Error('Tiempo de espera agotado al conectar con el servidor de autenticación. Intentá nuevamente.');
  }

  async provisionUserInBackend(token?: string): Promise<void> {
    try {
      const authToken = token || (this.keycloak as any).token || localStorage.getItem('apex_token') || sessionStorage.getItem('apex_token');
      if (!authToken) return;
      await fetch(`${environment.apiUrl}/me`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${authToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({})
      });
    } catch (e) {
      console.warn('Registro de usuario en backend diferido:', e);
    }
  }

  login(route = 'dashboard', idpHint?: string): Promise<void> {
    if (idpHint) {
      const target = new URL(route.replace(/^\/+/, ''), document.baseURI);
      if (target.origin !== location.origin) return Promise.reject(new Error('Destino invalido.'));
      const options: Parameters<Keycloak['login']>[0] = { redirectUri: target.href, idpHint };
      return this.keycloak.login(options);
    }
    return this.router.navigate(['/login'], { queryParams: { returnUrl: route } }).then(() => {});
  }

  loginKeycloakDirect(route = 'dashboard'): Promise<void> {
    const target = new URL(route.replace(/^\/+/, ''), document.baseURI);
    if (target.origin !== location.origin) return Promise.reject(new Error('Destino invalido.'));
    const options: Parameters<Keycloak['login']>[0] = { redirectUri: target.href };
    return this.keycloak.login(options);
  }

  loginWithGoogle(route = 'dashboard'): Promise<void> {
    return this.login(route, 'google');
  }

  logout(): Promise<void> {
    sessionStorage.removeItem('apex_token');
    sessionStorage.removeItem('apex_refresh_token');
    localStorage.removeItem('apex_token');
    localStorage.removeItem('apex_refresh_token');
    localStorage.removeItem('apex_username');
    return this.keycloak.logout({ redirectUri: new URL('.', document.baseURI).href });
  }

  register(route = 'dashboard'): Promise<void> {
    const target = new URL(route.replace(/^\/+/, ''), document.baseURI);
    return this.keycloak.register({ redirectUri: target.href });
  }

  async registerUser(userData: { username: string; firstName: string; lastName: string; email: string; password: string }): Promise<void> {
    return this.register('dashboard');
  }

  async resetPassword(identifier: string, newPassword: string): Promise<boolean> {
    const rawId = identifier.trim();
    if (!rawId || !newPassword) {
      throw new Error('Identificador o contraseña no válidos.');
    }

    // 1. Obtener token de administración de Keycloak (realm master)
    const tokenUrl = `${environment.keycloak.url}/realms/master/protocol/openid-connect/token`;
    const tokenRes = await fetch(tokenUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id: 'admin-cli',
        username: 'admin',
        password: 'Vasquito5',
        grant_type: 'password',
      }).toString(),
    });

    if (!tokenRes.ok) {
      throw new Error('No se pudo conectar con el servicio de autenticación. Intentá de nuevo en unos segundos.');
    }

    const { access_token } = await tokenRes.json();
    const headers = {
      Authorization: `Bearer ${access_token}`,
      'Content-Type': 'application/json',
    };

    // 2. Buscar usuario por username exacto, email exacto o búsqueda general
    let foundUser: any = null;
    const adminUsersUrl = `${environment.keycloak.url}/admin/realms/${environment.keycloak.realm}/users`;

    if (rawId.includes('@')) {
      const emailRes = await fetch(`${adminUsersUrl}?email=${encodeURIComponent(rawId.toLowerCase())}&exact=true`, { headers });
      if (emailRes.ok) {
        const users = await emailRes.json();
        if (users && users.length > 0) {
          foundUser = users[0];
        }
      }
    } else {
      const userRes = await fetch(`${adminUsersUrl}?username=${encodeURIComponent(rawId)}&exact=true`, { headers });
      if (userRes.ok) {
        const users = await userRes.json();
        if (users && users.length > 0) {
          foundUser = users[0];
        }
      }

      if (!foundUser) {
        const gmailRes = await fetch(`${adminUsersUrl}?email=${encodeURIComponent(rawId.toLowerCase() + '@gmail.com')}&exact=true`, { headers });
        if (gmailRes.ok) {
          const users = await gmailRes.json();
          if (users && users.length > 0) {
            foundUser = users[0];
          }
        }
      }
    }

    if (!foundUser) {
      const searchRes = await fetch(`${adminUsersUrl}?search=${encodeURIComponent(rawId)}`, { headers });
      if (searchRes.ok) {
        const users = await searchRes.json();
        if (users && users.length > 0) {
          foundUser = users[0];
        }
      }
    }

    if (!foundUser || !foundUser.id) {
      throw new Error('No encontramos ninguna cuenta asociada a ese usuario o correo.');
    }

    // 3. Restablecer la contraseña
    const resetUrl = `${adminUsersUrl}/${foundUser.id}/reset-password`;
    const resetRes = await fetch(resetUrl, {
      method: 'PUT',
      headers,
      body: JSON.stringify({
        type: 'password',
        value: newPassword,
        temporary: false,
      }),
    });

    if (!resetRes.ok) {
      throw new Error('No se pudo actualizar la contraseña. Por favor, intentá nuevamente.');
    }

    // 4. Asegurar que la cuenta quede habilitada, verificada y sin acciones bloqueantes
    const userUpdates: any = {};
    if (!foundUser.emailVerified) {
      userUpdates.emailVerified = true;
    }
    if (!foundUser.firstName) {
      userUpdates.firstName = foundUser.username || 'Piloto';
    }
    if (!foundUser.lastName) {
      userUpdates.lastName = 'F1';
    }
    if (foundUser.requiredActions && foundUser.requiredActions.length > 0) {
      userUpdates.requiredActions = foundUser.requiredActions.filter(
        (a: string) => a !== 'UPDATE_PASSWORD' && a !== 'VERIFY_EMAIL' && a !== 'UPDATE_PROFILE'
      );
    }
    if (Object.keys(userUpdates).length > 0) {
      await fetch(`${adminUsersUrl}/${foundUser.id}`, {
        method: 'PUT',
        headers,
        body: JSON.stringify(userUpdates),
      }).catch(() => {});
    }

    return true;
  }
}
