import { Component, signal, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink, ActivatedRoute } from '@angular/router';
import { AuthHeaderComponent } from './auth-header.component';
import { AuthService } from '../../core/auth/auth.service';
import { ApiService } from '../../core/services/api.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, AuthHeaderComponent],
  template: `
    <div class="auth-layout">
      <!-- HEADER IDÉNTICO PERSISTENTE -->
      <app-auth-header />

      <!-- CONTENEDOR CENTRADO DE LA TARJETA -->
      <main class="auth-main">
        @if (isLoading()) {
          <!-- PANTALLA DE CARGA EN EL CENTRO -->
          <div class="auth-loading-screen">
            <!-- ANIMACIÓN F1 QUE HACE AL USUARIO ESPERAR -->
            <div class="f1-loader-wrap">
              <div class="f1-loader-rings">
                <div class="ring-outer"></div>
                <div class="ring-inner"></div>
                <div class="f1-loader-logo">
                  <svg viewBox="0 0 18 18" width="34" height="34" fill="none">
                    <path d="M2 14L8 4H12L6 14H2Z" fill="#e10600"/>
                    <path d="M8 14L14 4H18L12 14H8Z" fill="#ffffff"/>
                  </svg>
                </div>
              </div>

              <!-- 5 LUCES DE SEMÁFORO DE LARGADA F1 EN SECUENCIA -->
              <div class="f1-start-lights" aria-hidden="true">
                <div class="light-unit"><span class="light-bulb bulb-1"></span></div>
                <div class="light-unit"><span class="light-bulb bulb-2"></span></div>
                <div class="light-unit"><span class="light-bulb bulb-3"></span></div>
                <div class="light-unit"><span class="light-bulb bulb-4"></span></div>
                <div class="light-unit"><span class="light-bulb bulb-5"></span></div>
              </div>
            </div>

            <!-- CARTEL SOLO EN EL CENTRO -->
            <div class="loading-cartel-box">
              <span class="loading-cartel-dot"></span>
              <p class="loading-cartel-text">
                Conectando con servidores de autenticación... Aguardá un instante mientras se valida tu cuenta.
              </p>
            </div>
          </div>
        } @else {
          <div class="auth-card">
            <div class="card-header">
              <h1 class="card-title">Iniciar Sesión</h1>
            </div>

            @if (errorMessage()) {
              <div class="alert-message error">
                {{ errorMessage() }}
              </div>
            }

            @if (successMessage()) {
              <div class="alert-message success">
                {{ successMessage() }}
              </div>
            }

            <form (ngSubmit)="handleLogin()" class="auth-form">
              <div class="form-group">
                <label for="username">USUARIO O CORREO ELECTRÓNICO</label>
                <div class="input-wrap">
                  <span class="input-icon">
                    <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
                      <circle cx="12" cy="7" r="4"/>
                    </svg>
                  </span>
                  <input 
                    id="username" 
                    type="text" 
                    [ngModel]="username()" 
                    (ngModelChange)="username.set($event)" 
                    (focus)="prewarm()"
                    name="username" 
                    placeholder="ej: piloto_f1 o tu@correo.com" 
                    required 
                    autocomplete="username" />
                </div>
              </div>

              <div class="form-group">
                <label for="password">CONTRASEÑA</label>
                <div class="input-wrap">
                  <span class="input-icon">
                    <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                      <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
                      <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
                    </svg>
                  </span>
                  <input 
                    id="password" 
                    [type]="showPassword() ? 'text' : 'password'" 
                    [ngModel]="password()" 
                    (ngModelChange)="password.set($event)" 
                    (focus)="prewarm()"
                    name="password" 
                    placeholder="••••••••••••" 
                    required 
                    autocomplete="current-password" />
                  <button 
                    type="button" 
                    class="toggle-pwd-btn" 
                    (click)="showPassword.set(!showPassword())" 
                    aria-label="Ver u ocultar contraseña">
                    @if (showPassword()) {
                      <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2">
                        <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
                        <circle cx="12" cy="12" r="3"/>
                      </svg>
                    } @else {
                      <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2">
                        <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/>
                        <line x1="1" y1="1" x2="23" y2="23"/>
                      </svg>
                    }
                  </button>
                </div>
              </div>

              <div class="form-options">
                <label class="checkbox-label">
                  <input 
                    type="checkbox" 
                    [ngModel]="rememberMe()" 
                    (ngModelChange)="rememberMe.set($event)" 
                    name="rememberMe" />
                  <span>Recordarme en este equipo</span>
                </label>
                <a routerLink="/forgot-password" class="link-muted">¿Olvidaste tu contraseña?</a>
              </div>

              <!-- BOTÓN PRINCIPAL -->
              <button type="submit" class="btn-primary" [disabled]="isLoading()">
                <span>INICIAR SESIÓN →</span>
              </button>

              <!-- SEPARADOR CON GOOGLE -->
              <div class="divider-wrap">
                <div class="divider-line"></div>
                <span class="divider-text">O CONTINUAR CON</span>
                <div class="divider-line"></div>
              </div>

              <!-- BOTÓN GOOGLE SSO -->
              <button type="button" class="btn-google" (click)="loginWithGoogle()">
                <svg class="google-icon" viewBox="0 0 24 24">
                  <path fill="#EA4335" d="M12 5c1.6 0 3 .6 4.1 1.7l3.1-3.1C17.3 1.8 14.8 1 12 1 7.5 1 3.7 3.6 1.9 7.3l3.7 2.9C6.5 7.4 9 5 12 5z"/>
                  <path fill="#4285F4" d="M23.5 12.3c0-.8-.1-1.6-.2-2.3H12v4.5h6.5c-.3 1.5-1.1 2.8-2.4 3.7l3.7 2.9c2.2-2 3.7-5 3.7-8.8z"/>
                  <path fill="#FBBC05" d="M5.6 14.8c-.2-.7-.4-1.5-.4-2.8s.2-2.1.4-2.8L1.9 6.3C.7 8.7 0 10.3 0 12s.7 3.3 1.9 5.7l3.7-2.9z"/>
                  <path fill="#34A853" d="M12 23c3.2 0 6-1.1 8-3l-3.7-2.9c-1.1.7-2.5 1.2-4.3 1.2-3 0-5.5-2.4-6.4-5.2L1.9 16C3.7 19.7 7.5 23 12 23z"/>
                </svg>
                <span>Continuar con Google</span>
              </button>
            </form>

            <div class="card-footer">
              <span class="text-muted">¿No tenés cuenta?</span>
              <a routerLink="/register" class="link-action">Registrarse</a>
            </div>
          </div>
        }
      </main>
    </div>
  `,
  styleUrls: ['./auth-shared.css']
})
export class LoginComponent implements OnInit {
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly api = inject(ApiService);

