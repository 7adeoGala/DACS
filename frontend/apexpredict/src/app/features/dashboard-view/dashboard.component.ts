import { Component, inject, OnInit, signal, computed } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { ApiService } from '../../core/services/api.service';
import { AuthService } from '../../core/auth/auth.service';
import { 
  F1_DRIVERS, 
  F1Driver, 
  League, 
  NextSession, 
  LeaderboardEntry, 
  PredictionHistoryItem 
} from '../../core/models/api.models';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, FormsModule, DatePipe],
  template: `
    <div class="dashboard-page">


      <!-- ========================================== -->
      <!-- TAB 1: PRONÓSTICO GP                       -->
      <!-- ========================================== -->
      @if (activeTab() === 'pronostico') {
        <section class="tab-content">
          <div class="section-hero">
            <div>
              <span class="badge-round">ROUND {{ session()?.round || 18 }} // {{ session()?.circuit || 'COTA' }}</span>
              <h2>Configuración de Pronósticos Oficiales</h2>
              <p class="subtitle">Asigná los 3 puestos de podio sin duplicar, poleman, duelo de la fecha y telemetría de carrera.</p>
            </div>
            <div class="points-badge">
              <span class="dim">POTENCIAL MÁXIMO:</span>
              <span class="pts-val">+125 PTS</span>
            </div>
          </div>

          <!-- AVISO DE PRONÓSTICO YA REGISTRADO EN BASE DE DATOS -->
          @if (hasExistingPrediction()) {
            <div class="alert-box success" style="margin-bottom: 1rem; display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 8px;">
              <div>
                <strong>✓ Pronóstico Registrado en la Base de Datos:</strong> 
                Tenés tu pronóstico activo guardado en el servidor para este GP.
                @if (predictionSubmittedAt()) {
                  <span class="dim" style="margin-left: 6px; font-size: 0.85rem;">
                    (Último envío: {{ predictionSubmittedAt() | date:'d/MM HH:mm':'America/Argentina/Buenos_Aires' }} hs Arg)
                  </span>
                }
              </div>
              <span class="badge" style="background: rgba(16, 185, 129, 0.25); color: #fff; font-weight: 700; padding: 4px 10px; border-radius: var(--radius-sm); font-size: 0.78rem;">
                ✓ SINCRONIZADO
              </span>
            </div>
          }

          @if (isLocked()) {
            <div class="alert-box error" style="margin-bottom: 1rem;">
              🔒 <strong>PRONÓSTICOS BLOQUEADOS:</strong> La sesión oficial ya ha comenzado. El pronóstico se encuentra en modo solo lectura.
            </div>
          }

          @if (saveSuccess()) {
            <div class="alert-box success" style="margin-bottom: 1rem;">
              ✓ ¡Pronóstico guardado exitosamente en el servidor y la base de datos!
            </div>
          }

          @if (saveError()) {
            <div class="alert-box error" style="margin-bottom: 1rem;">
              ⚠️ {{ saveError() }}
            </div>
          }

          <!-- 1. PODIO TOP 3 ESCALONADO -->
          <div class="spotlight-card">
            <div class="card-title-row">
              <h3>PODIO OFICIAL DE CARRERA</h3>
              <span class="mono-pts">+58 PTS TOTALES</span>
            </div>
            
            <div class="podium-grid">
              <!-- P1: GANADOR (ORO) -->
              <div class="podium-col gold-border">
                <div class="podium-header gold">🥇 P1 WINNER (+25 PTS)</div>
                <label class="field-label">Vencedor del Gran Premio</label>
                <select 
                  [ngModel]="p1DriverId()" 
                  (ngModelChange)="p1DriverId.set($event)"
                  [disabled]="isLocked()" 
                  class="driver-select">
                  @for (d of drivers; track d.id) {
                    <option [value]="d.id">{{ d.name }} (#{{ d.number }} • {{ d.team }})</option>
                  }
                </select>
              </div>

              <!-- P2: SEGUNDO LUGAR (PLATA) -->
              <div class="podium-col silver-border">
                <div class="podium-header silver">🥈 P2 SEGUNDO (+18 PTS)</div>
                <label class="field-label">Segundo Clasificado</label>
                <select 
                  [ngModel]="p2DriverId()" 
                  (ngModelChange)="p2DriverId.set($event)"
                  [disabled]="isLocked()" 
                  class="driver-select">
                  @for (d of drivers; track d.id) {
                    <option [value]="d.id">{{ d.name }} (#{{ d.number }} • {{ d.team }})</option>
                  }
                </select>
              </div>

              <!-- P3: TERCER LUGAR (BRONCE) -->
              <div class="podium-col bronze-border">
                <div class="podium-header bronze">🥉 P3 TERCERO (+15 PTS)</div>
                <label class="field-label">Tercer Clasificado</label>
                <select 
                  [ngModel]="p3DriverId()" 
                  (ngModelChange)="p3DriverId.set($event)"
                  [disabled]="isLocked()" 
                  class="driver-select">
                  @for (d of drivers; track d.id) {
                    <option [value]="d.id">{{ d.name }} (#{{ d.number }} • {{ d.team }})</option>
                  }
                </select>
              </div>
            </div>

            @if (isPodiumDuplicate()) {
              <div class="alert-box error">
                ⚠️ Atención: No podés seleccionar al mismo piloto en dos posiciones del podio a la vez.
              </div>
            }
          </div>

          <!-- 2. POLE POSITION Y DUELO DIRECTO -->
          <div class="grid-two-cols">
            <div class="spotlight-card">
              <div class="card-title-row">
                <h4>🏁 Pole Position (Sábado)</h4>
                <span class="cyan-pts">+20 PTS</span>
              </div>
              <label class="dim">Piloto más veloz en Q3</label>
              <select 
                [ngModel]="poleDriverId()" 
                (ngModelChange)="poleDriverId.set($event)"
                [disabled]="isLocked()" 
                class="driver-select">
                @for (d of drivers; track d.id) {
                  <option [value]="d.id">{{ d.name }} ({{ d.team }})</option>
                }
              </select>
            </div>

            <div class="spotlight-card">
              <div class="card-title-row">
                <h4>⚔️ Duelo Directo de la Fecha</h4>
                <span class="mono-pts">+15 PTS</span>
              </div>
              <label class="dim">{{ getDriverName(matchupDriver1()) }} vs {{ getDriverName(matchupDriver2()) }}</label>
              <div class="duel-selector">
                <button 
                  type="button"
                  [class.selected]="duelWinnerId() === matchupDriver1()" 
                  [disabled]="isLocked()"
                  (click)="duelWinnerId.set(matchupDriver1())">
                  {{ getDriverName(matchupDriver1()) }}
                </button>
                <button 
                  type="button"
                  [class.selected]="duelWinnerId() === matchupDriver2()" 
                  [disabled]="isLocked()"
                  (click)="duelWinnerId.set(matchupDriver2())">
                  {{ getDriverName(matchupDriver2()) }}
                </button>
              </div>
            </div>
          </div>

          <!-- 3. SLIDERS / CONTADORES TELEMETRÍA -->
          <div class="spotlight-card">
            <div class="card-title-row">
              <h4>INCIDENCIAS DE CARRERA</h4>
              <span class="mono-pts">+32 PTS</span>
            </div>
            <div class="counters-grid">
              <div class="counter-item">
                <label>¿Aparición de Safety Car (SC)? (0 a 10)</label>
                <div class="stepper">
                  <button type="button" [disabled]="isLocked()" (click)="decrementSC()">-</button>
                  <span class="count-num">{{ safetyCars() }}</span>
                  <button type="button" [disabled]="isLocked()" (click)="incrementSC()">+</button>
                </div>
              </div>
              <div class="counter-item">
                <label>Cantidad de Abandonos (DNFs) (0 a 20)</label>
                <div class="stepper">
                  <button type="button" [disabled]="isLocked()" (click)="decrementDNFs()">-</button>
                  <span class="count-num">{{ dnfs() }}</span>
                  <button type="button" [disabled]="isLocked()" (click)="incrementDNFs()">+</button>
                </div>
              </div>
            </div>
          </div>

          <!-- BOTÓN DE GUARDADO CON FEEDBACK -->
          <div class="submit-bar">
            <button 
              class="button" 
              type="button"
              [disabled]="isPodiumDuplicate() || isSaving() || isLocked()" 
              (click)="savePrediction()">
              @if (isSaving()) {
                <span>Sincronizando con base de datos…</span>
              } @else if (saveSuccess()) {
                <span>✓ ¡Pronóstico Guardado en Servidor!</span>
              } @else if (hasExistingPrediction()) {
                <span>🔄 Actualizar Mi Pronóstico Oficial</span>
              } @else {
                <span>🏁 Guardar Mi Pronóstico Oficial</span>
              }
            </button>
          </div>
        </section>
      }

      <!-- ========================================== -->
      <!-- TAB 2: MIS LIGAS PRIVADAS (SIN BUSCADOR)   -->
      <!-- ========================================== -->
      @if (activeTab() === 'ligas') {
        <section class="tab-content">
          <!-- SUB-NAVEGACIÓN INTERNA -->
          <div class="sub-nav-leagues">
            <button 
              type="button"
              [class.active]="leagueSubTab() === 'list'" 
              (click)="leagueSubTab.set('list')">
              🏆 Mis Ligas ({{ myLeagues().length }})
            </button>
            <button 
              type="button"
              [class.active]="leagueSubTab() === 'create'" 
              (click)="leagueSubTab.set('create')">
              ➕ Crear Nueva Liga
            </button>
            <button 
              type="button"
              [class.active]="leagueSubTab() === 'join'" 
              (click)="leagueSubTab.set('join')">
              🔗 Unirse por Link / Clave
            </button>
          </div>

          @if (leagueSuccess()) {
            <div class="alert-box success">
              ✓ {{ leagueSuccess() }}
            </div>
          }

          @if (leagueError()) {
            <div class="alert-box error">
              ⚠️ {{ leagueError() }}
            </div>
          }

          <!-- SUB-TAB 1: LISTADO DE MIS LIGAS -->
          @if (leagueSubTab() === 'list') {
            @if (myLeagues().length > 0) {
              <!-- SELECTOR DE LIGAS SI PERTENECE A MÁS DE UNA -->
              @if (myLeagues().length > 1) {
                <div class="league-pills-row">
                  @for (l of myLeagues(); track l.id) {
                    <button 
                      type="button"
                      class="league-chip" 
                      [class.active]="selectedLeague()?.id === l.id" 
                      (click)="selectLeague(l)">
                      🏆 {{ l.name }}
                      @if (l.hasPassword) { <span style="font-size: 11px;">🔒</span> }
                    </button>
                  }
                </div>
              }

              <!-- CAJA DE INVITACIÓN DIRECTA DE LA LIGA SELECCIONADA -->
              <div class="invite-strip">
                <div>
                  <span class="badge-red">ENLACE OFICIAL DE ACCESO RÁPIDO</span>
                  <p style="margin-top: 4px; font-size: 0.95rem;">
                    Compartí este enlace con tus amigos para que se sumen a <strong>{{ selectedLeague()?.name }}</strong>:
                  </p>
                </div>
                <div class="copy-group">
                  <input 
                    type="text" 
                    readonly 
                    [value]="getInviteUrl(selectedLeague()?.inviteCode)" 
                    class="copy-input"/>
                  <button class="button small" type="button" (click)="copyInviteUrl()">
                    {{ copySuccess() ? '✓ Copiado' : '🔗 Copiar Link' }}
                  </button>
                </div>
              </div>

              <!-- PODIO TOP 3 DE LA LIGA -->
              <div class="spotlight-card">
                <div style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 8px;">
                  <h3 class="podium-title" style="margin: 0;">👑 Podio de la Liga: {{ selectedLeague()?.name }}</h3>
                  @if (selectedLeague()?.hasPassword) {
                    <span style="font-size: 0.8rem; background: rgba(245, 176, 0, 0.15); color: var(--gold); border: 1px solid rgba(245, 176, 0, 0.3); padding: 3px 8px; border-radius: var(--radius-sm);">
                      🔒 Protegida con Contraseña
                    </span>
                  }
                </div>

                @if (leagueLeaderboard().length >= 1) {
                  <div class="league-podium-pedestals">
                    <!-- P2: PLATA -->
                    <div class="pedestal silver-ped">
                      <div class="pos-badge">🥈 P2</div>
                      <div class="pilot-name">{{ leagueLeaderboard()[1]?.displayName || 'Esperando corredor' }}</div>
                      <div class="pilot-pts">{{ leagueLeaderboard()[1]?.totalScore || 0 }} pts</div>
                      <span class="dim" style="font-size: 0.75rem; margin-top: 2px;">
                        {{ (leagueLeaderboard()[1]?.predictionsCount || 0) > 0 ? '🟢 Pronóstico cargado' : '⏳ Pendiente' }}
                      </span>
                    </div>

                    <!-- P1: ORO -->
                    <div class="pedestal gold-ped">
                      <div class="crown">👑</div>
                      <div class="pos-badge">🥇 P1</div>
                      <div class="pilot-name">{{ leagueLeaderboard()[0]?.displayName || 'Líder' }}</div>
                      <div class="pilot-pts">{{ leagueLeaderboard()[0]?.totalScore || 0 }} pts</div>
                      <span class="dim" style="font-size: 0.75rem; margin-top: 2px;">
                        {{ (leagueLeaderboard()[0]?.predictionsCount || 0) > 0 ? '🟢 Pronóstico cargado' : '⏳ Pendiente' }}
                      </span>
                    </div>

                    <!-- P3: BRONCE -->
                    <div class="pedestal bronze-ped">
                      <div class="pos-badge">🥉 P3</div>
                      <div class="pilot-name">{{ leagueLeaderboard()[2]?.displayName || 'Esperando corredor' }}</div>
                      <div class="pilot-pts">{{ leagueLeaderboard()[2]?.totalScore || 0 }} pts</div>
                      <span class="dim" style="font-size: 0.75rem; margin-top: 2px;">
                        {{ (leagueLeaderboard()[2]?.predictionsCount || 0) > 0 ? '🟢 Pronóstico cargado' : '⏳ Pendiente' }}
                      </span>
                    </div>
                  </div>
                }

                <!-- TABLA DE POSICIONES DE LA LIGA -->
                <h4 style="margin: 1.5rem 0 1rem; font-size: 1.05rem;">Participantes de la Liga ({{ leagueLeaderboard().length }})</h4>
                @if (leagueLeaderboard().length > 0) {
                  <table class="data-table">
                    <thead>
                      <tr>
                        <th>Pos</th>
                        <th>Corredor / Usuario</th>
                        <th>Puntos Totales</th>
                        <th>Estado de Pronóstico</th>
                      </tr>
                    </thead>
                    <tbody>
                      @for (entry of leagueLeaderboard(); track entry.userId) {
                        <tr>
                          <td><strong>#{{ entry.rank }}</strong></td>
                          <td style="color: #fff; font-weight: 600;">
                            {{ entry.displayName }}
                            @if (auth.username() && entry.displayName.toLowerCase().includes(auth.username().toLowerCase())) {
                              <span style="font-size: 0.75rem; color: var(--cyan); margin-left: 4px;">(Tú)</span>
                            }
                          </td>
                          <td style="font-family: var(--font-mono); color: var(--gold); font-weight: 700;">{{ entry.totalScore }} pts</td>
                          <td>
                            @if (entry.predictionsCount > 0) {
                              <span style="color: var(--green); font-weight: 600; font-size: 0.85rem;">🟢 Pronóstico Enviado</span>
                            } @else {
                              <span class="dim" style="font-size: 0.85rem;">⏳ Sin pronóstico aún</span>
                            }
                          </td>
                        </tr>
                      }
                    </tbody>
                  </table>
                } @else {
                  <p class="dim" style="padding: 1rem 0;">Aún no hay puntuaciones registradas en esta liga privada.</p>
                }
              </div>
            } @else {
              <!-- EMPTY STATE CUANDO NO TIENE LIGAS -->
              <div class="spotlight-card" style="text-align: center; padding: 3rem 1.5rem;">
                <div style="font-size: 3rem; margin-bottom: 0.5rem;">🏁</div>
                <h2>Aún no pertenecés a ninguna liga privada</h2>
                <p class="dim" style="max-width: 500px; margin: 0.5rem auto 1.5rem;">
                  Creá tu propia liga privada con contraseña o ingresá mediante el link de invitación que te compartieron tus amigos.
                </p>
                <div style="display: flex; gap: 0.75rem; justify-content: center; flex-wrap: wrap;">
                  <button class="button" type="button" (click)="leagueSubTab.set('create')">➕ Crear Nueva Liga</button>
                  <button class="button quiet" type="button" (click)="leagueSubTab.set('join')">🔗 Unirme por Link o Código</button>
                </div>
              </div>
            }
          }

          <!-- SUB-TAB 2: CREAR NUEVA LIGA -->
          @if (leagueSubTab() === 'create') {
            <div class="spotlight-card form-box">
              <h3>Crear Nueva Liga Privada</h3>
              <p class="dim">Tu liga será 100% confidencial. Nadie podrá buscarla en listas públicas; solo ingresarán quienes reciban tu link o código de invitación.</p>
              
              <div class="form-group">
                <label>Nombre de la Liga (requerido) *</label>
                <input 
                  type="text" 
                  [(ngModel)]="newLeagueName" 
                  placeholder="Ej: Escudería Amigos F1" 
                  class="form-input"/>
              </div>

              <div class="form-group">
                <label>Descripción (opcional)</label>
                <input 
                  type="text" 
                  [(ngModel)]="newLeagueDescription" 
                  placeholder="Ej: Torneo privado de amigos del trabajo" 
                  class="form-input"/>
              </div>

              <div class="form-group">
                <label>🔒 Contraseña de Acceso (opcional)</label>
                <input 
                  type="password" 
                  [(ngModel)]="newLeaguePassword" 
                  placeholder="Dejar vacío si es de acceso directo con link" 
                  class="form-input"/>
                <span class="dim" style="font-size: 0.8rem; margin-top: 4px;">Si definís una contraseña, los usuarios deberán ingresarla al unirse.</span>
              </div>

              <button 
                class="button" 
                type="button" 
                [disabled]="!newLeagueName.trim() || isCreatingLeague()" 
                (click)="createLeague()">
                {{ isCreatingLeague() ? 'Creando en base de datos…' : '🏁 Crear Liga y Persistir' }}
              </button>
            </div>
          }

          <!-- SUB-TAB 3: UNIRSE POR LINK O CLAVE -->
          @if (leagueSubTab() === 'join') {
            <div class="spotlight-card form-box">
              <h3>Unirse a una Liga Privada</h3>
              <p class="dim">Pegá el link completo de invitación o el código UUID proporcionado por el creador de la liga.</p>
              
              <div class="form-group">
                <label>Link o Código de Invitación *</label>
                <input 
                  type="text" 
                  [(ngModel)]="joinCode" 
                  placeholder="Ej: https://.../join/345c4e89... o 345c4e89-..." 
                  class="form-input"/>
              </div>

              <div class="form-group">
                <label>Contraseña (si la liga la requiere)</label>
                <input 
                  type="password" 
                  [(ngModel)]="joinPassword" 
                  placeholder="Contraseña de acceso" 
                  class="form-input"/>
              </div>

              <button 
                class="button" 
                type="button" 
                [disabled]="!joinCode.trim() || isJoiningLeague()" 
                (click)="joinLeague()">
                {{ isJoiningLeague() ? 'Verificando e ingresando…' : '🚀 Unirme a la Liga' }}
              </button>
            </div>
          }
        </section>
      }

      <!-- ========================================== -->
      <!-- TAB 3: TABLA GLOBAL                        -->
      <!-- ========================================== -->
      @if (activeTab() === 'global') {
        <section class="tab-content">
          <div class="spotlight-card">
            <div class="card-title-row">
              <div>
                <h3>📊 Clasificación Global de la Comunidad</h3>
                <p class="dim" style="margin-top: 4px;">Puntos y pronósticos registrados en tiempo real por todos los corredores de ApexPredict.</p>
              </div>
              <span class="mono-pts">{{ globalLeaderboard().length }} Pilotos Registrados</span>
            </div>

            @if (globalLeaderboard().length >= 3) {
              <div class="league-podium-pedestals">
                <div class="pedestal silver-ped">
                  <div class="pos-badge">🥈 P2</div>
                  <div class="pilot-name">{{ globalLeaderboard()[1]?.displayName }}</div>
                  <div class="pilot-pts">{{ globalLeaderboard()[1]?.totalScore }} pts</div>
                  <span class="dim" style="font-size: 0.75rem; margin-top: 2px;">
                    {{ (globalLeaderboard()[1]?.predictionsCount || 0) > 0 ? '🟢 Pronóstico cargado' : '⏳ Pendiente' }}
                  </span>
                </div>

                <div class="pedestal gold-ped">
                  <div class="crown">👑</div>
                  <div class="pos-badge">🥇 P1</div>
                  <div class="pilot-name">{{ globalLeaderboard()[0]?.displayName }}</div>
                  <div class="pilot-pts">{{ globalLeaderboard()[0]?.totalScore }} pts</div>
                  <span class="dim" style="font-size: 0.75rem; margin-top: 2px;">
                    {{ (globalLeaderboard()[0]?.predictionsCount || 0) > 0 ? '🟢 Pronóstico cargado' : '⏳ Pendiente' }}
                  </span>
                </div>

                <div class="pedestal bronze-ped">
                  <div class="pos-badge">🥉 P3</div>
                  <div class="pilot-name">{{ globalLeaderboard()[2]?.displayName }}</div>
                  <div class="pilot-pts">{{ globalLeaderboard()[2]?.totalScore }} pts</div>
                  <span class="dim" style="font-size: 0.75rem; margin-top: 2px;">
                    {{ (globalLeaderboard()[2]?.predictionsCount || 0) > 0 ? '🟢 Pronóstico cargado' : '⏳ Pendiente' }}
                  </span>
                </div>
              </div>
            }

            @if (globalLeaderboard().length > 0) {
              <table class="data-table" style="margin-top: 1.5rem;">
                <thead>
                  <tr>
                    <th>Pos</th>
                    <th>Corredor / Escudería</th>
                    <th>Puntos Totales</th>
                    <th>Pronósticos Realizados</th>
                  </tr>
                </thead>
                <tbody>
                  @for (entry of globalLeaderboard(); track entry.userId) {
                    <tr>
                      <td><strong>#{{ entry.rank }}</strong></td>
                      <td style="color: #fff; font-weight: 600;">
                        {{ entry.displayName }}
                        @if (auth.username() && entry.displayName.toLowerCase().includes(auth.username().toLowerCase())) {
                          <span style="font-size: 0.75rem; color: var(--cyan); margin-left: 4px;">(Tú)</span>
                        }
                      </td>
                      <td style="font-family: var(--font-mono); color: var(--gold); font-weight: 700;">{{ entry.totalScore }} pts</td>
                      <td>
                        @if (entry.predictionsCount > 0) {
                          <span style="color: var(--green); font-weight: 600; font-size: 0.85rem;">🟢 {{ entry.predictionsCount }} Carrera (Enviado)</span>
                        } @else {
                          <span class="dim" style="font-size: 0.85rem;">⏳ 0 Carreras</span>
                        }
                      </td>
                    </tr>
                  }
                </tbody>
              </table>
            } @else {
              <p class="dim" style="padding: 2rem 0; text-align: center;">Cargando clasificación global…</p>
            }
          </div>
        </section>
      }

      <!-- ========================================== -->
      <!-- TAB 4: HISTORIAL                           -->
      <!-- ========================================== -->
      @if (activeTab() === 'historial') {
        <section class="tab-content">
          <div class="spotlight-card">
            <div class="card-title-row">
              <div>
                <h3>📜 Historial & Pronósticos del Usuario</h3>
                <p class="dim" style="margin-top: 4px;">Detalle de tus pronósticos guardados y puntos asignados por fecha.</p>
              </div>
            </div>

            @if (historyItems().length > 0) {
              <div class="history-grid">
                @for (h of historyItems(); track h.sessionId) {
                  <div class="history-card">
                    <div style="display: flex; justify-content: space-between; align-items: flex-start; gap: 8px;">
                      <div>
                        @if (h.score != null) {
                          <span class="badge-round" style="font-size: 0.7rem; background: var(--green);">CARRERA PUNTUADA</span>
                        } @else {
                          <span class="badge-round" style="font-size: 0.7rem; background: var(--gold); color: #000;">🟡 PRONÓSTICO REGISTRADO — EN ESPERA</span>
                        }
                        <h4 style="margin: 6px 0 2px; font-size: 1.15rem;">{{ h.sessionName }}</h4>
                        <p class="dim" style="font-size: 0.85rem; margin: 0;">{{ h.circuit }}</p>
                      </div>
                      <div style="text-align: right;">
                        <span style="font-family: var(--font-mono); font-size: 1.4rem; font-weight: 800; color: var(--gold);">
                          {{ h.score != null ? h.score : '--' }} pts
                        </span>
                      </div>
                    </div>

                    <!-- DETALLE DE PICKS GUARDADOS -->
                    @if (h.podium && h.podium.length >= 3) {
                      <div style="margin: 1rem 0 0.5rem; background: rgba(0,0,0,0.3); padding: 0.75rem; border-radius: var(--radius-sm); border: 1px solid var(--line);">
                        <div style="font-size: 0.82rem; margin-bottom: 4px;">
                          <strong>Podio Elegido:</strong> 🥇 {{ getDriverName(h.podium[0]) }} • 🥈 {{ getDriverName(h.podium[1]) }} • 🥉 {{ getDriverName(h.podium[2]) }}
                        </div>
                        <div style="font-size: 0.82rem; color: var(--text-dim);">
                          Pole: <strong style="color: var(--cyan);">{{ getDriverName(h.polePositionDriverId) }}</strong> • 
                          Duelo: <strong style="color: #fff;">{{ getDriverName(h.duelDriverPick) }}</strong> • 
                          SC: <strong style="color: #fff;">{{ h.safetyCarCount }}</strong> • 
                          DNFs: <strong style="color: #fff;">{{ h.dnfCount }}</strong>
                        </div>
                        @if (h.submittedAt) {
                          <div style="font-size: 0.75rem; color: var(--text-dim); margin-top: 6px;">
                            Registrado: {{ h.submittedAt | date:'d/MM/yyyy HH:mm':'America/Argentina/Buenos_Aires' }} hs Arg
                          </div>
                        }
                      </div>
                    }

                    @if (h.scoreBreakdown) {
                      <div class="score-breakdown-tags" style="margin-top: 0.75rem; display: flex; flex-wrap: wrap; gap: 6px;">
                        <span class="chip-score" [class.hit]="h.scoreBreakdown.podiumHits > 0">
                          Podio: +{{ h.scoreBreakdown.podiumPoints }} pts ({{ h.scoreBreakdown.podiumHits }}/3)
                        </span>
                        <span class="chip-score" [class.hit]="h.scoreBreakdown.poleHit">
                          Pole: {{ h.scoreBreakdown.poleHit ? '+20 pts ✓' : '0 pts' }}
                        </span>
                        <span class="chip-score" [class.hit]="h.scoreBreakdown.duelHit">
                          Duelo: {{ h.scoreBreakdown.duelHit ? '+15 pts ✓' : '0 pts' }}
                        </span>
                        <span class="chip-score" [class.hit]="h.scoreBreakdown.safetyCarHit">
                          Safety Car: {{ h.scoreBreakdown.safetyCarHit ? '+16 pts ✓' : '0 pts' }}
                        </span>
                        <span class="chip-score" [class.hit]="h.scoreBreakdown.dnfHit">
                          DNFs: {{ h.scoreBreakdown.dnfHit ? '+16 pts ✓' : '0 pts' }}
                        </span>
                      </div>
                    }
                  </div>
                }
              </div>
            } @else {
              <div style="text-align: center; padding: 3rem 1rem;">
                <p class="dim" style="font-size: 1rem;">Aún no se han registrado pronósticos finalizados para tu usuario.</p>
                <p class="dim" style="font-size: 0.85rem; margin-top: 4px;">Cuando cargues tu pronóstico para el próximo GP, acá podrás consultar tus selecciones y el desglose de puntos.</p>
              </div>
            }
          </div>
        </section>
      }
    </div>
  `,
  styles: [`
    .dashboard-page {
      max-width: 1440px;
      margin: 1.5rem auto 4rem;
      padding: 0 1.5rem;
    }
    .cockpit-header {
      border-bottom: 1px solid var(--line);
      margin-bottom: 2rem;
    }
    .tabs-bar {
      display: flex;
      gap: 1.5rem;
      overflow-x: auto;
    }
    .tabs-bar button {
      background: transparent;
      border: none;
      color: var(--text-muted);
      font-size: 1.05rem;
      font-weight: 600;
      padding: 0.85rem 0.5rem;
      cursor: pointer;
      position: relative;
      white-space: nowrap;
      transition: color 0.2s;
    }
    .tabs-bar button:hover {
      color: #fff;
    }
    .tabs-bar button.active {
      color: #ffffff;
    }
    .tabs-bar button.active::after {
      content: '';
      position: absolute;
      bottom: -1px;
      left: 0;
      width: 100%;
      height: 3px;
      background: var(--red);
    }
    .tab-content {
      display: flex;
      flex-direction: column;
      gap: 1.5rem;
    }
    .section-hero {
      display: flex;
      justify-content: space-between;
      align-items: center;
      background: linear-gradient(135deg, rgba(225, 6, 0, 0.12) 0%, var(--surface) 100%);
      border: 1px solid var(--line-accent);
      border-radius: var(--radius-md);
      padding: 1.5rem 2rem;
      flex-wrap: wrap;
      gap: 1rem;
    }
    .badge-round {
      background: var(--red);
      font-size: 0.75rem;
      font-weight: 800;
      padding: 0.2rem 0.5rem;
      border-radius: 4px;
      display: inline-block;
      margin-bottom: 0.5rem;
    }
    .subtitle {
      color: var(--text-muted);
      margin-top: 0.25rem;
      font-size: 0.95rem;
    }
    .points-badge {
      text-align: right;
    }
    .points-badge .dim {
      font-size: 0.8rem;
      color: var(--text-dim);
      font-weight: 700;
    }
    .points-badge .pts-val {
      font-size: 1.5rem;
      font-weight: 800;
      font-family: var(--font-mono);
      color: var(--gold);
      margin-left: 0.5rem;
    }
    .card-title-row {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 1.25rem;
    }
    .mono-pts {
      font-family: var(--font-mono);
      color: var(--gold);
      font-weight: 700;
      font-size: 0.85rem;
    }
    .cyan-pts {
      font-family: var(--font-mono);
      color: var(--cyan);
      font-weight: 700;
      font-size: 0.85rem;
    }
    .podium-grid {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 1.25rem;
    }
    .podium-col {
      background: var(--surface);
      border: 1px solid var(--line);
      border-radius: var(--radius-sm);
      padding: 1.25rem;
    }
    .gold-border { border-top: 4px solid var(--gold); }
    .silver-border { border-top: 4px solid var(--silver); }
    .bronze-border { border-top: 4px solid var(--bronze); }
    .podium-header {
      font-size: 0.82rem;
      font-weight: 800;
      margin-bottom: 0.6rem;
    }
    .podium-header.gold { color: var(--gold); }
    .podium-header.silver { color: var(--silver); }
    .podium-header.bronze { color: var(--bronze); }
    .field-label {
      font-size: 0.82rem;
      color: var(--text-dim);
      display: block;
      margin-bottom: 0.25rem;
    }
    .driver-select {
      width: 100%;
      background: #0d1015;
      border: 1px solid var(--line-strong);
      color: #fff;
      padding: 0.75rem;
      border-radius: var(--radius-sm);
      font-family: var(--font-ui);
      font-size: 0.9rem;
      margin-top: 0.5rem;
      cursor: pointer;
    }
    .driver-select:disabled {
      opacity: 0.6;
      cursor: not-allowed;
    }
    .alert-box {
      padding: 0.75rem 1rem;
      border-radius: var(--radius-sm);
      font-size: 0.88rem;
    }
    .alert-box.error {
      background: rgba(225, 6, 0, 0.15);
      border: 1px solid var(--red);
      color: #ffb4ab;
    }
    .alert-box.success {
      background: rgba(16, 185, 129, 0.15);
      border: 1px solid var(--green);
      color: #a7f3d0;
    }
    .grid-two-cols {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 1.5rem;
    }
    .duel-selector {
      display: flex;
      gap: 0.75rem;
      margin-top: 0.75rem;
    }
    .duel-selector button {
      flex: 1;
      background: #0d1015;
      border: 1px solid var(--line);
      color: var(--text-muted);
      padding: 0.75rem;
      border-radius: var(--radius-sm);
      cursor: pointer;
      font-weight: 600;
      transition: all 0.2s;
    }
    .duel-selector button:hover:not(:disabled) {
      border-color: var(--line-strong);
      color: #fff;
    }
    .duel-selector button.selected {
      background: var(--red);
      color: #fff;
      border-color: var(--red);
    }
    .duel-selector button:disabled {
      opacity: 0.6;
      cursor: not-allowed;
    }
    .counters-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 1.5rem;
    }
    .stepper {
      display: flex;
      align-items: center;
      gap: 1rem;
      margin-top: 0.6rem;
    }
    .stepper button {
      width: 38px;
      height: 38px;
      background: #0d1015;
      border: 1px solid var(--line-strong);
      color: #fff;
      font-size: 1.25rem;
      border-radius: var(--radius-sm);
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      transition: all 0.15s;
    }
    .stepper button:hover:not(:disabled) {
      background: var(--surface-hover);
      border-color: var(--red);
    }
    .stepper button:disabled {
      opacity: 0.4;
      cursor: not-allowed;
    }
    .count-num {
      font-size: 1.6rem;
      font-weight: 800;
      font-family: var(--font-mono);
      min-width: 32px;
      text-align: center;
    }
    .submit-bar {
      display: flex;
      justify-content: flex-end;
      margin-top: 0.5rem;
    }
    /* LIGAS */
    .sub-nav-leagues {
      display: flex;
      gap: 0.75rem;
      flex-wrap: wrap;
    }
    .sub-nav-leagues button {
      background: var(--surface);
      border: 1px solid var(--line);
      color: var(--text-muted);
      padding: 0.6rem 1.15rem;
      border-radius: var(--radius-sm);
      cursor: pointer;
      font-weight: 600;
      transition: all 0.2s;
    }
    .sub-nav-leagues button:hover {
      color: #fff;
    }
    .sub-nav-leagues button.active {
      background: var(--surface-card);
      color: #fff;
      border-color: var(--line-strong);
    }
    .league-pills-row {
      display: flex;
      gap: 0.5rem;
      flex-wrap: wrap;
    }
    .league-chip {
      background: var(--surface);
      border: 1px solid var(--line);
      color: var(--text-muted);
      padding: 0.5rem 1rem;
      border-radius: var(--radius-full);
      cursor: pointer;
      font-weight: 600;
      font-size: 0.88rem;
      transition: all 0.2s;
    }
    .league-chip.active {
      background: rgba(225, 6, 0, 0.15);
      border-color: var(--red);
      color: #fff;
    }
    .invite-strip {
      background: var(--surface);
      border: 1px solid var(--line-accent);
      border-radius: var(--radius-md);
      padding: 1.25rem 1.75rem;
      display: flex;
      justify-content: space-between;
      align-items: center;
      flex-wrap: wrap;
      gap: 1rem;
    }
    .badge-red {
      font-size: 0.72rem;
      color: var(--red);
      font-weight: 800;
      letter-spacing: 0.05em;
    }
    .copy-group {
      display: flex;
      gap: 0.5rem;
    }
    .copy-input {
      background: #0d1015;
      border: 1px solid var(--line-strong);
      color: #fff;
      padding: 0.5rem 0.8rem;
      font-family: var(--font-mono);
      font-size: 0.85rem;
      border-radius: var(--radius-sm);
      width: 360px;
    }
    .league-podium-pedestals {
      display: flex;
      justify-content: center;
      align-items: flex-end;
      gap: 1.5rem;
      margin: 2rem 0;
    }
    .pedestal {
      background: var(--surface);
      border: 1px solid var(--line);
      border-radius: var(--radius-sm);
      padding: 1.5rem 1rem;
      text-align: center;
      width: 220px;
      display: flex;
      flex-direction: column;
      justify-content: flex-end;
    }
    .gold-ped {
      min-height: 190px;
      border-top: 5px solid var(--gold);
    }
    .silver-ped {
      min-height: 160px;
      border-top: 5px solid var(--silver);
    }
    .bronze-ped {
      min-height: 140px;
      border-top: 5px solid var(--bronze);
    }
    .pos-badge {
      font-weight: 800;
      font-size: 0.9rem;
      margin-bottom: 0.5rem;
    }
    .pilot-name {
      font-weight: 700;
      font-size: 1.05rem;
    }
    .pilot-pts {
      font-family: var(--font-mono);
      color: var(--gold);
      font-size: 0.95rem;
      margin-top: 0.35rem;
    }
    .crown {
      font-size: 1.5rem;
      margin-bottom: 0.2rem;
    }
    .form-box {
      max-width: 600px;
      margin: 0 auto;
    }
    .form-group {
      display: flex;
      flex-direction: column;
      gap: 0.4rem;
      margin: 1.25rem 0;
    }
    .form-input {
      background: #0d1015;
      border: 1px solid var(--line-strong);
      color: #fff;
      padding: 0.75rem;
      border-radius: var(--radius-sm);
      font-size: 0.95rem;
    }
    .data-table {
      width: 100%;
      border-collapse: collapse;
      font-size: 0.92rem;
    }
    .data-table th, .data-table td {
      padding: 0.75rem 1rem;
      text-align: left;
      border-bottom: 1px solid var(--line);
    }
    .data-table th {
      color: var(--text-dim);
      font-size: 0.8rem;
      text-transform: uppercase;
      letter-spacing: 0.05em;
    }
    .history-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(360px, 1fr));
      gap: 1.25rem;
    }
    .history-card {
      background: var(--surface);
      border: 1px solid var(--line);
      border-radius: var(--radius-sm);
      padding: 1.25rem;
    }
    .chip-score {
      font-size: 0.75rem;
      background: rgba(255, 255, 255, 0.05);
      color: var(--text-muted);
      padding: 3px 8px;
      border-radius: 4px;
      border: 1px solid var(--line);
    }
    .chip-score.hit {
      background: rgba(16, 185, 129, 0.15);
      border-color: rgba(16, 185, 129, 0.3);
      color: #a7f3d0;
      font-weight: 600;
    }
    .dim {
      color: var(--text-dim);
    }
    @media (max-width: 768px) {
      .podium-grid, .grid-two-cols, .counters-grid {
        grid-template-columns: 1fr;
      }
      .league-podium-pedestals {
        flex-direction: column;
        align-items: stretch;
      }
      .pedestal {
        width: 100%;
        min-height: auto;
      }
      .invite-strip {
        flex-direction: column;
        gap: 1rem;
        align-items: flex-start;
      }
      .copy-input {
        width: 100%;
      }
      .history-grid {
        grid-template-columns: 1fr;
      }
    }
  `]
})
export class DashboardComponent implements OnInit {
  private readonly api = inject(ApiService);
  public readonly auth = inject(AuthService);
  private readonly route = inject(ActivatedRoute);

