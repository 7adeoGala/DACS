import { Component, inject, OnInit, signal } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { DatePipe } from '@angular/common';
import { ActivatedRoute } from '@angular/router';
import { switchMap, catchError, of } from 'rxjs';
import { ApiService } from '../../core/services/api.service';
import { 
  League, 
  NextSession, 
  PredictionDetail, 
  LeaderboardEntry, 
  PredictionHistoryItem,
  F1_DRIVERS,
  DriverOption,
  JolpicaDriverStanding,
  JolpicaRaceResult
} from '../../core/models/api.models';

type DashboardTab = 'prediction' | 'leagues' | 'leaderboard' | 'history';

@Component({
  standalone: true,
  selector: 'app-dashboard',
  imports: [ReactiveFormsModule, DatePipe],
  template: `
    <section class="section page">
      <!-- DASHBOARD HEADER -->
      <header class="section-heading" style="margin-bottom: 28px;">
        <div>
          <p class="eyebrow"><span class="red-dot"></span> PADDOCK · APEXPREDICT 2026</p>
          <h1>Centro de Control & Pronósticos</h1>
          <p class="lead" style="margin: 8px 0 0;">
            Cargá tus pronósticos oficiales, gestioná tus ligas privadas y revisá tu historial de puntuación en tiempo real.
          </p>
        </div>
      </header>

      <!-- NAVIGATION TABS -->
      <nav class="dashboard-tabs" aria-label="Secciones del Dashboard">
        <button 
          class="tab-btn" 
          [class.active]="activeTab() === 'prediction'" 
          (click)="setTab('prediction')"
          type="button">
          🏎️ Pronóstico Actual
        </button>
        <button 
          class="tab-btn" 
          [class.active]="activeTab() === 'leagues'" 
          (click)="setTab('leagues')"
          type="button">
          🏆 Mis Ligas & Podios
        </button>
        <button 
          class="tab-btn" 
          [class.active]="activeTab() === 'leaderboard'" 
          (click)="setTab('leaderboard')"
          type="button">
          🌍 Campeonato Global
        </button>
        <button 
          class="tab-btn" 
          [class.active]="activeTab() === 'history'" 
          (click)="setTab('history')"
          type="button">
          📊 Historial & Puntos
        </button>
      </nav>

      @if (loading()) {
        <p role="status" class="empty">Cargando datos del paddock…</p>
      }
      @if (error()) {
        <div class="notice error" role="alert">{{ error() }}</div>
      }

      @if (!loading() && ready()) {
        <!-- ========================================== -->
        <!-- TAB 1: PRONÓSTICO ACTUAL                  -->
        <!-- ========================================== -->
        @if (activeTab() === 'prediction') {
          <article class="prediction-box">
            <div class="box-header">
              <div>
                <span class="round-badge">PRÓXIMO EVENTO EN DISPUTA</span>
                <h2 style="font-size: 28px; margin-top: 10px;">{{ nextSession()?.name || 'Gran Premio de Fórmula 1' }}</h2>
                <p class="eyebrow" style="margin-top: 6px;">
                  Circuito: <strong style="color: #fff;">{{ nextSession()?.circuit || 'Circuito Oficial' }}</strong> · Fecha: {{ nextSession()?.raceDate || 'Próximamente' }}
                </p>
              </div>
              <div class="lock-status">
                @if (isLocked()) {
                  <span class="status-pill locked">🔒 LOCK TIME SUPERADO · PRONÓSTICOS CERRADOS</span>
                } @else {
                  <span class="status-pill open">
                    ⏱️ ABIERTO HASTA {{ nextSession()?.startsAt ? (nextSession()?.startsAt | date: 'dd/MM HH:mm' : '-0300') + ' hs (Arg)' : 'INICIO DE SESIÓN' }}
                  </span>
                }
              </div>
            </div>

            @if (predictionSuccess()) {
              <div class="notice success" role="alert">
                ✓ ¡Pronóstico guardado exitosamente para este Gran Premio!
              </div>
            }
            @if (predictionError()) {
              <div class="notice error" role="alert">{{ predictionError() }}</div>
            }

            <form [formGroup]="predForm" (ngSubmit)="savePrediction()">
              <div class="form-grid">
                
                <!-- 1. PODIO OFICIAL (P1, P2, P3) -->
                <div class="form-card">
                  <h3>🏆 Podio Oficial</h3>
                  <p class="muted" style="margin: 0; font-size: 12px;">
                    1 acierto = <strong>3 pts</strong> · 2 aciertos = <strong>7 pts</strong> · Podio exacto = <strong>10 pts</strong>
                  </p>

                  <div>
                    <label class="field-label" for="p1">🥇 1º Puesto (Ganador)</label>
                    <select id="p1" formControlName="p1" class="driver-select" [attr.disabled]="isLocked() ? true : null">
                      <option value="" disabled>Seleccioná piloto P1</option>
                      @for (driver of drivers; track driver.id) {
                        <option [value]="driver.id">#{{ driver.number }} {{ driver.name }} ({{ driver.team }})</option>
                      }
                    </select>
                  </div>

                  <div>
                    <label class="field-label" for="p2">🥈 2º Puesto</label>
                    <select id="p2" formControlName="p2" class="driver-select" [attr.disabled]="isLocked() ? true : null">
                      <option value="" disabled>Seleccioná piloto P2</option>
                      @for (driver of drivers; track driver.id) {
                        <option [value]="driver.id">#{{ driver.number }} {{ driver.name }} ({{ driver.team }})</option>
                      }
                    </select>
                  </div>

                  <div>
                    <label class="field-label" for="p3">🥉 3º Puesto</label>
                    <select id="p3" formControlName="p3" class="driver-select" [attr.disabled]="isLocked() ? true : null">
                      <option value="" disabled>Seleccioná piloto P3</option>
                      @for (driver of drivers; track driver.id) {
                        <option [value]="driver.id">#{{ driver.number }} {{ driver.name }} ({{ driver.team }})</option>
                      }
                    </select>
                  </div>
                </div>

                <!-- 2. POLE POSITION & DUELO DE PILOTOS -->
                <div class="form-card">
                  <h3>⚡ Pole & Duelo del Fin de Semana</h3>
                  
                  <div>
                    <label class="field-label" for="pole">⚡ Pole Position Oficial (+4 pts)</label>
                    <select id="pole" formControlName="pole" class="driver-select" [attr.disabled]="isLocked() ? true : null">
                      <option value="">Seleccioná piloto en Pole</option>
                      @for (driver of drivers; track driver.id) {
                        <option [value]="driver.id">#{{ driver.number }} {{ driver.name }} ({{ driver.team }})</option>
                      }
                    </select>
                  </div>

                  <div>
                    <label class="field-label">⚔️ Duelo de Pilotos (+3 pts)</label>
                    <p class="muted" style="margin: 2px 0 10px; font-size: 11px;">Elegí cuál de los dos terminará en mejor posición:</p>
                    
                    <div class="duel-grid">
                      <button 
                        type="button" 
                        class="duel-btn"
                        [class.selected]="predForm.get('duel')?.value === nextSession()?.matchupDriver1"
                        [disabled]="isLocked()"
                        (click)="selectDuelDriver(nextSession()?.matchupDriver1)">
                        <span class="duel-tag">PILOTO A</span>
                        <span class="duel-driver-name">{{ formatDriverName(nextSession()?.matchupDriver1) }}</span>
                        @if (predForm.get('duel')?.value === nextSession()?.matchupDriver1) {
                          <span style="color: var(--cyan); font-size: 11px; font-weight: 700;">✓ Seleccionado</span>
                        }
                      </button>

                      <button 
                        type="button" 
                        class="duel-btn"
                        [class.selected]="predForm.get('duel')?.value === nextSession()?.matchupDriver2"
                        [disabled]="isLocked()"
                        (click)="selectDuelDriver(nextSession()?.matchupDriver2)">
                        <span class="duel-tag">PILOTO B</span>
                        <span class="duel-driver-name">{{ formatDriverName(nextSession()?.matchupDriver2) }}</span>
                        @if (predForm.get('duel')?.value === nextSession()?.matchupDriver2) {
                          <span style="color: var(--cyan); font-size: 11px; font-weight: 700;">✓ Seleccionado</span>
                        }
                      </button>
                    </div>
                  </div>
                </div>

                <!-- 3. INCIDENTES DE CARRERA -->
                <div class="form-card">
                  <h3>🚩 Incidentes de Carrera</h3>

                  <div>
                    <label class="field-label" for="safetyCars">🟡 Safety Cars (VSC + SC) (+6 pts)</label>
                    <p class="muted" style="margin: 2px 0 8px; font-size: 11px;">Cantidad exacta de apariciones en carrera:</p>
                    <div class="number-input-wrapper">
                      <input 
                        id="safetyCars" 
                        type="number" 
                        min="0" 
                        max="20" 
                        formControlName="safetyCars" 
                        class="number-input" 
                        [readonly]="isLocked()" />
                    </div>
                  </div>

                  <div>
                    <label class="field-label" for="dnfs">🚩 Abandonos (DNF / DNS) (+6 pts)</label>
                    <p class="muted" style="margin: 2px 0 8px; font-size: 11px;">Autos que no finalizan la carrera:</p>
                    <div class="number-input-wrapper">
                      <input 
                        id="dnfs" 
                        type="number" 
                        min="0" 
                        max="20" 
                        formControlName="dnfs" 
                        class="number-input" 
                        [readonly]="isLocked()" />
                    </div>
                  </div>
                </div>
              </div>

              <div style="margin-top: 32px; display: flex; justify-content: flex-end;">
                <button 
                  class="button" 
                  type="submit" 
                  [disabled]="isLocked() || savingPrediction() || predForm.invalid">
                  {{ isLocked() ? '🔒 Pronósticos Bloqueados (Lock Time)' : (savingPrediction() ? 'Guardando pronóstico…' : '💾 Guardar Pronóstico Oficial') }}
                </button>
              </div>
            </form>
          </article>
        }

        <!-- ========================================== -->
        <!-- TAB 2: MIS LIGAS PRIVADAS & PODIOS        -->
        <!-- ========================================== -->
        @if (activeTab() === 'leagues') {
          <section>
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px; flex-wrap: wrap; gap: 16px;">
              <div>
                <h2>Ligas Privadas & Competencia</h2>
                <p class="muted" style="margin: 4px 0 0;">Competí en ligas privadas protegidas con contraseña o abiertas por link de invitación.</p>
              </div>
              <span class="round-badge">{{ leagues().length }} ligas unidas</span>
            </div>

            <!-- SUB-NAVEGACIÓN INTERNA DE LIGAS -->
            <div class="dashboard-tabs" style="margin-bottom: 24px; border-bottom: 1px solid var(--line); padding-bottom: 8px;">
              <button 
                type="button" 
                class="tab-btn" 
                [class.active]="leaguesSubTab() === 'my-leagues'" 
                (click)="setLeaguesSubTab('my-leagues')">
                🏆 Mis Ligas ({{ leagues().length }})
              </button>
              <button 
                type="button" 
                class="tab-btn" 
                [class.active]="leaguesSubTab() === 'explore'" 
                (click)="setLeaguesSubTab('explore')">
                🔍 Explorar Ligas Privadas
              </button>
              <button 
                type="button" 
                class="tab-btn" 
                [class.active]="leaguesSubTab() === 'create'" 
                (click)="setLeaguesSubTab('create')">
                ➕ Crear Nueva Liga
              </button>
              <button 
                type="button" 
                class="tab-btn" 
                [class.active]="leaguesSubTab() === 'join'" 
                (click)="setLeaguesSubTab('join')">
                🔗 Unirse por Link / Clave
              </button>
            </div>

            @if (joinSuccess()) {
              <div class="notice success" role="alert" style="margin-bottom: 20px;">
                ✓ {{ joinSuccess() }}
              </div>
            }
            @if (createSuccess()) {
              <div class="notice success" role="alert" style="margin-bottom: 20px;">
                ✓ {{ createSuccess() }}
              </div>
            }
            @if (error()) {
              <div class="notice error" role="alert" style="margin-bottom: 20px;">
                ⚠️ {{ error() }}
              </div>
            }

            <!-- --------------------------------------- -->
            <!-- SUB-TAB 1: MIS LIGAS                   -->
            <!-- --------------------------------------- -->
            @if (leaguesSubTab() === 'my-leagues') {
              @if (leagues().length > 0) {
                <div class="league-selector-list" style="margin-bottom: 24px;">
                  @for (l of leagues(); track l.id) {
                    <button 
                      type="button" 
                      class="league-pill"
                      [class.active]="selectedLeague()?.id === l.id"
                      (click)="selectLeague(l)">
                      <span>🏆 {{ l.name }}</span>
                      @if (l.hasPassword) {
                        <span style="font-size: 11px; margin-left: 4px;">🔒</span>
                      }
                    </button>
                  }
                </div>

                @if (selectedLeague()) {
                  <article class="spotlight-card" style="margin-bottom: 36px;">
                    <div style="display: flex; justify-content: space-between; align-items: flex-start; flex-wrap: wrap; gap: 20px;">
                      <div>
                        <div style="display: flex; align-items: center; gap: 8px; flex-wrap: wrap;">
                          <span class="round-badge">CLASIFICACIÓN EN VIVO</span>
                          @if (selectedLeague()?.hasPassword) {
                            <span class="badge" style="background: rgba(245, 176, 0, 0.15); color: var(--gold); border: 1px solid rgba(245, 176, 0, 0.3); font-size: 11px; padding: 2px 8px; border-radius: var(--radius-full);">🔒 Protegida con Contraseña</span>
                          } @else {
                            <span class="badge" style="background: rgba(16, 185, 129, 0.15); color: var(--green); border: 1px solid rgba(16, 185, 129, 0.3); font-size: 11px; padding: 2px 8px; border-radius: var(--radius-full);">🌐 Acceso Libre</span>
                          }
                        </div>
                        <h2 style="font-size: 28px; margin-top: 10px;">{{ selectedLeague()?.name }}</h2>
                        @if (selectedLeague()?.description) {
                          <p class="muted" style="margin: 4px 0 0;">{{ selectedLeague()?.description }}</p>
                        }
                      </div>

                      @if (selectedLeague()?.inviteCode) {
                        <div style="background: rgba(0,0,0,0.4); padding: 16px; border-radius: var(--radius-sm); border: 1px solid var(--line); min-width: 300px;">
                          <span class="eyebrow" style="font-size: 11px; margin-bottom: 8px; color: var(--cyan);">LINK DE INVITACIÓN OFICIAL</span>
                          <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 8px;">
                            <input 
                              type="text" 
                              readonly 
                              [value]="getInviteUrl(selectedLeague()?.inviteCode)" 
                              style="font-size: 12px; font-family: 'JetBrains Mono', monospace; background: rgba(0,0,0,0.5); padding: 6px 10px;" />
                          </div>
                          <div style="display: flex; gap: 8px;">
                            <button class="button small" (click)="copyInviteUrl(selectedLeague()?.inviteCode)">
                              {{ copiedLink() ? '✓ Link Copiado' : '🔗 Copiar Link' }}
                            </button>
                            <button class="button small quiet" (click)="copyInviteCode(selectedLeague()?.inviteCode)">
                              {{ copied() ? '✓ Código Copiado' : '📋 Código' }}
                            </button>
                          </div>
                        </div>
                      }
                    </div>

                    <!-- PODIO TOP 3 DE LA LIGA -->
                    @if (leagueLeaderboard().length >= 3) {
                      <div class="podium-container">
                        <div class="podium-col rank-2">
                          <div class="podium-avatar">🥈</div>
                          <div class="podium-user-name">{{ leagueLeaderboard()[1].displayName }}</div>
                          <div class="podium-points">{{ leagueLeaderboard()[1].totalScore }} pts</div>
                          <div class="podium-pedestal">2</div>
                        </div>

                        <div class="podium-col rank-1">
                          <div style="font-size: 24px; margin-bottom: -10px;">👑</div>
                          <div class="podium-avatar">🥇</div>
                          <div class="podium-user-name">{{ leagueLeaderboard()[0].displayName }}</div>
                          <div class="podium-points" style="color: var(--gold); font-size: 15px;">{{ leagueLeaderboard()[0].totalScore }} pts</div>
                          <div class="podium-pedestal">1</div>
                        </div>

                        <div class="podium-col rank-3">
                          <div class="podium-avatar">🥉</div>
                          <div class="podium-user-name">{{ leagueLeaderboard()[2].displayName }}</div>
                          <div class="podium-points">{{ leagueLeaderboard()[2].totalScore }} pts</div>
                          <div class="podium-pedestal">3</div>
                        </div>
                      </div>
                    }

                    <!-- TABLA DE PARTICIPANTES DE LA LIGA -->
                    <h3 style="margin: 28px 0 16px; font-size: 18px;">Participantes de la Liga ({{ leagueLeaderboard().length }})</h3>
                    @if (leagueLeaderboard().length > 0) {
                      <table class="leaderboard-table">
                        <thead>
                          <tr>
                            <th>Pos</th>
                            <th>Jugador / Escudería</th>
                            <th>Puntos Totales</th>
                            <th>Pronósticos Enviados</th>
                          </tr>
                        </thead>
                        <tbody>
                          @for (entry of leagueLeaderboard(); track entry.userId) {
                            <tr>
                              <td>#{{ entry.rank }}</td>
                              <td><strong style="color: #fff;">{{ entry.displayName }}</strong></td>
                              <td style="font-family: 'JetBrains Mono', monospace; font-weight: 700; color: var(--cyan);">
                                {{ entry.totalScore }} pts
                              </td>
                              <td>{{ entry.predictionsCount }} carreras</td>
                            </tr>
                          }
                        </tbody>
                      </table>
                    } @else {
                      <p class="empty">Aún no hay puntuaciones registradas en esta liga privada.</p>
                    }
                  </article>
                }
              } @else {
                <div class="spotlight-card" style="text-align: center; padding: 48px 24px; margin-bottom: 32px;">
                  <div style="font-size: 44px; margin-bottom: 12px;">🏁</div>
                  <h2>Aún no pertenecés a ninguna liga privada</h2>
                  <p class="lead" style="max-width: 520px; margin: 8px auto 24px;">
                    Explorá ligas existentes, creá tu propia liga privada protegida con contraseña o ingresá con un link de invitación.
                  </p>
                  <div style="display: flex; gap: 12px; justify-content: center; flex-wrap: wrap;">
                    <button class="button" (click)="setLeaguesSubTab('create')">➕ Crear Nueva Liga</button>
                    <button class="button quiet" (click)="setLeaguesSubTab('explore')">🔍 Explorar Ligas Privadas</button>
                  </div>
                </div>
              }

              <!-- FORMULARIOS RÁPIDOS: CREAR Y UNIRSE A LIGA -->
              <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(320px, 1fr)); gap: 24px; margin-top: 24px;">
                <!-- CREAR LIGA -->
                <div class="form-card">
                  <h3>➕ Crear Nueva Liga Privada</h3>
                  <form [formGroup]="createLeagueForm" (ngSubmit)="create()">
                    <label class="field-label" for="league-name-quick">Nombre de la liga *</label>
                    <input 
                      id="league-name-quick" 
                      formControlName="name" 
                      placeholder="Ej: Gran Premio de Amigos" 
                      style="margin: 8px 0 16px;" 
                      required />

                    <label class="field-label" for="league-pwd-quick">🔒 Contraseña de Acceso (opcional)</label>
                    <input 
                      id="league-pwd-quick" 
                      type="password"
                      formControlName="password" 
                      placeholder="Opcional: protejé tu liga con contraseña" 
                      style="margin: 8px 0 16px;" />

                    <button class="button" type="submit" [disabled]="leagueNameControl.invalid || saving()">
                      {{ saving() ? 'Creando liga en base de datos…' : '🏁 Crear Liga' }}
                    </button>
                  </form>
                </div>

                <!-- UNIRSE A LIGA -->
                <div class="form-card">
                  <h3>🔗 Unirse con Código o Link</h3>
                  <label class="field-label" for="invite-input-quick">Link o Código de Invitación</label>
                  <input 
                    id="invite-input-quick" 
                    [formControl]="inviteLinkInput" 
                    placeholder="Ej: https://.../join/345c4e89... o 345c4e89-..." 
                    style="margin: 8px 0 16px;" />

                  <label class="field-label" for="invite-pwd-quick">Contraseña (si la liga la requiere)</label>
                  <input 
                    id="invite-pwd-quick" 
                    type="password"
                    [formControl]="invitePasswordInput" 
                    placeholder="Contraseña de acceso" 
                    style="margin: 8px 0 16px;" />

                  <button class="button quiet" type="button" (click)="joinByInvite()" [disabled]="inviteLinkInput.invalid || joiningInProgress()">
                    🚀 Unirme a la Liga
                  </button>
                </div>
              </div>
            }

            <!-- --------------------------------------- -->
            <!-- SUB-TAB 2: EXPLORAR LIGAS PRIVADAS     -->
            <!-- --------------------------------------- -->
            @if (leaguesSubTab() === 'explore') {
              <div class="form-card" style="margin-bottom: 28px;">
                <h3>🔍 Buscar Ligas Privadas</h3>
                <p class="muted" style="margin: 4px 0 16px;">Buscá ligas por nombre para sumarte a la competencia:</p>
                <div style="display: flex; gap: 12px; flex-wrap: wrap;">
                  <input 
                    type="text" 
                    [formControl]="searchInput" 
                    placeholder="Ej: DACS, Amigos, Scuderia..." 
                    (keyup.enter)="searchPrivateLeagues()"
                    style="flex: 1; min-width: 240px;" />
                  <button class="button" type="button" (click)="searchPrivateLeagues()" [disabled]="searchingLeagues()">
                    {{ searchingLeagues() ? 'Buscando…' : 'Buscar Ligas' }}
                  </button>
                </div>
              </div>

              <!-- MODAL / PROMPT PARA CONTRASEÑA DE LIGA -->
              @if (joiningLeague()) {
                <div class="spotlight-card" style="border: 2px solid var(--gold); margin-bottom: 24px; background: rgba(245, 176, 0, 0.05);">
                  <h3 style="color: var(--gold); margin-top: 0;">🔒 Ingresar Contraseña para: {{ joiningLeague()?.name }}</h3>
                  <p class="muted" style="margin: 4px 0 16px;">Esta liga privada está protegida con contraseña. Ingresá la clave provista por el administrador:</p>
                  
                  <div style="display: flex; gap: 12px; flex-wrap: wrap; align-items: center;">
                    <input 
                      type="password" 
                      [formControl]="promptPasswordControl" 
                      placeholder="Contraseña de la liga" 
                      (keyup.enter)="confirmJoinWithPassword()"
                      style="flex: 1; min-width: 220px;" />
                    <button class="button" (click)="confirmJoinWithPassword()" [disabled]="joiningInProgress()">
                      {{ joiningInProgress() ? 'Verificando…' : 'Confirmar y Unirme' }}
                    </button>
                    <button class="button quiet" (click)="cancelJoinPrompt()">Cancelar</button>
                  </div>
                  @if (joiningError()) {
                    <p class="error-text" style="color: var(--red-bright); margin-top: 10px; font-weight: 600;">⚠️ {{ joiningError() }}</p>
                  }
                </div>
              }

              <!-- LISTADO DE LIGAS ENCONTRADAS -->
              @if (discoveredLeagues().length > 0) {
                <div style="display: grid; grid-template-columns: repeat(auto-fill, minmax(320px, 1fr)); gap: 20px;">
                  @for (l of discoveredLeagues(); track l.id) {
                    <div class="spotlight-card" style="display: flex; flex-direction: column; justify-content: space-between;">
                      <div>
                        <div style="display: flex; justify-content: space-between; align-items: flex-start; gap: 8px;">
                          <h3 style="margin: 0; font-size: 20px;">{{ l.name }}</h3>
                          @if (l.hasPassword) {
                            <span style="font-size: 11px; background: rgba(245, 176, 0, 0.15); color: var(--gold); border: 1px solid rgba(245, 176, 0, 0.3); padding: 2px 6px; border-radius: var(--radius-sm); white-space: nowrap;">
                              🔒 Con Contraseña
                            </span>
                          } @else {
                            <span style="font-size: 11px; background: rgba(16, 185, 129, 0.15); color: var(--green); border: 1px solid rgba(16, 185, 129, 0.3); padding: 2px 6px; border-radius: var(--radius-sm); white-space: nowrap;">
                              🌐 Acceso Libre
                            </span>
                          }
                        </div>
                        @if (l.description) {
                          <p class="muted" style="margin: 8px 0; font-size: 14px;">{{ l.description }}</p>
                        }
                        <div style="font-size: 13px; color: var(--text-dim); margin-top: 12px; display: flex; flex-direction: column; gap: 4px;">
                          <span>👤 Creador: <strong style="color: var(--text-main);">{{ l.ownerName || 'Oficial' }}</strong></span>
                          <span>👥 Participantes: <strong style="color: var(--cyan);">{{ l.memberCount || 1 }} corredores</strong></span>
                        </div>
                      </div>

                      <div style="margin-top: 20px; padding-top: 16px; border-top: 1px solid var(--line);">
                        @if (isUserMemberOf(l.id)) {
                          <span class="badge" style="background: rgba(16, 185, 129, 0.2); color: var(--green); font-weight: 600; padding: 6px 12px; border-radius: var(--radius-sm); display: inline-block;">
                            ✓ Ya eres miembro
                          </span>
                        } @else {
                          <button class="button small" (click)="promptJoin(l)" style="width: 100%;">
                            {{ l.hasPassword ? '🔒 Unirse con Contraseña' : 'Unirse a la Liga' }}
                          </button>
                        }
                      </div>
                    </div>
                  }
                </div>
              } @else {
                <div class="spotlight-card" style="text-align: center; padding: 36px 20px;">
                  <p class="lead" style="margin: 0;">No se encontraron ligas con ese criterio de búsqueda.</p>
                  <button class="button quiet" (click)="searchPrivateLeagues('')" style="margin-top: 12px;">Ver todas las ligas</button>
                </div>
              }
            }

            <!-- --------------------------------------- -->
            <!-- SUB-TAB 3: CREAR NUEVA LIGA CON CLAVE  -->
            <!-- --------------------------------------- -->
            @if (leaguesSubTab() === 'create') {
              <div class="form-card" style="max-width: 640px; margin: 0 auto;">
                <div style="margin-bottom: 20px;">
                  <span class="round-badge">CREAR LIGA OFICIAL</span>
                  <h3 style="font-size: 24px; margin-top: 8px;">➕ Crear Nueva Liga Privada</h3>
                  <p class="muted" style="margin: 4px 0 0;">Configurá el nombre, la descripción y una contraseña de seguridad para tu liga:</p>
                </div>

                <form [formGroup]="createLeagueForm" (ngSubmit)="create()">
                  <div style="margin-bottom: 16px;">
                    <label class="field-label" for="league-name-input">Nombre de la liga *</label>
                    <input 
                      id="league-name-input" 
                      formControlName="name" 
                      placeholder="Ej: Apex Champions League 2026" 
                      style="margin-top: 6px; width: 100%;" 
                      required />
                    @if (leagueNameControl.touched && leagueNameControl.invalid) {
                      <span class="error-text" style="color: var(--red-bright); font-size: 12px; margin-top: 4px; display: block;">El nombre es obligatorio (hasta 100 caracteres).</span>
                    }
                  </div>

                  <div style="margin-bottom: 16px;">
                    <label class="field-label" for="league-desc-input">Descripción (opcional)</label>
                    <input 
                      id="league-desc-input" 
                      formControlName="desc" 
                      placeholder="Ej: Torneo privado de amigos de la oficina" 
                      style="margin-top: 6px; width: 100%;" />
                  </div>

                  <div style="margin-bottom: 24px;">
                    <label class="field-label" for="league-password-input">
                      🔒 Contraseña de Acceso (opcional)
                    </label>
                    <input 
                      id="league-password-input" 
                      type="password" 
                      formControlName="password" 
                      placeholder="Establecé una clave para proteger el ingreso (ej: f1argentina)" 
                      style="margin-top: 6px; width: 100%;" />
                    <span class="muted" style="font-size: 12px; display: block; margin-top: 4px;">
                      Si definís una contraseña, solo quienes conozcan la clave podrán unirse a tu liga.
                    </span>
                  </div>

                  <button class="button" type="submit" [disabled]="createLeagueForm.invalid || saving()" style="width: 100%; padding: 14px;">
                    {{ saving() ? 'Guardando liga en base de datos…' : '🏁 Crear Liga y Persistir en Base de Datos' }}
                  </button>
                </form>
              </div>
            }

            <!-- --------------------------------------- -->
            <!-- SUB-TAB 4: UNIRSE POR LINK O CLAVE     -->
            <!-- --------------------------------------- -->
            @if (leaguesSubTab() === 'join') {
              <div class="form-card" style="max-width: 640px; margin: 0 auto;">
                <div style="margin-bottom: 20px;">
                  <span class="round-badge">ACCESO A LIGA PRIVADA</span>
                  <h3 style="font-size: 24px; margin-top: 8px;">🔗 Unirse por Link de Invitación o Código</h3>
                  <p class="muted" style="margin: 4px 0 0;">Pegá el link completo o el código de invitación que te compartió el administrador:</p>
                </div>

                <div style="margin-bottom: 16px;">
                  <label class="field-label" for="invite-url-input">Link completo o Código UUID *</label>
                  <input 
                    id="invite-url-input" 
                    [formControl]="inviteLinkInput" 
                    placeholder="Ej: https://dacs-nine.vercel.app/join/345c4e89... o 345c4e89-506f-4f9d..." 
                    style="margin-top: 6px; width: 100%;" />
                </div>

                <div style="margin-bottom: 24px;">
                  <label class="field-label" for="invite-pwd-input">Contraseña de la Liga (si está protegida)</label>
                  <input 
                    id="invite-pwd-input" 
                    type="password" 
                    [formControl]="invitePasswordInput" 
                    placeholder="Ingresá la clave de acceso si la liga la requiere" 
                    style="margin-top: 6px; width: 100%;" />
                </div>

                <button class="button" type="button" (click)="joinByInvite()" [disabled]="inviteLinkInput.invalid || joiningInProgress()" style="width: 100%; padding: 14px;">
                  {{ joiningInProgress() ? 'Verificando y uniéndote…' : '🚀 Unirme a la Liga' }}
                </button>
              </div>
            }
          </section>
        }

        <!-- ========================================== -->
        <!-- TAB 3: CAMPEONATO GLOBAL & PODIO           -->
        <!-- ========================================== -->
        @if (activeTab() === 'leaderboard') {
          <section>
            <div class="section-heading">
              <div>
                <p class="eyebrow"><span class="red-dot"></span> TEMPORADA 2026</p>
                <h2>Tabla de Posiciones Global</h2>
              </div>
              <span class="muted">{{ leaderboard().length }} competidores activos</span>
            </div>

            <!-- PODIO TOP 3 GLOBAL -->
            @if (leaderboard().length >= 3) {
              <div class="podium-container">
                <!-- 2ND PLACE -->
                <div class="podium-col rank-2">
                  <div class="podium-avatar">🥈</div>
                  <div class="podium-user-name">{{ leaderboard()[1].displayName }}</div>
                  <div class="podium-points">{{ leaderboard()[1].totalScore }} pts</div>
                  <div class="podium-pedestal">2</div>
                </div>

                <!-- 1ST PLACE -->
                <div class="podium-col rank-1">
                  <div style="font-size: 24px; margin-bottom: -10px;">👑</div>
                  <div class="podium-avatar">🥇</div>
                  <div class="podium-user-name">{{ leaderboard()[0].displayName }}</div>
                  <div class="podium-points" style="color: var(--gold); font-size: 15px;">{{ leaderboard()[0].totalScore }} pts</div>
                  <div class="podium-pedestal">1</div>
                </div>

                <!-- 3RD PLACE -->
                <div class="podium-col rank-3">
                  <div class="podium-avatar">🥉</div>
                  <div class="podium-user-name">{{ leaderboard()[2].displayName }}</div>
                  <div class="podium-points">{{ leaderboard()[2].totalScore }} pts</div>
                  <div class="podium-pedestal">3</div>
                </div>
              </div>
            }

            <!-- TABLA COMPLETA -->
            @if (leaderboard().length > 0) {
              <table class="leaderboard-table">
                <thead>
                  <tr>
                    <th>Posición</th>
                    <th>Jugador / Piloto</th>
                    <th>Puntaje Acumulado</th>
                    <th>Pronósticos Realizados</th>
                  </tr>
                </thead>
                <tbody>
                  @for (entry of leaderboard(); track entry.userId) {
                    <tr>
                      <td>#{{ entry.rank }}</td>
                      <td><strong style="color: #fff;">{{ entry.displayName }}</strong></td>
                      <td style="font-family: 'JetBrains Mono', monospace; font-weight: 700; color: var(--cyan);">
                        {{ entry.totalScore }} pts
                      </td>
                      <td>{{ entry.predictionsCount }} carreras</td>
                    </tr>
                  }
                </tbody>
              </table>
            } @else {
              <p class="empty">Aún no hay puntuaciones registradas en el campeonato global.</p>
            }

            <!-- CAMPEONATO MUNDIAL DE PILOTOS F1 2026 (JOLPICA API) -->
            <div class="section-heading" style="margin-top: 48px;">
              <div>
                <p class="eyebrow"><span class="red-dot"></span> OFICIAL F1 · JOLPICA ERGAST API</p>
                <h2>Mundial de Pilotos 2026</h2>
              </div>
              <span class="muted">{{ f1Standings().length }} pilotos oficiales</span>
            </div>

            @if (f1Standings().length > 0) {
              <table class="leaderboard-table">
                <thead>
                  <tr>
                    <th>Posición</th>
                    <th>Piloto</th>
                    <th>Escudería</th>
                    <th>Puntos</th>
                    <th>Victorias</th>
                  </tr>
                </thead>
                <tbody>
                  @for (d of f1Standings(); track d.driverId) {
                    <tr>
                      <td>#{{ d.position }}</td>
                      <td>
                        <strong style="color: #fff;">{{ d.name }}</strong>
                        <span class="muted" style="margin-left: 6px; font-size: 11px;">{{ d.code }}</span>
                      </td>
                      <td>{{ d.team }}</td>
                      <td style="font-family: 'JetBrains Mono', monospace; font-weight: 700; color: var(--cyan);">
                        {{ d.points }} pts
                      </td>
                      <td>{{ d.wins }} 🏆</td>
                    </tr>
                  }
                </tbody>
              </table>
            }
          </section>
        }

        <!-- ========================================== -->
        <!-- TAB 4: HISTORIAL & DESGLOSE DE PUNTOS      -->
        <!-- ========================================== -->
        @if (activeTab() === 'history') {
          <section>
            <div class="section-heading">
              <div>
                <p class="eyebrow"><span class="red-dot"></span> REGISTRO OFICIAL</p>
                <h2>Historial de Pronósticos & Puntuaciones</h2>
              </div>
              <span class="muted">{{ history().length }} carreras disputadas</span>
            </div>

            @if (history().length > 0) {
              <div class="history-grid">
                @for (item of history(); track item.predictionId || item.sessionId) {
                  <article class="history-card">
                    <div class="history-card-header">
                      <div>
                        <span class="round-badge">{{ item.circuit }}</span>
                        <h3 style="font-size: 22px; margin-top: 6px;">{{ item.sessionName }}</h3>
                        <p class="muted" style="margin: 4px 0 0;">
                          Fecha de carrera: {{ item.raceDate || (item.startsAt | date: 'dd/MM/yyyy' : '-0300') }}
                        </p>
                      </div>

                      <div style="display: flex; align-items: center; gap: 12px;">
                        @if (item.score !== null) {
                          <div class="score-badge scored">
                            <span>🏆 +{{ item.score }} PTS</span>
                          </div>
                        } @else {
                          <div class="score-badge pending">
                            <span>⏱️ PENDIENTE DE RESULTADOS</span>
                          </div>
                        }
                      </div>
                    </div>

                    <!-- DESGLOSE POR TIPO DE PREDICCIÓN -->
                    <div class="breakdown-grid">
                      <!-- 1. PODIO -->
                      <div class="breakdown-box">
                        <span class="cat-title">🏆 Podio Seleccionado</span>
                        <div class="cat-picks">
                          1º {{ formatDriverName(item.podium[0]) }}<br />
                          2º {{ formatDriverName(item.podium[1]) }}<br />
                          3º {{ formatDriverName(item.podium[2]) }}
                        </div>
                        @if (item.scoreBreakdown) {
                          <span class="cat-score" [class.hit]="item.scoreBreakdown.podiumPoints > 0" [class.miss]="item.scoreBreakdown.podiumPoints === 0">
                            {{ item.scoreBreakdown.podiumHits }} aciertos · +{{ item.scoreBreakdown.podiumPoints }} pts
                          </span>
                        } @else {
                          <span class="cat-score miss">Regla: 3, 7 o 10 pts</span>
                        }
                      </div>

                      <!-- 2. POLE POSITION -->
                      <div class="breakdown-box">
                        <span class="cat-title">⚡ Pole Position</span>
                        <div class="cat-picks">
                          {{ item.polePositionDriverId ? formatDriverName(item.polePositionDriverId) : 'Sin selección' }}
                        </div>
                        @if (item.scoreBreakdown) {
                          <span class="cat-score" [class.hit]="item.scoreBreakdown.poleHit" [class.miss]="!item.scoreBreakdown.poleHit">
                            {{ item.scoreBreakdown.poleHit ? '✓ Acertó · +4 pts' : '✗ No acertó · 0 pts' }}
                          </span>
                        } @else {
                          <span class="cat-score miss">Premio: 4 pts</span>
                        }
                      </div>

                      <!-- 3. DUELO DE PILOTOS -->
                      <div class="breakdown-box">
                        <span class="cat-title">⚔️ Duelo de Pilotos</span>
                        <div class="cat-picks">
                          Elegido: <strong>{{ item.duelDriverPick ? formatDriverName(item.duelDriverPick) : 'Sin pick' }}</strong>
                        </div>
                        @if (item.scoreBreakdown) {
                          <span class="cat-score" [class.hit]="item.scoreBreakdown.duelHit" [class.miss]="!item.scoreBreakdown.duelHit">
                            {{ item.scoreBreakdown.duelHit ? '✓ Acertó · +3 pts' : '✗ No acertó · 0 pts' }}
                          </span>
                        } @else {
                          <span class="cat-score miss">Premio: 3 pts</span>
                        }
                      </div>

                      <!-- 4. SAFETY CARS -->
                      <div class="breakdown-box">
                        <span class="cat-title">🟡 Safety Cars</span>
                        <div class="cat-picks">
                          Estimados: <strong>{{ item.safetyCarCount ?? 0 }}</strong>
                        </div>
                        @if (item.scoreBreakdown) {
                          <span class="cat-score" [class.hit]="item.scoreBreakdown.safetyCarHit" [class.miss]="!item.scoreBreakdown.safetyCarHit">
                            {{ item.scoreBreakdown.safetyCarHit ? '✓ Exacto · +6 pts' : '✗ Falló · 0 pts' }}
                          </span>
                        } @else {
                          <span class="cat-score miss">Premio: 6 pts</span>
                        }
                      </div>

                      <!-- 5. ABANDONOS (DNF) -->
                      <div class="breakdown-box">
                        <span class="cat-title">🚩 Abandonos (DNF)</span>
                        <div class="cat-picks">
                          Estimados: <strong>{{ item.dnfCount ?? 0 }}</strong>
                        </div>
                        @if (item.scoreBreakdown) {
                          <span class="cat-score" [class.hit]="item.scoreBreakdown.dnfHit" [class.miss]="!item.scoreBreakdown.dnfHit">
                            {{ item.scoreBreakdown.dnfHit ? '✓ Exacto · +6 pts' : '✗ Falló · 0 pts' }}
                          </span>
                        } @else {
                          <span class="cat-score miss">Premio: 6 pts</span>
                        }
                      </div>
                    </div>
                  </article>
                }
              </div>
              <!-- HISTORIAL OFICIAL DE ÚLTIMA CARRERA (JOLPICA API) -->
              <div class="spotlight-card" style="margin-bottom: 28px;">
                <span class="round-badge">RESULTADOS OFICIALES · JOLPICA API</span>
                <h3 style="font-size: 24px; margin-top: 8px;">{{ lastRaceInfo()?.raceName || 'Gran Premio de Singapur (Ronda 17)' }}</h3>
                <p class="eyebrow" style="margin-top: 4px; color: var(--cyan);">
                  Circuito: {{ lastRaceInfo()?.circuit || 'Marina Bay Street Circuit' }} · Fecha: {{ lastRaceInfo()?.date || '2026-10-04' }}
                </p>

                @if (lastRaceInfo()?.results && lastRaceInfo()!.results.length >= 3) {
                  <div style="margin-top: 20px; display: grid; grid-template-columns: repeat(auto-fit, minmax(240px, 1fr)); gap: 16px;">
                    <div style="background: rgba(255,255,255,0.03); border: 1px solid var(--line); border-radius: var(--radius-sm); padding: 16px;">
                      <span style="font-size: 24px;">🥇 1º Puesto</span>
                      <div style="font-size: 18px; font-weight: 700; color: #fff; margin-top: 4px;">{{ lastRaceInfo()!.results[0].driverName }}</div>
                      <div class="muted" style="font-size: 12px;">{{ lastRaceInfo()!.results[0].team }} · +{{ lastRaceInfo()!.results[0].points }} pts</div>
                    </div>
                    <div style="background: rgba(255,255,255,0.03); border: 1px solid var(--line); border-radius: var(--radius-sm); padding: 16px;">
                      <span style="font-size: 24px;">🥈 2º Puesto</span>
                      <div style="font-size: 18px; font-weight: 700; color: #fff; margin-top: 4px;">{{ lastRaceInfo()!.results[1].driverName }}</div>
                      <div class="muted" style="font-size: 12px;">{{ lastRaceInfo()!.results[1].team }} · +{{ lastRaceInfo()!.results[1].points }} pts</div>
                    </div>
                    <div style="background: rgba(255,255,255,0.03); border: 1px solid var(--line); border-radius: var(--radius-sm); padding: 16px;">
                      <span style="font-size: 24px;">🥉 3º Puesto</span>
                      <div style="font-size: 18px; font-weight: 700; color: #fff; margin-top: 4px;">{{ lastRaceInfo()!.results[2].driverName }}</div>
                      <div class="muted" style="font-size: 12px;">{{ lastRaceInfo()!.results[2].team }} · +{{ lastRaceInfo()!.results[2].points }} pts</div>
                    </div>
                  </div>
                }
              </div>

              <div class="spotlight-card" style="text-align: center; padding: 48px 24px;">
                <div style="font-size: 40px; margin-bottom: 12px;">📊</div>
                <h2>Tus pronósticos para el próximo GP</h2>
                <p class="lead" style="max-width: 480px; margin: 8px auto 20px;">
                  El desglose de aciertos y puntuación obtenida se computará automáticamente al concluir la carrera del domingo.
                </p>
                <button class="button" (click)="setTab('prediction')">Ver mi pronóstico actual</button>
              </div>
            }
          </section>
        }
      }
    </section>
  `,
})
export class DashboardComponent implements OnInit {
  private readonly api = inject(ApiService);
  private readonly route = inject(ActivatedRoute);

