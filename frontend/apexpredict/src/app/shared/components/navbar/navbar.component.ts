import { Component, ElementRef, HostListener, OnInit, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink, NavigationEnd } from '@angular/router';
import { AuthService } from '../../../core/auth/auth.service';
import { ApiService } from '../../../core/services/api.service';
import { F1_DRIVERS, F1Driver } from '../../../core/models/f1-drivers.model';
import { environment } from '../../../../environments/environment';

export interface F1TeamOption {
  id: string;
  name: string;
  color: string;
  tag: string;
}

export const F1_TEAMS_OPTIONS: F1TeamOption[] = [
  { id: 'mclaren', name: 'McLaren F1 Team', color: '#FF8000', tag: 'PAPAYA' },
  { id: 'ferrari', name: 'Scuderia Ferrari', color: '#E80020', tag: 'SCUDERIA' },
  { id: 'redbull', name: 'Red Bull Racing', color: '#3671C6', tag: 'RED BULL' },
  { id: 'mercedes', name: 'Mercedes-AMG PETRONAS', color: '#27F4D2', tag: 'SILVER' },
  { id: 'williams', name: 'Williams Racing', color: '#64C4FF', tag: 'WILLIAMS' },
  { id: 'astonmartin', name: 'Aston Martin Aramco', color: '#229971', tag: 'AMR' },
  { id: 'alpine', name: 'BWT Alpine F1 Team', color: '#0093CC', tag: 'ALPINE' },
  { id: 'rb', name: 'Visa Cash App RB', color: '#6692FF', tag: 'VCARB' },
  { id: 'sauber', name: 'Stake F1 Team Kick Sauber', color: '#52E252', tag: 'KICK' },
  { id: 'haas', name: 'MoneyGram Haas F1 Team', color: '#B6BABD', tag: 'HAAS' }
];