  readonly drivers: F1Driver[] = F1_DRIVERS;
  readonly activeTab = signal<'pronostico' | 'ligas' | 'global' | 'historial'>('pronostico');
  readonly leagueSubTab = signal<'list' | 'create' | 'join'>('list');

  // Sesión F1 activa
  readonly session = signal<NextSession | null>(null);
  readonly isLocked = computed(() => this.session()?.isLocked ?? false);
  readonly matchupDriver1 = computed(() => this.session()?.matchupDriver1 || 'norris');
  readonly matchupDriver2 = computed(() => this.session()?.matchupDriver2 || 'verstappen');

  // Estado reactivo del pronóstico con Signals
  readonly p1DriverId = signal<string>('verstappen');
  readonly p2DriverId = signal<string>('norris');
  readonly p3DriverId = signal<string>('leclerc');
  readonly poleDriverId = signal<string>('norris');
  readonly duelWinnerId = signal<string>('norris');
  readonly safetyCars = signal<number>(1);
  readonly dnfs = signal<number>(2);

  readonly hasExistingPrediction = signal<boolean>(false);
  readonly predictionSubmittedAt = signal<string | null>(null);

  // Validación de podio duplicado reactiva
  readonly isPodiumDuplicate = computed(() => {
    const p1 = this.p1DriverId();
    const p2 = this.p2DriverId();
    const p3 = this.p3DriverId();
    return p1 === p2 || p1 === p3 || p2 === p3;
  });