  readonly drivers: DriverOption[] = F1_DRIVERS;
  readonly activeTab = signal<DashboardTab>('prediction');

  // Sub-navegación dentro de Ligas
  readonly leaguesSubTab = signal<'my-leagues' | 'explore' | 'create' | 'join'>('my-leagues');

  // Exploración y búsqueda de ligas privadas
  readonly searchInput = new FormControl('');
  readonly discoveredLeagues = signal<League[]>([]);
  readonly searchingLeagues = signal(false);
  readonly searchError = signal('');

  // Unirse con modal de contraseña
  readonly joiningLeague = signal<League | null>(null);
  readonly promptPasswordControl = new FormControl('');
  readonly joiningError = signal('');
  readonly joiningInProgress = signal(false);

  // Formulario Crear Liga con Contraseña
  readonly leagueNameControl = new FormControl('', {
    nonNullable: true,
    validators: [Validators.required, Validators.maxLength(100), Validators.pattern(/\S/)],
  });
  readonly leagueDescControl = new FormControl('', { nonNullable: true, validators: [Validators.maxLength(255)] });
  readonly leaguePasswordControl = new FormControl('', { nonNullable: true, validators: [Validators.maxLength(100)] });
  readonly createLeagueForm = new FormGroup({
    name: this.leagueNameControl,
    desc: this.leagueDescControl,
    password: this.leaguePasswordControl,
  });