  readonly rememberMe = signal<boolean>(
    typeof localStorage !== 'undefined' ? !!localStorage.getItem('apex_remembered_username') : false
  );
  readonly username = signal<string>(
    typeof localStorage !== 'undefined'
      ? (localStorage.getItem('apex_remembered_username') || '')
      : ''
  );
  readonly password = signal<string>('');
  readonly showPassword = signal<boolean>(false);
  readonly isLoading = signal<boolean>(false);
  readonly errorMessage = signal<string>('');
  readonly successMessage = signal<string>('');

  ngOnInit() {
    this.prewarm();
    const qp = this.route.snapshot.queryParams;
    if (qp['reset'] === 'success') {
      this.successMessage.set('¡Tu contraseña fue restablecida con éxito! Ya podés iniciar sesión con tu nueva clave.');
    } else if (qp['reason'] === 'reload') {
      this.errorMessage.set('Por motivos de seguridad, la sesión se cerró al actualizar la página. Por favor, iniciá sesión nuevamente.');
    }
  }

  prewarm() {
    this.api.wakeServices();
  }

  async handleLogin() {
    const user = this.username().trim();
    const pwd = this.password().trim();

    if (!user || !pwd) {
      this.errorMessage.set('Por favor, ingresá usuario y contraseña.');
      return;
    }

    this.isLoading.set(true);
    this.errorMessage.set('');

    try {
      const ok = await this.auth.loginWithCredentials(user, pwd, this.rememberMe());
      if (ok) {
        if (this.rememberMe()) {
          localStorage.setItem('apex_remembered_username', user);
        } else {
          localStorage.removeItem('apex_remembered_username');
          localStorage.removeItem('apex_username');
        }
        const returnUrl = this.route.snapshot.queryParams['returnUrl'] || '/dashboard';
        this.router.navigateByUrl(returnUrl);
      } else {
        this.errorMessage.set('Credenciales no válidas. Revisá tu usuario/correo y contraseña.');
      }
    } catch (err: any) {
      console.error('Error de login:', err);
      this.errorMessage.set(err?.message || 'Error de autenticación. Intentá nuevamente.');
    } finally {
      this.isLoading.set(false);
    }
  }

  loginWithGoogle() {
    this.isLoading.set(true);
    this.auth.loginWithGoogle();
  }
}