  // Ligas privadas
  readonly myLeagues = signal<League[]>([]);
  readonly selectedLeague = signal<League | null>(null);
  readonly leagueLeaderboard = signal<LeaderboardEntry[]>([]);

  // Clasificación Global e Historial
  readonly globalLeaderboard = signal<LeaderboardEntry[]>([]);
  readonly historyItems = signal<PredictionHistoryItem[]>([]);

  // Estados de feedback de la UI
  readonly isSaving = signal(false);
  readonly saveSuccess = signal(false);
  readonly saveError = signal('');
  readonly copySuccess = signal(false);

  readonly isCreatingLeague = signal(false);
  readonly isJoiningLeague = signal(false);
  readonly leagueSuccess = signal('');
  readonly leagueError = signal('');

  // Formularios de ligas
  newLeagueName = '';
  newLeagueDescription = '';
  newLeaguePassword = '';
  joinCode = '';
  joinPassword = '';

  ngOnInit() {
    this.loadNextSession();
    this.loadCurrentPrediction();
    this.loadUserLeagues();
    this.loadGlobalLeaderboard();
    this.loadHistory();

    // Comprobar parámetros de ruta (ej: /join/:inviteCode)
    const routeInvite = this.route.snapshot.paramMap.get('inviteCode');
    if (routeInvite) {
      this.activeTab.set('ligas');
      this.leagueSubTab.set('join');
      this.joinCode = routeInvite;
    }

    // Comprobar query params (ej: ?tab=ligas o ?tab=global)
    this.route.queryParamMap.subscribe((params) => {
      const tabParam = params.get('tab');
      if (tabParam === 'ligas') {
        this.activeTab.set('ligas');
      } else if (tabParam === 'global') {
        this.activeTab.set('global');
      } else if (tabParam === 'historial') {
        this.activeTab.set('historial');
      } else {
        this.activeTab.set('pronostico');
      }
    });
  }