  // Formulario Unirse por Link o Clave
  readonly inviteLinkInput = new FormControl('', { nonNullable: true, validators: [Validators.required] });
  readonly invitePasswordInput = new FormControl('', { nonNullable: true });

  // Mensajes de éxito y estado
  readonly joinSuccess = signal('');
  readonly createSuccess = signal('');
  readonly copiedLink = signal(false);
  readonly copied = signal(false);

  // Formulario de predicciones
  readonly predForm = new FormGroup({
    p1: new FormControl('', [Validators.required]),
    p2: new FormControl('', [Validators.required]),
    p3: new FormControl('', [Validators.required]),
    pole: new FormControl(''),
    duel: new FormControl(''),
    safetyCars: new FormControl(0, [Validators.min(0)]),
    dnfs: new FormControl(0, [Validators.min(0)]),
  });

  readonly leagues = signal<League[]>([]);
  readonly selectedLeague = signal<League | null>(null);
  readonly leagueLeaderboard = signal<LeaderboardEntry[]>([]);
  readonly leaderboard = signal<LeaderboardEntry[]>([]);
  readonly f1Standings = signal<JolpicaDriverStanding[]>([]);
  readonly lastRaceInfo = signal<{ raceName: string; round: number; circuit: string; date: string; results: JolpicaRaceResult[] } | null>(null);
  readonly history = signal<PredictionHistoryItem[]>([]);