@Component({
  selector: 'app-navbar',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  template: `
    <header class="navbar-wrapper">
      <div class="navbar-container">
        <!-- LOGO ESTILIZADO APEXPREDICT -->
        <a routerLink="/" class="brand-logo">
          <svg class="logo-racing-mark" viewBox="0 0 18 18" width="20" height="20" fill="none" style="margin-right: 3px;">
            <path d="M2 14L8 4H12L6 14H2Z" fill="var(--red)"/>
            <path d="M8 14L14 4H18L12 14H8Z" fill="#ffffff"/>
          </svg>
          <span class="txt-apex">APEX</span> <span class="txt-predict">PREDICT</span>
        </a>

        <!-- NAVEGACIÓN EN UN SOLO RENGLÓN CON ESPACIADO AMPLIO -->
        <nav class="nav-links">
          <a routerLink="/" [class.active]="isCurrent('inicio')">Inicio</a>
          <a routerLink="/dashboard" [queryParams]="{ tab: 'pronostico' }" [class.active]="isCurrent('predicciones')">Predicciones</a>
          <a routerLink="/dashboard" [queryParams]="{ tab: 'ligas' }" [class.active]="isCurrent('ligas')">Mis Ligas</a>
          <a routerLink="/dashboard" [queryParams]="{ tab: 'posiciones' }" [class.active]="isCurrent('posiciones')">Posiciones</a>
          <a routerLink="/dashboard" [queryParams]="{ tab: 'historial' }" [class.active]="isCurrent('historial')">Historial</a>
        </nav>

        <!-- ACCIONES DE SESIÓN / PERFIL -->
        <div class="nav-actions">
          @if (auth.isAuthenticated()) {
            <!-- CONTENEDOR RELATIVO PARA EL DROPDOWN -->
            <div class="profile-dropdown-wrapper">
              <!-- BOTÓN ACTIVADOR (PILL FIJO CON DATOS GUARDADOS) -->
              <button 
                type="button" 
                class="profile-trigger-btn" 
                (click)="toggleProfileMenu($event)"
                [style.--team-color]="savedTeam().color"
                aria-label="Abrir opciones de perfil">
                <div class="avatar-circle">
                  {{ savedInitials() }}
                </div>
                <div class="user-meta-column">
                  <span class="user-name-text" [title]="savedDisplayName()">
                    {{ savedDisplayName() }}
                  </span>
                  <span class="user-pts-text">{{ auth.userPoints() }} PTS</span>
                </div>
                <span class="chevron-icon">{{ isProfileOpen() ? '▲' : '▼' }}</span>
              </button>

              <!-- MENÚ FLOTANTE DROPDOWN -->
              @if (isProfileOpen()) {
                <div class="profile-dropdown-menu" (click)="$event.stopPropagation()">
                  <!-- ENCABEZADO DEL PERFIL (REFLEJA ESTADO GUARDADO CONFIRMADO) -->
                  <div class="dropdown-header">
                    <div class="avatar-box" [style.--team-color]="savedTeam().color">
                      <span>{{ savedInitials() }}</span>
                      <span class="status-indicator-dot"></span>
                    </div>
                    <div class="header-user-info">
                      <h4 class="header-name" [title]="savedDisplayName()">
                        {{ savedDisplayName() }}
                      </h4>
                      <div class="header-badge-row">
                        <span class="team-tag-badge" [style.--team-color]="savedTeam().color">
                          {{ savedTeamTag() }}
                        </span>
                      </div>
                    </div>
                  </div>

                  <!-- SECCIÓN DE PREFERENCIAS -->
                  <div class="dropdown-section-title-row">
                    <span class="section-title">PREFERENCIAS DE CARRERA</span>
                    <span class="sync-status">
                      <span class="sync-dot">●</span> SINCRONIZADO
                    </span>
                  </div>

                  <!-- CAMPO 1: NOMBRE PÚBLICO (LIMITADO A 20 CARACTERES) -->
                  <div class="form-field-group">
                    <div class="field-label-row">
                      <label class="field-label" for="displayNameInput">NOMBRE PÚBLICO</label>
                      <span class="char-count">{{ formDisplayName().length }}/20</span>
                    </div>
                    <div class="input-with-icon">
                      <span class="input-icon">👤</span>
                      <input 
                        type="text" 
                        id="displayNameInput"
                        class="field-input" 
                        [(ngModel)]="formDisplayName" 
                        placeholder="Tu nombre en la tabla"
                        maxlength="20" />
                    </div>
                  </div>

                  <!-- CAMPO 2: ESCUDERÍA FAVORITA -->
                  <div class="form-field-group">
                    <label class="field-label" for="favTeamSelect">ESCUDERÍA FAVORITA</label>
                    <div class="select-wrapper team-highlight" [style.--team-color]="formTeam().color">
                      <span class="team-color-indicator" [style.background]="formTeam().color"></span>
                      <select 
                        id="favTeamSelect"
                        class="field-select with-color" 
                        [(ngModel)]="formTeamId"
                        (ngModelChange)="onTeamSelected($event)">
                        @for (team of teams; track team.id) {
                          <option [value]="team.id">{{ team.name }}</option>
                        }
                      </select>
                      <span class="select-chevron">⇅</span>
                    </div>
                  </div>

                  <!-- CAMPO 3: PILOTO FAVORITO -->
                  <div class="form-field-group">
                    <label class="field-label" for="favDriverSelect">PILOTO FAVORITO</label>
                    <div class="select-wrapper">
                      <span class="driver-icon-badge">🏎</span>
                      <select 
                        id="favDriverSelect"
                        class="field-select with-icon" 
                        [(ngModel)]="formDriverId">
                        @for (driver of drivers; track driver.id) {
                          <option [value]="driver.id">
                            {{ driver.name }} #{{ driver.number }} ({{ driver.code }})
                          </option>
                        }
                      </select>
                      <span class="select-chevron">⇅</span>
                    </div>
                  </div>

                  <!-- CAMPO 4: RECORDATORIOS DE GP (SWITCH) -->
                  <div class="switch-row">
                    <div class="switch-labels">
                      <span class="switch-title">Recordatorios de GP</span>
                      <span class="switch-desc">Alertas de cierre de predicciones</span>
                    </div>
                    <label class="toggle-switch">
                      <input 
                        type="checkbox" 
                        [(ngModel)]="formNotifications" />
                      <span class="toggle-slider"></span>
                    </label>
                  </div>

                  <!-- BOTÓN GUARDAR PERFIL -->
                  <button 
                    type="button" 
                    class="btn-save-profile" 
                    [disabled]="isSaving()" 
                    (click)="saveProfile()">
                    @if (isSaving()) {
                      <span class="spinner-mini"></span> Guardando...
                    } @else if (saveStatus() === 'success') {
                      <span>✓ Perfil Guardado</span>
                    } @else {
                      <span>💾 GUARDAR PERFIL</span>
                    }
                  </button>

                  <!-- FOOTER: SEGURIDAD KEYCLOAK & CERRAR SESIÓN -->
                  <div class="dropdown-footer">
                    <a [href]="keycloakAccountUrl()" target="_blank" rel="noopener noreferrer" class="link-security">
                      🔒 Seguridad Keycloak ↗
                    </a>
                    <button type="button" class="btn-dropdown-logout" (click)="auth.logout()">
                      🚪 Cerrar Sesión
                    </button>
                  </div>
                </div>
              }
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

    /* DROPDOWN WRAPPER Y TRIGGER BUTTON */
    .profile-dropdown-wrapper {
      position: relative;
    }
    .profile-trigger-btn {
      display: flex;
      align-items: center;
      gap: 0.65rem;
      background: rgba(20, 24, 34, 0.9);
      border: 1px solid rgba(255, 255, 255, 0.12);
      border-radius: 9999px;
      padding: 4px 14px 4px 5px;
      cursor: pointer;
      transition: all 0.2s ease;
      color: #ffffff;
      max-width: 220px;
    }
    .profile-trigger-btn:hover {
      background: rgba(30, 36, 52, 0.95);
      border-color: rgba(255, 255, 255, 0.25);
    }
    .avatar-circle {
      width: 32px;
      height: 32px;
      border-radius: 50%;
      background: var(--team-color, #ff8000);
      color: #000000;
      font-weight: 800;
      font-size: 0.82rem;
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
      box-shadow: 0 0 10px rgba(0, 0, 0, 0.4);
    }
    .user-meta-column {
      display: flex;
      flex-direction: column;
      align-items: flex-start;
      text-align: left;
      line-height: 1.15;
      overflow: hidden;
      min-width: 0;
    }
    .user-name-text {
      font-size: 0.84rem;
      font-weight: 700;
      color: #ffffff;
      max-width: 130px;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }
    .user-pts-text {
      font-size: 0.72rem;
      font-family: var(--font-mono);
      color: var(--gold);
      font-weight: 700;
    }
    .chevron-icon {
      font-size: 0.62rem;
      color: #94a3b8;
      margin-left: 2px;
      flex-shrink: 0;
    }

    /* DROPDOWN MENU CARD */
    .profile-dropdown-menu {
      position: absolute;
      top: calc(100% + 10px);
      right: 0;
      width: 335px;
      background: #0f131c;
      border: 1px solid rgba(255, 255, 255, 0.12);
      border-radius: 14px;
      padding: 1.25rem;
      box-shadow: 0 20px 45px rgba(0, 0, 0, 0.75), 0 0 20px rgba(0, 0, 0, 0.5);
      z-index: 1000;
      box-sizing: border-box;
      animation: fadeInDropdown 0.15s ease-out;
    }
    @keyframes fadeInDropdown {
      from { opacity: 0; transform: translateY(-6px); }
      to { opacity: 1; transform: translateY(0); }
    }

    /* HEADER */
    .dropdown-header {
      display: flex;
      align-items: center;
      gap: 0.85rem;
      margin-bottom: 1.15rem;
    }
    .avatar-box {
      width: 52px;
      height: 52px;
      border-radius: 10px;
      background: var(--team-color, #ff8000);
      color: #000000;
      font-size: 1.3rem;
      font-weight: 900;
      display: flex;
      align-items: center;
      justify-content: center;
      position: relative;
      flex-shrink: 0;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.4);
    }
    .status-indicator-dot {
      position: absolute;
      bottom: -2px;
      right: -2px;
      width: 12px;
      height: 12px;
      border-radius: 50%;
      background: #10b981;
      border: 2px solid #0f131c;
    }
    .header-user-info {
      display: flex;
      flex-direction: column;
      gap: 5px;
      overflow: hidden;
      min-width: 0;
      justify-content: center;
    }
    .header-name {
      margin: 0;
      font-size: 1.12rem;
      font-weight: 800;
      color: #ffffff;
      max-width: 220px;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
      line-height: 1.2;
    }
    .header-badge-row {
      display: flex;
      align-items: center;
    }
    .team-tag-badge {
      font-size: 0.68rem;
      font-weight: 800;
      font-family: var(--font-mono);
      color: var(--team-color, #ff8000);
      background: color-mix(in srgb, var(--team-color, #ff8000) 16%, transparent);
      border: 1px solid var(--team-color, #ff8000);
      padding: 2px 7px;
      border-radius: 4px;
      letter-spacing: 0.05em;
      display: inline-flex;
      width: fit-content;
    }

    /* SECTION TITLE ROW */
    .dropdown-section-title-row {
      display: flex;
      align-items: center;
      justify-content: space-between;
      margin-bottom: 0.85rem;
      padding-top: 0.35rem;
      border-top: 1px solid rgba(255, 255, 255, 0.07);
    }
    .section-title {
      font-size: 0.72rem;
      font-weight: 700;
      color: #64748b;
      letter-spacing: 0.05em;
      text-transform: uppercase;
    }
    .sync-status {
      font-size: 0.68rem;
      font-weight: 700;
      color: #10b981;
      letter-spacing: 0.05em;
      text-transform: uppercase;
      display: flex;
      align-items: center;
      gap: 4px;
    }
    .sync-dot {
      font-size: 0.6rem;
    }

    /* FORM FIELDS */
    .form-field-group {
      margin-bottom: 0.75rem;
    }
    .field-label-row {
      display: flex;
      align-items: center;
      justify-content: space-between;
      margin-bottom: 0.35rem;
    }
    .field-label {
      font-size: 0.7rem;
      font-weight: 700;
      color: #94a3b8;
      letter-spacing: 0.05em;
      text-transform: uppercase;
    }
    .char-count {
      font-size: 0.68rem;
      font-family: var(--font-mono);
      color: #64748b;
    }
    .input-with-icon {
      position: relative;
      display: flex;
      align-items: center;
    }
    .input-icon {
      position: absolute;
      left: 10px;
      font-size: 0.85rem;
      pointer-events: none;
      color: #94a3b8;
    }
    .field-input {
      width: 100%;
      background: #090c13;
      border: 1px solid rgba(255, 255, 255, 0.12);
      border-radius: 7px;
      color: #ffffff;
      font-size: 0.88rem;
      font-weight: 600;
      font-family: inherit;
      padding: 0.55rem 0.75rem 0.55rem 2.15rem;
      box-sizing: border-box;
      outline: none;
      transition: border-color 0.2s;
    }
    .field-input:focus {
      border-color: rgba(255, 255, 255, 0.35);
    }

    /* SELECT WRAPPER */
    .select-wrapper {
      position: relative;
      display: flex;
      align-items: center;
      background: #090c13;
      border: 1px solid rgba(255, 255, 255, 0.12);
      border-radius: 7px;
      transition: border-color 0.2s;
    }
    .select-wrapper.team-highlight {
      border: 1px solid var(--team-color, #ff8000);
    }
    .team-color-indicator {
      position: absolute;
      left: 11px;
      width: 9px;
      height: 9px;
      border-radius: 50%;
      pointer-events: none;
      box-shadow: 0 0 6px rgba(0, 0, 0, 0.5);
    }
    .driver-icon-badge {
      position: absolute;
      left: 10px;
      font-size: 0.85rem;
      pointer-events: none;
    }
    .field-select {
      width: 100%;
      background: transparent;
      border: none;
      color: #ffffff;
      font-size: 0.86rem;
      font-weight: 600;
      font-family: inherit;
      padding: 0.55rem 1.8rem 0.55rem 1.95rem;
      box-sizing: border-box;
      outline: none;
      cursor: pointer;
      appearance: none;
    }
    .field-select option {
      background: #141822;
      color: #ffffff;
    }
    .select-chevron {
      position: absolute;
      right: 10px;
      font-size: 0.75rem;
      color: #94a3b8;
      pointer-events: none;
    }

    /* SWITCH ROW */
    .switch-row {
      display: flex;
      align-items: center;
      justify-content: space-between;
      margin: 0.85rem 0 1rem 0;
    }
    .switch-labels {
      display: flex;
      flex-direction: column;
      gap: 2px;
    }
    .switch-title {
      font-size: 0.82rem;
      font-weight: 600;
      color: #ffffff;
    }
    .switch-desc {
      font-size: 0.72rem;
      color: #64748b;
    }
    .toggle-switch {
      position: relative;
      display: inline-block;
      width: 44px;
      height: 24px;
      flex-shrink: 0;
    }
    .toggle-switch input {
      opacity: 0;
      width: 0;
      height: 0;
    }
    .toggle-slider {
      position: absolute;
      cursor: pointer;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background-color: #242c3d;
      transition: 0.25s;
      border-radius: 24px;
    }
    .toggle-slider:before {
      position: absolute;
      content: "";
      height: 18px;
      width: 18px;
      left: 3px;
      bottom: 3px;
      background-color: white;
      transition: 0.25s;
      border-radius: 50%;
    }
    input:checked + .toggle-slider {
      background-color: var(--red);
    }
    input:checked + .toggle-slider:before {
      transform: translateX(20px);
    }

    /* SAVE BUTTON */
    .btn-save-profile {
      width: 100%;
      background: var(--red);
      color: #ffffff;
      font-size: 0.85rem;
      font-weight: 800;
      letter-spacing: 0.04em;
      text-transform: uppercase;
      border: none;
      border-radius: 7px;
      padding: 0.65rem 1rem;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 0.45rem;
      transition: all 0.2s ease;
      box-shadow: 0 4px 14px rgba(225, 6, 0, 0.3);
    }
    .btn-save-profile:hover:not(:disabled) {
      background: #ff1801;
      transform: translateY(-1px);
      box-shadow: 0 6px 20px rgba(225, 6, 0, 0.5);
    }
    .btn-save-profile:disabled {
      opacity: 0.7;
      cursor: not-allowed;
    }
    .spinner-mini {
      display: inline-block;
      width: 14px;
      height: 14px;
      border: 2px solid rgba(255, 255, 255, 0.3);
      border-top-color: #ffffff;
      border-radius: 50%;
      animation: spin 0.8s linear infinite;
    }
    @keyframes spin {
      to { transform: rotate(360deg); }
    }

    /* FOOTER ACTIONS */
    .dropdown-footer {
      display: flex;
      align-items: center;
      justify-content: space-between;
      margin-top: 0.95rem;
      padding-top: 0.75rem;
      border-top: 1px solid rgba(255, 255, 255, 0.08);
    }
    .link-security {
      color: #94a3b8;
      font-size: 0.76rem;
      font-weight: 500;
      text-decoration: none;
      display: inline-flex;
      align-items: center;
      gap: 4px;
      transition: color 0.2s;
    }
    .link-security:hover {
      color: var(--cyan);
    }
    .btn-dropdown-logout {
      background: transparent;
      border: none;
      color: #f87171;
      font-size: 0.76rem;
      font-weight: 600;
      cursor: pointer;
      display: inline-flex;
      align-items: center;
      gap: 4px;
      padding: 0;
      transition: color 0.2s;
    }
    .btn-dropdown-logout:hover {
      color: #ef4444;
      text-decoration: underline;
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
      .profile-dropdown-menu {
        right: -10px;
        width: calc(100vw - 2rem);
        max-width: 335px;
      }
    }
  `]
})
export class NavbarComponent implements OnInit {
  readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  readonly api = inject(ApiService);
  private readonly elementRef = inject(ElementRef);