  private loadNextSession() {
    this.api.nextSession().subscribe({
      next: (sess) => {
        this.session.set(sess);
        // Si no se asignó duelo, usa el por defecto de la sesión
        if (!this.duelWinnerId() && sess.matchupDriver1) {
          this.duelWinnerId.set(sess.matchupDriver1);
        }
      },
      error: () => {}
    });
  }

  private loadCurrentPrediction() {
    this.api.currentPrediction().subscribe({
      next: (pred) => {
        if (pred) {
          if (pred.podium && pred.podium.length >= 3) {
            this.p1DriverId.set(pred.podium[0]);
            this.p2DriverId.set(pred.podium[1]);
            this.p3DriverId.set(pred.podium[2]);
          }
          if (pred.polePositionDriverId) {
            this.poleDriverId.set(pred.polePositionDriverId);
          }
          if (pred.duelDriverPick) {
            this.duelWinnerId.set(pred.duelDriverPick);
          }
          if (pred.safetyCarCount != null) {
            this.safetyCars.set(pred.safetyCarCount);
          }
          if (pred.dnfCount != null) {
            this.dnfs.set(pred.dnfCount);
          }
          if (pred.predictionId || pred.submittedAt || (pred.podium && pred.podium.length > 0)) {
            this.hasExistingPrediction.set(true);
            this.predictionSubmittedAt.set(pred.submittedAt || null);
          }
        }
      },
      error: () => {}
    });
  }