  readonly nextSession = signal<NextSession | null>(null);
  readonly currentPrediction = signal<PredictionDetail | null>(null);

  readonly isLocked = signal(false);
  readonly loading = signal(true);
  readonly saving = signal(false);
  readonly savingPrediction = signal(false);
  readonly ready = signal(false);

  readonly error = signal('');
  readonly predictionError = signal('');
  readonly predictionSuccess = signal(false);

  ngOnInit() {
    this.loadDashboardData();

    // Si el usuario ingresó por un link directo de invitación (/join/:inviteCode)
    const inviteParam = this.route.snapshot.paramMap.get('inviteCode');
    if (inviteParam) {
      this.activeTab.set('leagues');
      this.leaguesSubTab.set('join');
      this.inviteLinkInput.setValue(inviteParam);
    }

    // Cargar perfil y ligas del usuario desde el backend
    this.api
      .profile()
      .pipe(
        switchMap(() => this.api.leagues()),
        catchError(() => {
          return this.api.leagues().pipe(catchError(() => of([])));
        })
      )
      .subscribe({
        next: (leagues) => {
          this.leagues.set(leagues);
          if (leagues.length > 0 && !this.selectedLeague()) {
            this.selectLeague(leagues[0]);
          }
        },
        error: () => {},
      });
  }

