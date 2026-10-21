import { Component, signal, inject, OnInit, OnDestroy } from '@angular/core';
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
            <!-- ANIMACIÓN F1 CON AROS Y LOGO -->
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
                {{ loadingMessage() }}
              </p>
            </div>
          </div>
        } @else {
          <div class="auth-card">
            <!-- BARRA DE PROGRESO DE 3 PASOS -->
            <div class="step-indicator">
              <div class="step-bar" [class.active]="step() === 1" [class.completed]="step() > 1"></div>
              <div class="step-bar" [class.active]="step() === 2" [class.completed]="step() > 2"></div>
              <div class="step-bar" [class.active]="step() === 3"></div>
            </div>

            <div class="card-header">
              <div>
                <span class="step-badge">
                  <svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" stroke-width="2.5">
                    <circle cx="12" cy="12" r="10"/>
                    <path d="M12 6v6l4 2"/>
                  </svg>
                  PASO {{ step() }} DE 3 · TELEMETRÍA DE SEGURIDAD
                </span>

                @if (step() === 1) {
                  <h1 class="card-title">Recuperar Contraseña</h1>
                  <p class="card-subtitle">Ingresá tu correo electrónico para enviarte un código de verificación.</p>
                } @else if (step() === 2) {
                  <h1 class="card-title">Código de Verificación</h1>
                  <p class="card-subtitle">Ingresá el código numérico de 6 dígitos enviado a tu correo.</p>
                } @else if (step() === 3) {
                  <h1 class="card-title">Nueva Contraseña</h1>
                  <p class="card-subtitle">Código validado. Definí tu nueva clave de acceso para tu cuenta.</p>
                }
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

            <!-- PASO 1: SOLICITAR EMAIL -->
            @if (step() === 1) {
              <form (ngSubmit)="handleRequestCode()" class="auth-form">
                <div class="form-group">
                  <label for="identifier">CORREO ELECTRÓNICO O USUARIO *</label>
                  <div class="input-wrap">
                    <span class="input-icon">
                      <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                        <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/>
                        <polyline points="22,6 12,13 2,6"/>
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
                      autocomplete="email" />
                  </div>
                </div>

                <button type="submit" class="btn-primary" [disabled]="isLoading() || !identifier().trim()">
                  <span>ENVIAR CÓDIGO DE VERIFICACIÓN →</span>
                </button>
              </form>
            }

            <!-- PASO 2: INGRESAR CÓDIGO -->
            @if (step() === 2) {
              <form (ngSubmit)="handleVerifyCode()" class="auth-form">
                <div class="alert-message warning" style="margin-bottom: 1.15rem; font-size: 0.85rem; line-height: 1.45;">
                  📨 Enviamos un código de seguridad de 6 dígitos a <strong>{{ resolvedEmail() }}</strong>. Revisá tu bandeja de entrada o spam.
                </div>

                <div class="form-group">
                  <label for="entered-code">CÓDIGO DE 6 DÍGITOS *</label>
                  <div class="input-wrap">
                    <input 
                      id="entered-code" 
                      type="text" 
                      maxlength="6"
                      inputmode="numeric"
                      class="otp-input-field"
                      [ngModel]="enteredCode()" 
                      (ngModelChange)="enteredCode.set($event)" 
                      name="enteredCode" 
                      placeholder="000000" 
                      required 
                      autocomplete="one-time-code" />
                  </div>
                </div>

                <div class="secondary-actions">
                  <button 
                    type="button" 
                    class="btn-link-action" 
                    (click)="handleResendCode()" 
                    [disabled]="cooldownSeconds() > 0">
                    @if (cooldownSeconds() > 0) {
                      Reenviar código ({{ cooldownSeconds() }}s)
                    } @else {
                      Reenviar código
                    }
                  </button>
                  <button type="button" class="btn-link-action" (click)="handleChangeEmail()">
                    ← Cambiar correo
                  </button>
                </div>

                <button type="submit" class="btn-primary" [disabled]="isLoading() || enteredCode().trim().length < 6">
                  <span>VERIFICAR CÓDIGO →</span>
                </button>
              </form>
            }

            <!-- PASO 3: NUEVA CONTRASEÑA -->
            @if (step() === 3) {
              <form (ngSubmit)="handleCompleteReset()" class="auth-form">
                <div class="alert-message success" style="margin-bottom: 0.75rem;">
                  ✓ Código verificado para <strong>{{ resolvedEmail() }}</strong>.
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
                          <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8z"/>
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

                <button type="submit" class="btn-primary" [disabled]="isLoading() || !newPassword().trim() || !confirmPassword().trim()">
                  <span>RESTABLECER Y GUARDAR CONTRASEÑA →</span>
                </button>
              </form>
            }

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
export class ForgotPasswordComponent implements OnInit, OnDestroy {
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  private readonly api = inject(ApiService);

  readonly step = signal<1 | 2 | 3>(1);
  readonly identifier = signal<string>('');
  readonly resolvedEmail = signal<string>('');
  readonly resolvedUsername = signal<string>('');
  readonly enteredCode = signal<string>('');
  readonly newPassword = signal<string>('');
  readonly confirmPassword = signal<string>('');
  readonly showPassword = signal<boolean>(false);
  readonly isLoading = signal<boolean>(false);
  readonly loadingMessage = signal<string>('Procesando solicitud de autenticación... Aguardá un instante.');
  readonly errorMessage = signal<string>('');
  readonly successMessage = signal<string>('');
  readonly cooldownSeconds = signal<number>(0);

  private cooldownTimer: any = null;

  ngOnInit() {
    this.prewarm();
  }

  ngOnDestroy() {
    if (this.cooldownTimer) {
      clearInterval(this.cooldownTimer);
    }
  }

  prewarm() {
    this.api.wakeServices();
  }

  startCooldown(seconds = 30) {
    this.cooldownSeconds.set(seconds);
    if (this.cooldownTimer) clearInterval(this.cooldownTimer);
    this.cooldownTimer = setInterval(() => {
      const current = this.cooldownSeconds();
      if (current <= 1) {
        this.cooldownSeconds.set(0);
        clearInterval(this.cooldownTimer);
      } else {
        this.cooldownSeconds.set(current - 1);
      }
    }, 1000);
  }

  async handleRequestCode() {
    const rawId = this.identifier().trim();
    if (!rawId) {
      this.errorMessage.set('Por favor ingresá tu correo electrónico o nombre de usuario.');
      return;
    }

    this.isLoading.set(true);
    this.loadingMessage.set('Despachando correo con código de verificación...');
    this.errorMessage.set('');

    try {
      const res = await this.auth.requestPasswordResetCode(rawId);
      this.resolvedEmail.set(res.email);
      this.resolvedUsername.set(res.username);
      this.enteredCode.set('');
      this.step.set(2);
      this.startCooldown(30);
    } catch (err: any) {
      console.error('Error al solicitar código:', err);
      this.errorMessage.set(err?.message || 'No se pudo enviar el código. Verificá los datos ingresados.');
    } finally {
      this.isLoading.set(false);
    }
  }

  async handleResendCode() {
    if (this.cooldownSeconds() > 0) return;
    await this.handleRequestCode();
  }

  handleChangeEmail() {
    this.step.set(1);
    this.enteredCode.set('');
    this.errorMessage.set('');
  }

  async handleVerifyCode() {
    const rawCode = this.enteredCode().trim();
    if (!rawCode || rawCode.length < 6) {
      this.errorMessage.set('Por favor ingresá el código completo de 6 dígitos.');
      return;
    }

    this.isLoading.set(true);
    this.loadingMessage.set('Validando código de seguridad en servidores de autenticación...');
    this.errorMessage.set('');

    try {
      const targetId = this.resolvedUsername() || this.identifier() || this.resolvedEmail();
      await this.auth.verifyResetCode(targetId, rawCode);
      this.step.set(3);
    } catch (err: any) {
      console.error('Error al verificar código:', err);
      this.errorMessage.set(err?.message || 'Código incorrecto o expirado.');
    } finally {
      this.isLoading.set(false);
    }
  }

  async handleCompleteReset() {
    const pwd = this.newPassword().trim();
    const cpwd = this.confirmPassword().trim();

    if (!pwd || !cpwd) {
      this.errorMessage.set('Por favor completá los campos de contraseña.');
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
    this.loadingMessage.set('Actualizando tu nueva contraseña de forma segura...');
    this.errorMessage.set('');

    try {
      const targetId = this.resolvedUsername() || this.identifier() || this.resolvedEmail();
      await this.auth.completePasswordReset(targetId, this.enteredCode(), pwd);
      this.successMessage.set('¡Contraseña restablecida con éxito! Redirigiendo al inicio de sesión...');
      setTimeout(() => {
        this.router.navigate(['/login'], { queryParams: { reset: 'success' } });
      }, 1800);
    } catch (err: any) {
      console.error('Error al completar el reseteo:', err);
      this.errorMessage.set(err?.message || 'No se pudo actualizar la contraseña. Intentá nuevamente.');
    } finally {
      this.isLoading.set(false);
    }
  }
}