  private loadUserLeagues() {
    this.api.leagues().subscribe({
      next: (leagues) => {
        this.myLeagues.set(leagues);
        if (leagues.length > 0) {
          const current = this.selectedLeague();
          const match = current ? leagues.find(l => l.id === current.id) : null;
          this.selectLeague(match || leagues[0]);
        }
      },
      error: () => {
        this.myLeagues.set([]);
      }
    });
  }

  selectLeague(league: League) {
    this.selectedLeague.set(league);
    this.api.leagueLeaderboard(league.id).subscribe({
      next: (lb) => {
        this.leagueLeaderboard.set(lb);
      },
      error: () => {
        this.leagueLeaderboard.set([]);
      }
    });
  }

  private loadGlobalLeaderboard() {
    this.api.globalLeaderboard().subscribe({
      next: (lb) => {
        this.globalLeaderboard.set(lb);
        // Sincronizar puntos de usuario actual en navbar si coincide
        const myName = this.auth.username()?.toLowerCase();
        if (myName) {
          const me = lb.find(u => u.displayName.toLowerCase().includes(myName));
          if (me) {
            this.auth.userPoints.set(me.totalScore);
          }
        }
      },
      error: () => {
        this.globalLeaderboard.set([]);
      }
    });
  }

  private loadHistory() {
    this.api.predictionHistory().subscribe({
      next: (items) => {
        this.historyItems.set(items || []);
      },
      error: () => {
        this.historyItems.set([]);
      }
    });
  }

