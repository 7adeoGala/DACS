import { Component, inject, OnInit, signal } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { DatePipe } from '@angular/common';
import { switchMap } from 'rxjs';
import { ApiService } from '../../core/services/api.service';
import { 
  League, 
  NextSession, 
  PredictionDetail, 
  LeaderboardEntry, 
  PredictionHistoryItem,
  F1_DRIVERS,
  DriverOption
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
                    ⏱️ ABIERTO HASTA {{ nextSession()?.startsAt ? (nextSession()?.startsAt | date: 'dd/MM HH:mm' : 'UTC') + ' UTC' : 'INICIO DE SESIÓN' }}
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
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 24px; flex-wrap: wrap; gap: 16px;">
              <h2>Ligas Privadas & Competencia</h2>
              <span class="muted">{{ leagues().length }} ligas activas</span>
            </div>

            <!-- SELECTOR HORIZONTAL DE LIGAS -->
            @if (leagues().length > 0) {
              <div class="league-selector-list">
                @for (l of leagues(); track l.id) {
                  <button 
                    type="button" 
                    class="league-pill"
                    [class.active]="selectedLeague()?.id === l.id"
                    (click)="selectLeague(l)">
                    <span>🏆 {{ l.name }}</span>
                  </button>
                }
              </div>

              <!-- DETALLES DE LA LIGA SELECCIONADA Y SU PODIO -->
              @if (selectedLeague()) {
                <article class="spotlight-card" style="margin-bottom: 36px;">
                  <div style="display: flex; justify-content: space-between; align-items: flex-start; flex-wrap: wrap; gap: 16px;">
                    <div>
                      <span class="round-badge">CLASIFICACIÓN EN VIVO</span>
                      <h2 style="font-size: 28px; margin-top: 8px;">{{ selectedLeague()?.name }}</h2>
                      @if (selectedLeague()?.description) {
                        <p class="muted" style="margin: 4px 0 0;">{{ selectedLeague()?.description }}</p>
                      }
                    </div>
                    @if (selectedLeague()?.inviteCode) {
                      <div style="background: rgba(0,0,0,0.3); padding: 12px 16px; border-radius: var(--radius-sm); border: 1px solid var(--line);">
                        <span class="eyebrow" style="font-size: 10px; margin-bottom: 4px;">CÓDIGO DE INVITACIÓN</span>
                        <div style="display: flex; align-items: center; gap: 8px;">
                          <code style="color: var(--cyan); font-weight: 700;">{{ selectedLeague()?.inviteCode }}</code>
                          <button class="button small quiet" (click)="copyInviteCode(selectedLeague()?.inviteCode)">
                            {{ copied() ? '✓ Copiado' : 'Copiar' }}
                          </button>
                        </div>
                      </div>
                    }
                  </div>

                  <!-- PODIO TOP 3 DE LA LIGA -->
                  @if (leagueLeaderboard().length >= 3) {
                    <div class="podium-container">
                      <!-- 2ND PLACE -->
                      <div class="podium-col rank-2">
                        <div class="podium-avatar">🥈</div>
                        <div class="podium-user-name">{{ leagueLeaderboard()[1].displayName }}</div>
                        <div class="podium-points">{{ leagueLeaderboard()[1].totalScore }} pts</div>
                        <div class="podium-pedestal">2</div>
                      </div>

                      <!-- 1ST PLACE -->
                      <div class="podium-col rank-1">
                        <div style="font-size: 24px; margin-bottom: -10px;">👑</div>
                        <div class="podium-avatar">🥇</div>
                        <div class="podium-user-name">{{ leagueLeaderboard()[0].displayName }}</div>
                        <div class="podium-points" style="color: var(--gold); font-size: 15px;">{{ leagueLeaderboard()[0].totalScore }} pts</div>
                        <div class="podium-pedestal">1</div>
                      </div>

                      <!-- 3RD PLACE -->
                      <div class="podium-col rank-3">
                        <div class="podium-avatar">🥉</div>
                        <div class="podium-user-name">{{ leagueLeaderboard()[2].displayName }}</div>
                        <div class="podium-points">{{ leagueLeaderboard()[2].totalScore }} pts</div>
                        <div class="podium-pedestal">3</div>
                      </div>
                    </div>
                  }

                  <!-- TABLA DE PARTICIPANTES DE LA LIGA -->
                  <h3 style="margin: 24px 0 16px; font-size: 18px;">Participantes de la Liga ({{ leagueLeaderboard().length }})</h3>
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
                <div style="font-size: 40px; margin-bottom: 12px;">🏁</div>
                <h2>Aún no pertenecés a ninguna liga</h2>
                <p class="lead" style="max-width: 480px; margin: 8px auto 24px;">
                  Creá tu propia liga privada para jugar con amigos o ingresá el código de invitación de una existente.
                </p>
              </div>
            }

            <!-- FORMULARIOS: CREAR Y UNIRSE A LIGA -->
            <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(320px, 1fr)); gap: 24px;">
              <!-- CREAR LIGA -->
              <div class="form-card">
                <h3>➕ Crear Nueva Liga Privada</h3>
                <form [formGroup]="form" (ngSubmit)="create()">
                  <label class="field-label" for="league-name">Nombre de la liga</label>
                  <input 
                    id="league-name" 
                    formControlName="name" 
                    placeholder="Ej: Gran Premio de Amigos" 
                    style="margin: 8px 0 16px;" 
                    required />

                  <button class="button" type="submit" [disabled]="name.invalid || saving()">
                    {{ saving() ? 'Creando liga…' : 'Crear Liga' }}
                  </button>
                </form>
              </div>

              <!-- UNIRSE A LIGA -->
              <div class="form-card">
                <h3>🔗 Unirse con Código de Invitación</h3>
                <label class="field-label" for="invite-input">Pegar código de invitación</label>
                <div style="display: flex; gap: 8px; margin-top: 8px;">
                  <input id="invite-input" #inviteInput placeholder="Ej: 345c4e89-506f-4f9d-8cf5-4a8cb70858ee" />
                  <button class="button quiet" type="button" (click)="join(inviteInput.value)">
                    Unirme
                  </button>
                </div>
              </div>
            </div>
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
                          Fecha de carrera: {{ item.raceDate || (item.startsAt | date: 'dd/MM/yyyy' : 'UTC') }}
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
            } @else {
              <div class="spotlight-card" style="text-align: center; padding: 48px 24px;">
                <div style="font-size: 40px; margin-bottom: 12px;">📊</div>
                <h2>Sin historial de pronósticos anteriores</h2>
                <p class="lead" style="max-width: 480px; margin: 8px auto 20px;">
                  Tus predicciones pasadas y los puntos obtenidos por cada acierto aparecerán acá una vez enviadas y concluida la carrera.
                </p>
                <button class="button" (click)="setTab('prediction')">Hacer mi primer pronóstico</button>
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

  readonly drivers: DriverOption[] = F1_DRIVERS;
  readonly activeTab = signal<DashboardTab>('prediction');

  readonly name = new FormControl('', {
    nonNullable: true,
    validators: [Validators.required, Validators.maxLength(100), Validators.pattern(/\S/)],
  });
  readonly form = new FormGroup({ name: this.name });

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
  readonly history = signal<PredictionHistoryItem[]>([]);

  readonly nextSession = signal<NextSession | null>(null);
  readonly currentPrediction = signal<PredictionDetail | null>(null);

  readonly isLocked = signal(false);
  readonly loading = signal(true);
  readonly saving = signal(false);
  readonly savingPrediction = signal(false);
  readonly ready = signal(false);
  readonly copied = signal(false);

  readonly error = signal('');
  readonly predictionError = signal('');
  readonly predictionSuccess = signal(false);

  ngOnInit() {
    this.api
      .profile()
      .pipe(switchMap(() => this.api.leagues()))
      .subscribe({
        next: (leagues) => {
          this.leagues.set(leagues);
          if (leagues.length > 0) {
            this.selectLeague(leagues[0]);
          }
          this.loadDashboardData();
        },
        error: () => {
          this.loading.set(false);
          this.error.set('No pudimos cargar tu perfil. Reintenta iniciando sesión.');
        },
      });
  }

  setTab(tab: DashboardTab) {
    this.activeTab.set(tab);
    if (tab === 'history') {
      this.loadHistory();
    }
  }

  selectLeague(league: League) {
    this.selectedLeague.set(league);
    this.api.leagueLeaderboard(league.id).subscribe({
      next: (lb) => this.leagueLeaderboard.set(lb),
      error: () => this.leagueLeaderboard.set([]),
    });
  }

  copyInviteCode(code?: string) {
    if (!code) return;
    navigator.clipboard.writeText(code).then(() => {
      this.copied.set(true);
      setTimeout(() => this.copied.set(false), 2000);
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

    this.loadHistory();

    this.loading.set(false);
    this.ready.set(true);
  }

  private loadCurrentPrediction() {
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

    const payload = {
      podium: [val.p1!, val.p2!, val.p3!],
      polePositionDriverId: val.pole ? val.pole : null,
      duelDriverPick: val.duel ? val.duel : null,
      safetyCarCount: val.safetyCars ?? 0,
      dnfCount: val.dnfs ?? 0,
    };

    this.api.submitPrediction(session.id, payload).subscribe({
      next: (res) => {
        this.savingPrediction.set(false);
        this.predictionSuccess.set(true);
        this.currentPrediction.set(res);
        this.loadHistory();
      },
      error: (err) => {
        this.savingPrediction.set(false);
        if (err.status === 423) {
          this.isLocked.set(true);
          this.predictionError.set('Lock Time alcanzado: La sesión ha comenzado y se bloquearon los pronósticos.');
        } else {
          this.predictionError.set('No se pudo guardar el pronóstico. Verifica los campos.');
        }
      }
    });
  }

  create() {
    if (this.name.invalid || this.saving()) return;
    this.saving.set(true);
    this.error.set('');
    this.api.createLeague(this.name.value.trim()).subscribe({
      next: (league) => {
        this.leagues.update((leagues) => [league, ...leagues]);
        this.selectLeague(league);
        this.name.reset();
        this.saving.set(false);
      },
      error: () => {
        this.saving.set(false);
        this.error.set('No pudimos crear la liga. Intenta nuevamente.');
      },
    });
  }

  join(code: string) {
    if (!code || !code.trim()) return;
    this.api.joinLeague(code.trim()).subscribe({
      next: (league) => {
        this.leagues.update((leagues) => [league, ...leagues]);
        this.selectLeague(league);
      },
      error: () => {
        this.error.set('Código de invitación no válido o ya eres miembro de esa liga.');
      }
    });
  }
}