  setTab(tab: DashboardTab) {
    this.activeTab.set(tab);
    if (tab === 'history') {
      this.loadHistory();
    }
    if (tab === 'leaderboard') {
      this.api.globalLeaderboard().subscribe({
        next: (lb) => this.leaderboard.set(lb),
        error: () => {}
      });
    }
  }

  setLeaguesSubTab(subTab: 'my-leagues' | 'explore' | 'create' | 'join') {
    this.leaguesSubTab.set(subTab);
    this.error.set('');
    this.joinSuccess.set('');
    this.createSuccess.set('');
    if (subTab === 'explore' && this.discoveredLeagues().length === 0) {
      this.searchPrivateLeagues('');
    }
  }

  selectLeague(league: League) {
    this.selectedLeague.set(league);
    this.api.leagueLeaderboard(league.id).subscribe({
      next: (lb) => this.leagueLeaderboard.set(lb),
      error: () => this.leagueLeaderboard.set([]),
    });
  }

  isUserMemberOf(leagueId: string): boolean {
    return this.leagues().some(l => l.id === leagueId);
  }

  getInviteUrl(code?: string): string {
    return code ? `${window.location.origin}/join/${code}` : '';
  }

  copyInviteUrl(code?: string) {
    if (!code) return;
    navigator.clipboard.writeText(this.getInviteUrl(code)).then(() => {
      this.copiedLink.set(true);
      setTimeout(() => this.copiedLink.set(false), 2000);
    });
  }