  incrementSC() {
    if (this.isLocked()) return;
    if (this.safetyCars() < 10) this.safetyCars.update(v => v + 1);
  }

  decrementSC() {
    if (this.isLocked()) return;
    if (this.safetyCars() > 0) this.safetyCars.update(v => v - 1);
  }

  incrementDNFs() {
    if (this.isLocked()) return;
    if (this.dnfs() < 20) this.dnfs.update(v => v + 1);
  }

  decrementDNFs() {
    if (this.isLocked()) return;
    if (this.dnfs() > 0) this.dnfs.update(v => v - 1);
  }

  getDriverName(id?: string | null): string {
    if (!id) return 'Piloto';
    const found = this.drivers.find(d => d.id === id);
    return found ? `${found.name} (${found.team})` : id;
  }

  savePrediction() {
    if (this.isPodiumDuplicate() || this.isSaving() || this.isLocked()) return;
    
    const sess = this.session();
    const sessionId = sess?.id || 'f0c23d70-f7ca-411d-b827-7a9d45037100';

    this.isSaving.set(true);
    this.saveError.set('');
    this.saveSuccess.set(false);

    const payload = {
      podium: [this.p1DriverId(), this.p2DriverId(), this.p3DriverId()],
      polePositionDriverId: this.poleDriverId(),
      duelDriverPick: this.duelWinnerId(),
      safetyCarCount: this.safetyCars(),
      dnfCount: this.dnfs()
    };

    this.api.submitPrediction(sessionId, payload).subscribe({
      next: (res) => {
        this.isSaving.set(false);
        this.saveSuccess.set(true);
        this.hasExistingPrediction.set(true);
        this.predictionSubmittedAt.set(res?.submittedAt || new Date().toISOString());
        this.loadHistory();
        this.loadGlobalLeaderboard();
        if (this.selectedLeague()) {
          this.selectLeague(this.selectedLeague()!);
        }
        setTimeout(() => this.saveSuccess.set(false), 4000);
      },
      error: (err) => {
        this.isSaving.set(false);
        this.saveError.set(err.error?.message || err.error?.description || 'Error al persistir el pronóstico en la base de datos.');
      }
    });
  }

