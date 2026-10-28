import { Component, ElementRef, HostListener, OnInit, inject, signal, computed, effect } from '@angular/core';
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
  secondaryColor: string;
  gradient: string;
  textColor: string;
  btnTextColor?: string;
  tag: string;
  tagColor?: string;
  switchKnobColor?: string;
}

export const F1_TEAMS_OPTIONS: F1TeamOption[] = [
  { 
    id: 'mclaren', 
    name: 'McLaren F1 Team', 
    color: '#FF8000', 
    secondaryColor: '#00A3E0',
    gradient: 'linear-gradient(135deg, #FF8000 0%, #D85600 100%)',
    textColor: '#000000',
    btnTextColor: '#000000',
    tag: 'PAPAYA' 
  },
  { 
    id: 'ferrari', 
    name: 'Scuderia Ferrari', 
    color: '#E8002D', 
    secondaryColor: '#FFE500',
    gradient: 'linear-gradient(135deg, #EF1A2D 0%, #8A000E 100%)',
    textColor: '#FFFFFF',
    btnTextColor: '#FFFFFF',
    tag: 'SCUDERIA' 
  },
  { 
    id: 'redbull', 
    name: 'Red Bull Racing', 
    color: '#1E41FF', 
    secondaryColor: '#EA1D2D',
    gradient: 'linear-gradient(135deg, #1E3D7B 0%, #061026 100%)',
    textColor: '#FFFFFF',
    btnTextColor: '#FFFFFF',
    tag: 'RED BULL' 
  },
  { 
    id: 'mercedes', 
    name: 'Mercedes-AMG PETRONAS', 
    color: '#00A19C', 
    secondaryColor: '#27F4D2',
    gradient: 'linear-gradient(135deg, #27F4D2 0%, #007A6C 100%)',
    textColor: '#031E19',
    btnTextColor: '#031E19',
    tag: 'PETRONAS' 
  },
  { 
    id: 'astonmartin', 
    name: 'Aston Martin Aramco', 
    color: '#00594F', 
    secondaryColor: '#CEDC00',
    gradient: 'linear-gradient(135deg, #00665E 0%, #002B26 100%)',
    textColor: '#FFFFFF',
    btnTextColor: '#FFFFFF',
    tag: 'AMR' 
  },
  { 
    id: 'alpine', 
    name: 'BWT Alpine F1 Team', 
    color: '#0093CC', 
    secondaryColor: '#FD4BC7',
    gradient: 'linear-gradient(135deg, #0093CC 0%, #FD4BC7 100%)',
    textColor: '#FFFFFF',
    btnTextColor: '#FFFFFF',
    tag: 'ALPINE' 
  },
  { 
    id: 'williams', 
    name: 'Williams Racing', 
    color: '#00A0DE', 
    secondaryColor: '#00F2FE',
    gradient: 'linear-gradient(135deg, #00A0DE 0%, #041E42 100%)',
    textColor: '#FFFFFF',
    btnTextColor: '#FFFFFF',
    tag: 'WILLIAMS' 
  },
  { 
    id: 'rb', 
    name: 'Visa Cash App RB', 
    color: '#3858EC', 
    secondaryColor: '#FF3B30',
    gradient: 'linear-gradient(135deg, #4E71FF 0%, #10217D 100%)',
    textColor: '#FFFFFF',
    btnTextColor: '#FFFFFF',
    tag: 'VCARB' 
  },
  { 
    id: 'audi', 
    name: 'Audi F1 Team', 
    color: '#C0C6CE', 
    secondaryColor: '#E0001B',
    gradient: 'linear-gradient(135deg, #E6E8EC 0%, #C0C6CE 50%, #7E8590 100%)',
    textColor: '#E0001B',
    btnTextColor: '#0b0f17',
    switchKnobColor: '#000000',
    tag: 'AUDI',
    tagColor: '#E0001B' 
  },
  { 
    id: 'haas', 
    name: 'TGR Haas F1 Team', 
    color: '#FFFFFF', 
    secondaryColor: '#ED1A3B',
    gradient: 'linear-gradient(135deg, #FFFFFF 0%, #FFFFFF 58%, #ED1A3B 82%, #111111 100%)',
    textColor: '#ED1A3B',
    btnTextColor: '#0b0f17',
    switchKnobColor: '#ED1A3B',
    tag: 'HAAS GR',
    tagColor: '#ED1A3B' 
  },
  { 
    id: 'cadillac', 
    name: 'Cadillac Formula 1 Team', 
    color: '#FFFFFF', 
    secondaryColor: '#FFFFFF',
    gradient: 'linear-gradient(135deg, #FFFFFF 0%, #3F3F46 50%, #09090B 100%)',
    textColor: '#000000',
    btnTextColor: '#000000',
    switchKnobColor: '#000000',
    tag: 'CADILLAC',
    tagColor: '#FFFFFF' 
  }
];

