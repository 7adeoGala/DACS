import { Component, signal, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { AuthHeaderComponent } from './auth-header.component';
import { AuthService } from '../../core/auth/auth.service';
import { environment } from '../../../environments/environment';

@Component({
  selector: 'app-register',
  standalone: true,
  imports: [CommonModule, RouterLink, AuthHeaderComponent],
  template: `
    <div class="auth-layout">
      <app-auth-header />

      <main class="auth-main">
        @if (isLoading()) {
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
                Redirigiendo al registro seguro de Keycloak (OIDC + PKCE S256)...
              </p>
            </div>
          </div>
        } @else {
          <div class="auth-card register-mode">
            <div class="card-header">
              <div>
                <h1 class="card-title">Crear Cuenta</h1>
                <p class="card-subtitle">Registro seguro mediante Keycloak OIDC (PKCE S256) y verificación por correo.</p>
              </div>
            </div>

            @if (errorMessage()) {
              <div class="alert-message error">
                {{ errorMessage() }}
              </div>
            }

            <div class="auth-form">
              <button type="button" class="btn-primary" (click)="registerWithKeycloak()" [disabled]="isLoading()">
                <span>CREAR CUENTA CON CORREO →</span>
              </button>

              <div class="divider-wrap">
                <div class="divider-line"></div>
                <span class="divider-text">O CONTINUAR CON</span>
                <div class="divider-line"></div>
              </div>

              <button type="button" class="btn-google" (click)="registerWithGoogle()" [disabled]="isLoading()">
                <svg class="google-icon" viewBox="0 0 24 24">
                  <path fill="#EA4335" d="M12 5c1.6 0 3 .6 4.1 1.7l3.1-3.1C17.3 1.8 14.8 1 12 1 7.5 1 3.7 3.6 1.9 7.3l3.7 2.9C6.5 7.4 9 5 12 5z"/>
                  <path fill="#4285F4" d="M23.5 12.3c0-.8-.1-1.6-.2-2.3H12v4.5h6.5c-.3 1.5-1.1 2.8-2.4 3.7l3.7 2.9c2.2-2 3.7-5 3.7-8.8z"/>
                  <path fill="#FBBC05" d="M5.6 14.8c-.2-.7-.4-1.5-.4-2.8s.2-2.1.4-2.8L1.9 6.3C.7 8.7 0 10.3 0 12s.7 3.3 1.9 5.7l3.7-2.9z"/>
                  <path fill="#34A853" d="M12 23c3.2 0 6-1.1 8-3l-3.7-2.9c-1.1.7-2.5 1.2-4.3 1.2-3 0-5.5-2.4-6.4-5.2L1.9 16C3.7 19.7 7.5 23 12 23z"/>
                </svg>
                <span>Registrarse con Google</span>
              </button>
            </div>

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

  readonly isLoading = signal<boolean>(false);
  readonly errorMessage = signal<string>('');

  ngOnInit() {
    if (typeof window !== 'undefined') {
      fetch(`${environment.keycloak.url}/realms/${environment.keycloak.realm}`, { mode: 'no-cors' }).catch(() => {});
    }
  }

  async registerWithKeycloak() {
    this.isLoading.set(true);
    this.errorMessage.set('');
    try {
      await this.auth.register('dashboard');
    } catch (err: any) {
      this.isLoading.set(false);
      this.errorMessage.set(err?.message || 'No se pudo iniciar el registro seguro con Keycloak.');
    }
  }

  async registerWithGoogle() {
    this.isLoading.set(true);
    this.errorMessage.set('');
    try {
      await this.auth.loginWithGoogle('dashboard');
    } catch (err: any) {
      this.isLoading.set(false);
      this.errorMessage.set(err?.message || 'No se pudo iniciar el registro con Google.');
    }
  }
}
