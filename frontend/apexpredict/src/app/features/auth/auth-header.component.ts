import { Component } from '@angular/core';

@Component({
  selector: 'app-auth-header',
  standalone: true,
  template: `
    <header class="auth-header">
      <div class="auth-header-inner">
        <a class="brand-link" href="/">
          <svg class="logo-racing-mark" viewBox="0 0 18 18" width="22" height="22" fill="none" style="margin-right: 4px;">
            <path d="M2 14L8 4H12L6 14H2Z" fill="#e10600"/>
            <path d="M8 14L14 4H18L12 14H8Z" fill="#ffffff"/>
          </svg>
          <div class="brand-text">
            <div class="brand-title">
              <span class="brand-apex">APEX</span> <span class="brand-predict">PREDICT</span>
            </div>
            <span class="brand-sub">OFFICIAL F1 COMPETITION LEAGUE</span>
          </div>
        </a>
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
    .logo-racing-mark {
      flex-shrink: 0;
    }
    .brand-text {
      display: flex;
      flex-direction: column;
      text-align: left;
    }
    .brand-title {
      font-size: 1.35rem;
      font-weight: 900;
      font-style: normal;
      letter-spacing: -0.01em;
      line-height: 1.1;
    }
    .brand-apex {
      color: #ffffff;
    }
    .brand-predict {
      color: #e10600;
      margin-left: 4px;
    }
    .brand-sub {
      font-family: 'JetBrains Mono', monospace;
      font-size: 0.55rem;
      font-weight: 700;
      letter-spacing: 0.22em;
      color: #94a3b8;
    }
    @media (max-width: 640px) {
      .auth-header-inner {
        padding: 0 1rem;
      }
      .brand-title {
        font-size: 1.15rem;
      }
      .brand-sub {
        font-size: 0.5rem;
        letter-spacing: 0.14em;
      }
    }
  `]
})
export class AuthHeaderComponent {}
