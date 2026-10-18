import { Component, signal, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AuthHeaderComponent } from './auth-header.component';
import { AuthService } from '../../core/auth/auth.service';

@Component({
  selector: 'app-register',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, AuthHeaderComponent],
  template: `
    <div class="auth-layout">
      <!-- HEADER IDÉNTICO PERSISTENTE -->
      <app-auth-header />

      <!-- CONTENEDOR CENTRADO DE LA TARJETA -->
      <main class="auth-main">
        <div class="auth-card register-mode">
          <div class="card-header">
            <div>
              <h1 class="card-title">Registrarse</h1>
              <p class="card-subtitle">* Campos obligatorios</p>
            </div>
            <div class="lang-selector">
              <span>ES</span>
              <span class="chevron">▼</span>
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

            <div class="form-row">
              <div class="form-group">
                <label for="reg-pwd">CONTRASEÑA *</label>
                <input 
                  id="reg-pwd" 
                  type="password" 
                  [ngModel]="password()" 
                  (ngModelChange)="password.set($event)" 
                  name="password" 
                  placeholder="••••••••" 
                  required 
                  autocomplete="new-password" />
              </div>

              <div class="form-group">
                <label for="reg-pwd-confirm">CONFIRMAR CONTRASEÑA *</label>
                <input 
                  id="reg-pwd-confirm" 
                  type="password" 
                  [ngModel]="confirmPassword()" 
                  (ngModelChange)="confirmPassword.set($event)" 
                  name="confirmPassword" 
                  placeholder="••••••••" 
                  required 
                  autocomplete="new-password" />
              </div>
            </div>

            <button type="submit" class="btn-primary" [disabled]="isLoading()">
              @if (isLoading()) {
                <span>CREANDO CUENTA...</span>
              } @else {
                <span>REGISTRARSE →</span>
              }
            </button>

            <!-- SEPARADOR CON GOOGLE -->
            <div class="divider-wrap">
              <div class="divider-line"></div>
              <span class="divider-text">O CONTINUAR CON</span>
              <div class="divider-line"></div>
            </div>

            <!-- REGISTRO CON GOOGLE -->
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
      fetch('https://dacs-3-dswy.onrender.com/auth/realms/apexpredict', { mode: 'no-cors' }).catch(() => {});
    }
  }

  readonly username = signal<string>('');
  readonly firstName = signal<string>('');
  readonly lastName = signal<string>('');
  readonly email = signal<string>('');
  readonly password = signal<string>('');
  readonly confirmPassword = signal<string>('');
  readonly isLoading = signal<boolean>(false);
  readonly errorMessage = signal<string>('');
  readonly successMessage = signal<string>('');

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
      // Registrar usuario mediante el flujo de registro o Keycloak
      await this.auth.registerUser({
        username: user,
        firstName: fn,
        lastName: ln,
        email: em,
        password: pwd
      });
      this.successMessage.set('¡Cuenta creada con éxito! Redirigiendo...');
      setTimeout(() => {
        this.router.navigate(['/login']);
      }, 1500);
    } catch (err: any) {
      console.error('Error al registrar usuario:', err);
      this.errorMessage.set(err?.message || 'Error al crear la cuenta. Verificá si el usuario o email ya existen.');
    } finally {
      this.isLoading.set(false);
    }
  }

  registerWithGoogle() {
    this.auth.loginWithGoogle();
  }
}
