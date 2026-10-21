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

        const handleSuccess = async (successRes: Response, identifierUsed: string): Promise<boolean> => {
          const data = await successRes.json();
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

          const finalUsername = (this.keycloak as any).tokenParsed?.['preferred_username'] || identifierUsed;

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
        };

        if (res.ok) {
          return await handleSuccess(res, userToTry);
        }

        // Si falló con 400/401, intentar resolver el usuario alternativo (usuario <-> correo)
        if (res.status === 400 || res.status === 401) {
          try {
            const adminToken = await this.getMasterAdminToken();
            const foundUser = await this.findUserByIdentifier(userToTry, adminToken);
            if (foundUser) {
              // Asegurar emailVerified: true en segundo plano si estaba deshabilitado
              if (!foundUser.emailVerified && foundUser.id) {
                fetch(`${environment.keycloak.url}/admin/realms/${environment.keycloak.realm}/users/${foundUser.id}`, {
                  method: 'PUT',
                  headers: { Authorization: `Bearer ${adminToken}`, 'Content-Type': 'application/json' },
                  body: JSON.stringify({ emailVerified: true })
                }).catch(() => {});
              }

              // Si el usuario ingresó correo, intentar con su username canónico
              if (foundUser.username && foundUser.username.toLowerCase() !== userToTry.toLowerCase()) {
                const retryUsernameRes = await attemptFetch(foundUser.username);
                if (retryUsernameRes.ok) {
                  return await handleSuccess(retryUsernameRes, foundUser.username);
                }
              }

              // Si el usuario ingresó username, intentar con su correo
              if (foundUser.email && foundUser.email.toLowerCase() !== userToTry.toLowerCase()) {
                const retryEmailRes = await attemptFetch(foundUser.email.toLowerCase());
                if (retryEmailRes.ok) {
                  return await handleSuccess(retryEmailRes, foundUser.username || foundUser.email);
                }
              }
            }
          } catch (resErr) {
            console.warn('Resolución de identidad omitida en login:', resErr);
          }

          // Fallback con @gmail.com si el usuario ingresó solo el prefijo sin @
          if (!userToTry.includes('@')) {
            try {
              const fallbackRes = await attemptFetch(userToTry.toLowerCase() + '@gmail.com');
              if (fallbackRes.ok) {
                return await handleSuccess(fallbackRes, userToTry);
              }
            } catch {}
          }

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
    const adminToken = await this.getMasterAdminToken();
    const adminUsersUrl = `${environment.keycloak.url}/admin/realms/${environment.keycloak.realm}/users`;

    const createRes = await fetch(adminUsersUrl, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${adminToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        username: userData.username.trim(),
        firstName: userData.firstName.trim(),
        lastName: userData.lastName.trim(),
        email: userData.email.trim().toLowerCase(),
        enabled: true,
        emailVerified: true,
        credentials: [{
          type: 'password',
          value: userData.password,
          temporary: false,
        }],
      }),
    });

    if (!createRes.ok) {
      if (createRes.status === 409) {
        throw new Error('Ya existe una cuenta registrada con ese nombre de usuario o correo electrónico.');
      }
      const errText = await createRes.text().catch(() => '');
      throw new Error(errText || 'No se pudo crear la cuenta en este momento. Intentá nuevamente.');
    }

    // Iniciar sesión automáticamente tras el registro exitoso
    await this.loginWithCredentials(userData.username.trim(), userData.password, true);
  }

  private async getMasterAdminToken(): Promise<string> {
    const tokenUrl = `${environment.keycloak.url}/realms/master/protocol/openid-connect/token`;
    let lastError: any = null;

    for (let attempt = 1; attempt <= 3; attempt++) {
      try {
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

        if (tokenRes.ok) {
          const { access_token } = await tokenRes.json();
          return access_token;
        }

        if (tokenRes.status === 400 || tokenRes.status === 401) {
          throw new Error('Credenciales maestras de Keycloak rechazadas.');
        }
      } catch (err: any) {
        lastError = err;
        await new Promise((r) => setTimeout(r, 1200));
      }
    }

    throw lastError || new Error('No se pudo conectar con el servidor de autenticación. Intentá de nuevo en unos segundos.');
  }

  private async findUserByIdentifier(identifier: string, adminToken: string): Promise<any> {
    const rawId = identifier.trim();
    const headers = { Authorization: `Bearer ${adminToken}`, 'Content-Type': 'application/json' };
    const adminUsersUrl = `${environment.keycloak.url}/admin/realms/${environment.keycloak.realm}/users`;

    let foundUser: any = null;

    if (rawId.includes('@')) {
      const emailRes = await fetch(`${adminUsersUrl}?email=${encodeURIComponent(rawId.toLowerCase())}&exact=true`, { headers });
      if (emailRes.ok) {
        const users = await emailRes.json();
        if (users && users.length > 0) foundUser = users[0];
      }
    } else {
      const userRes = await fetch(`${adminUsersUrl}?username=${encodeURIComponent(rawId)}&exact=true`, { headers });
      if (userRes.ok) {
        const users = await userRes.json();
        if (users && users.length > 0) foundUser = users[0];
      }

      if (!foundUser) {
        const gmailRes = await fetch(`${adminUsersUrl}?email=${encodeURIComponent(rawId.toLowerCase() + '@gmail.com')}&exact=true`, { headers });
        if (gmailRes.ok) {
          const users = await gmailRes.json();
          if (users && users.length > 0) foundUser = users[0];
        }
      }
    }

    if (!foundUser) {
      const searchRes = await fetch(`${adminUsersUrl}?search=${encodeURIComponent(rawId)}`, { headers });
      if (searchRes.ok) {
        const users = await searchRes.json();
        if (users && users.length > 0) foundUser = users[0];
      }
    }

    return foundUser;
  }

  async requestPasswordResetCode(identifier: string): Promise<{ success: boolean; email: string; username: string; code: string }> {
    const rawId = identifier.trim();
    if (!rawId) {
      throw new Error('Por favor ingresá tu correo electrónico o usuario.');
    }

    const adminToken = await this.getMasterAdminToken();
    const foundUser = await this.findUserByIdentifier(rawId, adminToken);

    if (!foundUser || !foundUser.id) {
      throw new Error('No encontramos ninguna cuenta asociada a ese usuario o correo.');
    }

    // Generar código de 6 dígitos numéricos
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    const expires = String(Date.now() + 15 * 60 * 1000); // 15 minutos

    const headers = { Authorization: `Bearer ${adminToken}`, 'Content-Type': 'application/json' };
    const adminUsersUrl = `${environment.keycloak.url}/admin/realms/${environment.keycloak.realm}/users`;

    const targetEmail = foundUser.email || (rawId.includes('@') ? rawId.toLowerCase() : null);

    if (!targetEmail) {
      throw new Error('Esta cuenta no tiene un correo electrónico válido registrado para recibir el código.');
    }

    // Guardar código y expiración en atributos de Keycloak preservando todos los campos
    const updatePayload = {
      id: foundUser.id,
      username: foundUser.username,
      email: targetEmail,
      firstName: foundUser.firstName || 'Piloto',
      lastName: foundUser.lastName || 'F1',
      emailVerified: true,
      enabled: true,
      attributes: {
        ...(foundUser.attributes || {}),
        reset_code: [code],
        reset_code_expires: [expires]
      }
    };

    const updateRes = await fetch(`${adminUsersUrl}/${foundUser.id}`, {
      method: 'PUT',
      headers,
      body: JSON.stringify(updatePayload)
    });

    if (!updateRes.ok) {
      throw new Error('No se pudo generar el código de verificación. Intentá nuevamente.');
    }

    // Despacho de correo real mediante el endpoint seguro de correo
    try {
      const emailEndpoint = typeof window !== 'undefined'
        ? `${window.location.origin}/api/send-email`
        : 'https://dacs-nine.vercel.app/api/send-email';

      const sendRes = await fetch(emailEndpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          to: targetEmail,
          code,
        }),
      });

      if (!sendRes.ok) {
        const errJson = await sendRes.json().catch(() => ({}));
        throw new Error(errJson.error || 'Error al despachar el correo de verificación.');
      }
    } catch (mailErr: any) {
      console.error('Error enviando correo real:', mailErr);
      throw new Error(mailErr.message || `No se pudo enviar el correo a ${targetEmail}. Verificá la conexión.`);
    }

    return {
      success: true,
      email: targetEmail,
      username: foundUser.username || rawId,
      code
    };
  }

  async verifyResetCode(identifier: string, enteredCode: string): Promise<boolean> {
    const rawId = identifier.trim();
    const rawCode = enteredCode.trim();

    if (!rawId || !rawCode) {
      throw new Error('Por favor ingresá el código de 6 dígitos.');
    }

    const adminToken = await this.getMasterAdminToken();
    const foundUser = await this.findUserByIdentifier(rawId, adminToken);

    if (!foundUser || !foundUser.id) {
      throw new Error('Cuenta no encontrada.');
    }

    const headers = { Authorization: `Bearer ${adminToken}`, 'Content-Type': 'application/json' };
    const adminUsersUrl = `${environment.keycloak.url}/admin/realms/${environment.keycloak.realm}/users`;

    // Leer usuario fresco de Keycloak
    const userRes = await fetch(`${adminUsersUrl}/${foundUser.id}`, { headers });
    if (!userRes.ok) {
      throw new Error('Error al verificar código con el servidor de autenticación.');
    }

    const freshUser = await userRes.json();
    const savedCode = freshUser.attributes?.reset_code?.[0];
    const savedExpires = Number(freshUser.attributes?.reset_code_expires?.[0]);

    if (!savedCode) {
      throw new Error('No hay ningún código activo para esta cuenta. Solicitá uno nuevo.');
    }

    if (Date.now() > savedExpires) {
      throw new Error('El código de verificación ha expirado (validez: 15 minutos). Solicitá uno nuevo.');
    }

    if (savedCode.trim() !== rawCode) {
      throw new Error('El código ingresado es incorrecto. Revisá el código e intentá de nuevo.');
    }

    return true;
  }

  async completePasswordReset(identifier: string, enteredCode: string, newPassword: string): Promise<boolean> {
    const rawId = identifier.trim();
    const rawCode = enteredCode.trim();
    const rawPwd = newPassword.trim();

    if (!rawId || !rawCode || !rawPwd) {
      throw new Error('Datos incompletos para restablecer la contraseña.');
    }

    // 1. Validar código
    await this.verifyResetCode(rawId, rawCode);

    const adminToken = await this.getMasterAdminToken();
    const foundUser = await this.findUserByIdentifier(rawId, adminToken);

    if (!foundUser || !foundUser.id) {
      throw new Error('Cuenta no encontrada.');
    }

    const headers = { Authorization: `Bearer ${adminToken}`, 'Content-Type': 'application/json' };
    const adminUsersUrl = `${environment.keycloak.url}/admin/realms/${environment.keycloak.realm}/users`;

    // 2. Restablecer la contraseña
    const resetUrl = `${adminUsersUrl}/${foundUser.id}/reset-password`;
    const resetRes = await fetch(resetUrl, {
      method: 'PUT',
      headers,
      body: JSON.stringify({
        type: 'password',
        value: rawPwd,
        temporary: false,
      }),
    });

    if (!resetRes.ok) {
      throw new Error('No se pudo actualizar la contraseña. Verificá que cumpla las políticas.');
    }

    // 3. Limpiar código utilizado y asegurar estado del usuario preservando todos los campos
    const userUpdates: any = {
      id: foundUser.id,
      username: foundUser.username,
      email: foundUser.email,
      firstName: foundUser.firstName || 'Piloto',
      lastName: foundUser.lastName || 'F1',
      emailVerified: true,
      enabled: true,
      attributes: {
        ...(foundUser.attributes || {}),
        reset_code: [],
        reset_code_expires: []
      }
    };

    if (foundUser.requiredActions && foundUser.requiredActions.length > 0) {
      userUpdates.requiredActions = foundUser.requiredActions.filter(
        (a: string) => a !== 'UPDATE_PASSWORD' && a !== 'VERIFY_EMAIL' && a !== 'UPDATE_PROFILE'
      );
    }

    await fetch(`${adminUsersUrl}/${foundUser.id}`, {
      method: 'PUT',
      headers,
      body: JSON.stringify(userUpdates),
    }).catch(() => {});

    return true;
  }

  async resetPassword(identifier: string, newPassword: string): Promise<boolean> {
    const rawId = identifier.trim();
    if (!rawId || !newPassword) {
      throw new Error('Identificador o contraseña no válidos.');
    }

    const adminToken = await this.getMasterAdminToken();
    const foundUser = await this.findUserByIdentifier(rawId, adminToken);

    if (!foundUser || !foundUser.id) {
      throw new Error('No encontramos ninguna cuenta asociada a ese usuario o correo.');
    }

    const headers = { Authorization: `Bearer ${adminToken}`, 'Content-Type': 'application/json' };
    const adminUsersUrl = `${environment.keycloak.url}/admin/realms/${environment.keycloak.realm}/users`;

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

    const userUpdates: any = {};
    if (!foundUser.emailVerified) userUpdates.emailVerified = true;
    if (!foundUser.firstName) userUpdates.firstName = foundUser.username || 'Piloto';
    if (!foundUser.lastName) userUpdates.lastName = 'F1';
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