  copyInviteCode(code?: string) {
    if (!code) return;
    navigator.clipboard.writeText(code).then(() => {
      this.copied.set(true);
      setTimeout(() => this.copied.set(false), 2000);
    });
  }

  searchPrivateLeagues(query?: string) {
    this.searchingLeagues.set(true);
    this.searchError.set('');
    const term = query !== undefined ? query : this.searchInput.value?.trim();
    this.api.searchLeagues(term).subscribe({
      next: (list) => {
        this.discoveredLeagues.set(list);
        this.searchingLeagues.set(false);
      },
      error: () => {
        this.discoveredLeagues.set([]);
        this.searchingLeagues.set(false);
        this.searchError.set('No se pudieron buscar las ligas. Intente nuevamente.');
      }
    });
  }

  promptJoin(league: League) {
    if (!league.hasPassword) {
      this.joinDirect(league);
      return;
    }
    this.joiningLeague.set(league);
    this.promptPasswordControl.reset();
    this.joiningError.set('');
  }

  cancelJoinPrompt() {
    this.joiningLeague.set(null);
    this.promptPasswordControl.reset();
    this.joiningError.set('');
  }

  confirmJoinWithPassword() {
    const league = this.joiningLeague();
    if (!league) return;
    this.joiningInProgress.set(true);
    this.joiningError.set('');

    const pwd = this.promptPasswordControl.value?.trim() || '';
    this.api.joinLeagueById(league.id, pwd).subscribe({
      next: (updatedLeague) => {
        this.joiningInProgress.set(false);
        this.joiningLeague.set(null);
        this.refreshUserLeagues(updatedLeague.id);
        this.joinSuccess.set(`¡Te uniste con éxito a la liga "${updatedLeague.name}"!`);
        this.leaguesSubTab.set('my-leagues');
        setTimeout(() => this.joinSuccess.set(''), 5000);
      },
      error: (err) => {
        this.joiningInProgress.set(false);
        this.joiningError.set(err.error?.message || err.error?.description || 'Contraseña incorrecta o error al unirse.');
      }
    });
  }