  readonly currentUrl = signal<string>(this.router.url);

  // Opciones de configuración de F1
  readonly teams = F1_TEAMS_OPTIONS;
  readonly drivers: F1Driver[] = F1_DRIVERS;

  // Estado del dropdown
  readonly isProfileOpen = signal<boolean>(false);
  readonly isSaving = signal<boolean>(false);
  readonly saveStatus = signal<'idle' | 'success' | 'error'>('idle');

  // ESTADO GUARDADO (Confirma los valores visibles en navbar y encabezado)
  readonly savedDisplayName = signal<string>('Tadeo Gala');
  readonly savedTeamId = signal<string>('mclaren');
  readonly savedDriverId = signal<string>('norris');
  readonly savedNotifications = signal<boolean>(true);

  // ESTADO BORRADOR / FORMULARIO (Se edita sin afectar el navbar hasta presionar Guardar)
  readonly formDisplayName = signal<string>('Tadeo Gala');
  readonly formTeamId = signal<string>('mclaren');
  readonly formDriverId = signal<string>('norris');
  readonly formNotifications = signal<boolean>(true);

  // Computados para el estado GUARDADO (visible en la píldora superior y badge confirmado)
  readonly savedTeam = computed(() => {
    return this.teams.find((t) => t.id === this.savedTeamId()) || this.teams[0];
  });

