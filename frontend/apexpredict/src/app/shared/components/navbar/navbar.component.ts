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
            <a routerLink="/login" class="btn-login">
              Iniciar Sesión <span class="arrow">↗</span>
            </a>
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
    .btn-login {
      background: transparent;
      border: 1px solid var(--line-strong);
      color: #ffffff;
      padding: 0.5rem 1.15rem;
      border-radius: var(--radius-sm);
      font-weight: 600;
      font-size: 0.88rem;
      cursor: pointer;
      display: inline-flex;
      align-items: center;
      gap: 0.35rem;
      text-decoration: none;
      transition: all 0.2s;
    }
    .btn-login:hover {
      background: var(--surface-hover);
      border-color: var(--red);
      color: #ffffff;
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