  private joinDirect(league: League) {
    this.api.joinLeagueById(league.id).subscribe({
      next: (updatedLeague) => {
        this.refreshUserLeagues(updatedLeague.id);
        this.joinSuccess.set(`¡Te uniste con éxito a la liga "${updatedLeague.name}"!`);
        this.leaguesSubTab.set('my-leagues');
        setTimeout(() => this.joinSuccess.set(''), 5000);
      },
      error: (err) => {
        this.error.set(err.error?.message || err.error?.description || 'No pudiste unirte a la liga.');
      }
    });
  }

  joinByInvite() {
    let raw = this.inviteLinkInput.value?.trim() || '';
    if (!raw) return;

    // Acepta URLs completas (ej: https://.../join/UUID) o el UUID directamente
    if (raw.includes('/join/')) {
      raw = raw.substring(raw.lastIndexOf('/join/') + 6);
    }
    if (raw.includes('/')) {
      raw = raw.substring(raw.lastIndexOf('/') + 1);
    }
    const inviteCode = raw.trim();

    this.joiningInProgress.set(true);
    this.error.set('');

    const pwd = this.invitePasswordInput.value?.trim() || undefined;

    this.api.joinLeague(inviteCode, pwd).subscribe({
      next: (league) => {
        this.joiningInProgress.set(false);
        this.refreshUserLeagues(league.id);
        this.inviteLinkInput.reset();
        this.invitePasswordInput.reset();
        this.joinSuccess.set(`¡Te uniste con éxito a la liga "${league.name}"!`);
        this.leaguesSubTab.set('my-leagues');
        setTimeout(() => this.joinSuccess.set(''), 5000);
      },
      error: (err) => {
        this.joiningInProgress.set(false);
        this.error.set(err.error?.message || err.error?.description || 'Código o link de invitación no válido o contraseña incorrecta.');
      }
    });
  }

