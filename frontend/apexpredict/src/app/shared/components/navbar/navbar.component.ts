import { Component, inject, signal } from '@angular/core';
import { Router, RouterLink, NavigationEnd } from '@angular/router';
import { AuthService } from '../../../core/auth/auth.service';

@Component({
  selector: 'app-navbar',
  standalone: true,
  imports: [RouterLink],
  template: `
    <header class="navbar-wrapper">
      <div class="navbar-container">
        <!-- LOGO ESTILIZADO APEXPREDICT -->
        <a routerLink="/" class="brand-logo">
          <span class="logo-a">⚡</span>
          <span class="txt-apex">APEX</span><span class="txt-predict">PREDICT</span>
        </a>

        <!-- NAVEGACIÓN EN UN SOLO RENGLÓN CON ESPACIADO AMPLIO -->
        <nav class="nav-links">
          <a routerLink="/" [class.active]="isCurrent('inicio')">Inicio</a>
          <a routerLink="/dashboard" [queryParams]="{ tab: 'pronostico' }" [class.active]="isCurrent('predicciones')">Predicciones</a>
          <a routerLink="/dashboard" [queryParams]="{ tab: 'ligas' }" [class.active]="isCurrent('ligas')">Mis Ligas</a>
          <a routerLink="/dashboard" [queryParams]="{ tab: 'posiciones' }" [class.active]="isCurrent('posiciones')">Posiciones</a>
          <a routerLink="/dashboard" [queryParams]="{ tab: 'historial' }" [class.active]="isCurrent('historial')">Historial</a>
        </nav>

        <!-- ACCIONES DE LOGIN / SESIÓN -->
        <div class="nav-actions">
          @if (!auth.isAuthenticated()) {
            <button class="btn-google" (click)="auth.loginWithGoogle()" title="Iniciar sesión con Google">
              <svg width="15" height="15" viewBox="0 0 24 24" class="google-icon" aria-hidden="true">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"/>
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"/>
              </svg>
              <span>Google</span>
            </button>
            <button class="btn-login" (click)="auth.login()">
              Iniciar Sesión <span class="arrow">↗</span>
            </button>
          } @else {
            <div class="user-pill">
              @if (auth.userPoints() > 0) {
                <span class="user-pts">🏆 {{ auth.userPoints() }} pts</span>
              }
              <button class="btn-logout" (click)="auth.logout()">Salir · {{ auth.username() }}</button>
            </div>
          }
        </div>
      </div>
    </header>
  `,
  styles: [`
    .navbar-wrapper {
      position: sticky;
      top: 0;
      z-index: 100;
      background: rgba(9, 11, 14, 0.95);
      backdrop-filter: blur(12px);
      border-bottom: 1px solid var(--line);
      padding: 0.85rem 2rem;
    }
    .navbar-container {
      max-width: 1440px;
      margin: 0 auto;
      display: flex;
      align-items: center;
      justify-content: space-between;
    }
    .brand-logo {
      font-size: 1.35rem;
      font-weight: 900;
      text-decoration: none;
      letter-spacing: -0.02em;
      display: flex;
      align-items: center;
      gap: 0.35rem;
    }
    .logo-a {
      color: var(--red);
      font-size: 1.2rem;
    }
    .txt-apex {
      color: #ffffff;
    }
    .txt-predict {
      color: var(--red);
    }
    .nav-links {
      display: flex;
      align-items: center;
      gap: 2.25rem;
    }
    .nav-links a {
      color: var(--text-muted);
      text-decoration: none;
      font-size: 0.92rem;
      font-weight: 500;
      padding: 0.4rem 0.6rem;
      border-radius: var(--radius-sm);
      transition: color 0.2s;
    }
    .nav-links a:hover {
      color: #ffffff;
    }
    .nav-links a.active {
      color: #ffffff;
      font-weight: 700;
      box-shadow: inset 0 -2px 0 var(--red);
    }
    .btn-google {
      background: #141822;
      border: 1px solid var(--line-strong);
      color: #ffffff;
      padding: 0.5rem 0.95rem;
      border-radius: var(--radius-sm);
      font-weight: 600;
      font-size: 0.86rem;
      cursor: pointer;
      display: inline-flex;
      align-items: center;
      gap: 0.45rem;
      transition: all 0.2s;
    }
    .btn-google:hover {
      background: #1c2230;
      border-color: rgba(255, 255, 255, 0.35);
      box-shadow: 0 0 14px rgba(66, 133, 244, 0.25);
    }
    .google-icon {
      flex-shrink: 0;
    }
    .btn-login {
      background: transparent;
      border: 1px solid var(--line-strong);
      color: #ffffff;
      padding: 0.5rem 1.15rem;
      border-radius: var(--radius-sm);
      font-weight: 600;
      font-size: 0.88rem;
      cursor: pointer;
      display: flex;
      align-items: center;
      gap: 0.35rem;
      transition: all 0.2s;
    }
    .btn-login:hover {
      background: var(--surface-hover);
      border-color: var(--red);
    }
    .btn-login .arrow {
      color: var(--red);
      font-size: 0.95rem;
    }
    .user-pill {
      display: flex;
      align-items: center;
      gap: 0.75rem;
    }
    .user-pts {
      font-family: var(--font-mono);
      font-size: 0.85rem;
      color: var(--gold);
      font-weight: 700;
    }
    .btn-logout {
      background: transparent;
      border: 1px solid var(--line);
      color: var(--text-muted);
      font-size: 0.85rem;
      cursor: pointer;
      padding: 0.4rem 0.8rem;
      border-radius: var(--radius-sm);
      transition: all 0.2s;
    }
    .btn-logout:hover {
      color: #ffffff;
      border-color: var(--red);
      background: rgba(225, 6, 0, 0.1);
    }
    @media (max-width: 768px) {
      .navbar-wrapper {
        padding: 0.75rem 1rem;
      }
      .nav-links {
        gap: 1rem;
        overflow-x: auto;
        font-size: 0.82rem;
      }
    }
  `]
})
export class NavbarComponent {
  readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  readonly currentUrl = signal<string>(this.router.url);

  constructor() {
    this.router.events.subscribe((event) => {
      if (event instanceof NavigationEnd) {
        this.currentUrl.set(event.urlAfterRedirects || event.url);
      }
    });
  }

  isCurrent(tab: 'inicio' | 'predicciones' | 'ligas' | 'posiciones' | 'historial'): boolean {
    const url = this.currentUrl();
    if (tab === 'inicio') {
      return url === '/' || url === '' || url.startsWith('/?');
    }
    if (!url.startsWith('/dashboard') && !url.startsWith('/join')) {
      return false;
    }
    if (tab === 'ligas') {
      return url.includes('tab=ligas') || url.startsWith('/join');
    }
    if (tab === 'posiciones') {
      return url.includes('tab=posiciones') || url.includes('tab=global');
    }
    if (tab === 'historial') {
      return url.includes('tab=historial');
    }
    if (tab === 'predicciones') {
      return (
        !url.includes('tab=ligas') &&
        !url.includes('tab=posiciones') &&
        !url.includes('tab=global') &&
        !url.includes('tab=historial') &&
        !url.startsWith('/join')
      );
    }
    return false;
  }
}