  getInviteUrl(code?: string): string {
    if (!code) return '';
    const origin = typeof window !== 'undefined' ? window.location.origin : 'https://dacs-nine.vercel.app';
    return `${origin}/join/${code}`;
  }

  copyInviteUrl() {
    const code = this.selectedLeague()?.inviteCode;
    if (!code) return;
    const url = this.getInviteUrl(code);
    navigator.clipboard.writeText(url).then(() => {
      this.copySuccess.set(true);
      setTimeout(() => this.copySuccess.set(false), 2000);
    });
  }

  createLeague() {
    const name = this.newLeagueName.trim();
    if (!name || this.isCreatingLeague()) return;

    this.isCreatingLeague.set(true);
    this.leagueError.set('');
    this.leagueSuccess.set('');

    const desc = this.newLeagueDescription.trim() || undefined;
    const pwd = this.newLeaguePassword.trim() || undefined;

    this.api.createLeague(name, desc, pwd).subscribe({
      next: (created) => {
        this.isCreatingLeague.set(false);
        this.myLeagues.update((prev) => [created, ...prev]);
        this.selectLeague(created);
        this.newLeagueName = '';
        this.newLeagueDescription = '';
        this.newLeaguePassword = '';
        this.leagueSuccess.set(`¡Liga "${created.name}" creada y persistida con éxito en la base de datos!`);
        this.leagueSubTab.set('list');
        setTimeout(() => this.leagueSuccess.set(''), 5000);
      },
      error: (err) => {
        this.isCreatingLeague.set(false);
        this.leagueError.set(err.error?.message || err.error?.description || 'No se pudo crear la liga.');
      }
    });
  }

  joinLeague() {
    let raw = this.joinCode.trim();
    if (!raw || this.isJoiningLeague()) return;

    if (raw.includes('/join/')) {
      raw = raw.substring(raw.lastIndexOf('/join/') + 6);
    }
    if (raw.includes('/')) {
      raw = raw.substring(raw.lastIndexOf('/') + 1);
    }
    const inviteCode = raw.trim();
    const pwd = this.joinPassword.trim() || undefined;

    this.isJoiningLeague.set(true);
    this.leagueError.set('');
    this.leagueSuccess.set('');

    this.api.joinLeague(inviteCode, pwd).subscribe({
      next: (joined) => {
        this.isJoiningLeague.set(false);
        this.loadUserLeagues();
        this.selectLeague(joined);
        this.joinCode = '';
        this.joinPassword = '';
        this.leagueSuccess.set(`¡Te uniste con éxito a la liga "${joined.name}"!`);
        this.leagueSubTab.set('list');
        setTimeout(() => this.leagueSuccess.set(''), 5000);
      },
      error: (err) => {
        this.isJoiningLeague.set(false);
        this.leagueError.set(err.error?.message || err.error?.description || 'Código o link no válido o contraseña incorrecta.');
      }
    });
  }
}