  create() {
    if (this.leagueNameControl.invalid || this.saving()) return;
    this.saving.set(true);
    this.error.set('');
    this.createSuccess.set('');

    const name = this.leagueNameControl.value.trim();
    const desc = this.leagueDescControl.value.trim() || undefined;
    const pwd = this.leaguePasswordControl.value.trim() || undefined;

    const call$ = (desc || pwd) ? this.api.createLeague(name, desc, pwd) : this.api.createLeague(name);
    call$.subscribe({
      next: (league) => {
        this.leagues.update((prev) => [league, ...prev]);
        this.selectLeague(league);
        this.createLeagueForm.reset();
        this.saving.set(false);
        this.createSuccess.set(`¡Liga "${league.name}" creada y guardada con éxito en la base de datos!`);
        this.leaguesSubTab.set('my-leagues');
        setTimeout(() => this.createSuccess.set(''), 5000);
      },
      error: (err) => {
        this.saving.set(false);
        this.error.set(err.error?.message || err.error?.description || 'No pudimos crear la liga en la base de datos. Intente nuevamente.');
      },
    });
  }

  private refreshUserLeagues(selectLeagueId?: string) {
    this.api.leagues().subscribe({
      next: (list) => {
        this.leagues.set(list);
        if (selectLeagueId) {
          const found = list.find(l => l.id === selectLeagueId);
          if (found) this.selectLeague(found);
        } else if (list.length > 0 && !this.selectedLeague()) {
          this.selectLeague(list[0]);
        }
      }
    });
  }

  selectDuelDriver(driverId?: string | null) {
    if (this.isLocked() || !driverId) return;
    this.predForm.patchValue({ duel: driverId });
  }

  formatDriverName(driverId?: string | null): string {
    if (!driverId) return 'Piloto';
    const found = this.drivers.find(d => d.id.toLowerCase() === driverId.toLowerCase());
    return found ? found.name : driverId.charAt(0).toUpperCase() + driverId.slice(1);
  }

  private loadDashboardData() {
    this.api.nextSession().subscribe({
      next: (session) => {
        this.nextSession.set(session);
        if (session) {
          this.isLocked.set(session.isLocked);
          this.loadCurrentPrediction();
        }
      },
      error: () => {}
    });

    this.api.globalLeaderboard().subscribe({
      next: (lb) => this.leaderboard.set(lb),
      error: () => {}
    });

    this.api.jolpicaDriverStandings().subscribe({
      next: (standings) => this.f1Standings.set(standings),
      error: () => {}
    });

    this.api.jolpicaLastResults().subscribe({
      next: (last) => this.lastRaceInfo.set(last),
      error: () => {}
    });

    this.loadHistory();

    this.loading.set(false);
    this.ready.set(true);
  }

  private loadCurrentPrediction() {
    const session = this.nextSession();
    if (session) {
      try {
        const saved = localStorage.getItem(`apexpredict_pred_${session.season}_${session.round}`);
        if (saved) {
          const parsed = JSON.parse(saved);
          this.predForm.patchValue({
            p1: parsed.podium?.[0] || '',
            p2: parsed.podium?.[1] || '',
            p3: parsed.podium?.[2] || '',
            pole: parsed.polePositionDriverId || '',
            duel: parsed.duelDriverPick || '',
            safetyCars: parsed.safetyCarCount || 0,
            dnfs: parsed.dnfCount || 0,
          });
        }
      } catch {}
    }

    this.api.currentPrediction().subscribe({
      next: (pred) => {
        this.currentPrediction.set(pred);
        if (pred) {
          this.isLocked.set(pred.isLocked);
          if (pred.podium && pred.podium.length >= 3) {
            this.predForm.patchValue({
              p1: pred.podium[0],
              p2: pred.podium[1],
              p3: pred.podium[2],
              pole: pred.polePositionDriverId || '',
              duel: pred.duelDriverPick || '',
              safetyCars: pred.safetyCarCount || 0,
              dnfs: pred.dnfCount || 0,
            });
          }
        }
      },
      error: () => {}
    });
  }

  private loadHistory() {
    this.api.predictionHistory().subscribe({
      next: (items) => this.history.set(items),
      error: () => {}
    });
  }

  savePrediction() {
    if (this.isLocked() || this.predForm.invalid || this.savingPrediction()) return;
    const session = this.nextSession();
    if (!session) return;

    const val = this.predForm.value;
    if (val.p1 === val.p2 || val.p1 === val.p3 || val.p2 === val.p3) {
      this.predictionError.set('Los pilotos del podio (1º, 2º y 3º puesto) deben ser diferentes.');
      return;
    }

    this.savingPrediction.set(true);
    this.predictionError.set('');
    this.predictionSuccess.set(false);

    const safetyCarsVal = val.safetyCars != null ? Number(val.safetyCars) : 0;
    const dnfsVal = val.dnfs != null ? Number(val.dnfs) : 0;
    const payload = {
      podium: [val.p1!, val.p2!, val.p3!],
      polePositionDriverId: val.pole ? val.pole : null,
      duelDriverPick: val.duel ? val.duel : null,
      safetyCarCount: safetyCarsVal,
      safetyCars: safetyCarsVal,
      dnfCount: dnfsVal,
      dnfs: dnfsVal,
    };

    // Respaldo en almacenamiento local
    try {
      localStorage.setItem(`apexpredict_pred_${session.season}_${session.round}`, JSON.stringify(payload));
    } catch {}

    this.api.submitPrediction(session.id, payload).subscribe({
      next: (res) => {
        this.savingPrediction.set(false);
        this.predictionSuccess.set(true);
        this.predictionError.set('');
        this.currentPrediction.set(res);
        this.loadHistory();
        this.api.globalLeaderboard().subscribe({ next: (lb) => this.leaderboard.set(lb) });
        if (this.selectedLeague()) {
          this.api.leagueLeaderboard(this.selectedLeague()!.id).subscribe({ next: (lb) => this.leagueLeaderboard.set(lb) });
        }
      },
      error: (err) => {
        this.savingPrediction.set(false);
        if (err.status === 423) {
          this.isLocked.set(true);
          this.predictionError.set('Lock Time alcanzado: La sesión ha comenzado y se bloquearon los pronósticos.');
        } else {
          const msg = err.error?.message || err.error?.description || 'Error al persistir el pronóstico en la base de datos. Verifique su conexión.';
          this.predictionError.set(msg);
        }
      }
    });
  }
}
