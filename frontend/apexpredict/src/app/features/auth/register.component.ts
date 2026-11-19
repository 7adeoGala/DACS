import { Component, signal, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AuthHeaderComponent } from './auth-header.component';
import { AuthService } from '../../core/auth/auth.service';
import { environment } from '../../../environments/environment';

@Component({
  selector: 'app-register',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, AuthHeaderComponent],
  template: `
    <div class="auth-layout">
      <app-auth-header />

      <main class="auth-main">
        @if (isLoading()) {
          <!-- Pantalla de carga -->
          <div class="auth-loading-screen">
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

              <div class="f1-start-lights" aria-hidden="true">
                <div class="light-unit"><span class="light-bulb bulb-1"></span></div>
                <div class="light-unit"><span class="light-bulb bulb-2"></span></div>
                <div class="light-unit"><span class="light-bulb bulb-3"></span></div>
                <div class="light-unit"><span class="light-bulb bulb-4"></span></div>
                <div class="light-unit"><span class="light-bulb bulb-5"></span></div>
              </div>
            </div>

            <div class="loading-cartel-box">
              <span class="loading-cartel-dot"></span>
              <p class="loading-cartel-text">
                Registrando usuario en los servidores de autenticación... Aguardá un instante mientras se crea tu cuenta.
              </p>
            </div>
          </div>
        } @else {
          <div class="auth-card register-mode">
            <div class="card-header">
              <div>
                <h1 class="card-title">Registrarse</h1>
                <p class="card-subtitle">* Campos obligatorios</p>
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

            <form (ngSubmit)="handleRegister()" class="auth-form">
              <div class="form-group">
                <label for="reg-username">USUARIO *</label>
                <div class="input-wrap">
                  <span class="input-icon">
                    <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
                      <circle cx="12" cy="7" r="4"/>
                    </svg>
                  </span>
                  <input 
                    id="reg-username" 
                    type="text" 
                    [ngModel]="username()" 
                    (ngModelChange)="username.set($event)" 
                    name="username" 
                    placeholder="Elegí tu nombre de usuario" 
                    required 
                    autocomplete="username" />
                </div>
              </div>

              <div class="form-row">
                <div class="form-group">
                  <label for="firstName">NOMBRE *</label>
                  <input 
                    id="firstName" 
                    type="text" 
                    [ngModel]="firstName()" 
                    (ngModelChange)="firstName.set($event)" 
                    name="firstName" 
                    placeholder="Nombre" 
                    required 
                    autocomplete="given-name" />
                </div>

                <div class="form-group">
                  <label for="lastName">APELLIDO *</label>
                  <input 
                    id="lastName" 
                    type="text" 
                    [ngModel]="lastName()" 
                    (ngModelChange)="lastName.set($event)" 
                    name="lastName" 
                    placeholder="Apellido" 
                    required 
                    autocomplete="family-name" />
                </div>
              </div>

              <div class="form-group">
                <label for="reg-email">CORREO ELECTRÓNICO *</label>
                <div class="input-wrap">
                  <span class="input-icon">
                    <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                      <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/>
                      <polyline points="22,6 12,13 2,6"/>
                    </svg>
                  </span>
                  <input 
                    id="reg-email" 
                    type="email" 
                    [ngModel]="email()" 
                    (ngModelChange)="email.set($event)" 
                    name="email" 
                    placeholder="correo@ejemplo.com" 
                    required 
                    autocomplete="email" />
                </div>
              </div>

              <div class="form-row">
                <div class="form-group">
                  <label for="reg-pwd">CONTRASEÑA *</label>
                  <div class="input-wrap">
                    <span class="input-icon">
                      <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                        <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
                        <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
                      </svg>
                    </span>
                    <input 
                      id="reg-pwd" 
                      [type]="showPassword() ? 'text' : 'password'" 
                      [ngModel]="password()" 
                      (ngModelChange)="password.set($event)" 
                      name="password" 
                      placeholder="••••••••" 
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

                <div class="form-group">
                  <label for="reg-pwd-confirm">CONFIRMAR CONTRASEÑA *</label>
                  <div class="input-wrap">
                    <span class="input-icon">
                      <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                        <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
                        <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
                      </svg>
                    </span>
                    <input 
                      id="reg-pwd-confirm" 
                      [type]="showConfirmPassword() ? 'text' : 'password'" 
                      [ngModel]="confirmPassword()" 
                      (ngModelChange)="confirmPassword.set($event)" 
                      name="confirmPassword" 
                      placeholder="••••••••" 
                      required 
                      autocomplete="new-password" />
                    <button 
                      type="button" 
                      class="toggle-pwd-btn" 
                      (click)="showConfirmPassword.set(!showConfirmPassword())" 
                      aria-label="Ver u ocultar confirmación de contraseña">
                      @if (showConfirmPassword()) {
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
              </div>

              <div class="form-options" style="margin-top: -0.35rem; margin-bottom: 0.25rem;">
                <label class="checkbox-label" style="font-size: 0.75rem;">
                  <input 
                    type="checkbox" 
                    [checked]="showPassword() && showConfirmPassword()" 
                    (change)="toggleAllPasswords($event)" />
                  <span>Mostrar contraseñas creadas</span>
                </label>
              </div>

              <button type="submit" class="btn-primary" [disabled]="isLoading()">
                <span>REGISTRARSE →</span>
              </button>

              <div class="divider-wrap">
                <div class="divider-line"></div>
                <span class="divider-text">O CONTINUAR CON</span>
                <div class="divider-line"></div>
              </div>

              <!-- Registro con Google -->
              <button type="button" class="btn-google" (click)="registerWithGoogle()">
                <svg class="google-icon" viewBox="0 0 24 24">
                  <path fill="#EA4335" d="M12 5c1.6 0 3 .6 4.1 1.7l3.1-3.1C17.3 1.8 14.8 1 12 1 7.5 1 3.7 3.6 1.9 7.3l3.7 2.9C6.5 7.4 9 5 12 5z"/>
                  <path fill="#4285F4" d="M23.5 12.3c0-.8-.1-1.6-.2-2.3H12v4.5h6.5c-.3 1.5-1.1 2.8-2.4 3.7l3.7 2.9c2.2-2 3.7-5 3.7-8.8z"/>
                  <path fill="#FBBC05" d="M5.6 14.8c-.2-.7-.4-1.5-.4-2.8s.2-2.1.4-2.8L1.9 6.3C.7 8.7 0 10.3 0 12s.7 3.3 1.9 5.7l3.7-2.9z"/>
                  <path fill="#34A853" d="M12 23c3.2 0 6-1.1 8-3l-3.7-2.9c-1.1.7-2.5 1.2-4.3 1.2-3 0-5.5-2.4-6.4-5.2L1.9 16C3.7 19.7 7.5 23 12 23z"/>
                </svg>
                <span>Registrarse con Google</span>
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
export class RegisterComponent implements OnInit {
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);

  ngOnInit() {
    if (typeof window !== 'undefined') {
      fetch(`${environment.keycloak.url}/realms/${environment.keycloak.realm}`, { mode: 'no-cors' }).catch(() => {});
    }
  }

  readonly username = signal<string>('');
  readonly firstName = signal<string>('');
  readonly lastName = signal<string>('');
  readonly email = signal<string>('');
  readonly password = signal<string>('');
  readonly confirmPassword = signal<string>('');
  readonly showPassword = signal<boolean>(false);
  readonly showConfirmPassword = signal<boolean>(false);
  readonly isLoading = signal<boolean>(false);
  readonly errorMessage = signal<string>('');
  readonly successMessage = signal<string>('');

  toggleAllPasswords(event: Event) {
    const isChecked = (event.target as HTMLInputElement).checked;
    this.showPassword.set(isChecked);
    this.showConfirmPassword.set(isChecked);
  }

  async handleRegister() {
    const user = this.username().trim();
    const fn = this.firstName().trim();
    const ln = this.lastName().trim();
    const em = this.email().trim();
    const pwd = this.password();
    const cpwd = this.confirmPassword();

    if (!user || !fn || !ln || !em || !pwd) {
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
      await this.auth.registerUser({
        username: user,
        firstName: fn,
        lastName: ln,
        email: em,
        password: pwd
      });
      this.successMessage.set('¡Cuenta creada con éxito! Ingresando...');
      setTimeout(() => {
        this.router.navigate(['/dashboard']);
      }, 1200);
    } catch (err: any) {
      console.error('Error al registrar usuario:', err);
      this.errorMessage.set(err?.message || 'Error al crear la cuenta. Verificá si el usuario o email ya existen.');
    } finally {
      this.isLoading.set(false);
    }
  }

  registerWithGoogle() {
    this.isLoading.set(true);
    this.auth.loginWithGoogle();
  }
}