  readonly savedDriver = computed(() => {
    return this.drivers.find((d) => d.id === this.savedDriverId()) || this.drivers[1];
  });

  readonly savedTeamTag = computed(() => {
    return `${this.savedTeam().tag} #${this.savedDriver().number}`;
  });

  readonly savedInitials = computed(() => {
    const name = this.savedDisplayName() || this.auth.username() || 'TG';
    const parts = name.trim().split(/\s+/);
    if (parts.length >= 2) {
      return (parts[0][0] + parts[1][0]).toUpperCase();
    }
    return name.slice(0, 2).toUpperCase();
  });

  // Computado para el estado BORRADOR (se muestra dentro del select mientras se elige)
  readonly formTeam = computed(() => {
    return this.teams.find((t) => t.id === this.formTeamId()) || this.teams[0];
  });


  readonly keycloakAccountUrl = computed(() => {
    return `${environment.keycloak.url}/realms/${environment.keycloak.realm}/account`;
  });

  constructor() {
    this.router.events.subscribe((event) => {
      if (event instanceof NavigationEnd) {
        this.currentUrl.set(event.urlAfterRedirects || event.url);
      }
    });
  }

  ngOnInit() {
    if (this.auth.authenticated()) {
      this.loadProfile();
    }
  }

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent) {
    if (this.isProfileOpen() && !this.elementRef.nativeElement.contains(event.target)) {
      this.isProfileOpen.set(false);
    }
  }

  toggleProfileMenu(event: MouseEvent) {
    event.stopPropagation();
    if (!this.isProfileOpen()) {
      // Al abrir, sincronizar el borrador con los últimos datos guardados
      this.formDisplayName.set(this.savedDisplayName());
      this.formTeamId.set(this.savedTeamId());
      this.formDriverId.set(this.savedDriverId());
      this.formNotifications.set(this.savedNotifications());
      this.saveStatus.set('idle');
    }
    this.isProfileOpen.update((v) => !v);
  }

  onTeamSelected(teamId: string) {
    // Si cambia de escudería en el selector, sugerir el primer piloto de ese equipo
    const driverOfTeam = this.drivers.find((d) => {
      const teamObj = this.teams.find((t) => t.id === teamId);
      return teamObj && d.team.toLowerCase().includes(teamObj.name.split(' ')[0].toLowerCase());
    });
    if (driverOfTeam) {
      this.formDriverId.set(driverOfTeam.id);
    }
  }

  loadProfile() {
    this.api.getProfile().subscribe({
      next: (profile) => {
        const name = profile.displayName || this.auth.username() || 'Piloto';
        this.savedDisplayName.set(name);
        this.formDisplayName.set(name);

        if (profile.favoriteTeamId) {
          this.savedTeamId.set(profile.favoriteTeamId);
          this.formTeamId.set(profile.favoriteTeamId);
        }
        if (profile.favoriteDriverId) {
          this.savedDriverId.set(profile.favoriteDriverId);
          this.formDriverId.set(profile.favoriteDriverId);
        }
        if (profile.notificationsEnabled !== undefined) {
          this.savedNotifications.set(profile.notificationsEnabled);
          this.formNotifications.set(profile.notificationsEnabled);
        }
        if (profile.totalScore !== undefined) {
          this.auth.userPoints.set(profile.totalScore);
        }
      },
      error: () => {
        const fallback = this.auth.username() || 'Piloto';
        this.savedDisplayName.set(fallback);
        this.formDisplayName.set(fallback);
      }
    });
  }

  saveProfile() {
    const raw = this.formDisplayName() || '';
    const trimmed = raw.trim();
    // Limitar a 20 caracteres y fallback al username si está vacío
    const finalName = trimmed.length > 0 ? trimmed.slice(0, 20) : (this.auth.username() || 'Piloto');
    this.formDisplayName.set(finalName);

    this.isSaving.set(true);
    this.saveStatus.set('idle');

    this.api.updateProfile({
      displayName: finalName,
      favoriteTeamId: this.formTeamId(),
      favoriteDriverId: this.formDriverId(),
      notificationsEnabled: this.formNotifications()
    }).subscribe({
      next: (profile) => {
        this.isSaving.set(false);
        this.saveStatus.set('success');

        // AHORA SÍ reflejamos los cambios guardados arriba en el navbar y en el encabezado
        const confirmedName = profile.displayName || finalName;
        this.savedDisplayName.set(confirmedName);
        this.formDisplayName.set(confirmedName);

        if (profile.favoriteTeamId) {
          this.savedTeamId.set(profile.favoriteTeamId);
          this.formTeamId.set(profile.favoriteTeamId);
        }
        if (profile.favoriteDriverId) {
          this.savedDriverId.set(profile.favoriteDriverId);
          this.formDriverId.set(profile.favoriteDriverId);
        }
        if (profile.notificationsEnabled !== undefined) {
          this.savedNotifications.set(profile.notificationsEnabled);
          this.formNotifications.set(profile.notificationsEnabled);
        }
        if (profile.totalScore !== undefined) {
          this.auth.userPoints.set(profile.totalScore);
        }
        setTimeout(() => this.saveStatus.set('idle'), 2500);
      },
      error: (err) => {
        console.error('Error guardando perfil:', err);
        this.isSaving.set(false);
        this.saveStatus.set('error');
        setTimeout(() => this.saveStatus.set('idle'), 2500);
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
