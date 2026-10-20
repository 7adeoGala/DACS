import { Component, signal, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AuthHeaderComponent } from './auth-header.component';
import { AuthService } from '../../core/auth/auth.service';
import { ApiService } from '../../core/services/api.service';

@Component({
  selector: 'app-forgot-password',
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

            <!-- CARTEL EN EL CENTRO -->
            <div class="loading-cartel-box">
              <span class="loading-cartel-dot"></span>
              <p class="loading-cartel-text">
                Actualizando credenciales en servidores de autenticación... Aguardá un instante.
              </p>
            </div>
          </div>
        } @else {
          <div class="auth-card">
            <div class="card-header">
              <div>
                <h1 class="card-title">Recuperar Contraseña</h1>
                <p class="card-subtitle">Ingresá tu usuario o correo electrónico para definir tu nueva clave.</p>
              </div>
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

            <form (ngSubmit)="handleResetPassword()" class="auth-form">
              <div class="form-group">
                <label for="identifier">USUARIO O CORREO ELECTRÓNICO *</label>
                <div class="input-wrap">
                  <span class="input-icon">
                    <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
                      <circle cx="12" cy="7" r="4"/>
                    </svg>
                  </span>
                  <input 
                    id="identifier" 
                    type="text" 
                    [ngModel]="identifier()" 
                    (ngModelChange)="identifier.set($event)" 
                    (focus)="prewarm()"
                    name="identifier" 
                    placeholder="ej: piloto_f1 o tu@correo.com" 
                    required 
                    autocomplete="username" />
                </div>
              </div>

              <div class="form-group">
                <label for="new-password">NUEVA CONTRASEÑA *</label>
                <div class="input-wrap">
                  <span class="input-icon">
                    <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                      <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
                      <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
                    </svg>
                  </span>
                  <input 
                    id="new-password" 
                    [type]="showPassword() ? 'text' : 'password'" 
                    [ngModel]="newPassword()" 
                    (ngModelChange)="newPassword.set($event)" 
                    (focus)="prewarm()"
                    name="newPassword" 
                    placeholder="Mínimo 6 caracteres" 
                    required 
                    autocomplete="new-password" />
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

              <div class="form-group">
                <label for="confirm-password">CONFIRMAR NUEVA CONTRASEÑA *</label>
                <div class="input-wrap">
                  <span class="input-icon">
                    <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                      <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
                      <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
                    </svg>
                  </span>
                  <input 
                    id="confirm-password" 
                    [type]="showPassword() ? 'text' : 'password'" 
                    [ngModel]="confirmPassword()" 
                    (ngModelChange)="confirmPassword.set($event)" 
                    (focus)="prewarm()"
                    name="confirmPassword" 
                    placeholder="Repetí la nueva contraseña" 
                    required 
                    autocomplete="new-password" />
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

              <!-- BOTÓN PRINCIPAL -->
              <button type="submit" class="btn-primary" [disabled]="isLoading()">
                <span>RESTABLECER CONTRASEÑA →</span>
              </button>
            </form>

            <div class="card-footer">
              <a routerLink="/login" class="link-back">« Volver a Iniciar Sesión</a>
            </div>
          </div>
        }
      </main>
    </div>
  `,
  styleUrls: ['./auth-shared.css']
})
export class ForgotPasswordComponent implements OnInit {
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  private readonly api = inject(ApiService);

  readonly identifier = signal<string>('');
  readonly newPassword = signal<string>('');
  readonly confirmPassword = signal<string>('');
  readonly showPassword = signal<boolean>(false);
  readonly isLoading = signal<boolean>(false);
  readonly errorMessage = signal<string>('');
  readonly successMessage = signal<string>('');

  ngOnInit() {
    this.prewarm();
  }

  prewarm() {
    this.api.wakeServices();
  }

  async handleResetPassword() {
    const rawId = this.identifier().trim();
    const pwd = this.newPassword().trim();
    const cpwd = this.confirmPassword().trim();

    if (!rawId || !pwd || !cpwd) {
      this.errorMessage.set('Por favor, completá todos los campos obligatorios (*).');
      return;
    }

    if (pwd !== cpwd) {
      this.errorMessage.set('Las contraseñas no coinciden.');
      return;
    }

    if (pwd.length < 6) {
      this.errorMessage.set('La contraseña debe tener al menos 6 caracteres.');
      return;
    }

    this.isLoading.set(true);
    this.errorMessage.set('');
    this.successMessage.set('');

    try {
      await this.auth.resetPassword(rawId, pwd);
      this.successMessage.set('¡Contraseña restablecida con éxito! Redirigiendo al inicio de sesión...');
      setTimeout(() => {
        this.router.navigate(['/login'], { queryParams: { reset: 'success' } });
      }, 2000);
    } catch (err: any) {
      console.error('Error al resetear contraseña:', err);
      this.errorMessage.set(err?.message || 'No se pudo restablecer la contraseña. Verificá los datos ingresados.');
    } finally {
      this.isLoading.set(false);
    }
  }
}
