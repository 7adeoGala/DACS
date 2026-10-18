import { Component, signal, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
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
        <div class="auth-card">
          <div class="card-header">
            <h1 class="card-title">Iniciar Sesión</h1>
            <div class="lang-selector">
              <span>ES</span>
              <span class="chevron">▼</span>
            </div>
          </div>

          @if (errorMessage()) {
            <div class="alert-message error">
              ⚠️ {{ errorMessage() }}
            </div>
          }

          <form (ngSubmit)="handleLogin()" class="auth-form">
            <div class="form-group">
              <label for="username">USUARIO O CORREO ELECTRÓNICO</label>
              <div class="input-wrap">
                <span class="input-icon">👤</span>
                <input 
                  id="username" 
                  type="text" 
                  [ngModel]="username()" 
                  (ngModelChange)="username.set($event)" 
                  (focus)="prewarm()"
                  name="username" 
                  placeholder="tadeogala7" 
                  required 
                  autocomplete="username" />
              </div>
            </div>

            <div class="form-group">
              <label for="password">CONTRASEÑA</label>
              <div class="input-wrap">
                <span class="input-icon">🔒</span>
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
                  {{ showPassword() ? '👁️' : '🙈' }}
                </button>
              </div>
            </div>

            <div class="form-options">
              <label class="checkbox-label">
                <input type="checkbox" checked />
                <span>Recordarme en este equipo</span>
              </label>
              <a href="https://dacs-3-dswy.onrender.com/auth/realms/apexpredict/login-actions/reset-credentials" target="_blank" rel="noopener" class="link-muted">¿Olvidaste tu contraseña?</a>
            </div>

            <!-- BOTÓN PRINCIPAL -->
            <button type="submit" class="btn-primary" [disabled]="isLoading()">
              @if (isLoading()) {
                <span>INICIANDO SESIÓN...</span>
              } @else {
                <span>INICIAR SESIÓN →</span>
              }
            </button>

            @if (isWakingServer()) {
              <div class="alert-message warning" style="margin-top: 0.5rem; display: flex; align-items: center; gap: 8px;">
                <span class="spinner-dot"></span>
                <span>Conectando con servidores de autenticación... Aguardá un instante mientras se valida tu cuenta.</span>
              </div>
            }

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

        <p class="telemetry-footer-status">
          <span class="status-indicator"></span>
          PADDOCK TELEMETRY SERVERS ONLINE | PKCE 256-BIT ENCRYPTED
        </p>
      </main>
    </div>
  `,
  styleUrls: ['./auth-shared.css']
})
export class LoginComponent implements OnInit {
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  private readonly api = inject(ApiService);

  readonly username = signal<string>('tadeogala7');
  readonly password = signal<string>('');
  readonly showPassword = signal<boolean>(false);
  readonly isLoading = signal<boolean>(false);
  readonly isWakingServer = signal<boolean>(false);
  readonly errorMessage = signal<string>('');

  ngOnInit() {
    this.prewarm();
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
    this.isWakingServer.set(false);

    const wakingTimer = setTimeout(() => {
      if (this.isLoading()) {
        this.isWakingServer.set(true);
      }
    }, 1800);

    try {
      const ok = await this.auth.loginWithCredentials(user, pwd);
      if (ok) {
        this.router.navigate(['/dashboard']);
      } else {
        this.errorMessage.set('Credenciales no válidas. Revisá tu usuario y contraseña.');
      }
    } catch (err: any) {
      console.error('Error de login:', err);
      this.errorMessage.set(err?.message || 'Error de autenticación. Intentá nuevamente.');
    } finally {
      clearTimeout(wakingTimer);
      this.isWakingServer.set(false);
      this.isLoading.set(false);
    }
  }

  loginWithGoogle() {
    this.auth.loginWithGoogle();
  }
}
