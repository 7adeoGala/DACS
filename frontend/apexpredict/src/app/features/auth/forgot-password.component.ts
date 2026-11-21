import { Component, signal, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { AuthHeaderComponent } from './auth-header.component';
import { AuthService } from '../../core/auth/auth.service';
import { ApiService } from '../../core/services/api.service';

@Component({
  selector: 'app-forgot-password',
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
                Redirigiendo al servidor de identidad Keycloak para restablecer tu contraseña de forma segura...
              </p>
            </div>
          </div>
        } @else {
          <div class="auth-card">
            <div class="card-header">
              <div>
                <h1 class="card-title">Recuperar Contraseña</h1>
                <p class="card-subtitle">
                  Te redirigiremos al formulario oficial de Keycloak para recibir un enlace seguro de restablecimiento en tu correo.
                </p>
              </div>
            </div>

            <div class="auth-form">
              <button type="button" class="btn-primary" (click)="startPasswordReset()" [disabled]="isLoading()">
                <span>CONTINUAR A RECUPERACIÓN SEGURA →</span>
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
export class ForgotPasswordComponent implements OnInit {
  private readonly auth = inject(AuthService);
  private readonly api = inject(ApiService);

  readonly isLoading = signal<boolean>(false);

  ngOnInit() {
    this.api.wakeServices();
  }

  startPasswordReset() {
    this.isLoading.set(true);
    this.auth.openResetPassword('dashboard');
  }
}
