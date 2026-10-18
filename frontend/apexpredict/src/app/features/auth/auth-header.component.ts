import { Component } from '@angular/core';

@Component({
  selector: 'app-auth-header',
  standalone: true,
  template: `
    <header class="auth-header">
      <div class="auth-header-inner">
        <!-- LOGO OFICIAL APEXPREDICT (ESQUINA SUPERIOR IZQUIERDA) -->
        <a class="brand-link" href="/">
          <div class="brand-icon">
            <svg class="brand-bolt" viewBox="0 0 24 24" fill="currentColor">
              <path d="M13 2L3 14H12L11 22L21 10H12L13 2Z"/>
            </svg>
          </div>
          <div class="brand-text">
            <div class="brand-title">
              <span class="brand-apex">APEX</span><span class="brand-predict">PREDICT</span>
            </div>
            <span class="brand-sub">OFFICIAL F1 COMPETITION LEAGUE</span>
          </div>
        </a>

        <!-- BADGE TELEMÉTRICO DE ESTADO (DERECHA) -->
        <div class="auth-badge">
          <span class="pulse-dot"></span>
          <span class="badge-text-primary">KEYCLOAK OIDC PROTECTED</span>
          <span class="badge-divider">|</span>
          <span class="badge-text-secondary">TEMPORADA 2026</span>
        </div>
      </div>
    </header>
  `,
  styles: [`
    .auth-header {
      width: 100%;
      height: 64px;
      position: sticky;
      top: 0;
      z-index: 50;
      background: rgba(9, 11, 14, 0.92);
      backdrop-filter: blur(14px);
      -webkit-backdrop-filter: blur(14px);
      border-bottom: 1px solid rgba(255, 255, 255, 0.08);
      display: flex;
      align-items: center;
      box-sizing: border-box;
    }
    .auth-header-inner {
      width: 100%;
      max-width: 1280px;
      margin: 0 auto;
      padding: 0 1.5rem;
      display: flex;
      align-items: center;
      justify-content: space-between;
      box-sizing: border-box;
    }
    .brand-link {
      display: inline-flex;
      align-items: center;
      gap: 0.75rem;
      text-decoration: none;
      transition: transform 0.2s ease;
    }
    .brand-link:hover {
      transform: scale(1.02);
    }
    .brand-icon {
      width: 38px;
      height: 38px;
      border-radius: 10px;
      background: linear-gradient(135deg, #e10600 0%, #b30500 100%);
      display: flex;
      align-items: center;
      justify-content: center;
      box-shadow: 0 4px 16px rgba(225, 6, 0, 0.4);
      border: 1px solid rgba(255, 255, 255, 0.2);
    }
    .brand-bolt {
      width: 20px;
      height: 20px;
      color: #ffffff;
      transform: skewX(-6deg);
    }
    .brand-text {
      display: flex;
      flex-direction: column;
      text-align: left;
    }
    .brand-title {
      font-size: 1.25rem;
      font-weight: 900;
      font-style: italic;
      letter-spacing: 0.03em;
      line-height: 1.1;
    }
    .brand-apex {
      color: #ffffff;
    }
    .brand-predict {
      color: #e10600;
      margin-left: 2px;
    }
    .brand-sub {
      font-family: 'JetBrains Mono', monospace;
      font-size: 0.55rem;
      font-weight: 700;
      letter-spacing: 0.22em;
      color: #94a3b8;
    }
    .auth-badge {
      display: inline-flex;
      align-items: center;
      gap: 0.5rem;
      padding: 4px 12px;
      border-radius: 9999px;
      background: rgba(18, 23, 34, 0.8);
      border: 1px solid rgba(255, 255, 255, 0.1);
      font-family: 'JetBrains Mono', monospace;
      font-size: 0.65rem;
      color: #cbd5e1;
    }
    .pulse-dot {
      width: 6px;
      height: 6px;
      border-radius: 50%;
      background: #10b981;
      box-shadow: 0 0 8px #10b981;
      animation: pulseGlow 2s infinite ease-in-out;
    }
    @keyframes pulseGlow {
      0%, 100% { opacity: 1; transform: scale(1); }
      50% { opacity: 0.4; transform: scale(0.85); }
    }
    .badge-divider {
      color: rgba(255, 255, 255, 0.2);
    }
    .badge-text-secondary {
      color: #94a3b8;
    }
    @media (max-width: 640px) {
      .auth-header-inner {
        padding: 0 1rem;
      }
      .badge-text-primary, .badge-divider {
        display: none;
      }
    }
  `]
})
export class AuthHeaderComponent {}
