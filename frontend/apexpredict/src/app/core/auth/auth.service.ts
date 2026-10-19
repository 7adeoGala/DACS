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
      this.authenticated.set(!!this.keycloak.authenticated);
      this.username.set(this.keycloak.tokenParsed?.['preferred_username'] ?? '');
      this.roles.set(this.keycloak.realmAccess?.roles ?? []);
    };
    this.keycloak.onAuthSuccess = sync;
    this.keycloak.onAuthLogout = sync;
    this.keycloak.onAuthRefreshSuccess = sync;
    this.keycloak.onAuthRefreshError = () => {
      this.keycloak.clearToken();
      sessionStorage.removeItem('apex_token');
      sessionStorage.removeItem('apex_refresh_token');
      localStorage.removeItem('apex_token');
      localStorage.removeItem('apex_refresh_token');
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
        sync();
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
        sync();
      } catch (err) {
        console.warn('Keycloak init continuará en segundo plano (arranque rápido):', err);
        initPromise.then(() => {
          (this.keycloak as any).timeSkew = 0;
          sync();
        }).catch(() => {});
        sync();
      }
    }
  }

  hasRole(...roles: AppRole[]): boolean {
    return this.authenticated() && roles.some((role) => this.roles().includes(role));
  }

  async loginWithCredentials(username: string, password: string): Promise<boolean> {
    try {
      const tokenUrl = `${environment.keycloak.url}/realms/${environment.keycloak.realm}/protocol/openid-connect/token`;
      const body = new URLSearchParams({
        client_id: environment.keycloak.clientId,
        username: username.trim(),
        password: password.trim(),
        grant_type: 'password',
        scope: 'openid profile email',
      });

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 45000);

      const res = await fetch(tokenUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: body.toString(),
        signal: controller.signal
      });
      clearTimeout(timeoutId);

      if (!res.ok) {
        return false;
      }

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
      localStorage.setItem('apex_token', data.access_token);
      if (data.refresh_token) {
        sessionStorage.setItem('apex_refresh_token', data.refresh_token);
        localStorage.setItem('apex_refresh_token', data.refresh_token);
      }

      this.authenticated.set(true);
      const finalUsername = (this.keycloak as any).tokenParsed?.['preferred_username'] || username;
      this.username.set(finalUsername);
      localStorage.setItem('apex_username', finalUsername);
      this.roles.set((this.keycloak as any).realmAccess?.roles ?? []);

      // Provisionar y registrar de inmediato el usuario en el backend (app_users)
      this.provisionUserInBackend(data.access_token);
      return true;
    } catch (err) {
      console.error('Error al autenticar credenciales:', err);
      return false;
    }
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

  async registerUser(userData: { username: string; firstName: string; lastName: string; email: string; password: string }): Promise<void> {
    return this.register();
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

  register(): Promise<void> {
    return this.router.navigate(['/register']).then(() => {});
  }
}