@Component({
  selector: 'app-navbar',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  template: `
    <header class="navbar-wrapper">
      <div class="navbar-container">
        <!-- LOGO ESTILIZADO APEXPREDICT -->
        <a routerLink="/" class="brand-logo" (click)="closeMobileNav()">
          <svg class="logo-racing-mark" viewBox="0 0 18 18" width="20" height="20" fill="none" style="margin-right: 3px;">
            <path d="M2 14L8 4H12L6 14H2Z" fill="var(--red)"/>
            <path d="M8 14L14 4H18L12 14H8Z" fill="#ffffff"/>
          </svg>
          <span class="txt-apex">APEX</span> <span class="txt-predict">PREDICT</span>
        </a>

        <!-- NAVEGACIÓN DESKTOP (PANTALLAS GRANDES) -->
        @if (auth.isAuthenticated()) {
          <nav class="nav-links d-none d-lg-flex">
            <a routerLink="/" [class.active]="isCurrent('inicio')">Inicio</a>
            <a routerLink="/dashboard" [queryParams]="{ tab: 'pronostico' }" [class.active]="isCurrent('predicciones')">Predicciones</a>
            <a routerLink="/dashboard" [queryParams]="{ tab: 'ligas' }" [class.active]="isCurrent('ligas')">Mis Ligas</a>
            <a routerLink="/dashboard" [queryParams]="{ tab: 'posiciones' }" [class.active]="isCurrent('posiciones')">Posiciones</a>
            <a routerLink="/dashboard" [queryParams]="{ tab: 'historial' }" [class.active]="isCurrent('historial')">Historial</a>
          </nav>
        }

        <!-- ACCIONES DE SESIÓN / PERFIL -->
        <div class="nav-actions">
          @if (auth.isAuthenticated()) {
            <!-- CONTENEDOR RELATIVO PARA EL DROPDOWN -->
            <div class="profile-dropdown-wrapper">
              <!-- BOTÓN ACTIVADOR (PILL FIJO CON DATOS GUARDADOS Y PREVIEW DE COLOR) -->
              <button 
                type="button" 
                class="profile-trigger-btn" 
                (click)="toggleProfileMenu($event)"
                [style.--team-color]="activeTeam().color"
                aria-label="Abrir opciones de perfil">
                <div class="avatar-circle"
                  [style.background]="activeTeam().gradient || activeTeam().color"
                  [style.color]="activeTeam().textColor || '#ffffff'">
                  {{ savedInitials() }}
                </div>
                <div class="user-meta-column d-none d-sm-flex">
                  <span class="user-name-text" [title]="savedDisplayName()">
                    {{ savedDisplayName() }}
                  </span>
                  <span class="user-pts-text">{{ auth.userPoints() }} PTS</span>
                </div>
                <span class="chevron-icon d-none d-sm-inline">{{ isProfileOpen() ? '▲' : '▼' }}</span>
              </button>

              <!-- MENÚ FLOTANTE DROPDOWN -->
              @if (isProfileOpen()) {
                <div class="profile-dropdown-menu" 
                  (click)="$event.stopPropagation()"
                  [style.--team-color]="activeTeam().color"
                  [style.--team-secondary]="activeTeam().secondaryColor"
                  [style.--team-btn-text]="activeTeam().btnTextColor || activeTeam().textColor || '#ffffff'"
                  [style.--team-switch-knob]="activeTeam().switchKnobColor || '#ffffff'">
                  <!-- ENCABEZADO DEL PERFIL (REFLEJA PREVISUALIZACIÓN DE COLORES DE EQUIPO, PERO NOMBRE GUARDADO) -->
                  <div class="dropdown-header">
                    <div class="avatar-box" 
                      [style.background]="activeTeam().gradient || activeTeam().color"
                      [style.color]="activeTeam().textColor || '#ffffff'">
                      <span>{{ savedInitials() }}</span>
                      <span class="status-indicator-dot"></span>
                    </div>
                    <div class="header-user-info">
                      <h4 class="header-name" [title]="savedDisplayName()">
                        {{ savedDisplayName() }}
                      </h4>
                      <div class="header-badge-row">
                        <span class="team-tag-badge" [style.--team-color]="activeTeam().tagColor || activeTeam().color">
                          {{ activeTeamTag() }}
                        </span>
                      </div>
                    </div>
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
                        [ngModel]="formDisplayName()" 
                        (ngModelChange)="formDisplayName.set($event)"
                        placeholder="Tu nombre en la tabla"
                        maxlength="20" />
                    </div>
                  </div>

                  <!-- CAMPO 2: ESCUDERÍA FAVORITA (CUSTOM DROPDOWN CON ESTILOS DE PICKER F1) -->
                  <div class="form-field-group">
                    <label class="field-label" id="favTeamLabel">ESCUDERÍA FAVORITA</label>
                    <div class="custom-select-container" [class.is-active]="isTeamSelectOpen()">
                      <button 
                        type="button" 
                        class="custom-select-trigger" 
                        [class.is-open]="isTeamSelectOpen()"
                        (click)="toggleTeamSelect($event)"
                        [style.--team-color]="formTeam().color"
                        aria-labelledby="favTeamLabel"
                        aria-haspopup="listbox"
                        [attr.aria-expanded]="isTeamSelectOpen()">
                        <span class="trigger-main">
                          <span class="team-dot" [style.background]="formTeam().gradient || formTeam().color"></span>
                          <span class="trigger-label">{{ formTeam().name }}</span>
                        </span>
                        <div class="trigger-right">
                          <span class="team-tag-pill" [style.--team-color]="formTeam().tagColor || formTeam().color">{{ formTeam().tag }}</span>
                          <span class="chevron-arrow" [class.rotated]="isTeamSelectOpen()">▾</span>
                        </div>
                      </button>

                      @if (isTeamSelectOpen()) {
                        <div class="custom-select-dropdown" role="listbox" (click)="$event.stopPropagation()">
                          @for (team of teams; track team.id) {
                            <button 
                              type="button" 
                              class="custom-select-option" 
                              role="option"
                              [attr.aria-selected]="formTeamId() === team.id"
                              [class.is-selected]="formTeamId() === team.id"
                              [style.--opt-color]="team.tagColor || team.color"
                              (click)="selectTeam(team.id, $event)">
                              <span class="opt-left">
                                <span class="team-dot" [style.background]="team.gradient || team.color"></span>
                                <span class="opt-name">{{ team.name }}</span>
                              </span>
                              <span class="opt-right">
                                <span class="team-tag-pill" [style.--team-color]="team.tagColor || team.color">{{ team.tag }}</span>
                                @if (formTeamId() === team.id) {
                                  <span class="opt-check">✓</span>
                                }
                              </span>
                            </button>
                          }
                        </div>
                      }
                    </div>
                  </div>

                  <!-- CAMPO 3: PILOTO FAVORITO (CUSTOM DROPDOWN CON ESTILOS DE PICKER F1) -->
                  <div class="form-field-group">
                    <label class="field-label" id="favDriverLabel">PILOTO FAVORITO</label>
                    <div class="custom-select-container" [class.is-active]="isDriverSelectOpen()">
                      <button 
                        type="button" 
                        class="custom-select-trigger" 
                        [class.is-open]="isDriverSelectOpen()"
                        (click)="toggleDriverSelect($event)"
                        [style.--team-color]="activeDriver().teamColor"
                        aria-labelledby="favDriverLabel"
                        aria-haspopup="listbox"
                        [attr.aria-expanded]="isDriverSelectOpen()">
                        <span class="trigger-main">
                          <span class="team-dot" [style.background]="activeDriver().teamColor"></span>
                          <span class="trigger-label">{{ activeDriver().name }}</span>
                        </span>
                        <div class="trigger-right">
                          <span class="dtc-code">{{ activeDriver().code }}</span>
                          <span class="dtc-num">#{{ activeDriver().number }}</span>
                          <span class="chevron-arrow" [class.rotated]="isDriverSelectOpen()">▾</span>
                        </div>
                      </button>

                      @if (isDriverSelectOpen()) {
                        <div class="custom-select-dropdown" role="listbox" (click)="$event.stopPropagation()">
                          @for (driver of drivers; track driver.id) {
                            <button 
                              type="button" 
                              class="custom-select-option" 
                              role="option"
                              [attr.aria-selected]="formDriverId() === driver.id"
                              [class.is-selected]="formDriverId() === driver.id"
                              [style.--opt-color]="driver.teamColor"
                              (click)="selectDriver(driver.id, $event)">
                              <span class="opt-left">
                                <span class="team-dot" [style.background]="driver.teamColor"></span>
                                <span class="opt-name">{{ driver.name }}</span>
                              </span>
                              <span class="opt-right">
                                <span class="dtc-code">{{ driver.code }}</span>
                                <span class="dtc-num">#{{ driver.number }}</span>
                                @if (formDriverId() === driver.id) {
                                  <span class="opt-check">✓</span>
                                }
                              </span>
                            </button>
                          }
                        </div>
                      }
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
                        [ngModel]="formNotifications()"
                        (ngModelChange)="formNotifications.set($event)" />
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
                    } @else if (saveStatus() === 'error') {
                      <span>⚠ Guardado sólo local</span>
                    } @else {
                      <span>💾 GUARDAR PERFIL</span>
                    }
                  </button>

                  <!-- FOOTER: CAMBIAR CONTRASEÑA & CERRAR SESIÓN -->
                  <div class="dropdown-footer">
                    <a [href]="changePasswordUrl()" target="_blank" rel="noopener noreferrer" class="link-security" title="Cambiar contraseña">
                      🔒 Cambiar contraseña ↗
                    </a>
                    <button type="button" class="btn-dropdown-logout" (click)="auth.logout()">
                      🚪 Cerrar Sesión
                    </button>
                  </div>
                </div>
              }
            </div>

            <!-- BOTÓN HAMBURGUESA BOOTSTRAP PARA TELÉFONOS MÓVILES -->
            <button 
              type="button" 
              class="navbar-toggler d-flex d-lg-none" 
              [class.active]="isMobileNavOpen()"
              (click)="toggleMobileNav($event)"
              aria-label="Menú de navegación"
              [attr.aria-expanded]="isMobileNavOpen()">
              <span class="navbar-toggler-bar"></span>
              <span class="navbar-toggler-bar"></span>
              <span class="navbar-toggler-bar"></span>
            </button>
          } @else {
            <!-- ACCIONES DE SESIÓN PARA VISITANTES (ARRIBA A LA DERECHA) -->
            <div class="nav-auth-buttons">
              <a routerLink="/login" class="nav-btn-login" id="navLoginBtn">
                Iniciar Sesión
              </a>
              <a routerLink="/register" class="nav-btn-register" id="navRegisterBtn">
                Registrarse
              </a>
            </div>
          }
        </div>
      </div>

      <!-- MENÚ DESPLEGABLE MÓVIL BOOTSTRAP (EN PANTALLAS PEQUEÑAS < 992px) -->
      @if (auth.isAuthenticated() && isMobileNavOpen()) {
        <nav class="mobile-nav-drawer d-lg-none" (click)="$event.stopPropagation()">
          <a routerLink="/" [class.active]="isCurrent('inicio')" (click)="closeMobileNav()" class="mobile-nav-link">
            <span class="nav-icon">🏁</span> Inicio
          </a>
          <a routerLink="/dashboard" [queryParams]="{ tab: 'pronostico' }" [class.active]="isCurrent('predicciones')" (click)="closeMobileNav()" class="mobile-nav-link">
            <span class="nav-icon">🎯</span> Predicciones GP
          </a>
          <a routerLink="/dashboard" [queryParams]="{ tab: 'ligas' }" [class.active]="isCurrent('ligas')" (click)="closeMobileNav()" class="mobile-nav-link">
            <span class="nav-icon">🏆</span> Mis Ligas Privadas
          </a>
          <a routerLink="/dashboard" [queryParams]="{ tab: 'posiciones' }" [class.active]="isCurrent('posiciones')" (click)="closeMobileNav()" class="mobile-nav-link">
            <span class="nav-icon">📊</span> Posiciones & F1 Standings
          </a>
          <a routerLink="/dashboard" [queryParams]="{ tab: 'historial' }" [class.active]="isCurrent('historial')" (click)="closeMobileNav()" class="mobile-nav-link">
            <span class="nav-icon">📜</span> Historial de Pronósticos
          </a>
          <div class="mobile-nav-footer">
            <span class="dim" style="font-size: 0.8rem;">Puntaje acumulado:</span>
            <span class="mobile-pts-badge">{{ auth.userPoints() }} PTS</span>
          </div>
        </nav>
      }
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

    /* ACCIONES DE SESIÓN EN NAVBAR (ARRIBA A LA DERECHA) */
    .nav-actions {
      display: flex;
      align-items: center;
      gap: 0.75rem;
    }
    .nav-auth-buttons {
      display: flex;
      align-items: center;
      gap: 0.65rem;
    }
    .nav-btn-login {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      color: var(--text-main, #f8fafc);
      background: rgba(255, 255, 255, 0.05);
      border: 1px solid rgba(255, 255, 255, 0.16);
      padding: 0.45rem 1rem;
      border-radius: var(--radius-sm);
      font-size: 0.88rem;
      font-weight: 600;
      text-decoration: none;
      transition: all 0.2s cubic-bezier(0.16, 1, 0.3, 1);
    }
    .nav-btn-login:hover {
      background: rgba(255, 255, 255, 0.12);
      border-color: rgba(255, 255, 255, 0.35);
      color: #ffffff;
      transform: translateY(-1px);
    }
    .nav-btn-register {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      background: var(--red);
      color: #ffffff;
      border: 1px solid var(--red-bright);
      padding: 0.45rem 1.15rem;
      border-radius: var(--radius-sm);
      font-size: 0.88rem;
      font-weight: 700;
      text-decoration: none;
      box-shadow: 0 0 14px var(--red-glow);
      transition: all 0.2s cubic-bezier(0.16, 1, 0.3, 1);
    }
    .nav-btn-register:hover {
      background: var(--red-bright);
      box-shadow: 0 0 20px rgba(225, 6, 0, 0.6);
      transform: translateY(-1px);
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
      border: 1px solid color-mix(in srgb, var(--team-color, #ff8000) 35%, rgba(255, 255, 255, 0.12));
      border-radius: 9999px;
      padding: 4px 14px 4px 5px;
      cursor: pointer;
      transition: all 0.25s cubic-bezier(0.16, 1, 0.3, 1);
      color: #ffffff;
      max-width: 220px;
    }
    .profile-trigger-btn:hover {
      background: rgba(30, 36, 52, 0.95);
      border-color: var(--team-color, #ff8000);
      box-shadow: 0 0 16px color-mix(in srgb, var(--team-color, #ff8000) 30%, transparent);
    }
    .avatar-circle {
      width: 32px;
      height: 32px;
      border-radius: 50%;
      background: var(--team-color, #ff8000);
      color: #ffffff;
      font-weight: 900;
      font-size: 0.82rem;
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.4);
      border: 1px solid rgba(255, 255, 255, 0.18);
      letter-spacing: -0.02em;
      transition: background 0.25s ease, color 0.25s ease, border-color 0.25s ease;
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
      border-top: 2px solid var(--team-color, #ff8000);
      border-radius: 14px;
      padding: 1.25rem;
      box-shadow: 0 20px 45px rgba(0, 0, 0, 0.75), 0 0 25px color-mix(in srgb, var(--team-color, #ff8000) 25%, transparent);
      z-index: 1000;
      box-sizing: border-box;
      animation: fadeInDropdown 0.15s ease-out;
      transition: border-top-color 0.25s ease, box-shadow 0.25s ease;
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
      margin-bottom: 1rem;
      padding-bottom: 0.85rem;
      border-bottom: 1px solid rgba(255, 255, 255, 0.08);
    }
    .avatar-box {
      width: 52px;
      height: 52px;
      border-radius: 12px;
      background: var(--team-color, #ff8000);
      color: #ffffff;
      font-size: 1.35rem;
      font-weight: 900;
      display: flex;
      align-items: center;
      justify-content: center;
      position: relative;
      flex-shrink: 0;
      box-shadow: 0 4px 16px rgba(0, 0, 0, 0.5);
      border: 1px solid rgba(255, 255, 255, 0.18);
      letter-spacing: -0.02em;
      transition: background 0.25s ease, color 0.25s ease, box-shadow 0.25s ease;
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
      transition: color 0.25s ease, background 0.25s ease, border-color 0.25s ease;
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

    /* CUSTOM SELECT SYSTEM (COPIADO Y ALINEADO CON DRIVER-PICKER-MODAL) */
    .custom-select-container {
      position: relative;
      width: 100%;
    }
    .custom-select-container.is-active {
      z-index: 100;
    }

    .custom-select-trigger {
      width: 100%;
      background: #090c13;
      border: 1px solid rgba(255, 255, 255, 0.12);
      border-left: 3px solid var(--team-color, #ff8000);
      border-radius: 8px;
      color: #ffffff;
      padding: 0.55rem 0.75rem;
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 0.5rem;
      cursor: pointer;
      box-sizing: border-box;
      outline: none;
      transition: all 0.2s cubic-bezier(0.16, 1, 0.3, 1);
      font-family: inherit;
    }

    .custom-select-trigger:hover,
    .custom-select-trigger.is-open {
      background: #11151f;
      border-color: rgba(255, 255, 255, 0.25);
      border-left-color: var(--team-color, #ff8000);
      box-shadow: 0 4px 14px rgba(0, 0, 0, 0.4), 0 0 10px -2px color-mix(in srgb, var(--team-color, #ff8000) 30%, transparent);
    }

    .trigger-main {
      display: flex;
      align-items: center;
      gap: 0.55rem;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
      min-width: 0;
    }

    .trigger-label {
      font-size: 0.86rem;
      font-weight: 700;
      color: #ffffff;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
      letter-spacing: -0.01em;
    }

    .trigger-right {
      display: flex;
      align-items: center;
      gap: 0.45rem;
      flex-shrink: 0;
    }

    .chevron-arrow {
      font-size: 0.7rem;
      color: #94a3b8;
      transition: transform 0.2s cubic-bezier(0.16, 1, 0.3, 1), color 0.15s;
      display: inline-block;
      margin-left: 2px;
    }

    .chevron-arrow.rotated {
      transform: rotate(180deg);
      color: #ffffff;
    }

    /* DROPDOWN LIST OVERLAY */
    .custom-select-dropdown {
      position: absolute;
      top: calc(100% + 5px);
      left: 0;
      right: 0;
      z-index: 250;
      background: #0d1118;
      border: 1px solid rgba(255, 255, 255, 0.16);
      border-radius: 8px;
      box-shadow: 0 16px 36px rgba(0, 0, 0, 0.95), 0 0 1px 1px rgba(255, 255, 255, 0.08);
      max-height: 230px;
      overflow-y: auto;
      padding: 4px;
      box-sizing: border-box;
      animation: selectDropdownFade 0.15s cubic-bezier(0.16, 1, 0.3, 1);
      scrollbar-width: thin;
      scrollbar-color: rgba(255, 255, 255, 0.22) transparent;
    }

    @keyframes selectDropdownFade {
      from { opacity: 0; transform: translateY(-4px); }
      to { opacity: 1; transform: translateY(0); }
    }

    .custom-select-dropdown::-webkit-scrollbar {
      width: 5px;
    }
    .custom-select-dropdown::-webkit-scrollbar-track {
      background: transparent;
    }
    .custom-select-dropdown::-webkit-scrollbar-thumb {
      background: rgba(255, 255, 255, 0.22);
      border-radius: 9999px;
    }
    .custom-select-dropdown::-webkit-scrollbar-thumb:hover {
      background: rgba(255, 255, 255, 0.38);
    }

    /* DROPDOWN OPTION BUTTON */
    .custom-select-option {
      width: 100%;
      background: transparent;
      border: 1px solid transparent;
      border-left: 3px solid transparent;
      border-radius: 6px;
      color: #e2e8f0;
      padding: 0.5rem 0.65rem;
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 0.5rem;
      cursor: pointer;
      box-sizing: border-box;
      text-align: left;
      font-family: inherit;
      transition: all 0.15s cubic-bezier(0.16, 1, 0.3, 1);
    }

    .custom-select-option:hover {
      background: #151a24;
      border-color: rgba(255, 255, 255, 0.12);
      border-left-color: var(--opt-color, #ff8000);
      color: #ffffff;
      transform: translateX(2px);
    }

    .custom-select-option.is-selected {
      background: rgba(255, 255, 255, 0.07);
      border-color: rgba(255, 255, 255, 0.15);
      border-left: 3px solid var(--opt-color, #ff8000);
      color: #ffffff;
      font-weight: 700;
    }

    .opt-left {
      display: flex;
      align-items: center;
      gap: 0.55rem;
      overflow: hidden;
      min-width: 0;
    }

    .opt-name {
      font-size: 0.83rem;
      font-weight: 600;
      color: inherit;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    .opt-right {
      display: flex;
      align-items: center;
      gap: 0.4rem;
      flex-shrink: 0;
    }

    .opt-check {
      color: #10b981;
      font-weight: 900;
      font-size: 0.82rem;
      margin-left: 2px;
    }

    /* TEAM DOT TOKEN */
    .team-dot {
      width: 8px;
      height: 8px;
      border-radius: 50%;
      flex-shrink: 0;
      box-shadow: 0 0 6px rgba(0, 0, 0, 0.5);
    }

    /* TEAM TAG PILL (MONO) */
    .team-tag-pill {
      font-family: 'JetBrains Mono', monospace;
      font-size: 0.65rem;
      font-weight: 800;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      padding: 2px 5px;
      border-radius: 4px;
      color: var(--team-color, #ff8000);
      background: color-mix(in srgb, var(--team-color, #ff8000) 16%, transparent);
      border: 1px solid color-mix(in srgb, var(--team-color, #ff8000) 35%, transparent);
      line-height: 1.1;
      white-space: nowrap;
    }

    /* DRIVER CODE AND NUMBER BADGES */
    .dtc-code {
      font-family: 'JetBrains Mono', monospace;
      font-size: 0.72rem;
      font-weight: 700;
      color: #94a3b8;
      background: rgba(255, 255, 255, 0.06);
      border: 1px solid rgba(255, 255, 255, 0.08);
      padding: 1px 4px;
      border-radius: 3px;
      line-height: 1.1;
      white-space: nowrap;
    }

    .dtc-num {
      font-family: 'JetBrains Mono', monospace;
      font-size: 0.78rem;
      font-weight: 900;
      color: #ffffff;
      white-space: nowrap;
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
      background-color: #ffffff;
      transition: 0.25s;
      border-radius: 50%;
      box-shadow: 0 2px 4px rgba(0, 0, 0, 0.4);
    }
    input:checked + .toggle-slider {
      background-color: var(--team-color, var(--red));
    }
    input:checked + .toggle-slider:before {
      transform: translateX(20px);
      background-color: var(--team-switch-knob, #ffffff);
    }

    /* SAVE BUTTON */
    .btn-save-profile {
      width: 100%;
      background: var(--team-color, var(--red));
      color: var(--team-btn-text, #ffffff);
      font-size: 0.85rem;
      font-weight: 800;
      letter-spacing: 0.04em;
      text-transform: uppercase;
      border: 1px solid rgba(255, 255, 255, 0.15);
      border-radius: 7px;
      padding: 0.65rem 1rem;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 0.45rem;
      transition: all 0.25s ease;
      box-shadow: 0 4px 14px color-mix(in srgb, var(--team-color, var(--red)) 35%, transparent);
    }
    .btn-save-profile span {
      color: inherit;
    }
    .btn-save-profile:hover:not(:disabled) {
      filter: brightness(1.1);
      transform: translateY(-1px);
      box-shadow: 0 6px 20px color-mix(in srgb, var(--team-color, var(--red)) 50%, transparent);
    }
    .btn-save-profile:disabled {
      opacity: 0.7;
      cursor: not-allowed;
    }
    .spinner-mini {
      display: inline-block;
      width: 14px;
      height: 14px;
      border: 2px solid color-mix(in srgb, var(--team-btn-text, #ffffff) 30%, transparent);
      border-top-color: var(--team-btn-text, #ffffff);
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

    /* HAMBURGUESA BOOTSTRAP PARA TELÉFONOS */
    .navbar-toggler {
      background: rgba(255, 255, 255, 0.05);
      border: 1px solid rgba(255, 255, 255, 0.15);
      border-radius: 8px;
      padding: 8px;
      width: 38px;
      height: 38px;
      flex-direction: column;
      justify-content: center;
      align-items: center;
      gap: 5px;
      cursor: pointer;
      transition: all 0.2s ease;
      margin-left: 0.25rem;
    }
    .navbar-toggler:hover, .navbar-toggler.active {
      background: rgba(225, 6, 0, 0.15);
      border-color: rgba(225, 6, 0, 0.5);
    }
    .navbar-toggler-bar {
      display: block;
      width: 20px;
      height: 2px;
      background-color: #ffffff;
      border-radius: 2px;
      transition: all 0.25s ease;
    }
    .navbar-toggler.active .navbar-toggler-bar:nth-child(1) {
      transform: translateY(7px) rotate(45deg);
    }
    .navbar-toggler.active .navbar-toggler-bar:nth-child(2) {
      opacity: 0;
    }
    .navbar-toggler.active .navbar-toggler-bar:nth-child(3) {
      transform: translateY(-7px) rotate(-45deg);
    }

    /* MOBILE NAVIGATION DRAWER */
    .mobile-nav-drawer {
      display: flex;
      flex-direction: column;
      background: #0d1118;
      border-top: 1px solid var(--line);
      border-bottom: 2px solid var(--red);
      padding: 0.75rem 1rem 1rem;
      gap: 0.35rem;
      animation: fadeInDropdown 0.2s ease-out;
    }
    .mobile-nav-link {
      display: flex;
      align-items: center;
      gap: 0.75rem;
      padding: 0.75rem 1rem;
      border-radius: 8px;
      color: var(--text-muted);
      font-weight: 600;
      font-size: 0.95rem;
      text-decoration: none;
      transition: all 0.15s ease;
    }
    .mobile-nav-link:hover, .mobile-nav-link.active {
      background: rgba(225, 6, 0, 0.12);
      color: #ffffff;
      border-left: 3px solid var(--red);
    }
    .mobile-nav-footer {
      margin-top: 0.5rem;
      padding-top: 0.75rem;
      border-top: 1px solid rgba(255, 255, 255, 0.08);
      display: flex;
      justify-content: space-between;
      align-items: center;
    }
    .mobile-pts-badge {
      font-family: var(--font-mono);
      font-size: 0.75rem;
      color: var(--gold);
      font-weight: 800;
      background: rgba(245, 176, 0, 0.12);
      padding: 4px 8px;
      border-radius: 4px;
      border: 1px solid rgba(245, 176, 0, 0.3);
    }
    .dim {
      color: var(--text-dim, #64748b);
    }

    @media (max-width: 991px) {
      .navbar-wrapper {
        padding: 0.65rem 1rem;
      }
      .profile-dropdown-menu {
        right: 0;
        width: calc(100vw - 1.5rem);
        max-width: 335px;
      }
      .profile-trigger-btn {
        max-width: 170px;
        padding: 3px 8px 3px 4px;
      }
      .user-name-text {
        max-width: 90px;
      }
      .nav-auth-buttons {
        gap: 0.4rem;
      }
      .nav-btn-login, .nav-btn-register {
        padding: 0.4rem 0.75rem;
        font-size: 0.8rem;
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

  // Estado del dropdown del perfil y navegación móvil
  readonly isProfileOpen = signal<boolean>(false);
  readonly isMobileNavOpen = signal<boolean>(false);
  readonly isSaving = signal<boolean>(false);
  readonly saveStatus = signal<'idle' | 'success' | 'error'>('idle');

  // Estado de los dropdowns personalizados dentro del menú
  readonly isTeamSelectOpen = signal<boolean>(false);
  readonly isDriverSelectOpen = signal<boolean>(false);

  // ESTADO GUARDADO (Confirma los valores visibles en navbar y encabezado)
  readonly savedDisplayName = signal<string>(this.auth.username() || 'Piloto');
  readonly savedTeamId = signal<string>('mclaren');
  readonly savedDriverId = signal<string>('norris');
  readonly savedNotifications = signal<boolean>(true);

  // ESTADO BORRADOR / FORMULARIO (Se edita sin afectar el navbar hasta presionar Guardar)
  readonly formDisplayName = signal<string>(this.auth.username() || 'Piloto');
  readonly formTeamId = signal<string>('mclaren');
  readonly formDriverId = signal<string>('norris');
  readonly formNotifications = signal<boolean>(true);

  // Computados para el estado GUARDADO (visible en la píldora superior y badge confirmado)
  readonly savedTeam = computed(() => {
    const tid = this.savedTeamId() === 'sauber' ? 'audi' : this.savedTeamId();
    return this.teams.find((t) => t.id === tid) || this.teams[0];
  });

  readonly savedDriver = computed(() => {
    return this.drivers.find((d) => d.id === this.savedDriverId()) || this.drivers[0];
  });

  readonly savedTeamTag = computed(() => {
    return `${this.savedTeam().tag} #${this.savedDriver().number}`;
  });

  readonly savedInitials = computed(() => {
    const name = this.savedDisplayName() || this.auth.username() || 'AP';
    const parts = name.trim().split(/\s+/);
    if (parts.length >= 2) {
      return (parts[0][0] + parts[1][0]).toUpperCase();
    }
    return name.slice(0, 2).toUpperCase();
  });

  // Computado para el estado BORRADOR (se muestra dentro del select mientras se elige)
  readonly formTeam = computed(() => {
    const tid = this.formTeamId() === 'sauber' ? 'audi' : this.formTeamId();
    return this.teams.find((t) => t.id === tid) || this.teams[0];
  });

  // ESTADO ACTIVO PARA ESTÉTICA VISUAL (Colores y badge):
  // Si el menú está abierto, previsualiza inmediatamente el equipo seleccionado en el formulario.
  // Si el menú se cierra sin guardar, vuelve automáticamente a los colores del equipo guardado.
  readonly activeTeam = computed(() => {
    return this.isProfileOpen() ? this.formTeam() : this.savedTeam();
  });

  readonly activeDriver = computed(() => {
    if (this.isProfileOpen()) {
      return this.drivers.find((d) => d.id === this.formDriverId()) || this.savedDriver();
    }
    return this.savedDriver();
  });

  readonly activeTeamTag = computed(() => {
    return `${this.activeTeam().tag} #${this.activeDriver().number}`;
  });

  readonly changePasswordUrl = computed(() => {
    const base = `${environment.keycloak.url}/realms/${environment.keycloak.realm}/account`;
    const referrer = encodeURIComponent(environment.keycloak.clientId);
    return `${base}/?referrer=${referrer}#/account-security/signing-in`;
  });

  constructor() {
    this.router.events.subscribe((event) => {
      if (event instanceof NavigationEnd) {
        this.currentUrl.set(event.urlAfterRedirects || event.url);
        this.isMobileNavOpen.set(false);
      }
    });

    // Reaccionar automáticamente cuando el usuario inicie sesión o cambie de cuenta
    effect(() => {
      const isAuth = this.auth.authenticated();
      const user = this.auth.username();
      if (isAuth) {
        this.loadProfile();
      } else {
        const defaultName = user || 'Piloto';
        this.savedDisplayName.set(defaultName);
        this.formDisplayName.set(defaultName);
      }
    });

    // Sincronizar dinámicamente variable CSS global en :root para iluminación ambiental
    effect(() => {
      const color = this.activeTeam().color;
      if (typeof document !== 'undefined' && document.documentElement) {
        document.documentElement.style.setProperty('--user-team-color', color);
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
    const target = event.target as HTMLElement | null;
    if (this.isProfileOpen() && !this.elementRef.nativeElement.contains(target)) {
      this.closeProfileMenu();
      return;
    }
    if (this.isMobileNavOpen() && !this.elementRef.nativeElement.contains(target)) {
      this.closeMobileNav();
      return;
    }
    // Si hace click fuera de un custom select abierto, cerrarlo
    if (!target?.closest('.custom-select-container')) {
      this.isTeamSelectOpen.set(false);
      this.isDriverSelectOpen.set(false);
    }
  }

  @HostListener('document:keydown.escape')
  onEscape() {
    if (this.isTeamSelectOpen() || this.isDriverSelectOpen()) {
      this.isTeamSelectOpen.set(false);
      this.isDriverSelectOpen.set(false);
      return;
    }
    if (this.isProfileOpen()) {
      this.closeProfileMenu();
    }
    if (this.isMobileNavOpen()) {
      this.closeMobileNav();
    }
  }

  toggleMobileNav(event: MouseEvent) {
    event.stopPropagation();
    this.isMobileNavOpen.update((v) => !v);
    if (this.isMobileNavOpen()) {
      this.closeProfileMenu();
    }
  }

  closeMobileNav() {
    this.isMobileNavOpen.set(false);
  }

  toggleProfileMenu(event: MouseEvent) {
    event.stopPropagation();
    if (this.isProfileOpen()) {
      this.closeProfileMenu();
    } else {
      this.openProfileMenu();
    }
  }

  openProfileMenu() {
    this.closeMobileNav();
    // Al abrir, sincronizar el borrador con los últimos datos guardados
    this.isTeamSelectOpen.set(false);
    this.isDriverSelectOpen.set(false);
    this.formDisplayName.set(this.savedDisplayName());
    this.formTeamId.set(this.savedTeamId());
    this.formDriverId.set(this.savedDriverId());
    this.formNotifications.set(this.savedNotifications());
    this.saveStatus.set('idle');
    this.isProfileOpen.set(true);
  }

  closeProfileMenu() {
    // Si el usuario cierra el menú sin guardar, vuelve a los colores y datos anteriores
    this.isTeamSelectOpen.set(false);
    this.isDriverSelectOpen.set(false);
    this.formDisplayName.set(this.savedDisplayName());
    this.formTeamId.set(this.savedTeamId());
    this.formDriverId.set(this.savedDriverId());
    this.formNotifications.set(this.savedNotifications());
    this.saveStatus.set('idle');
    this.isProfileOpen.set(false);
  }

  toggleTeamSelect(event: MouseEvent) {
    event.stopPropagation();
    const next = !this.isTeamSelectOpen();
    this.isTeamSelectOpen.set(next);
    if (next) {
      this.isDriverSelectOpen.set(false);
    }
  }

  toggleDriverSelect(event: MouseEvent) {
    event.stopPropagation();
    const next = !this.isDriverSelectOpen();
    this.isDriverSelectOpen.set(next);
    if (next) {
      this.isTeamSelectOpen.set(false);
    }
  }

  selectTeam(teamId: string, event: MouseEvent) {
    event.stopPropagation();
    this.onTeamSelected(teamId);
    this.isTeamSelectOpen.set(false);
  }

  selectDriver(driverId: string, event: MouseEvent) {
    event.stopPropagation();
    this.formDriverId.set(driverId);
    this.isDriverSelectOpen.set(false);
  }

  onTeamSelected(teamId: string) {
    this.formTeamId.set(teamId);
    // Si cambia de escudería en el selector, sugerir el primer piloto de ese equipo
    const teamObj = this.teams.find((t) => t.id === teamId);
    const driverOfTeam = this.drivers.find((d) => {
      if (!teamObj) return false;
      const tid = teamObj.id.toLowerCase();
      const tname = teamObj.name.toLowerCase();
      const dteam = d.team.toLowerCase();
      return dteam.includes(tid) || tname.includes(dteam) || dteam.includes(tname);
    });
    if (driverOfTeam) {
      this.formDriverId.set(driverOfTeam.id);
    }
  }

  loadProfile() {
    const username = this.auth.username();

    // 1. Cargar inmediatamente desde almacenamiento local (cero retraso visual)
    const cached = this.api.getCachedProfile(username);
    if (cached) {
      if (cached.displayName) {
        this.savedDisplayName.set(cached.displayName);
        this.formDisplayName.set(cached.displayName);
      }
      if (cached.favoriteTeamId) {
        const teamId = cached.favoriteTeamId === 'sauber' ? 'audi' : cached.favoriteTeamId;
        this.savedTeamId.set(teamId);
        this.formTeamId.set(teamId);
      }
      if (cached.favoriteDriverId) {
        this.savedDriverId.set(cached.favoriteDriverId);
        this.formDriverId.set(cached.favoriteDriverId);
      }
      if (cached.notificationsEnabled !== undefined) {
        this.savedNotifications.set(cached.notificationsEnabled);
        this.formNotifications.set(cached.notificationsEnabled);
      }
      if (cached.totalScore !== undefined) {
        this.auth.userPoints.set(cached.totalScore);
      }
    } else if (username) {
      this.savedDisplayName.set(username);
      this.formDisplayName.set(username);
    }

    // 2. Sincronizar en segundo plano con el servidor
    this.api.getProfile().subscribe({
      next: (profile) => {
        const name = profile.displayName || this.auth.username() || 'Piloto';
        this.savedDisplayName.set(name);
        this.formDisplayName.set(name);

        if (profile.favoriteTeamId) {
          const teamId = profile.favoriteTeamId === 'sauber' ? 'audi' : profile.favoriteTeamId;
          this.savedTeamId.set(teamId);
          this.formTeamId.set(teamId);
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
        this.api.setCachedProfile(profile, username);
      },
      error: () => {
        if (!cached) {
          const fallback = this.auth.username() || 'Piloto';
          this.savedDisplayName.set(fallback);
          this.formDisplayName.set(fallback);
        }
      }
    });
  }

  saveProfile() {
    const raw = this.formDisplayName() || '';
    const trimmed = raw.trim();
    // Limitar a 20 caracteres y fallback al username si está vacío
    const finalName = trimmed.length > 0 ? trimmed.slice(0, 20) : (this.auth.username() || 'Piloto');
    this.formDisplayName.set(finalName);

    const teamId = this.formTeamId();
    const driverId = this.formDriverId();
    const notifications = this.formNotifications();
    const username = this.auth.username();

    // 1. Actualización optimista inmediata en UI
    this.savedDisplayName.set(finalName);
    this.savedTeamId.set(teamId);
    this.savedDriverId.set(driverId);
    this.savedNotifications.set(notifications);

    // 2. Guardar inmediatamente en localStorage para garantizar persistencia continua
    this.api.setCachedProfile({
      displayName: finalName,
      favoriteTeamId: teamId,
      favoriteDriverId: driverId,
      notificationsEnabled: notifications
    }, username);

    this.isSaving.set(true);
    this.saveStatus.set('idle');

    // 3. Sincronizar con el backend
    this.api.updateProfile({
      displayName: finalName,
      favoriteTeamId: teamId,
      favoriteDriverId: driverId,
      notificationsEnabled: notifications
    }).subscribe({
      next: (profile) => {
        this.isSaving.set(false);
        this.saveStatus.set('success');

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
        this.api.setCachedProfile(profile, username);
        setTimeout(() => this.saveStatus.set('idle'), 2500);
      },
      error: (err) => {
        console.warn('Backend update failed, profile saved in local storage only:', err);
        this.isSaving.set(false);
        this.saveStatus.set('error');
        setTimeout(() => this.saveStatus.set('idle'), 3500);
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
