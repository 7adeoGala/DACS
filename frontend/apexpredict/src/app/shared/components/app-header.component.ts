import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { AuthService } from '../../core/auth/auth.service';

@Component({
  selector: 'app-header',
  standalone: true,
  imports: [CommonModule, RouterLink],
  template: `
    <header class="app-header">
      <div class="header-container">
        <a routerLink="/" class="brand">
          <span class="brand-title">APEX PREDICT</span>
        </a>
        <div class="header-actions">
          @if (auth.isLoggedIn()) {
            <button type="button" class="btn-logout" (click)="onLogout()">
              Cerrar Sesión
            </button>
          }
        </div>
      </div>
    </header>
  `,
  styles: [`
    .app-header {
      width: 100%;
      height: 60px;
      display: flex;
      align-items: center;
      background: #0d1117;
      border-bottom: 1px solid rgba(255, 255, 255, 0.1);
      padding: 0 1.5rem;
    }
    .header-container {
      display: flex;
      justify-content: space-between;
      align-items: center;
      width: 100%;
    }
    .brand-title {
      color: #ffffff;
      font-weight: 700;
      letter-spacing: 1px;
    }
    .btn-logout {
      background: #e10600;
      color: #fff;
      border: none;
      padding: 0.4rem 1rem;
      border-radius: 4px;
      cursor: pointer;
      font-weight: 600;
    }
  `]
})
export class AppHeaderComponent {
  readonly auth = inject(AuthService);

  onLogout(): void {
    // Retorno exacto del logout respetando el subpath base (/DACS/)
    this.auth.logout();
  }
}

