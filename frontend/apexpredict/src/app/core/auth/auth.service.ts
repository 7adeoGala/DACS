import { Injectable, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import Keycloak from 'keycloak-js';
import { AppRole } from '../models/api.models';
import { environment } from '../../../environments/environment';

@Injectable({ providedIn: 'root' })
export class AuthService {
  static readonly SESSION_DURATION_MS = 7 * 24 * 60 * 60 * 1000;
  private static readonly TOKEN_KEY = 'apex_token';
  private static readonly REFRESH_TOKEN_KEY = 'apex_refresh_token';
  private static readonly USERNAME_KEY = 'apex_username';
  private static readonly SESSION_EXPIRES_AT_KEY = 'apex_session_expires_at';

  private readonly keycloak = inject(Keycloak);
  private readonly router = inject(Router);
  readonly authenticated = signal(false);
  readonly isAuthenticated = this.authenticated;
  isLoggedIn(): boolean {
    return this.authenticated();
  }
  readonly available = signal(true);
  readonly sessionExpired = signal(false);
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

  private safeGetItem(key: string): string | null {
    try {
      const fromLocal = typeof localStorage !== 'undefined' ? localStorage.getItem(key) : null;
      if (fromLocal !== null) return fromLocal;
      return typeof sessionStorage !== 'undefined' ? sessionStorage.getItem(key) : null;
    } catch {
      return null;
    }
  }

  private hasLocalSession(): boolean {
    try {
      return typeof localStorage !== 'undefined' && !!localStorage.getItem(AuthService.TOKEN_KEY);
    } catch {
      return false;
    }
  }

  private isStoredSessionExpired(): boolean {
    const rawExpires = this.safeGetItem(AuthService.SESSION_EXPIRES_AT_KEY);
    if (rawExpires) {
      const expiresAt = Number(rawExpires);
      if (Number.isFinite(expiresAt) && expiresAt > 0 && Date.now() >= expiresAt) {
        return true;
      }
    }

    const savedRefresh = this.safeGetItem(AuthService.REFRESH_TOKEN_KEY);
    if (savedRefresh && savedRefresh.split('.').length === 3) {
      const decodedRefresh = this.decodeJwt(savedRefresh);
      if (typeof decodedRefresh?.exp === 'number' && decodedRefresh.exp > 0 && Date.now() >= decodedRefresh.exp * 1000) {
        return true;
      }
    }

    return false;
  }

  private applyKeycloakTokens(token: string, refreshToken?: string | null, idToken?: string | null): any {
    const parsed = this.decodeJwt(token);
    const tokenEndpoint = `${environment.keycloak.url}/realms/${environment.keycloak.realm}/protocol/openid-connect/token`;
    (this.keycloak as any).token = token;
    (this.keycloak as any).refreshToken = refreshToken || undefined;
    if (idToken) {
      (this.keycloak as any).idToken = idToken;
    }
    (this.keycloak as any).authenticated = true;
    (this.keycloak as any).tokenParsed = parsed;
    (this.keycloak as any).realmAccess = parsed?.realm_access;
    (this.keycloak as any).timeSkew = 0;
    (this.keycloak as any).clientId = environment.keycloak.clientId;
    (this.keycloak as any).realm = environment.keycloak.realm;
    (this.keycloak as any).authServerUrl = environment.keycloak.url;
    if (!(this.keycloak as any).endpoints || typeof (this.keycloak as any).endpoints?.token !== 'function') {
      (this.keycloak as any).endpoints = { token: () => tokenEndpoint };
    }
    return parsed;
  }

  private persistSession(
    token: string,
    refreshToken: string | undefined,
    username: string | undefined,
    persistLocal: boolean,
    resetExpiryWindow: boolean
  ): void {
    const existingExpiryRaw = this.safeGetItem(AuthService.SESSION_EXPIRES_AT_KEY);
    const existingExpiry = existingExpiryRaw ? Number(existingExpiryRaw) : NaN;
    const expiresAt = resetExpiryWindow || !Number.isFinite(existingExpiry) || existingExpiry <= 0
      ? Date.now() + AuthService.SESSION_DURATION_MS
      : existingExpiry;
    const expiresAtStr = String(expiresAt);

    try {
      if (typeof sessionStorage !== 'undefined') {
        sessionStorage.setItem(AuthService.TOKEN_KEY, token);
        if (refreshToken) {
          sessionStorage.setItem(AuthService.REFRESH_TOKEN_KEY, refreshToken);
        }
        if (username) {
          sessionStorage.setItem(AuthService.USERNAME_KEY, username);
        }
        sessionStorage.setItem(AuthService.SESSION_EXPIRES_AT_KEY, expiresAtStr);
      }
    } catch {}

    try {
      if (typeof localStorage !== 'undefined') {
        if (persistLocal) {
          localStorage.setItem(AuthService.TOKEN_KEY, token);
          if (refreshToken) {
            localStorage.setItem(AuthService.REFRESH_TOKEN_KEY, refreshToken);
          }
          if (username) {
            localStorage.setItem(AuthService.USERNAME_KEY, username);
          }
          localStorage.setItem(AuthService.SESSION_EXPIRES_AT_KEY, expiresAtStr);
        } else {
          localStorage.removeItem(AuthService.TOKEN_KEY);
          localStorage.removeItem(AuthService.REFRESH_TOKEN_KEY);
          localStorage.removeItem(AuthService.USERNAME_KEY);
          localStorage.removeItem(AuthService.SESSION_EXPIRES_AT_KEY);
        }
      }
    } catch {}
  }

  async initialize(): Promise<void> {
    const hasOAuthCallback = typeof window !== 'undefined' &&
      (window.location.search.includes('code=') || window.location.hash.includes('code='));

    const sync = (isFreshAuth = false) => {
      const currentToken = this.keycloak.token || this.safeGetItem(AuthService.TOKEN_KEY);
      const hasToken = !!currentToken;
      const isAuth = !!this.keycloak.authenticated || hasToken;
      this.authenticated.set(isAuth);
      if (isAuth) {
        this.available.set(true);
        this.sessionExpired.set(false);
      }
      const parsed = this.keycloak.tokenParsed || (currentToken ? this.decodeJwt(currentToken) : null);
      if (parsed) {
        const resolvedUsername = parsed['preferred_username'] || this.safeGetItem(AuthService.USERNAME_KEY) || '';
        this.username.set(resolvedUsername);
        this.roles.set(parsed.realm_access?.roles ?? []);
      }
      if (this.keycloak.authenticated && this.keycloak.token) {
        const persistLocal = isFreshAuth || this.hasLocalSession();
        const resolvedUsername = parsed?.['preferred_username'] || this.safeGetItem(AuthService.USERNAME_KEY) || undefined;
        this.persistSession(this.keycloak.token, this.keycloak.refreshToken, resolvedUsername, persistLocal, isFreshAuth);
        this.provisionUserInBackend(this.keycloak.token);
      }
    };

    this.keycloak.onAuthSuccess = () => sync(hasOAuthCallback);
    this.keycloak.onAuthLogout = () => {
      if (!this.safeGetItem(AuthService.TOKEN_KEY)) {
        sync(false);
      }
    };
    this.keycloak.onAuthRefreshSuccess = () => sync(false);
    this.keycloak.onAuthRefreshError = () => {
      if (!this.keycloak.token || this.isStoredSessionExpired()) {
        this.clearLocalSession();
        this.sessionExpired.set(true);
      }
    };

    if (!hasOAuthCallback && this.isStoredSessionExpired()) {
      this.clearLocalSession();
      this.sessionExpired.set(true);
    }

    const restoreTokens = () => {
      if (this.isStoredSessionExpired()) {
        this.clearLocalSession();
        this.sessionExpired.set(true);
        return;
      }
      const savedToken = this.safeGetItem(AuthService.TOKEN_KEY);
      const savedRefresh = this.safeGetItem(AuthService.REFRESH_TOKEN_KEY);
      if (savedToken) {
        try {
          this.applyKeycloakTokens(savedToken, savedRefresh);
          const parsed = this.keycloak.tokenParsed;
          const resolvedUsername = parsed?.['preferred_username'] || this.safeGetItem(AuthService.USERNAME_KEY) || undefined;
          this.persistSession(savedToken, savedRefresh || undefined, resolvedUsername, this.hasLocalSession(), false);
          this.available.set(true);
        } catch (e) {
          console.warn('Error restaurando token de sesión:', e);
        }
      }
    };

    if (!hasOAuthCallback) {
      restoreTokens();
      sync(false);
    }

    const initPromise = this.keycloak.init({
      pkceMethod: 'S256',
      checkLoginIframe: false,
    });

    if (hasOAuthCallback) {
      try {
        await initPromise;
        (this.keycloak as any).timeSkew = 0;
        this.available.set(true);
        sync(true);
        if (typeof window !== 'undefined' && window.history && window.history.replaceState) {
          const cleanUrl = window.location.pathname;
          window.history.replaceState({}, document.title, cleanUrl);
        }
      } catch (err) {
        console.warn('Keycloak no disponible para SSO silencioso:', err);
        restoreTokens();
        if (!this.authenticated()) {
          this.available.set(false);
        }
        sync(false);
      }
    } else {
      try {
        const timeoutPromise = new Promise((_, reject) =>
          setTimeout(() => reject(new Error('Keycloak init timeout')), 2500)
        );
        await Promise.race([initPromise, timeoutPromise]);
        (this.keycloak as any).timeSkew = 0;
        restoreTokens();
        this.available.set(true);
        sync(false);
      } catch {
        console.warn('Keycloak init continuará en segundo plano (arranque rápido).');
        initPromise.then(() => {
          (this.keycloak as any).timeSkew = 0;
          restoreTokens();
          this.available.set(true);
          sync(false);
        }).catch(() => {});
        restoreTokens();
        sync(false);
      }
    }

    if (this.authenticated() && this.isTokenExpired() && this.safeGetItem(AuthService.REFRESH_TOKEN_KEY)) {
      await Promise.race([
        this.refreshAccessToken().catch(() => null),
        new Promise<null>((resolve) => setTimeout(() => resolve(null), 5000))
      ]);
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

        const handleSuccess = async (successRes: Response, identifierUsed: string): Promise<boolean> => {
          const data = await successRes.json();
          const parsed = this.applyKeycloakTokens(data.access_token, data.refresh_token, data.id_token);
          const finalUsername = parsed?.['preferred_username'] || identifierUsed;

          this.persistSession(data.access_token, data.refresh_token, finalUsername, rememberMe, true);

          this.available.set(true);
          this.sessionExpired.set(false);
          this.authenticated.set(true);
          this.username.set(finalUsername);
          this.roles.set((this.keycloak as any).realmAccess?.roles ?? []);

          this.provisionUserInBackend(data.access_token);
          return true;
        };

        if (res.ok) {
          return await handleSuccess(res, userToTry);
        }

        if (res.status === 400 || res.status === 401) {
          throw new Error('Credenciales no válidas. Revisá tu usuario/correo y contraseña.');
        }

        if (res.status === 429) {
          throw new Error('Demasiados intentos de inicio de sesión. Esperá unos segundos e intentá nuevamente.');
        }

        const backoffMs = Math.min(4000 * attemptCount, 12000);
        statusCallback?.('Servidor de autenticación iniciándose en Render... Aguardá unos segundos.');
        await new Promise((r) => setTimeout(r, backoffMs));
      } catch (err: any) {
        lastError = err;
        if (
          err.message &&
          (err.message.includes('Credenciales no válidas') || err.message.includes('Demasiados intentos'))
        ) {
          throw err;
        }
        const backoffMs = Math.min(4000 * attemptCount, 12000);
        statusCallback?.('Conectando con servidores seguros... Aguardá unos segundos.');
        await new Promise((r) => setTimeout(r, backoffMs));
      }
    }

    throw lastError || new Error('Tiempo de espera agotado al conectar con el servidor de autenticación. Intentá nuevamente.');
  }

  private lastProvisionedToken: string | null = null;
  private isProvisioning = false;

  async provisionUserInBackend(token?: string): Promise<void> {
    try {
      const authToken = token || (this.keycloak as any).token || 
        (typeof sessionStorage !== 'undefined' ? sessionStorage.getItem('apex_token') : null) ||
        (typeof localStorage !== 'undefined' ? localStorage.getItem('apex_token') : null);
      if (!authToken) return;
      if (this.lastProvisionedToken === authToken || this.isProvisioning) {
        return;
      }
      this.isProvisioning = true;
      const res = await fetch(`${environment.apiUrl}/me`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${authToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({})
      });
      if (res.ok) {
        this.lastProvisionedToken = authToken;
      }
    } catch (e) {
      console.warn('Registro de usuario en backend diferido:', e);
    } finally {
      this.isProvisioning = false;
    }
  }

  private isRefreshing = false;
  private refreshPromise: Promise<string | null> | null = null;

  isTokenExpired(token?: string | null): boolean {
    const t = token || (this.keycloak as any).token || 
      (typeof sessionStorage !== 'undefined' ? sessionStorage.getItem('apex_token') : null) ||
      (typeof localStorage !== 'undefined' ? localStorage.getItem('apex_token') : null);
    if (!t) return false;
    try {
      const decoded = this.decodeJwt(t);
      if (!decoded || !decoded.exp) return false;
      return Date.now() >= ((decoded.exp * 1000) - 30000);
    } catch {
      return false;
    }
  }

  async refreshAccessToken(): Promise<string | null> {
    if (this.isRefreshing && this.refreshPromise) {
      return this.refreshPromise;
    }

    if (this.isStoredSessionExpired()) {
      this.clearLocalSession();
      this.sessionExpired.set(true);
      return null;
    }

    const refreshToken =
      (this.keycloak as any).refreshToken ||
      this.safeGetItem(AuthService.REFRESH_TOKEN_KEY);

    if (!refreshToken) {
      return null;
    }

    this.isRefreshing = true;
    this.refreshPromise = (async () => {
      try {
        const tokenUrl = `${environment.keycloak.url}/realms/${environment.keycloak.realm}/protocol/openid-connect/token`;
        let res: Response | null = null;
        for (let attempt = 1; attempt <= 2; attempt++) {
          res = await fetch(tokenUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: new URLSearchParams({
              client_id: environment.keycloak.clientId,
              grant_type: 'refresh_token',
              refresh_token: refreshToken
            }).toString()
          });
          if (res.ok || res.status === 400 || res.status === 401 || attempt === 2) {
            break;
          }
          await new Promise((r) => setTimeout(r, 1500));
        }

        if (!res || !res.ok) {
          if (res && (res.status === 400 || res.status === 401)) {
            console.warn('El refresh token ha expirado o fue revocado. Limpiando credenciales caducadas.');
            this.clearLocalSession();
            this.sessionExpired.set(true);
          }
          return null;
        }

        const data = await res.json();
        if (data.access_token) {
          const parsed = this.applyKeycloakTokens(data.access_token, data.refresh_token || refreshToken, data.id_token);
          const resolvedUsername = parsed?.['preferred_username'] || this.safeGetItem(AuthService.USERNAME_KEY) || undefined;
          this.persistSession(
            data.access_token,
            data.refresh_token || refreshToken,
            resolvedUsername,
            this.hasLocalSession(),
            false
          );
          if (resolvedUsername) {
            this.username.set(resolvedUsername);
          }
          this.roles.set(parsed?.realm_access?.roles ?? []);
          this.sessionExpired.set(false);
          this.authenticated.set(true);
          return data.access_token;
        }
        return null;
      } catch (err) {
        console.warn('Error renovando token:', err);
        return null;
      } finally {
        this.isRefreshing = false;
        this.refreshPromise = null;
      }
    })();

    return this.refreshPromise;
  }

  clearLocalSession(): void {
    this.lastProvisionedToken = null;
    if (typeof sessionStorage !== 'undefined') {
      sessionStorage.removeItem(AuthService.TOKEN_KEY);
      sessionStorage.removeItem(AuthService.REFRESH_TOKEN_KEY);
      sessionStorage.removeItem(AuthService.USERNAME_KEY);
      sessionStorage.removeItem(AuthService.SESSION_EXPIRES_AT_KEY);
    }
    if (typeof localStorage !== 'undefined') {
      localStorage.removeItem(AuthService.TOKEN_KEY);
      localStorage.removeItem(AuthService.REFRESH_TOKEN_KEY);
      localStorage.removeItem(AuthService.USERNAME_KEY);
      localStorage.removeItem(AuthService.SESSION_EXPIRES_AT_KEY);
    }
    try {
      if (this.keycloak && typeof this.keycloak.clearToken === 'function') {
        this.keycloak.clearToken();
      }
    } catch {}
    (this.keycloak as any).token = undefined;
    (this.keycloak as any).refreshToken = undefined;
    (this.keycloak as any).authenticated = false;
    (this.keycloak as any).tokenParsed = undefined;
    (this.keycloak as any).realmAccess = undefined;
    this.authenticated.set(false);
    this.username.set('');
    this.roles.set([]);
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
    this.clearLocalSession();
    const base = typeof document !== 'undefined' ? (document.baseURI || window.location.origin) : '';
    const redirectUri = base.includes('/DACS/')
      ? new URL('/DACS/', window.location.origin).href
      : new URL('.', document.baseURI).href;
    return this.keycloak.logout({ redirectUri });
  }

  register(route = 'dashboard'): Promise<void> {
    const target = new URL(route.replace(/^\/+/, ''), document.baseURI);
    return this.keycloak.register({ redirectUri: target.href });
  }

  openResetPassword(route = 'dashboard'): void {
    const target = new URL(route.replace(/^\/+/, ''), document.baseURI);
    const resetUrl = new URL(
      `${environment.keycloak.url}/realms/${environment.keycloak.realm}/login-actions/reset-credentials`,
    );
    resetUrl.searchParams.set('client_id', environment.keycloak.clientId);
    resetUrl.searchParams.set('redirect_uri', target.href);
    window.location.assign(resetUrl.toString());
  }
}
