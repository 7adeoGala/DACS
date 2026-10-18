import { Injectable, inject, signal } from '@angular/core';
import Keycloak from 'keycloak-js';
import { AppRole } from '../models/api.models';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly keycloak = inject(Keycloak);
  readonly authenticated = signal(false);
  readonly isAuthenticated = this.authenticated;
  readonly available = signal(true);
  readonly username = signal('');
  readonly userPoints = signal(0);
  readonly roles = signal<readonly string[]>([]);

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
      sync();
    };
    try {
      await this.keycloak.init({
        pkceMethod: 'S256',
        checkLoginIframe: false,
      });
      sync();
    } catch (err) {
      console.warn('Keycloak no disponible para SSO silencioso:', err);
      this.available.set(false);
      sync();
    }
  }
  hasRole(...roles: AppRole[]): boolean {
    return this.authenticated() && roles.some((role) => this.roles().includes(role));
  }
  login(route = 'dashboard', idpHint?: string): Promise<void> {
    const target = new URL(route.replace(/^\/+/, ''), document.baseURI);
    if (target.origin !== location.origin) return Promise.reject(new Error('Destino invalido.'));
    const options: Parameters<Keycloak['login']>[0] = { redirectUri: target.href };
    if (idpHint) {
      options.idpHint = idpHint;
    }
    return this.keycloak.login(options);
  }
  loginWithGoogle(route = 'dashboard'): Promise<void> {
    return this.login(route, 'google');
  }
  logout(): Promise<void> {
    return this.keycloak.logout({ redirectUri: new URL('.', document.baseURI).href });
  }
  register(): Promise<void> {
    return this.keycloak.register({ redirectUri: new URL('dashboard', document.baseURI).href });
  }
}
