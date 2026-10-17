import { Component, inject } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { AuthService } from '../../../core/auth/auth.service';

@Component({
  selector: 'app-navbar',
  standalone: true,
  imports: [RouterLink, RouterLinkActive],
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
          <a routerLink="/" routerLinkActive="active" [routerLinkActiveOptions]="{ exact: true }">GP Actual</a>
          <a routerLink="/dashboard" routerLinkActive="active">Cockpit & Predicciones</a>
          <a routerLink="/dashboard" [queryParams]="{ tab: 'ligas' }" routerLinkActive="active">Mis Ligas</a>
          <a routerLink="/dashboard" [queryParams]="{ tab: 'global' }" routerLinkActive="active">Posiciones F1</a>
        </nav>

        <!-- ACCIONES DE LOGIN / SESIÓN -->
        <div class="nav-actions">
          @if (!auth.isAuthenticated()) {
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
}
