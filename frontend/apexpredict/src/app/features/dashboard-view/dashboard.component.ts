import { Component, inject, OnInit, signal, computed, HostListener } from '@angular/core';
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
  PredictionDetail,
  PredictionHistoryItem,
  JolpicaDriverStanding,
  JolpicaConstructorStanding,
  resolveCircuitShortName
} from '../../core/models/api.models';
import { PodiumPickerComponent, PodiumSelection } from './components/podium-picker/podium-picker.component';
import { DriverPickerModalComponent } from '../../shared/components/driver-picker-modal/driver-picker-modal.component';
import { PodiumSlot } from '../../core/models/f1-drivers.model';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, FormsModule, DatePipe, PodiumPickerComponent, DriverPickerModalComponent],
  template: `
    <div class="dashboard-page">


      <!-- ========================================== -->
      <!-- TAB 1: PRONÓSTICO GP                       -->
      <!-- ========================================== -->
      @if (activeTab() === 'pronostico') {
        <section class="tab-content">
          <div class="section-hero">
            <div class="hero-intro">
              <span class="badge-round">ROUND {{ session()?.round || 19 }} // {{ circuitShortName() }}</span>
              <h2>Configuración de Pronósticos Oficiales</h2>
              <p class="subtitle">Asigná los 3 puestos de podio sin duplicar, poleman, duelo de la fecha y telemetría de carrera.</p>

              <!-- DETALLE DE LOS PUNTAJES OFICIALES DE LA PREDICCIÓN -->
              <div class="scoring-rules-panel">
                <div class="scoring-rules-title">Los puntajes:</div>
                <div class="scoring-groups-list">
                  <!-- PREDICCIONES DEL PODIO DE LA CARRERA -->
                  <div class="scoring-group">
                    <div class="scoring-group-label">Predicciones del podio de la carrera:</div>
                    <div class="scoring-group-cards">
                      <div class="scoring-rule-card">
                        <span class="rule-card-indicator gold"></span>
                        <span class="rule-card-label">Acierto de podio completo:</span>
                        <span class="rule-card-pts gold">+10 pts</span>
                      </div>
                      <div class="scoring-rule-card">
                        <span class="rule-card-indicator silver"></span>
                        <span class="rule-card-label">Acierto de 2 posiciones del podio:</span>
                        <span class="rule-card-pts silver">+7 pts</span>
                      </div>
                      <div class="scoring-rule-card">
                        <span class="rule-card-indicator bronze"></span>
                        <span class="rule-card-label">Acierto 1 posición del podio:</span>
                        <span class="rule-card-pts bronze">+3 pts</span>
                      </div>
                    </div>
                  </div>

                  <!-- SUBGRUPOS DE OTRAS PREDICCIONES -->
                  <div class="scoring-subgroups-grid">
                    <div class="scoring-group">
                      <div class="scoring-group-label">Predicción del poleman:</div>
                      <div class="scoring-group-cards">
                        <div class="scoring-rule-card">
                          <span class="rule-card-indicator cyan"></span>
                          <span class="rule-card-label">Poleman:</span>
                          <span class="rule-card-pts cyan">+4 pts</span>
                        </div>
                      </div>
                    </div>

                    <div class="scoring-group">
                      <div class="scoring-group-label">Predicción del duelo de pilotos:</div>
                      <div class="scoring-group-cards">
                        <div class="scoring-rule-card">
                          <span class="rule-card-indicator duel"></span>
                          <span class="rule-card-label">Ganador del duelo de pilotos:</span>
                          <span class="rule-card-pts duel">+3 pts</span>
                        </div>
                      </div>
                    </div>

                    <div class="scoring-group">
                      <div class="scoring-group-label">Predicción de Safety Car / VSC:</div>
                      <div class="scoring-group-cards">
                        <div class="scoring-rule-card">
                          <span class="rule-card-indicator sc"></span>
                          <span class="rule-card-label">Safety car /VSC:</span>
                          <span class="rule-card-pts sc">+10 pts</span>
                        </div>
                      </div>
                    </div>

                    <div class="scoring-group">
                      <div class="scoring-group-label">Predicción de abandonos (DNF):</div>
                      <div class="scoring-group-cards">
                        <div class="scoring-rule-card">
                          <span class="rule-card-indicator dnf"></span>
                          <span class="rule-card-label">DNF:</span>
                          <span class="rule-card-pts dnf">+15 pts</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <!-- CARTEL DINÁMICO DE ESTADO CON SEMÁFORO F1 -->
          @if (isSaving()) {
            <!-- ESTADO AMARILLO: CARGANDO -->
            <div class="prediction-status-card status-yellow">
              <div class="traffic-lights-box" aria-hidden="true">
                <div class="traffic-housing">
                  <span class="traffic-light light-red off"></span>
                  <span class="traffic-light light-yellow on pulse"></span>
                  <span class="traffic-light light-green off"></span>
                </div>
              </div>
              <div class="status-content">
                <div class="status-headline">
                  <span class="status-indicator-tag yellow">EN PROCESO</span>
                  <h3 class="status-text yellow">Cargando pronóstico...</h3>
                </div>
                <p class="status-subtext">
                  Conectando con los servidores y sincronizando tus elecciones en la base de datos...
                </p>
              </div>
            </div>
          } @else if (hasExistingPrediction()) {
            <!-- ESTADO VERDE: CARGADO -->
            <div class="prediction-status-card status-green">
              <div class="traffic-lights-box" aria-hidden="true">
                <div class="traffic-housing">
                  <span class="traffic-light light-red off"></span>
                  <span class="traffic-light light-yellow off"></span>
                  <span class="traffic-light light-green on"></span>
                </div>
              </div>
              <div class="status-content">
                <div class="status-headline">
                  <span class="status-indicator-tag green">GUARDADO</span>
                  <h3 class="status-text green">Pronóstico cargado</h3>
                </div>
                <p class="status-subtext">
                  Tu pronóstico oficial está activo y registrado en la base de datos para este Gran Premio.
                  @if (predictionSubmittedAt()) {
                    <span class="status-timestamp">
                      (Último envío: {{ predictionSubmittedAt() | date:'d/MM HH:mm':'America/Argentina/Buenos_Aires' }} hs Arg)
                    </span>
                  }
                </p>
              </div>
            </div>
          } @else {
            <!-- ESTADO ROJO: SIN CARGAR -->
            <div class="prediction-status-card status-red">
              <div class="traffic-lights-box" aria-hidden="true">
                <div class="traffic-housing">
                  <span class="traffic-light light-red on"></span>
                  <span class="traffic-light light-yellow off"></span>
                  <span class="traffic-light light-green off"></span>
                </div>
              </div>
              <div class="status-content">
                <div class="status-headline">
                  <span class="status-indicator-tag red">PENDIENTE</span>
                  <h3 class="status-text red">Pronóstico sin cargar</h3>
                </div>
                <p class="status-subtext">
                  Aún no has registrado tu pronóstico oficial para este Gran Premio. Completá tus selecciones abajo y presioná "Guardar Pronóstico".
                </p>
              </div>
            </div>
          }

          @if (isLocked()) {
            <div class="alert-box error" style="margin-bottom: 1rem;">
              <strong>PRONÓSTICOS BLOQUEADOS:</strong> La sesión oficial ya ha comenzado. El pronóstico se encuentra en modo solo lectura.
            </div>
          }

          @if (saveError()) {
            <div class="alert-box error" style="margin-bottom: 1rem;">
              {{ saveError() }}
            </div>
          }

          <!-- 1. PODIO OFICIAL DE CARRERA (P1, P2, P3) - COMPONENTE MODULAR -->
          <app-podium-picker 
            [(p1DriverId)]="p1DriverId"
            [(p2DriverId)]="p2DriverId"
            [(p3DriverId)]="p3DriverId"
            (onSavePodium)="handleSavePodium($event)" />


          <!-- 2. POLEMAN, SAFETY CARS Y ABANDONOS (MISMA LÍNEA) -->
          <div class="grid-three-cols">
            <!-- TARJETA 1: POLE POSITION -->
            <div class="spotlight-card telemetry-card pole-card">
              <div class="card-title-row">
                <div class="card-title-group">
                  <span class="telemetry-icon-badge pole">P</span>
                  <div>
                    <h4>Pole Position (Sábado)</h4>
                    <span class="dim" style="font-size: 0.82rem;">Piloto más veloz en Q3</span>
                  </div>
                </div>
              </div>
              
              @if (getDriver(poleDriverId()); as d) {
                <div class="driver-template-card pole-slot" 
                     [style.--driver-color]="d.teamColor"
                     (click)="openDriverPicker('pole')"
                     [class.disabled-card]="isLocked()">
                  <div class="dtc-header">
                    <span class="dtc-team" [style.color]="d.teamColor" [style.background]="d.teamColor + '20'">
                      {{ d.team }}
                    </span>
                    <div class="dtc-badges">
                      <span class="dtc-code">{{ d.code }}</span>
                      <span class="dtc-num">#{{ d.number }}</span>
                    </div>
                  </div>
                  <div class="dtc-main">
                    <div class="dtc-name">{{ d.name }}</div>
                  </div>
                  <div class="dtc-action">
                    <span>Cambiar Piloto</span>
                    <span class="action-icon">⇄</span>
                    <button type="button" class="btn-slot-remove" title="Quitar selección" (click)="$event.stopPropagation(); poleDriverId.set('')">
                      ✕
                    </button>
                  </div>
                </div>
              } @else {
                <div class="driver-template-card empty-slot pole-slot" 
                     (click)="openDriverPicker('pole')"
                     [class.disabled-card]="isLocked()">
                  <div class="dtc-empty-state">
                    <span class="empty-icon">+</span>
                    <span class="empty-text">Elegir Poleman</span>
                    <span class="empty-hint">Click para seleccionar</span>
                  </div>
                </div>
              }
            </div>

            <!-- TARJETA 2: SAFETY CAR -->
            <div class="spotlight-card telemetry-card sc-card">
              <div class="card-title-row">
                <div class="card-title-group">
                  <span class="telemetry-icon-badge sc">SC</span>
                  <div>
                    <h4>Auto de Seguridad (Safety Car)</h4>
                    <span class="dim" style="font-size: 0.82rem;">Apariciones físicas de SC o Virtual SC</span>
                  </div>
                </div>
              </div>

              <div class="telemetry-display-box">
                <div class="stepper-hero">
                  <button 
                    type="button" 
                    class="step-hero-btn" 
                    [disabled]="isLocked() || safetyCars() <= 0" 
                    (click)="decrementSC()"
                    aria-label="Disminuir Safety Cars">
                    −
                  </button>
                  <div class="step-hero-center">
                    <span class="step-hero-val">{{ safetyCars() }}</span>
                    <span class="step-hero-unit">{{ safetyCars() === 1 ? 'Aparición estimada' : 'Apariciones estimadas' }}</span>
                  </div>
                  <button 
                    type="button" 
                    class="step-hero-btn" 
                    [disabled]="isLocked() || safetyCars() >= 10" 
                    (click)="incrementSC()"
                    aria-label="Aumentar Safety Cars">
                    +
                  </button>
                </div>
                <div class="telemetry-range-hint">
                  <span>Rango: 0 a 10</span>
                  <span class="telemetry-status-pill">
                    {{ safetyCars() === 0 ? 'Carrera Limpia' : (safetyCars() <= 2 ? 'Normal' : 'Accidentada') }}
                  </span>
                </div>
              </div>
            </div>

            <!-- TARJETA 3: ABANDONOS DNFs -->
            <div class="spotlight-card telemetry-card dnf-card">
              <div class="card-title-row">
                <div class="card-title-group">
                  <span class="telemetry-icon-badge dnf">DNF</span>
                  <div>
                    <h4>Abandonos de Carrera (DNFs)</h4>
                    <span class="dim" style="font-size: 0.82rem;">Monoplazas fuera de carrera</span>
                  </div>
                </div>
              </div>

              <div class="telemetry-display-box">
                <div class="stepper-hero">
                  <button 
                    type="button" 
                    class="step-hero-btn" 
                    [disabled]="isLocked() || dnfs() <= 0" 
                    (click)="decrementDNFs()"
                    aria-label="Disminuir Abandonos">
                    −
                  </button>
                  <div class="step-hero-center">
                    <span class="step-hero-val">{{ dnfs() }}</span>
                    <span class="step-hero-unit">{{ dnfs() === 1 ? 'Auto retirado' : 'Autos retirados' }}</span>
                  </div>
                  <button 
                    type="button" 
                    class="step-hero-btn" 
                    [disabled]="isLocked() || dnfs() >= 20" 
                    (click)="incrementDNFs()"
                    aria-label="Aumentar Abandonos">
                    +
                  </button>
                </div>
                <div class="telemetry-range-hint">
                  <span>Rango: 0 a 20</span>
                  <span class="telemetry-status-pill">
                    {{ dnfs() === 0 ? 'Sin Abandonos' : (dnfs() <= 3 ? 'Desgaste Normal' : 'Alto Caos') }}
                  </span>
                </div>
              </div>
            </div>
          </div>

          <!-- 3. DUELO DE PILOTOS DEBAJO A ANCHO COMPLETO -->
          <div class="spotlight-card duel-spotlight-card">
            <div class="card-title-row">
              <div class="duel-title-wrap">
                <div class="duel-badge-icon" aria-hidden="true">
                  <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <path d="M14.5 17.5L3 6V3h3l11.5 11.5"/>
                    <path d="m13 19 6 2 2-6-2-2-6 6Z"/>
                    <path d="M9.5 6.5 21 18v3h-3L6.5 9.5"/>
                    <path d="m11 5-6-2-2 6 2 2 6-6Z"/>
                  </svg>
                </div>
                <div>
                  <h4>Duelo Directo de la Fecha</h4>
                  <span class="dim" style="font-size: 0.82rem;">Elegí qué piloto superará a su rival directo en el fin de semana</span>
                </div>
              </div>
            </div>

            <!-- SELECTOR DE PILOTOS EN FORMATO ARENA F1 -->
            <div class="duel-arena-grid">
              <!-- PILOTO 1 -->
              @if (getDriver(matchupDriver1()); as d1) {
                <button 
                  type="button"
                  class="duel-driver-card"
                  [class.selected]="duelWinnerId() === d1.id"
                  [class.unselected]="duelWinnerId() && duelWinnerId() !== d1.id"
                  [style.--driver-team-color]="d1.teamColor"
                  [disabled]="isLocked()"
                  (click)="toggleDuelWinner(d1.id)"
                  aria-label="Seleccionar a {{ d1.name }} como ganador del duelo">
                  <div class="ddc-top">
                    <span class="ddc-team-pill" [style.color]="d1.teamColor" [style.background]="d1.teamColor + '18'">
                      {{ d1.team }}
                    </span>
                    <span class="ddc-number">#{{ d1.number }}</span>
                  </div>
                  <div class="ddc-name">{{ d1.name }}</div>
                  <div class="ddc-selection-status">
                    @if (duelWinnerId() === d1.id) {
                      <span class="status-picked">
                        <svg class="check-icon-svg" viewBox="0 0 20 20" width="13" height="13" fill="currentColor" aria-hidden="true">
                          <path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd"/>
                        </svg>
                        GANADOR ELEGIDO
                      </span>
                    } @else {
                      <span class="status-choose">Elegir Piloto</span>
                    }
                  </div>
                </button>
              } @else {
                <button 
                  type="button"
                  class="duel-driver-card"
                  [class.selected]="duelWinnerId() === matchupDriver1()"
                  [class.unselected]="duelWinnerId() && duelWinnerId() !== matchupDriver1()"
                  [disabled]="isLocked()"
                  (click)="toggleDuelWinner(matchupDriver1())">
                  <div class="ddc-name">{{ getDriverName(matchupDriver1()) }}</div>
                </button>
              }

              <!-- VS BADGE -->
              <div class="duel-vs-separator" aria-hidden="true">
                <span class="vs-text">VS</span>
              </div>

              <!-- PILOTO 2 -->
              @if (getDriver(matchupDriver2()); as d2) {
                <button 
                  type="button"
                  class="duel-driver-card"
                  [class.selected]="duelWinnerId() === d2.id"
                  [class.unselected]="duelWinnerId() && duelWinnerId() !== d2.id"
                  [style.--driver-team-color]="d2.teamColor"
                  [disabled]="isLocked()"
                  (click)="toggleDuelWinner(d2.id)"
                  aria-label="Seleccionar a {{ d2.name }} como ganador del duelo">
                  <div class="ddc-top">
                    <span class="ddc-team-pill" [style.color]="d2.teamColor" [style.background]="d2.teamColor + '18'">
                      {{ d2.team }}
                    </span>
                    <span class="ddc-number">#{{ d2.number }}</span>
                  </div>
                  <div class="ddc-name">{{ d2.name }}</div>
                  <div class="ddc-selection-status">
                    @if (duelWinnerId() === d2.id) {
                      <span class="status-picked">
                        <svg class="check-icon-svg" viewBox="0 0 20 20" width="13" height="13" fill="currentColor" aria-hidden="true">
                          <path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd"/>
                        </svg>
                        GANADOR ELEGIDO
                      </span>
                    } @else {
                      <span class="status-choose">Elegir Piloto</span>
                    }
                  </div>
                </button>
              } @else {
                <button 
                  type="button"
                  class="duel-driver-card"
                  [class.selected]="duelWinnerId() === matchupDriver2()"
                  [class.unselected]="duelWinnerId() && duelWinnerId() !== matchupDriver2()"
                  [disabled]="isLocked()"
                  (click)="toggleDuelWinner(matchupDriver2())">
                  <div class="ddc-name">{{ getDriverName(matchupDriver2()) }}</div>
                </button>
              }
            </div>

            <!-- BLOQUE EXPLICATIVO DE CRITERIOS DE VICTORIA Y DESEMPATE -->
            <div class="duel-criteria-panel">
              <div class="criteria-header-row">
                <svg class="criteria-svg" viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                  <path d="m16 16 3-8 3 8c-.87.65-1.92 1-3 1s-2.13-.35-3-1Z"/>
                  <path d="m2 16 3-8 3 8c-.87.65-1.92 1-3 1s-2.13-.35-3-1Z"/>
                  <path d="M7 21h10"/>
                  <path d="M12 3v18"/>
                  <path d="M3 7h2c2 0 5-1 7-2 2 1 5 2 7 2h2"/>
                </svg>
                <span class="criteria-label">Criterio de definición del duelo:</span>
              </div>
              <div class="criteria-items-list">
                <div class="criteria-item">
                  <span class="criteria-badge-num">1</span>
                  <div class="criteria-desc">
                    <strong>Puntos del fin de semana:</strong> Gana quien sume la mayor cantidad de puntos oficiales en la fecha.
                  </div>
                </div>
                <div class="criteria-item">
                  <span class="criteria-badge-num">2</span>
                  <div class="criteria-desc">
                    <strong>En formato Sprint:</strong> Se calcula la combinatoria de puntos obtenidos en ambas carreras (Sprint + GP Domingo).
                  </div>
                </div>
                <div class="criteria-item">
                  <span class="criteria-badge-num">3</span>
                  <div class="criteria-desc">
                    <strong>Criterio de desempate:</strong> A igualdad de puntos (o sin unidades), se define por la <strong>mejor posición final en carrera</strong>.
                  </div>
                </div>
              </div>
            </div>
          </div>

          <!-- BOTÓN DE GUARDADO CON FEEDBACK -->
          <div class="submit-bar">
            <button 
              class="button" 
              type="button" 
              [disabled]="!canSavePrediction()" 
              (click)="savePrediction()">
              @if (isSaving()) {
                <span>Sincronizando con base de datos…</span>
              } @else if (saveSuccess()) {
                <span>¡Pronóstico Guardado en Servidor!</span>
              } @else if (isLocked()) {
                <span>Pronósticos Cerrados</span>
              } @else if (isPodiumDuplicate()) {
                <span>No podés repetir pilotos en el podio</span>
              } @else if (hasExistingPrediction()) {
                <span>Actualizar Mi Pronóstico Oficial</span>
              } @else {
                <span>Guardar Mi Pronóstico Oficial</span>
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
              Mis Ligas ({{ myLeagues().length }})
            </button>
            <button 
              type="button"
              [class.active]="leagueSubTab() === 'create'" 
              (click)="leagueSubTab.set('create')">
              Crear Nueva Liga
            </button>
            <button 
              type="button"
              [class.active]="leagueSubTab() === 'join'" 
              (click)="leagueSubTab.set('join')">
              Unirse por Link / Clave
            </button>
          </div>

          @if (leagueSuccess()) {
            <div class="alert-box success">
              {{ leagueSuccess() }}
            </div>
          }

          @if (leagueError()) {
            <div class="alert-box error">
              {{ leagueError() }}
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
                      {{ l.name }}
                      @if (l.hasPassword) {
                        <span class="lock-indicator" title="Protegida con contraseña" style="display: inline-flex; vertical-align: middle; margin-left: 4px;">
                          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                            <rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect>
                            <path d="M7 11V7a5 5 0 0 1 10 0v4"></path>
                          </svg>
                        </span>
                      }
                    </button>
                  }
                </div>
              }

              <!-- CAJA DE INVITACIÓN DIRECTA DE LA LIGA SELECCIONADA -->
              <div class="invite-strip">
                <div class="invite-row">
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
                      {{ copySuccess() ? 'Copiado' : 'Copiar Link' }}
                    </button>
                  </div>
                </div>

                @if (selectedLeague()?.hasPassword) {
                  <div class="league-password-bar">
                    <div class="password-label-group">
                      <span class="password-tag">CONTRASEÑA DE ACCESO</span>
                      <p class="password-hint">
                        Esta liga está protegida. Los corredores necesitarán esta clave para ingresar.
                      </p>
                    </div>
                    <div class="password-action-group">
                      <div class="password-field-container">
                        <input 
                          [type]="showLeaguePassword() ? 'text' : 'password'" 
                          readonly 
                          [value]="getLeaguePassword(selectedLeague())" 
                          class="password-display-input"
                          aria-label="Contraseña de la liga" />
                        <button 
                          type="button" 
                          class="password-visibility-btn" 
                          (click)="toggleLeaguePasswordVisibility()"
                          [title]="showLeaguePassword() ? 'Ocultar contraseña' : 'Ver contraseña'"
                          [attr.aria-label]="showLeaguePassword() ? 'Ocultar contraseña' : 'Ver contraseña'">
                          @if (showLeaguePassword()) {
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                              <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"></path>
                              <line x1="1" y1="1" x2="23" y2="23"></line>
                            </svg>
                          } @else {
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                              <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
                              <circle cx="12" cy="12" r="3"></circle>
                            </svg>
                          }
                        </button>
                      </div>
                      <button class="button small quiet" type="button" (click)="copyLeaguePassword()">
                        {{ copyPasswordSuccess() ? 'Copiada' : 'Copiar Clave' }}
                      </button>
                    </div>
                  </div>
                }
              </div>

              <!-- PODIO TOP 3 DE LA LIGA -->
              <div class="spotlight-card">
                <div style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 8px;">
                  <h3 class="podium-title" style="margin: 0;">Podio de la Liga: {{ selectedLeague()?.name }}</h3>
                  @if (selectedLeague()?.hasPassword) {
                    <div 
                      class="password-pill-badge" 
                      (click)="toggleLeaguePasswordVisibility()"
                      role="button"
                      tabindex="0"
                      title="Clic para mostrar u ocultar la contraseña">
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                        <rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect>
                        <path d="M7 11V7a5 5 0 0 1 10 0v4"></path>
                      </svg>
                      <span>Clave: <strong class="font-mono">{{ showLeaguePassword() ? getLeaguePassword(selectedLeague()) : '••••••••' }}</strong></span>
                      <span class="pill-toggle-action">
                        {{ showLeaguePassword() ? '(Ocultar)' : '(Mostrar)' }}
                      </span>
                    </div>
                  }
                </div>

                @if (leagueLeaderboard().length >= 1) {
                  <div class="league-podium-pedestals">
                    <!-- P2: PLATA -->
                    <div class="pedestal silver-ped">
                      <div class="pos-badge">P2</div>
                      <div class="pilot-name">{{ leagueLeaderboard()[1]?.displayName || 'Esperando corredor' }}</div>
                      <div class="pilot-pts">{{ leagueLeaderboard()[1]?.totalScore || 0 }} pts</div>
                      <span class="dim" style="font-size: 0.75rem; margin-top: 2px;">
                        {{ (leagueLeaderboard()[1]?.predictionsCount || 0) > 0 ? 'Pronóstico cargado' : 'Pendiente' }}
                      </span>
                    </div>

                    <!-- P1: ORO -->
                    <div class="pedestal gold-ped">
                      <div class="crown" aria-hidden="true">
                        <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="var(--gold)" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
                          <path d="M6 9H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h2"/>
                          <path d="M18 9h2a2 2 0 0 0 2-2V5a2 2 0 0 0-2-2h-2"/>
                          <path d="M4 22h16"/>
                          <path d="M10 14.66V17c0 .55-.45 1-1 1H7c-.55 0-1 .45-1 1v1c0 .55.45 1 1 1h10c.55 0 1-.45 1-1v-1c0-.55-.45-1-1-1h-2c-.55 0-1-.45-1-1v-2.34"/>
                          <path d="M6 4h12a2 2 0 0 1 2 2v3a6 6 0 0 1-6 6h-4a6 6 0 0 1-6-6V6a2 2 0 0 1 2-2z"/>
                        </svg>
                      </div>
                      <div class="pos-badge">P1</div>
                      <div class="pilot-name">{{ leagueLeaderboard()[0]?.displayName || 'Líder' }}</div>
                      <div class="pilot-pts">{{ leagueLeaderboard()[0]?.totalScore || 0 }} pts</div>
                      <span class="dim" style="font-size: 0.75rem; margin-top: 2px;">
                        {{ (leagueLeaderboard()[0]?.predictionsCount || 0) > 0 ? 'Pronóstico cargado' : 'Pendiente' }}
                      </span>
                    </div>

                    <!-- P3: BRONCE -->
                    <div class="pedestal bronze-ped">
                      <div class="pos-badge">P3</div>
                      <div class="pilot-name">{{ leagueLeaderboard()[2]?.displayName || 'Esperando corredor' }}</div>
                      <div class="pilot-pts">{{ leagueLeaderboard()[2]?.totalScore || 0 }} pts</div>
                      <span class="dim" style="font-size: 0.75rem; margin-top: 2px;">
                        {{ (leagueLeaderboard()[2]?.predictionsCount || 0) > 0 ? 'Pronóstico cargado' : 'Pendiente' }}
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
                              <span style="color: var(--green); font-weight: 600; font-size: 0.85rem;">Pronóstico Enviado</span>
                            } @else {
                              <span class="dim" style="font-size: 0.85rem;">Sin pronóstico aún</span>
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
                <div class="empty-state-f1-icon" style="margin: 0 auto 1.25rem; display: flex; justify-content: center;">
                  <svg width="68" height="68" viewBox="0 0 64 64" fill="none" stroke="currentColor">
                    <rect x="6" y="16" width="52" height="32" rx="8" stroke="var(--line-strong)" stroke-width="2" fill="rgba(255,255,255,0.03)" />
                    <circle cx="16" cy="32" r="4.5" fill="var(--red)" />
                    <circle cx="24" cy="32" r="4.5" fill="var(--red)" />
                    <circle cx="32" cy="32" r="4.5" fill="var(--red)" />
                    <circle cx="40" cy="32" r="4.5" fill="var(--red)" />
                    <circle cx="48" cy="32" r="4.5" fill="var(--red)" />
                    <line x1="32" y1="48" x2="32" y2="58" stroke="var(--line-strong)" stroke-width="3" stroke-linecap="round"/>
                    <line x1="22" y1="58" x2="42" y2="58" stroke="var(--line-strong)" stroke-width="3" stroke-linecap="round"/>
                  </svg>
                </div>
                <h2>Aún no pertenecés a ninguna liga privada</h2>
                <p class="dim" style="max-width: 500px; margin: 0.5rem auto 1.5rem;">
                  Creá tu propia liga privada con contraseña o ingresá mediante el link de invitación que te compartieron tus amigos.
                </p>
                <div style="display: flex; gap: 0.75rem; justify-content: center; flex-wrap: wrap;">
                  <button class="button" type="button" (click)="leagueSubTab.set('create')">Crear Nueva Liga</button>
                  <button class="button quiet" type="button" (click)="leagueSubTab.set('join')">Unirme por Link o Código</button>
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
                <label>Contraseña de Acceso (opcional)</label>
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
                {{ isCreatingLeague() ? 'Creando en base de datos…' : 'Crear Liga y Persistir' }}
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
                {{ isJoiningLeague() ? 'Verificando e ingresando…' : 'Unirme a la Liga' }}
              </button>
            </div>
          }
        </section>
      }

      <!-- ========================================== -->
      <!-- TAB 3: POSICIONES (JUGADORES, WDC, WCC)    -->
      <!-- ========================================== -->
      @if (activeTab() === 'posiciones') {
        <section class="tab-content">
          <!-- SUB-NAVEGACIÓN INTERNA DE POSICIONES -->
          <div class="sub-nav-leagues">
            <button 
              type="button"
              [class.active]="posicionesSubTab() === 'jugadores'" 
              (click)="posicionesSubTab.set('jugadores')">
              Jugadores Global ({{ globalLeaderboard().length }})
            </button>
            <button 
              type="button"
              [class.active]="posicionesSubTab() === 'pilotos'" 
              (click)="posicionesSubTab.set('pilotos')">
              Pilotos F1 (WDC)
            </button>
            <button 
              type="button"
              [class.active]="posicionesSubTab() === 'equipos'" 
              (click)="posicionesSubTab.set('equipos')">
              Equipos F1 (WCC)
            </button>
          </div>

          <!-- 1. JUGADORES GLOBAL (COMUNIDAD APEXPREDICT) -->
          @if (posicionesSubTab() === 'jugadores') {
            <div class="spotlight-card">
              <div class="card-title-row">
                <div>
                  <h3>Clasificación Global de la Comunidad</h3>
                  <p class="dim" style="margin-top: 4px;">Puntos y pronósticos registrados en tiempo real por todos los corredores de ApexPredict.</p>
                </div>
                <div style="display: flex; align-items: center; gap: 0.75rem;">
                  @if (isLoadingGlobalLeaderboard()) {
                    <span class="dim" style="font-size: 0.8rem; display: inline-flex; align-items: center; gap: 0.35rem;">
                      <span class="spinner-inline"></span> Sincronizando...
                    </span>
                  }
                  <span class="mono-pts">{{ globalLeaderboard().length }} Pilotos Registrados</span>
                </div>
              </div>

              @if (globalLeaderboard().length >= 3) {
                <div class="league-podium-pedestals">
                  <div class="pedestal silver-ped">
                    <div class="pos-badge">P2</div>
                    <div class="pilot-name">{{ globalLeaderboard()[1]?.displayName }}</div>
                    <div class="pilot-pts">{{ globalLeaderboard()[1]?.totalScore }} pts</div>
                    <span class="dim" style="font-size: 0.75rem; margin-top: 2px;">
                      {{ (globalLeaderboard()[1]?.predictionsCount || 0) > 0 ? 'Pronóstico cargado' : 'Pendiente' }}
                    </span>
                  </div>

                  <div class="pedestal gold-ped">
                    <div class="crown" aria-hidden="true">
                      <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="var(--gold)" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
                        <path d="M6 9H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h2"/>
                        <path d="M18 9h2a2 2 0 0 0 2-2V5a2 2 0 0 0-2-2h-2"/>
                        <path d="M4 22h16"/>
                        <path d="M10 14.66V17c0 .55-.45 1-1 1H7c-.55 0-1 .45-1 1v1c0 .55.45 1 1 1h10c.55 0 1-.45 1-1v-1c0-.55-.45-1-1-1h-2c-.55 0-1-.45-1-1v-2.34"/>
                        <path d="M6 4h12a2 2 0 0 1 2 2v3a6 6 0 0 1-6 6h-4a6 6 0 0 1-6-6V6a2 2 0 0 1 2-2z"/>
                      </svg>
                    </div>
                    <div class="pos-badge">P1</div>
                    <div class="pilot-name">{{ globalLeaderboard()[0]?.displayName }}</div>
                    <div class="pilot-pts">{{ globalLeaderboard()[0]?.totalScore }} pts</div>
                    <span class="dim" style="font-size: 0.75rem; margin-top: 2px;">
                      {{ (globalLeaderboard()[0]?.predictionsCount || 0) > 0 ? 'Pronóstico cargado' : 'Pendiente' }}
                    </span>
                  </div>

                  <div class="pedestal bronze-ped">
                    <div class="pos-badge">P3</div>
                    <div class="pilot-name">{{ globalLeaderboard()[2]?.displayName }}</div>
                    <div class="pilot-pts">{{ globalLeaderboard()[2]?.totalScore }} pts</div>
                    <span class="dim" style="font-size: 0.75rem; margin-top: 2px;">
                      {{ (globalLeaderboard()[2]?.predictionsCount || 0) > 0 ? 'Pronóstico cargado' : 'Pendiente' }}
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
                            <span style="color: var(--green); font-weight: 600; font-size: 0.85rem;">{{ entry.predictionsCount }} Carrera (Enviado)</span>
                          } @else {
                            <span class="dim" style="font-size: 0.85rem;">0 Carreras</span>
                          }
                        </td>
                      </tr>
                    }
                  </tbody>
                </table>
              } @else if (isLoadingGlobalLeaderboard()) {
                <div style="padding: 3rem 0; text-align: center;">
                  <div class="spinner-block"></div>
                  <p class="dim" style="margin: 0;">Conectando con el servidor y cargando clasificación global…</p>
                </div>
              } @else if (globalLeaderboardError()) {
                <div class="alert-box error" style="margin-top: 1.5rem; text-align: center; padding: 1.25rem;">
                  <p style="margin: 0 0 0.75rem 0; font-size: 0.9rem;">{{ globalLeaderboardError() }}</p>
                  <button type="button" class="btn-primary" (click)="loadGlobalLeaderboard()" style="display: inline-flex; align-items: center; gap: 0.5rem; margin: 0 auto; padding: 0.45rem 1.1rem; font-size: 0.85rem; cursor: pointer;">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                      <polyline points="23 4 23 10 17 10"></polyline>
                      <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"></path>
                    </svg>
                    Reintentar conexión
                  </button>
                </div>
              } @else {
                <p class="dim" style="padding: 2.5rem 0; text-align: center;">Aún no hay puntuaciones registradas en el campeonato global.</p>
              }
            </div>
          }

          <!-- 2. PILOTOS F1 (WDC) -->
          @if (posicionesSubTab() === 'pilotos') {
            <div class="spotlight-card">
              <div class="card-title-row">
                <div>
                  <h3>Campeonato Mundial de Pilotos (WDC)</h3>
                  <p class="dim" style="margin-top: 4px;">Tabla oficial de posiciones de pilotos F1 2026 suministrada por Jolpica F1 API.</p>
                </div>
                <span class="mono-pts">{{ driverStandings().length }} Pilotos F1</span>
              </div>

              @if (driverStandings().length > 0) {
                <table class="data-table">
                  <thead>
                    <tr>
                      <th>Pos</th>
                      <th>Piloto</th>
                      <th>Escudería</th>
                      <th>Nacionalidad</th>
                      <th>Victorias</th>
                      <th>Puntos Totales</th>
                    </tr>
                  </thead>
                  <tbody>
                    @for (d of driverStandings(); track d.driverId || d.position) {
                      <tr>
                        <td><strong>#{{ d.position }}</strong></td>
                        <td style="color: #fff; font-weight: 700;">
                          {{ d.name }}
                          @if (d.code) {
                            <span class="dtc-code" style="margin-left: 6px;">{{ d.code }}</span>
                          }
                        </td>
                        <td style="color: var(--text-muted);">{{ d.team }}</td>
                        <td class="dim">{{ d.nationality }}</td>
                        <td style="font-family: var(--font-mono); font-weight: 600;">{{ d.wins }}</td>
                        <td style="font-family: var(--font-mono); color: var(--gold); font-weight: 800;">{{ d.points }} pts</td>
                      </tr>
                    }
                  </tbody>
                </table>
              } @else {
                <p class="dim" style="padding: 2rem 0; text-align: center;">Cargando posiciones oficiales de pilotos de F1…</p>
              }
            </div>
          }

          <!-- 3. EQUIPOS F1 (WCC) -->
          @if (posicionesSubTab() === 'equipos') {
            <div class="spotlight-card">
              <div class="card-title-row">
                <div>
                  <h3>Campeonato Mundial de Constructores (WCC)</h3>
                  <p class="dim" style="margin-top: 4px;">Tabla oficial de posiciones de escuderías F1 2026 suministrada por Jolpica F1 API.</p>
                </div>
                <span class="mono-pts">{{ constructorStandings().length }} Escuderías</span>
              </div>

              @if (constructorStandings().length > 0) {
                <table class="data-table">
                  <thead>
                    <tr>
                      <th>Pos</th>
                      <th>Escudería</th>
                      <th>País / Origen</th>
                      <th>Victorias</th>
                      <th>Puntos Totales</th>
                    </tr>
                  </thead>
                  <tbody>
                    @for (c of constructorStandings(); track c.constructorId || c.position) {
                      <tr>
                        <td><strong>#{{ c.position }}</strong></td>
                        <td style="color: #fff; font-weight: 700; font-size: 1rem;">{{ c.name }}</td>
                        <td class="dim">{{ c.nationality }}</td>
                        <td style="font-family: var(--font-mono); font-weight: 600;">{{ c.wins }}</td>
                        <td style="font-family: var(--font-mono); color: var(--gold); font-weight: 800;">{{ c.points }} pts</td>
                      </tr>
                    }
                  </tbody>
                </table>
              } @else {
                <p class="dim" style="padding: 2rem 0; text-align: center;">Cargando posiciones oficiales de constructores de F1…</p>
              }
            </div>
          }
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
                <h3>Historial & Pronósticos del Usuario</h3>
                <p class="dim" style="margin-top: 4px;">Detalle de tus pronósticos guardados y puntos asignados por fecha.</p>
              </div>
            </div>

            <!-- AVISO TEMPORADA 2026 -->
            <div class="alert-box info" style="margin: 1rem 0; display: flex; align-items: flex-start; gap: 10px;">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--cyan)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="flex-shrink: 0; margin-top: 2px;"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="16" x2="12" y2="12"></line><line x1="12" y1="8" x2="12.01" y2="8"></line></svg>
              <div>
                <strong>Temporada F1 2026 en curso:</strong>
                A medida que se disputen los Grandes Premios y la FIA homologue las clasificaciones oficiales finales, tus resultados se puntuarán automáticamente.
                Hacé clic en cualquiera de las tarjetas de GP para comparar tus pronósticos contra los resultados oficiales de la FIA y ver tus aciertos y errores.
              </div>
            </div>

            @if (historyItems().length > 0) {
              <div class="history-grid">
                @for (h of historyItems(); track h.sessionId) {
                  <div class="history-card clickable-history-card" (click)="selectedHistoryItem.set(h)">
                    <div style="display: flex; justify-content: space-between; align-items: flex-start; gap: 8px;">
                      <div>
                        @if (h.score != null) {
                          <span class="badge-round" style="font-size: 0.7rem; background: var(--green);">CARRERA PUNTUADA</span>
                        } @else {
                          <span class="badge-round" style="font-size: 0.7rem; background: var(--gold); color: #000;">PRONÓSTICO REGISTRADO — EN ESPERA</span>
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

                    <!-- DETALLE DE PICKS GUARDADOS (VALOR PUESTO) -->
                    @if (h.podium && h.podium.length > 0) {
                      <div class="history-card-picks-box">
                        <div class="picks-box-header">
                          <span class="picks-box-badge">TU PRONÓSTICO (VALOR PUESTO)</span>
                          @if (h.submittedAt) {
                            <span class="dim" style="font-size: 0.72rem;">
                              {{ h.submittedAt | date:'d/MM HH:mm':'America/Argentina/Buenos_Aires' }} hs Arg
                            </span>
                          }
                        </div>
                        <div class="picks-content">
                          <div class="pick-line">
                            <span class="dim">Podio:</span>
                            <strong>P1:</strong> {{ getDriverName(h.podium[0]) }} • 
                            <strong>P2:</strong> {{ getDriverName(h.podium[1]) }} • 
                            <strong>P3:</strong> {{ getDriverName(h.podium[2]) }}
                          </div>
                          <div class="pick-line dim">
                            Pole: <strong style="color: var(--cyan);">{{ getDriverName(h.polePositionDriverId) }}</strong> • 
                            Duelo: <strong style="color: #fff;">{{ getDriverName(h.duelDriverPick) }}</strong> • 
                            SC: <strong style="color: #fff;">{{ h.safetyCarCount != null ? h.safetyCarCount : '--' }}</strong> • 
                            DNFs: <strong style="color: #fff;">{{ h.dnfCount != null ? h.dnfCount : '--' }}</strong>
                          </div>
                        </div>
                      </div>
                    }

                    <!-- DETALLE DE RESULTADO OFICIAL FIA (RESULTADO FINAL) -->
                    @if (h.officialResults) {
                      <div class="history-card-official-box">
                        <div class="official-box-header">
                          <span class="official-box-badge">RESULTADO OFICIAL FIA (RESULTADO FINAL)</span>
                          <span class="dim" style="font-size: 0.72rem;">Homologado</span>
                        </div>
                        <div class="picks-content">
                          <div class="pick-line">
                            <span class="dim">Podio Real:</span>
                            <strong style="color: var(--gold);">P1:</strong> {{ getDriverName(h.officialResults.podium?.[0]) }} • 
                            <strong style="color: var(--silver);">P2:</strong> {{ getDriverName(h.officialResults.podium?.[1]) }} • 
                            <strong style="color: var(--bronze);">P3:</strong> {{ getDriverName(h.officialResults.podium?.[2]) }}
                          </div>
                          <div class="pick-line dim">
                            Pole Real: <strong style="color: var(--cyan);">{{ getDriverName(h.officialResults.polePositionDriverId) }}</strong> • 
                            Duelo Ganador: <strong style="color: #fff;">{{ getDriverName(h.officialResults.duelWinnerId) }}</strong> • 
                            SC Reales: <strong style="color: #fff;">{{ h.officialResults.safetyCarCount != null ? h.officialResults.safetyCarCount : '--' }}</strong> • 
                            DNFs Reales: <strong style="color: #fff;">{{ h.officialResults.dnfCount != null ? h.officialResults.dnfCount : '--' }}</strong>
                          </div>
                        </div>
                      </div>
                    }

                    @if (h.scoreBreakdown) {
                      <div class="score-breakdown-tags" style="margin-top: 0.75rem; display: flex; flex-wrap: wrap; gap: 6px;">
                        <span class="chip-score" [class.hit]="h.scoreBreakdown.podiumHits > 0">
                          Podio: +{{ h.scoreBreakdown.podiumPoints }} pts ({{ h.scoreBreakdown.podiumHits }}/3)
                        </span>
                        <span class="chip-score" [class.hit]="h.scoreBreakdown.poleHit">
                          Pole: {{ h.scoreBreakdown.poleHit ? '+' + (h.scoreBreakdown.polePoints || 4) + ' pts' : '0 pts' }}
                        </span>
                        <span class="chip-score" [class.hit]="h.scoreBreakdown.duelHit">
                          Duelo: {{ h.scoreBreakdown.duelHit ? '+' + (h.scoreBreakdown.duelPoints || 3) + ' pts' : '0 pts' }}
                        </span>
                        <span class="chip-score" [class.hit]="h.scoreBreakdown.safetyCarHit">
                          Safety Car: {{ h.scoreBreakdown.safetyCarHit ? '+10 pts' : '0 pts' }}
                        </span>
                        <span class="chip-score" [class.hit]="h.scoreBreakdown.dnfHit">
                          DNFs: {{ h.scoreBreakdown.dnfHit ? '+15 pts' : '0 pts' }}
                        </span>
                      </div>
                    }

                    <div class="card-tap-hint">
                      <span>Tocar para comparar con resultados oficiales FIA</span>
                    </div>
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

      <!-- ========================================== -->
      <!-- MODAL SELECTOR DE PILOTOS MODULAR          -->
      <!-- ========================================== -->
      <app-driver-picker-modal
        [isOpen]="isPickerOpen()"
        [currentSlot]="pickerSlot()"
        [p1DriverId]="p1DriverId()"
        [p2DriverId]="p2DriverId()"
        [p3DriverId]="p3DriverId()"
        [poleDriverId]="poleDriverId()"
        (onClose)="closeDriverPicker()"
        (onDriverSelected)="handleModalDriverSelected($event)" />


      <!-- ========================================== -->
      <!-- MODAL COMPARATIVO: RESULTADOS vs OFICIALES -->
      <!-- ========================================== -->
      @if (selectedHistoryItem(); as item) {
        <div class="driver-picker-backdrop" (click)="selectedHistoryItem.set(null)">
          <div class="driver-picker-modal comparison-modal" (click)="$event.stopPropagation()">
            <div class="picker-header">
              <div>
                <div class="badge-round" style="margin-bottom: 4px;">ROUND COMPARATIVO // {{ item.circuit }}</div>
                <h3 class="picker-title" style="margin: 0;">{{ item.sessionName }}</h3>
                <p class="picker-subtitle">
                  Comparación entre tus pronósticos registrados y los resultados oficiales homologados por la FIA.
                </p>
              </div>
              <button type="button" class="picker-close-btn" (click)="selectedHistoryItem.set(null)" aria-label="Cerrar">✕</button>
            </div>

            <div class="comparison-modal-body custom-scrollbar" tabindex="0">
              <!-- RESUMEN DE PUNTOS TOTALES -->
              <div class="comparison-summary-bar">
                <div>
                  <span class="dim" style="font-size: 0.82rem;">PUNTAJE OBTENIDO EN ESTE GP:</span>
                  <div class="comp-total-pts">{{ item.score != null ? item.score : 0 }} <span style="font-size: 1rem; color: #fff;">/ 42 PTS</span></div>
                </div>
                <div class="comp-status-badge" [class.scored]="item.score != null">
                  {{ item.score != null ? 'CARRERA HOMOLOGADA Y PUNTUADA' : 'RESULTADOS OFICIALES EN ESPERA' }}
                </div>
              </div>

              @if (item.score == null) {
                <div class="alert-box info" style="margin: 0.4rem 0;">
                  <strong>Carrera pendiente de homologación:</strong> Esta sesión aún no ha finalizado o los comisarios de la FIA no han emitido la clasificación final oficial. Debajo podés revisar tus pronósticos guardados.
                </div>
              }

              <!-- RESUMEN EN CHIPS -->
              @if (item.scoreBreakdown) {
                <div class="score-breakdown-tags" style="display: flex; flex-wrap: wrap; gap: 8px;">
                  <span class="chip-score" [class.hit]="item.scoreBreakdown.podiumHits > 0">
                    Podio: +{{ item.scoreBreakdown.podiumPoints }} pts ({{ item.scoreBreakdown.podiumHits }}/3 aciertos)
                  </span>
                  <span class="chip-score" [class.hit]="item.scoreBreakdown.poleHit">
                    Pole: {{ item.scoreBreakdown.poleHit ? '+4 pts' : '0 pts' }}
                  </span>
                  <span class="chip-score" [class.hit]="item.scoreBreakdown.duelHit">
                    Duelo: {{ item.scoreBreakdown.duelHit ? '+3 pts' : '0 pts' }}
                  </span>
                  <span class="chip-score" [class.hit]="item.scoreBreakdown.safetyCarHit">
                    Safety Car: {{ item.scoreBreakdown.safetyCarHit ? '+10 pts' : '0 pts' }}
                  </span>
                  <span class="chip-score" [class.hit]="item.scoreBreakdown.dnfHit">
                    Abandonos: {{ item.scoreBreakdown.dnfHit ? '+15 pts' : '0 pts' }}
                  </span>
                </div>
              }

              <!-- TABLA COMPARATIVA ITEM POR ITEM -->
              <div class="comparison-table">
                <div class="comp-header-row">
                  <span class="c-col cat">Categoría</span>
                  <span class="c-col pick">Tu Pronóstico (Puesto)</span>
                  <span class="c-col official">Resultado FIA (Final)</span>
                  <span class="c-col pts">Puntos</span>
                  <span class="c-col status">Evaluación</span>
                </div>

                <!-- SECCIÓN 1: PODIO DE CARRERA -->
                <div class="comp-section-row">
                  <span class="sec-title">🏎️ PODIO OFICIAL DE CARRERA</span>
                  <span class="sec-badge">1 acierto = 3 pts · 2 aciertos = 7 pts · 3 aciertos = 10 pts</span>
                </div>

                <!-- P1 WINNER -->
                <div class="comp-data-row">
                  <span class="c-col cat">
                    <strong class="cat-name">P1 (Ganador GP)</strong>
                    <span class="c-col-sub">1º Puesto de Carrera</span>
                  </span>
                  <span class="c-col pick" data-label="Tu Elección">{{ getDriverName(item.podium[0]) }}</span>
                  <span class="c-col official dim" data-label="Resultado FIA">
                    {{ item.officialResults?.podium?.[0] ? getDriverName(item.officialResults?.podium?.[0]) : (item.score != null ? 'Oficial' : 'Pendiente FIA') }}
                  </span>
                  <span class="c-col pts gold" data-label="Puntos">Top 3</span>
                  <span class="c-col status" data-label="Evaluación">
                    @if (item.officialResults?.podium?.[0] || item.score != null) {
                      @if (isPodiumHit(item, 0)) {
                        <span class="status-tag hit">ACERTADO</span>
                      } @else {
                        <span class="status-tag miss">NO ACERTÓ</span>
                      }
                    } @else {
                      <span class="status-tag pending">PENDIENTE</span>
                    }
                  </span>
                </div>

                <!-- P2 SEGUNDO -->
                <div class="comp-data-row">
                  <span class="c-col cat">
                    <strong class="cat-name">P2 (Segundo Puesto)</strong>
                    <span class="c-col-sub">2º Puesto de Carrera</span>
                  </span>
                  <span class="c-col pick" data-label="Tu Elección">{{ getDriverName(item.podium[1]) }}</span>
                  <span class="c-col official dim" data-label="Resultado FIA">
                    {{ item.officialResults?.podium?.[1] ? getDriverName(item.officialResults?.podium?.[1]) : (item.score != null ? 'Oficial' : 'Pendiente FIA') }}
                  </span>
                  <span class="c-col pts silver" data-label="Puntos">Top 3</span>
                  <span class="c-col status" data-label="Evaluación">
                    @if (item.officialResults?.podium?.[1] || item.score != null) {
                      @if (isPodiumHit(item, 1)) {
                        <span class="status-tag hit">ACERTADO</span>
                      } @else {
                        <span class="status-tag miss">NO ACERTÓ</span>
                      }
                    } @else {
                      <span class="status-tag pending">PENDIENTE</span>
                    }
                  </span>
                </div>

                <!-- P3 TERCERO -->
                <div class="comp-data-row">
                  <span class="c-col cat">
                    <strong class="cat-name">P3 (Tercer Puesto)</strong>
                    <span class="c-col-sub">3º Puesto de Carrera</span>
                  </span>
                  <span class="c-col pick" data-label="Tu Elección">{{ getDriverName(item.podium[2]) }}</span>
                  <span class="c-col official dim" data-label="Resultado FIA">
                    {{ item.officialResults?.podium?.[2] ? getDriverName(item.officialResults?.podium?.[2]) : (item.score != null ? 'Oficial' : 'Pendiente FIA') }}
                  </span>
                  <span class="c-col pts bronze" data-label="Puntos">Top 3</span>
                  <span class="c-col status" data-label="Evaluación">
                    @if (item.officialResults?.podium?.[2] || item.score != null) {
                      @if (isPodiumHit(item, 2)) {
                        <span class="status-tag hit">ACERTADO</span>
                      } @else {
                        <span class="status-tag miss">NO ACERTÓ</span>
                      }
                    } @else {
                      <span class="status-tag pending">PENDIENTE</span>
                    }
                  </span>
                </div>

                <!-- SECCIÓN 2: CLASIFICACIÓN Y DUELO -->
                <div class="comp-section-row">
                  <span class="sec-title">⚡ CLASIFICACIÓN Y DUELO DIRECTO</span>
                  <span class="sec-badge">Pole = 4 pts · Duelo = 3 pts</span>
                </div>

                <!-- POLE POSITION -->
                <div class="comp-data-row">
                  <span class="c-col cat">
                    <strong class="cat-name">Pole Position (Q3)</strong>
                    <span class="c-col-sub">1º en Clasificación Sábado</span>
                  </span>
                  <span class="c-col pick" data-label="Tu Elección">{{ getDriverName(item.polePositionDriverId) }}</span>
                  <span class="c-col official dim" data-label="Resultado FIA">
                    {{ item.officialResults?.polePositionDriverId ? getDriverName(item.officialResults?.polePositionDriverId) : (item.score != null ? 'Oficial' : 'Pendiente FIA') }}
                  </span>
                  <span class="c-col pts cyan" data-label="Puntos">+4 pts</span>
                  <span class="c-col status" data-label="Evaluación">
                    @if (item.officialResults?.polePositionDriverId || item.score != null) {
                      @if (isPoleHit(item)) {
                        <span class="status-tag hit">ACERTADO</span>
                      } @else {
                        <span class="status-tag miss">NO ACERTÓ</span>
                      }
                    } @else {
                      <span class="status-tag pending">PENDIENTE</span>
                    }
                  </span>
                </div>

                <!-- DUELO DE LA FECHA -->
                <div class="comp-data-row">
                  <span class="c-col cat">
                    <strong class="cat-name">Duelo de la Fecha</strong>
                    @if (item.matchupDriver1 && item.matchupDriver2) {
                      <span class="c-col-sub">{{ getDriverName(item.matchupDriver1) }} vs {{ getDriverName(item.matchupDriver2) }}</span>
                    } @else {
                      <span class="c-col-sub">Piloto con mejor posición en carrera</span>
                    }
                  </span>
                  <span class="c-col pick" data-label="Tu Elección">{{ getDriverName(item.duelDriverPick) }}</span>
                  <span class="c-col official dim" data-label="Resultado FIA">
                    {{ item.officialResults?.duelWinnerId ? getDriverName(item.officialResults?.duelWinnerId) : (item.score != null ? 'Oficial' : 'Pendiente FIA') }}
                  </span>
                  <span class="c-col pts" data-label="Puntos">+3 pts</span>
                  <span class="c-col status" data-label="Evaluación">
                    @if (item.officialResults?.duelWinnerId || item.score != null) {
                      @if (isDuelHit(item)) {
                        <span class="status-tag hit">ACERTADO</span>
                      } @else {
                        <span class="status-tag miss">NO ACERTÓ</span>
                      }
                    } @else {
                      <span class="status-tag pending">PENDIENTE</span>
                    }
                  </span>
                </div>

                <!-- SECCIÓN 3: INCIDENCIAS -->
                <div class="comp-section-row">
                  <span class="sec-title">🚨 TELEMETRÍA E INCIDENCIAS EN PISTA</span>
                  <span class="sec-badge">Safety Car = 10 pts · Abandonos = 15 pts</span>
                </div>

                <!-- SAFETY CAR -->
                <div class="comp-data-row">
                  <span class="c-col cat">
                    <strong class="cat-name">Autos de Seguridad</strong>
                    <span class="c-col-sub">Safety Car / Virtual SC desplegados</span>
                  </span>
                  <span class="c-col pick" data-label="Tu Elección">
                    {{ item.safetyCarCount != null ? item.safetyCarCount + (item.safetyCarCount === 1 ? ' Auto' : ' Autos') : '--' }}
                  </span>
                  <span class="c-col official dim" data-label="Resultado FIA">
                    {{ item.officialResults?.safetyCarCount != null ? item.officialResults?.safetyCarCount + (item.officialResults?.safetyCarCount === 1 ? ' Auto' : ' Autos') : (item.score != null ? 'Oficial' : 'Pendiente FIA') }}
                  </span>
                  <span class="c-col pts" data-label="Puntos">+10 pts</span>
                  <span class="c-col status" data-label="Evaluación">
                    @if (item.officialResults?.safetyCarCount != null || item.score != null) {
                      @if (isSafetyCarHit(item)) {
                        <span class="status-tag hit">EXACTO</span>
                      } @else {
                        <span class="status-tag miss">NO ACERTÓ</span>
                      }
                    } @else {
                      <span class="status-tag pending">PENDIENTE</span>
                    }
                  </span>
                </div>

                <!-- ABANDONOS DNFS -->
                <div class="comp-data-row">
                  <span class="c-col cat">
                    <strong class="cat-name">Abandonos (DNFs)</strong>
                    <span class="c-col-sub">Retiros y pilotos no clasificados</span>
                  </span>
                  <span class="c-col pick" data-label="Tu Elección">
                    {{ item.dnfCount != null ? item.dnfCount + (item.dnfCount === 1 ? ' Piloto' : ' Pilotos') : '--' }}
                  </span>
                  <span class="c-col official dim" data-label="Resultado FIA">
                    {{ item.officialResults?.dnfCount != null ? item.officialResults?.dnfCount + (item.officialResults?.dnfCount === 1 ? ' Piloto' : ' Pilotos') : (item.score != null ? 'Oficial' : 'Pendiente FIA') }}
                  </span>
                  <span class="c-col pts" data-label="Puntos">+15 pts</span>
                  <span class="c-col status" data-label="Evaluación">
                    @if (item.officialResults?.dnfCount != null || item.score != null) {
                      @if (isDnfHit(item)) {
                        <span class="status-tag hit">EXACTO</span>
                      } @else {
                        <span class="status-tag miss">NO ACERTÓ</span>
                      }
                    } @else {
                      <span class="status-tag pending">PENDIENTE</span>
                    }
                  </span>
                </div>
              </div>
            </div>

            <!-- FOOTER CON BOTÓN DE CIERRE -->
            <div class="comparison-modal-footer">
              <span class="dim comp-footer-note">Puntuación homologada según el reglamento oficial de ApexPredict (máx 42 pts).</span>
              <button type="button" class="button primary" (click)="selectedHistoryItem.set(null)">Entendido / Cerrar</button>
            </div>
          </div>
        </div>
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
      flex-direction: column;
      background: linear-gradient(135deg, rgba(225, 6, 0, 0.12) 0%, var(--surface) 100%);
      border: 1px solid var(--line-accent);
      border-radius: var(--radius-md);
      padding: 1.5rem 2rem;
      gap: 1.25rem;
    }
    .hero-intro {
      width: 100%;
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
      line-height: 1.45;
    }
    .scoring-rules-panel {
      margin-top: 1.25rem;
      padding-top: 1.1rem;
      border-top: 1px solid rgba(255, 255, 255, 0.08);
      width: 100%;
    }
    .scoring-rules-title {
      font-size: 0.85rem;
      font-weight: 700;
      color: #cbd5e1;
      text-transform: uppercase;
      letter-spacing: 0.06em;
      margin-bottom: 0.75rem;
      display: flex;
      align-items: center;
      gap: 0.4rem;
    }
    .scoring-groups-list {
      display: flex;
      flex-direction: column;
      gap: 0.95rem;
    }
    .scoring-group {
      display: flex;
      flex-direction: column;
      gap: 0.45rem;
    }
    .scoring-group-label {
      font-size: 0.76rem;
      font-weight: 700;
      color: #94a3b8;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      display: flex;
      align-items: center;
      gap: 0.35rem;
    }
    .scoring-group-cards {
      display: flex;
      flex-wrap: wrap;
      gap: 0.55rem 0.75rem;
    }
    .scoring-subgroups-grid {
      display: flex;
      flex-wrap: wrap;
      gap: 0.95rem 1.75rem;
      align-items: flex-start;
    }
    .scoring-rules-grid {
      display: flex;
      flex-wrap: wrap;
      gap: 0.6rem 0.85rem;
    }
    .scoring-rule-card {
      display: inline-flex;
      align-items: center;
      gap: 0.55rem;
      background: rgba(10, 14, 20, 0.85);
      border: 1px solid rgba(255, 255, 255, 0.09);
      border-radius: 6px;
      padding: 0.45rem 0.85rem;
      font-size: 0.83rem;
      transition: all 0.2s ease;
    }
    .scoring-rule-card:hover {
      border-color: rgba(255, 255, 255, 0.22);
      transform: translateY(-1px);
      background: rgba(16, 22, 32, 0.95);
    }
    .rule-card-indicator {
      width: 7px;
      height: 7px;
      border-radius: 50%;
      flex-shrink: 0;
    }
    .rule-card-indicator.gold { background: var(--gold); box-shadow: 0 0 6px rgba(255, 209, 102, 0.55); }
    .rule-card-indicator.silver { background: var(--silver); box-shadow: 0 0 6px rgba(226, 232, 240, 0.55); }
    .rule-card-indicator.bronze { background: #f97316; box-shadow: 0 0 6px rgba(249, 115, 22, 0.55); }
    .rule-card-indicator.cyan { background: var(--cyan); box-shadow: 0 0 6px rgba(0, 242, 254, 0.55); }
    .rule-card-indicator.sc { background: #facc15; box-shadow: 0 0 6px rgba(250, 204, 21, 0.55); }
    .rule-card-indicator.dnf { background: #f43f5e; box-shadow: 0 0 6px rgba(244, 63, 94, 0.55); }
    .rule-card-indicator.duel { background: #10b981; box-shadow: 0 0 6px rgba(16, 185, 129, 0.55); }

    .rule-card-label {
      color: #94a3b8;
      font-weight: 500;
    }
    .rule-card-pts {
      font-family: var(--font-mono);
      font-weight: 800;
      font-size: 0.83rem;
    }
    .rule-card-pts.gold { color: var(--gold); }
    .rule-card-pts.silver { color: var(--silver); }
    .rule-card-pts.bronze { color: #f97316; }
    .rule-card-pts.cyan { color: var(--cyan); }
    .rule-card-pts.sc { color: #facc15; }
    .rule-card-pts.dnf { color: #f43f5e; }
    .rule-card-pts.duel { color: #10b981; }

    /* CARTEL DINÁMICO DE ESTADO CON SEMÁFORO */
    .prediction-status-card {
      display: flex;
      align-items: center;
      gap: 1.25rem;
      padding: 1.1rem 1.4rem;
      border-radius: var(--radius-md);
      margin-bottom: 1.5rem;
      transition: all 0.25s ease;
      box-sizing: border-box;
    }
    .traffic-lights-box {
      flex-shrink: 0;
    }
    .traffic-housing {
      background: #080b11;
      border: 1px solid rgba(255, 255, 255, 0.14);
      border-radius: 9999px;
      padding: 6px 12px;
      display: flex;
      align-items: center;
      gap: 9px;
      box-shadow: inset 0 2px 4px rgba(0, 0, 0, 0.7);
    }
    .traffic-light {
      width: 14px;
      height: 14px;
      border-radius: 50%;
      display: inline-block;
      transition: all 0.2s ease;
    }
    .traffic-light.light-red.off {
      background: #340c0c;
      border: 1px solid rgba(239, 68, 68, 0.2);
      opacity: 0.35;
    }
    .traffic-light.light-red.on {
      background: #ef4444;
      border: 1px solid #ff7878;
      box-shadow: 0 0 12px #ef4444, 0 0 3px #fff;
    }
    .traffic-light.light-yellow.off {
      background: #2e2105;
      border: 1px solid rgba(245, 158, 11, 0.2);
      opacity: 0.35;
    }
    .traffic-light.light-yellow.on {
      background: #f59e0b;
      border: 1px solid #fde68a;
      box-shadow: 0 0 12px #f59e0b, 0 0 3px #fff;
    }
    .traffic-light.light-yellow.pulse {
      animation: trafficPulse 1s infinite ease-in-out;
    }
    .traffic-light.light-green.off {
      background: #062b1d;
      border: 1px solid rgba(16, 185, 129, 0.2);
      opacity: 0.35;
    }
    .traffic-light.light-green.on {
      background: #10b981;
      border: 1px solid #6ee7b7;
      box-shadow: 0 0 12px #10b981, 0 0 3px #fff;
    }
    @keyframes trafficPulse {
      0%, 100% { opacity: 1; transform: scale(1); }
      50% { opacity: 0.55; transform: scale(0.92); }
    }
    .status-content {
      display: flex;
      flex-direction: column;
      gap: 3px;
      flex: 1;
    }
    .status-headline {
      display: flex;
      align-items: center;
      gap: 8px;
    }
    .status-indicator-tag {
      font-size: 0.7rem;
      font-weight: 800;
      letter-spacing: 0.05em;
      padding: 2px 7px;
      border-radius: 4px;
      text-transform: uppercase;
    }
    .status-indicator-tag.red {
      background: rgba(239, 68, 68, 0.2);
      color: #fca5a5;
      border: 1px solid rgba(239, 68, 68, 0.4);
    }
    .status-indicator-tag.yellow {
      background: rgba(245, 158, 11, 0.2);
      color: #fde68a;
      border: 1px solid rgba(245, 158, 11, 0.4);
    }
    .status-indicator-tag.green {
      background: rgba(16, 185, 129, 0.2);
      color: #a7f3d0;
      border: 1px solid rgba(16, 185, 129, 0.4);
    }
    .status-text {
      margin: 0;
      font-size: 1.1rem;
      font-weight: 800;
    }
    .status-text.red { color: #f87171; }
    .status-text.yellow { color: #fbbf24; }
    .status-text.green { color: #34d399; }
    .status-subtext {
      margin: 0;
      font-size: 0.88rem;
      color: var(--text-muted);
    }
    .status-timestamp {
      margin-left: 6px;
      font-size: 0.82rem;
      color: var(--text-dim);
    }

    .prediction-status-card.status-red {
      background: rgba(225, 6, 0, 0.08);
      border: 1px solid rgba(225, 6, 0, 0.35);
      border-left: 5px solid var(--red);
    }
    .prediction-status-card.status-yellow {
      background: rgba(245, 158, 11, 0.08);
      border: 1px solid rgba(245, 158, 11, 0.35);
      border-left: 5px solid #f59e0b;
    }
    .prediction-status-card.status-green {
      background: rgba(16, 185, 129, 0.08);
      border: 1px solid rgba(16, 185, 129, 0.35);
      border-left: 5px solid #10b981;
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
    .amber-pts {
      font-family: var(--font-mono);
      color: #fbbf24;
      font-weight: 700;
      font-size: 0.85rem;
    }
    .podium-card-wrapper {
      position: relative;
      overflow: hidden;
    }
    .podium-grid {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 1.25rem;
      margin-top: 0.5rem;
    }
    .podium-col {
      background: linear-gradient(180deg, rgba(255, 255, 255, 0.03) 0%, rgba(255, 255, 255, 0.01) 100%), var(--surface);
      border: 1px solid var(--line);
      border-radius: var(--radius-md);
      padding: 1.25rem;
      display: flex;
      flex-direction: column;
      position: relative;
      box-shadow: 0 4px 20px rgba(0, 0, 0, 0.25);
    }
    .gold-border { 
      border-top: 4px solid var(--gold); 
      background: linear-gradient(180deg, rgba(245, 158, 11, 0.08) 0%, rgba(18, 22, 31, 0.95) 100%);
    }
    .silver-border { 
      border-top: 4px solid var(--silver); 
      background: linear-gradient(180deg, rgba(226, 232, 240, 0.06) 0%, rgba(18, 22, 31, 0.95) 100%);
    }
    .bronze-border { 
      border-top: 4px solid var(--bronze); 
      background: linear-gradient(180deg, rgba(205, 127, 50, 0.06) 0%, rgba(18, 22, 31, 0.95) 100%);
    }
    .podium-col-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 0.4rem;
    }
    .podium-badge {
      font-weight: 800;
      font-size: 0.9rem;
      letter-spacing: 0.02em;
    }
    .podium-badge.gold { color: var(--gold); }
    .podium-badge.silver { color: var(--silver); }
    .podium-badge.bronze { color: var(--bronze); }
    .pts-tag {
      font-family: var(--font-mono);
      font-weight: 700;
      font-size: 0.8rem;
      padding: 2px 8px;
      border-radius: 4px;
    }
    .pts-tag.gold {
      background: rgba(245, 158, 11, 0.15);
      color: var(--gold);
      border: 1px solid rgba(245, 158, 11, 0.35);
    }
    .pts-tag.silver {
      background: rgba(226, 232, 240, 0.15);
      color: var(--silver);
      border: 1px solid rgba(226, 232, 240, 0.35);
    }
    .pts-tag.bronze {
      background: rgba(205, 127, 50, 0.15);
      color: var(--bronze);
      border: 1px solid rgba(205, 127, 50, 0.35);
    }
    .podium-slot-label {
      font-size: 0.78rem;
      color: var(--text-dim);
      text-transform: uppercase;
      letter-spacing: 0.06em;
      margin-bottom: 0.85rem;
    }

    /* ================================================= */
    /* PLANTILLA UNIFICADA DE TARJETA DE PILOTO (F1 DTC)  */
    /* ================================================= */
    .driver-template-card {
      --driver-color: #3671c6;
      background: #0d1118;
      border: 1px solid var(--line-strong);
      border-left: 5px solid var(--driver-color);
      border-radius: var(--radius-sm);
      padding: 1rem 1.15rem;
      cursor: pointer;
      position: relative;
      display: flex;
      flex-direction: column;
      gap: 0.75rem;
      transition: all 0.22s cubic-bezier(0.16, 1, 0.3, 1);
      user-select: none;
    }
    .driver-template-card:hover:not(.disabled-card) {
      transform: translateY(-2px);
      border-color: rgba(255, 255, 255, 0.25);
      border-left-color: var(--driver-color);
      box-shadow: 0 10px 24px rgba(0, 0, 0, 0.45), 0 0 14px -3px var(--driver-color);
    }
    .driver-template-card.disabled-card {
      cursor: not-allowed;
      opacity: 0.7;
    }
    .driver-template-card.gold-slot:hover {
      box-shadow: 0 10px 24px rgba(0, 0, 0, 0.45), 0 0 16px -2px rgba(245, 158, 11, 0.4);
    }
    .driver-template-card.silver-slot:hover {
      box-shadow: 0 10px 24px rgba(0, 0, 0, 0.45), 0 0 16px -2px rgba(226, 232, 240, 0.35);
    }
    .driver-template-card.bronze-slot:hover {
      box-shadow: 0 10px 24px rgba(0, 0, 0, 0.45), 0 0 16px -2px rgba(205, 127, 50, 0.35);
    }
    .driver-template-card.pole-slot:hover {
      box-shadow: 0 10px 24px rgba(0, 0, 0, 0.45), 0 0 16px -2px rgba(6, 182, 212, 0.4);
    }
    .driver-template-card.empty-slot {
      --driver-color: rgba(255, 255, 255, 0.25);
      border: 1px dashed rgba(255, 255, 255, 0.2);
      border-left: 4px dashed rgba(255, 255, 255, 0.35);
      background: rgba(255, 255, 255, 0.02);
      min-height: 110px;
      justify-content: center;
      align-items: center;
    }
    .driver-template-card.empty-slot:hover:not(.disabled-card) {
      border-color: rgba(255, 255, 255, 0.45);
      border-left-color: rgba(255, 255, 255, 0.6);
      background: rgba(255, 255, 255, 0.05);
      box-shadow: 0 8px 20px rgba(0, 0, 0, 0.45);
    }
    .driver-template-card.empty-slot.pole-slot:hover:not(.disabled-card) {
      border-color: #38bdf8;
      border-left-color: #38bdf8;
      background: rgba(56, 189, 248, 0.06);
    }
    .dtc-empty-state {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 0.35rem;
      text-align: center;
    }
    .dtc-empty-state .empty-icon {
      font-size: 1.6rem;
      font-weight: 300;
      line-height: 1;
      color: var(--text-dim, rgba(255, 255, 255, 0.6));
    }
    .dtc-empty-state .empty-text {
      font-size: 0.82rem;
      font-weight: 700;
      letter-spacing: 0.05em;
      text-transform: uppercase;
      color: rgba(255, 255, 255, 0.8);
    }
    .dtc-empty-state .empty-hint {
      font-size: 0.7rem;
      color: rgba(255, 255, 255, 0.4);
    }
    .dtc-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      gap: 0.5rem;
    }
    .dtc-team {
      font-size: 0.72rem;
      font-weight: 800;
      text-transform: uppercase;
      letter-spacing: 0.08em;
      padding: 3px 8px;
      border-radius: 4px;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
      max-width: 65%;
    }
    .dtc-badges {
      display: flex;
      align-items: center;
      gap: 6px;
    }
    .dtc-code {
      font-family: var(--font-mono);
      font-size: 0.75rem;
      font-weight: 700;
      color: var(--text-muted);
      background: rgba(255, 255, 255, 0.06);
      padding: 2px 6px;
      border-radius: 3px;
    }
    .dtc-num {
      font-family: var(--font-mono);
      font-size: 0.85rem;
      font-weight: 800;
      color: #fff;
    }
    .dtc-main {
      padding: 0.2rem 0;
    }
    .dtc-name {
      font-size: 1.15rem;
      font-weight: 700;
      color: #ffffff;
      letter-spacing: -0.01em;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }
    .dtc-action {
      display: flex;
      align-items: center;
      justify-content: space-between;
      border-top: 1px solid var(--line);
      padding-top: 0.6rem;
      font-size: 0.78rem;
      color: var(--text-muted);
      font-weight: 600;
      transition: color 0.15s;
    }
    .driver-template-card:hover:not(.disabled-card) .dtc-action {
      color: #ffffff;
    }
    .action-icon {
      font-size: 0.95rem;
      color: var(--cyan);
    }

    /* Selector modal mode for driver template card */
    .driver-template-card.picker-mode {
      padding: 0.85rem 1rem;
    }
    .driver-template-card.picker-mode.is-selected {
      border-color: var(--green);
      border-left-color: var(--driver-color);
      background: rgba(16, 185, 129, 0.08);
      box-shadow: 0 0 14px rgba(16, 185, 129, 0.25);
    }
    .driver-template-card.picker-mode.is-swap {
      border-color: rgba(245, 158, 11, 0.4);
      border-left-color: var(--driver-color);
    }
    .status-chip {
      font-size: 0.72rem;
      font-weight: 700;
      padding: 2px 8px;
      border-radius: 4px;
      width: 100%;
      text-align: center;
    }
    .status-chip.current {
      background: rgba(16, 185, 129, 0.2);
      color: #6ee7b7;
      border: 1px solid rgba(16, 185, 129, 0.4);
    }
    .status-chip.swap {
      background: rgba(245, 158, 11, 0.15);
      color: #fde68a;
      border: 1px solid rgba(245, 158, 11, 0.3);
    }
    .status-chip.pick {
      color: var(--cyan);
    }
    .driver-template-card.picker-mode:hover .status-chip.pick {
      color: #ffffff;
    }

    /* ================================================= */
    /* MODAL OVERLAY Y BUSCADOR DE PILOTOS               */
    /* ================================================= */
    .driver-picker-backdrop {
      position: fixed;
      inset: 0;
      background: rgba(0, 0, 0, 0.82);
      backdrop-filter: blur(8px);
      z-index: 10000;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 1.5rem;
      animation: fadeInBackdrop 0.18s ease-out;
    }
    @keyframes fadeInBackdrop {
      from { opacity: 0; }
      to { opacity: 1; }
    }
    .driver-picker-modal {
      background: #0f131a;
      border: 1px solid var(--line-strong);
      border-radius: var(--radius-md);
      max-width: 860px;
      width: 100%;
      max-height: 88vh;
      display: flex;
      flex-direction: column;
      box-shadow: 0 24px 64px rgba(0, 0, 0, 0.9);
      animation: slideUpModal 0.2s cubic-bezier(0.16, 1, 0.3, 1);
      overflow: hidden;
    }
    @keyframes slideUpModal {
      from { opacity: 0; transform: translateY(16px) scale(0.98); }
      to { opacity: 1; transform: translateY(0) scale(1); }
    }
    .picker-header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      padding: 1.25rem 1.5rem 1rem;
      border-bottom: 1px solid var(--line);
      background: #131720;
    }
    .picker-title {
      font-size: 1.25rem;
      font-weight: 800;
      color: #ffffff;
      margin: 0;
    }
    .picker-subtitle {
      font-size: 0.84rem;
      color: var(--text-dim);
      margin: 4px 0 0;
    }
    .picker-close-btn {
      background: rgba(255, 255, 255, 0.08);
      border: 1px solid var(--line);
      color: var(--text-muted);
      width: 34px;
      height: 34px;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      cursor: pointer;
      font-size: 1rem;
      transition: all 0.15s;
    }
    .picker-close-btn:hover {
      background: rgba(225, 6, 0, 0.2);
      border-color: var(--red);
      color: #fff;
    }
    .picker-search-bar {
      padding: 1rem 1.5rem;
      position: relative;
      display: flex;
      align-items: center;
      border-bottom: 1px solid var(--line);
      background: #0d1016;
    }
    .search-icon {
      position: absolute;
      left: 2.25rem;
      font-size: 1rem;
      color: var(--text-dim);
      pointer-events: none;
    }
    .picker-search-input {
      width: 100%;
      background: #141923;
      border: 1px solid var(--line-strong);
      color: #fff;
      padding: 0.75rem 2.5rem 0.75rem 2.5rem;
      border-radius: var(--radius-sm);
      font-size: 0.95rem;
      outline: none;
      transition: border-color 0.15s;
    }
    .picker-search-input:focus {
      border-color: var(--red);
      box-shadow: 0 0 0 2px rgba(225, 6, 0, 0.2);
    }
    .clear-search-btn {
      position: absolute;
      right: 2.25rem;
      background: transparent;
      border: none;
      color: var(--text-dim);
      cursor: pointer;
      font-size: 0.9rem;
      padding: 4px;
    }
    .clear-search-btn:hover {
      color: #fff;
    }
    .picker-grid-scroll {
      overflow-y: auto;
      padding: 1.25rem 1.5rem 1.5rem;
      max-height: calc(88vh - 180px);
    }
    .picker-drivers-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(240px, 1fr));
      gap: 1rem;
    }
    .picker-empty-state {
      text-align: center;
      padding: 3rem 1rem;
      color: var(--text-dim);
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
    .spinner-inline {
      display: inline-block;
      width: 13px;
      height: 13px;
      border: 2px solid rgba(255, 255, 255, 0.2);
      border-top-color: var(--cyan);
      border-radius: 50%;
      animation: spin 0.8s linear infinite;
      vertical-align: middle;
    }
    .spinner-block {
      width: 32px;
      height: 32px;
      border: 3px solid rgba(255, 255, 255, 0.15);
      border-top-color: var(--red);
      border-radius: 50%;
      animation: spin 0.8s linear infinite;
      margin: 0 auto 1rem;
    }
    @keyframes spin {
      to { transform: rotate(360deg); }
    }
    .grid-two-cols {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 1.5rem;
    }
    .grid-three-cols {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 1.25rem;
      align-items: stretch;
      margin-bottom: 1.5rem;
    }
    @media (max-width: 992px) {
      .grid-three-cols {
        grid-template-columns: 1fr;
      }
    }
    .spotlight-card.pole-card {
      border-top: 4px solid #a855f7;
      background: linear-gradient(180deg, rgba(168, 85, 247, 0.06) 0%, rgba(18, 22, 31, 0.95) 100%);
      display: flex;
      flex-direction: column;
      justify-content: space-between;
      gap: 1.15rem;
    }
    .telemetry-icon-badge.pole {
      background: rgba(168, 85, 247, 0.15);
      border: 1px solid rgba(168, 85, 247, 0.35);
      color: #c084fc;
      font-weight: 900;
      font-family: var(--font-mono);
    }
    /* DUEL SPOTLIGHT CARD & SELECTOR */
    .duel-spotlight-card {
      display: flex;
      flex-direction: column;
      gap: 1.15rem;
      margin-bottom: 1.5rem;
    }
    .duel-title-wrap {
      display: flex;
      align-items: center;
      gap: 0.65rem;
    }
    .duel-badge-icon {
      width: 36px;
      height: 36px;
      display: flex;
      align-items: center;
      justify-content: center;
      background: rgba(225, 6, 0, 0.14);
      border: 1px solid rgba(225, 6, 0, 0.35);
      border-radius: var(--radius-sm);
      color: #ff3b30;
      flex-shrink: 0;
    }
    .duel-badge-icon svg {
      display: block;
    }
    .duel-arena-grid {
      display: grid;
      grid-template-columns: 1fr auto 1fr;
      align-items: center;
      gap: 1.5rem;
    }
    .duel-driver-card {
      background: #0d121c;
      border: 1.5px solid rgba(255, 255, 255, 0.1);
      border-left: 5px solid var(--driver-team-color, var(--line));
      border-radius: var(--radius-md, 8px);
      padding: 1rem 1.1rem;
      display: flex;
      flex-direction: column;
      gap: 0.55rem;
      cursor: pointer;
      text-align: left;
      transition: all 0.25s cubic-bezier(0.16, 1, 0.3, 1);
      position: relative;
    }
    .duel-driver-card:hover:not(:disabled) {
      transform: translateY(-2px);
      border-color: rgba(255, 255, 255, 0.35);
      box-shadow: 0 8px 22px rgba(0, 0, 0, 0.5), 0 0 14px -2px var(--driver-team-color, rgba(255,255,255,0.2));
    }
    /* PILOTO ELEGIDO: DESTACAMIENTO EN LA PALETA OFICIAL DE LA PÁGINA (ROJO F1) */
    .duel-driver-card.selected {
      background: linear-gradient(135deg, rgba(225, 6, 0, 0.14) 0%, rgba(225, 6, 0, 0.03) 60%, transparent 100%), #111622;
      border: 2px solid var(--red, #e10600);
      border-left: 6px solid var(--red, #e10600);
      box-shadow: 0 0 0 1px rgba(225, 6, 0, 0.4) inset,
                  0 0 20px var(--red-glow, rgba(225, 6, 0, 0.35)),
                  0 12px 28px rgba(0, 0, 0, 0.65);
      transform: translateY(-2px) scale(1.02);
      z-index: 2;
    }
    /* PILOTO NO ELEGIDO: ATENUADO PARA DAR PROTAGONISMO AL ELEGIDO */
    .duel-driver-card.unselected {
      opacity: 0.55;
      filter: saturate(0.65);
      background: #090c12;
      border-color: rgba(255, 255, 255, 0.06);
      border-left-width: 3px;
    }
    .duel-driver-card.unselected:hover:not(:disabled) {
      opacity: 0.92;
      filter: saturate(1);
      transform: translateY(-1px);
      border-color: rgba(255, 255, 255, 0.25);
    }
    .duel-driver-card:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }
    .ddc-top {
      display: flex;
      justify-content: space-between;
      align-items: center;
      gap: 0.5rem;
    }
    .ddc-team-pill {
      font-size: 0.7rem;
      font-weight: 700;
      text-transform: uppercase;
      padding: 2px 6px;
      border-radius: 3px;
      letter-spacing: 0.04em;
    }
    .ddc-number {
      font-family: var(--font-mono);
      font-size: 0.76rem;
      font-weight: 800;
      color: var(--text-muted);
      transition: color 0.2s ease;
    }
    .duel-driver-card.selected .ddc-number {
      color: #ffffff;
      font-weight: 900;
    }
    .ddc-name {
      font-size: 1rem;
      font-weight: 800;
      color: #ffffff;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
      transition: all 0.2s ease;
    }
    .duel-driver-card.selected .ddc-name {
      font-size: 1.08rem;
      font-weight: 900;
      color: #ffffff;
      text-shadow: 0 0 12px rgba(255, 255, 255, 0.3);
    }
    .duel-driver-card.unselected .ddc-name {
      color: #94a3b8;
    }
    .ddc-selection-status {
      margin-top: 0.35rem;
      display: flex;
      align-items: center;
    }
    .status-picked {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      background: linear-gradient(135deg, var(--red, #e10600) 0%, #b30000 100%);
      color: #ffffff;
      font-weight: 900;
      font-size: 0.72rem;
      letter-spacing: 0.06em;
      padding: 5px 12px;
      border-radius: var(--radius-full, 9999px);
      border: 1px solid rgba(255, 255, 255, 0.2);
      box-shadow: 0 0 14px var(--red-glow, rgba(225, 6, 0, 0.45));
      animation: pulse-picked 2.5s infinite ease-in-out;
    }
    @keyframes pulse-picked {
      0%, 100% { box-shadow: 0 0 14px var(--red-glow, rgba(225, 6, 0, 0.45)); }
      50% { box-shadow: 0 0 22px var(--red-glow, rgba(225, 6, 0, 0.75)); }
    }
    .check-icon-svg {
      display: block;
      flex-shrink: 0;
    }
    .status-choose {
      display: inline-flex;
      align-items: center;
      color: #64748b;
      font-size: 0.72rem;
      font-weight: 700;
      padding: 3px 8px;
      border-radius: 4px;
      background: rgba(255, 255, 255, 0.04);
      border: 1px dashed rgba(255, 255, 255, 0.14);
      text-transform: uppercase;
      letter-spacing: 0.04em;
      transition: all 0.2s ease;
    }
    .duel-driver-card:hover:not(:disabled) .status-choose {
      color: #e2e8f0;
      border-color: rgba(255, 255, 255, 0.3);
      background: rgba(255, 255, 255, 0.08);
    }
    .duel-vs-separator {
      display: flex;
      align-items: center;
      justify-content: center;
    }
    .vs-text {
      font-family: var(--font-mono);
      font-size: 0.75rem;
      font-weight: 900;
      background: #1a1e28;
      border: 1px solid rgba(255, 255, 255, 0.15);
      color: var(--text-dim);
      padding: 4px 8px;
      border-radius: 9999px;
      letter-spacing: 0.08em;
    }

    /* DUEL CRITERIA PANEL */
    .duel-criteria-panel {
      background: rgba(10, 14, 22, 0.75);
      border: 1px solid rgba(255, 255, 255, 0.08);
      border-radius: var(--radius-sm);
      padding: 0.85rem 1rem;
      display: flex;
      flex-direction: column;
      gap: 0.65rem;
    }
    .criteria-header-row {
      display: flex;
      align-items: center;
      gap: 0.5rem;
    }
    .criteria-svg {
      color: #ff3b30;
      flex-shrink: 0;
    }
    .criteria-label {
      font-size: 0.74rem;
      font-weight: 800;
      color: #94a3b8;
      text-transform: uppercase;
      letter-spacing: 0.06em;
    }
    .criteria-items-list {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 1.25rem;
    }
    @media (max-width: 850px) {
      .criteria-items-list {
        grid-template-columns: 1fr;
        gap: 0.5rem;
      }
    }
    .criteria-item {
      display: flex;
      align-items: flex-start;
      gap: 0.6rem;
      line-height: 1.35;
    }
    .criteria-badge-num {
      width: 17px;
      height: 17px;
      border-radius: 50%;
      background: rgba(225, 6, 0, 0.2);
      border: 1px solid rgba(225, 6, 0, 0.4);
      color: #ff8577;
      font-size: 0.65rem;
      font-weight: 800;
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
      margin-top: 1px;
    }
    .criteria-desc {
      font-size: 0.76rem;
      color: #cbd5e1;
    }
    .criteria-desc strong {
      color: #ffffff;
      font-weight: 700;
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
    .telemetry-card {
      display: flex;
      flex-direction: column;
      justify-content: space-between;
      gap: 1.25rem;
      background: linear-gradient(180deg, rgba(255, 255, 255, 0.02) 0%, rgba(255, 255, 255, 0.01) 100%), var(--surface);
      border: 1px solid var(--line);
      border-radius: var(--radius-md);
      padding: 1.25rem;
      box-shadow: 0 4px 20px rgba(0, 0, 0, 0.25);
      position: relative;
      overflow: hidden;
    }
    .telemetry-card.sc-card {
      border-top: 4px solid #f59e0b;
      background: linear-gradient(180deg, rgba(245, 158, 11, 0.06) 0%, rgba(18, 22, 31, 0.95) 100%);
    }
    .telemetry-card.dnf-card {
      border-top: 4px solid var(--red);
      background: linear-gradient(180deg, rgba(225, 6, 0, 0.06) 0%, rgba(18, 22, 31, 0.95) 100%);
    }
    .card-title-group {
      display: flex;
      align-items: center;
      gap: 0.75rem;
    }
    .telemetry-icon-badge {
      width: 40px;
      height: 40px;
      border-radius: var(--radius-sm);
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 1.2rem;
      flex-shrink: 0;
    }
    .telemetry-icon-badge.sc {
      background: rgba(245, 158, 11, 0.15);
      border: 1px solid rgba(245, 158, 11, 0.35);
    }
    .telemetry-icon-badge.dnf {
      background: rgba(225, 6, 0, 0.15);
      border: 1px solid rgba(225, 6, 0, 0.35);
    }
    .telemetry-display-box {
      background: #0d1118;
      border: 1px solid var(--line-strong);
      border-radius: var(--radius-sm);
      padding: 1rem 1.15rem;
      display: flex;
      flex-direction: column;
      gap: 0.85rem;
    }
    .stepper-hero {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 0.75rem;
    }
    .step-hero-btn {
      width: 44px;
      height: 44px;
      background: #141923;
      border: 1px solid var(--line-strong);
      color: #fff;
      font-size: 1.4rem;
      font-weight: 700;
      border-radius: var(--radius-sm);
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      transition: all 0.18s cubic-bezier(0.16, 1, 0.3, 1);
      user-select: none;
      flex-shrink: 0;
    }
    .step-hero-btn:hover:not(:disabled) {
      background: var(--surface-hover);
      border-color: var(--cyan);
      box-shadow: 0 0 14px rgba(0, 242, 254, 0.3);
      transform: scale(1.06);
    }
    .step-hero-btn:active:not(:disabled) {
      transform: scale(0.96);
    }
    .step-hero-btn:disabled {
      opacity: 0.25;
      cursor: not-allowed;
    }
    .step-hero-center {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 3px;
    }
    .step-hero-val {
      font-size: 2.2rem;
      font-weight: 800;
      font-family: var(--font-mono);
      color: #ffffff;
      line-height: 1;
      letter-spacing: -0.02em;
    }
    .step-hero-unit {
      font-size: 0.74rem;
      color: var(--text-dim);
      text-transform: uppercase;
      letter-spacing: 0.05em;
      font-weight: 600;
      white-space: nowrap;
    }
    .telemetry-range-hint {
      display: flex;
      justify-content: space-between;
      align-items: center;
      border-top: 1px solid var(--line);
      padding-top: 0.75rem;
      font-size: 0.76rem;
      color: var(--text-dim);
      gap: 0.5rem;
      flex-wrap: wrap;
    }
    .telemetry-status-pill {
      font-size: 0.72rem;
      font-weight: 700;
      padding: 2px 8px;
      border-radius: 4px;
      background: rgba(255, 255, 255, 0.06);
      color: var(--text-muted);
      border: 1px solid var(--line);
      white-space: nowrap;
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
      flex-direction: column;
      gap: 1.25rem;
    }
    .invite-row {
      display: flex;
      justify-content: space-between;
      align-items: center;
      flex-wrap: wrap;
      gap: 1rem;
      width: 100%;
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
    .league-password-bar {
      display: flex;
      justify-content: space-between;
      align-items: center;
      flex-wrap: wrap;
      gap: 1rem;
      padding-top: 1rem;
      border-top: 1px dashed rgba(255, 255, 255, 0.1);
      width: 100%;
    }
    .password-label-group {
      display: flex;
      flex-direction: column;
      gap: 3px;
    }
    .password-tag {
      font-size: 0.72rem;
      color: var(--gold);
      font-weight: 800;
      letter-spacing: 0.05em;
    }
    .password-hint {
      margin: 0;
      font-size: 0.88rem;
      color: var(--text-dim);
    }
    .password-action-group {
      display: flex;
      align-items: center;
      gap: 0.5rem;
    }
    .password-field-container {
      position: relative;
      display: flex;
      align-items: center;
    }
    .password-display-input {
      background: #0d1015;
      border: 1px solid rgba(245, 176, 0, 0.4);
      color: var(--gold);
      padding: 0.5rem 2.4rem 0.5rem 0.8rem;
      font-family: var(--font-mono);
      font-size: 0.95rem;
      letter-spacing: 0.08em;
      font-weight: 700;
      border-radius: var(--radius-sm);
      width: 220px;
    }
    .password-visibility-btn {
      position: absolute;
      right: 6px;
      background: transparent;
      border: none;
      color: var(--text-dim);
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 4px;
      border-radius: 4px;
      transition: color 0.15s ease;
    }
    .password-visibility-btn:hover {
      color: #fff;
    }
    .password-pill-badge {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      font-size: 0.82rem;
      background: rgba(245, 176, 0, 0.12);
      color: var(--gold);
      border: 1px solid rgba(245, 176, 0, 0.35);
      padding: 4px 10px;
      border-radius: var(--radius-sm);
      cursor: pointer;
      user-select: none;
      transition: all 0.15s ease;
    }
    .password-pill-badge:hover {
      background: rgba(245, 176, 0, 0.22);
      border-color: var(--gold);
    }
    .pill-toggle-action {
      font-size: 0.75rem;
      opacity: 0.75;
      margin-left: 2px;
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
      min-height: 220px;
      border-top: 5px solid var(--gold);
    }
    .silver-ped {
      min-height: 180px;
      border-top: 5px solid var(--silver);
    }
    .bronze-ped {
      min-height: 145px;
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
    .clickable-history-card {
      cursor: pointer;
      transition: all 0.2s cubic-bezier(0.16, 1, 0.3, 1);
    }
    .clickable-history-card:hover {
      border-color: var(--red);
      transform: translateY(-2px);
      box-shadow: 0 8px 24px rgba(225, 6, 0, 0.15);
    }
    .card-tap-hint {
      margin-top: 0.85rem;
      padding-top: 0.65rem;
      border-top: 1px solid var(--line);
      font-size: 0.78rem;
      color: var(--red);
      font-weight: 600;
      text-align: right;
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
    /* TARJETAS DE HISTORIAL: PICKS Y RESULTADOS OFICIALES */
    .history-card-picks-box, .history-card-official-box {
      margin-top: 0.75rem;
      padding: 0.65rem 0.85rem;
      border-radius: var(--radius-sm);
      border: 1px solid var(--line);
    }
    .history-card-picks-box {
      background: rgba(0, 0, 0, 0.35);
    }
    .history-card-official-box {
      background: rgba(16, 185, 129, 0.06);
      border-color: rgba(16, 185, 129, 0.3);
    }
    .picks-box-header, .official-box-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 0.35rem;
      padding-bottom: 0.3rem;
      border-bottom: 1px solid rgba(255, 255, 255, 0.06);
    }
    .picks-box-badge {
      font-size: 0.68rem;
      font-weight: 800;
      color: #cbd5e1;
      letter-spacing: 0.05em;
      text-transform: uppercase;
    }
    .official-box-badge {
      font-size: 0.68rem;
      font-weight: 800;
      color: #34d399;
      letter-spacing: 0.05em;
      text-transform: uppercase;
    }
    .picks-content {
      display: flex;
      flex-direction: column;
      gap: 0.25rem;
      font-size: 0.8rem;
    }
    .pick-line {
      line-height: 1.4;
    }

    .driver-picker-modal.comparison-modal {
      max-width: 900px;
      width: min(900px, 95vw);
      height: min(88vh, 850px);
      max-height: 88vh;
      display: flex;
      flex-direction: column;
      overflow: hidden;
      box-shadow: 0 24px 64px rgba(0, 0, 0, 0.95);
    }
    .comparison-modal .picker-header {
      flex: 0 0 auto;
      flex-shrink: 0;
    }
    .comparison-modal-body {
      flex: 1 1 0px;
      min-height: 0;
      height: 0;
      overflow-y: scroll;
      overflow-x: hidden;
      padding: 1rem 1.25rem;
      display: flex;
      flex-direction: column;
      gap: 0.85rem;
      scrollbar-width: thin;
      scrollbar-color: var(--red) rgba(255, 255, 255, 0.1);
      overscroll-behavior: contain;
    }
    .comparison-modal-body:focus {
      outline: none;
    }
    .comparison-modal-body > * {
      flex-shrink: 0;
    }
    .comparison-modal-body::-webkit-scrollbar {
      width: 8px;
    }
    .comparison-modal-body::-webkit-scrollbar-track {
      background: rgba(0, 0, 0, 0.45);
      border-radius: 4px;
    }
    .comparison-modal-body::-webkit-scrollbar-thumb {
      background: var(--red);
      border-radius: 4px;
      box-shadow: 0 0 8px rgba(225, 6, 0, 0.5);
    }
    .comparison-modal-body::-webkit-scrollbar-thumb:hover {
      background: #ff3329;
    }
    .comparison-modal-footer {
      flex: 0 0 auto;
      flex-shrink: 0;
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 0.85rem 1.25rem;
      border-top: 1px solid var(--line);
      background: #131720;
      flex-wrap: wrap;
      gap: 0.75rem;
    }
    .comp-footer-note {
      font-size: 0.8rem;
    }
    .comparison-summary-bar {
      display: flex;
      justify-content: space-between;
      align-items: center;
      background: rgba(0, 0, 0, 0.4);
      border: 1px solid var(--line);
      border-radius: var(--radius-sm);
      padding: 0.75rem 1rem;
      margin: 0;
      flex-wrap: wrap;
      gap: 0.75rem;
    }
    .comp-total-pts {
      font-family: var(--font-mono);
      font-size: 1.85rem;
      font-weight: 900;
      color: var(--gold);
      line-height: 1;
      margin-top: 3px;
    }
    .comp-status-badge {
      font-size: 0.78rem;
      font-weight: 700;
      padding: 5px 10px;
      border-radius: var(--radius-sm);
      background: rgba(245, 176, 0, 0.2);
      color: var(--gold);
      border: 1px solid rgba(245, 176, 0, 0.4);
    }
    .comp-status-badge.scored {
      background: rgba(16, 185, 129, 0.2);
      color: #34d399;
      border-color: rgba(16, 185, 129, 0.4);
    }
    .comparison-table {
      display: flex;
      flex-direction: column;
      border: 1px solid var(--line);
      border-radius: var(--radius-sm);
      overflow: hidden;
      background: var(--surface);
    }
    .comp-header-row, .comp-data-row {
      display: grid;
      grid-template-columns: 2.1fr 2fr 2fr 1fr 1.2fr;
      align-items: center;
      padding: 0.55rem 0.85rem;
      gap: 0.65rem;
      border-bottom: 1px solid var(--line);
    }
    .comp-header-row {
      background: rgba(255, 255, 255, 0.04);
      font-size: 0.76rem;
      color: var(--text-dim);
      text-transform: uppercase;
      font-weight: 700;
      letter-spacing: 0.04em;
    }
    .comp-section-row {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 0.42rem 0.85rem;
      background: rgba(225, 6, 0, 0.08);
      border-top: 1px solid rgba(225, 6, 0, 0.25);
      border-bottom: 1px solid rgba(255, 255, 255, 0.08);
    }
    .comp-section-row:first-child {
      border-top: none;
    }
    .sec-title {
      font-size: 0.74rem;
      font-weight: 800;
      color: #ff6b6b;
      letter-spacing: 0.05em;
      text-transform: uppercase;
      display: flex;
      align-items: center;
      gap: 6px;
    }
    .sec-badge {
      font-size: 0.7rem;
      color: var(--text-dim);
      font-weight: 600;
    }
    .c-col.cat {
      display: flex;
      flex-direction: column;
      gap: 1px;
    }
    .cat-name {
      font-size: 0.88rem;
      font-weight: 700;
      color: #ffffff;
    }
    .c-col-sub {
      font-size: 0.72rem;
      color: var(--text-dim);
      display: block;
    }
    .comp-data-row:last-child {
      border-bottom: none;
    }
    .comp-data-row:hover {
      background: rgba(255, 255, 255, 0.02);
    }
    .c-col.pts {
      font-family: var(--font-mono);
      font-weight: 700;
      font-size: 0.88rem;
    }
    .c-col.pts.gold { color: var(--gold); }
    .c-col.pts.silver { color: var(--silver); }
    .c-col.pts.bronze { color: var(--bronze); }
    .c-col.pts.cyan { color: var(--cyan); }
    .status-tag {
      font-size: 0.72rem;
      font-weight: 700;
      padding: 3px 8px;
      border-radius: 4px;
      display: inline-block;
      text-align: center;
    }
    .status-tag.hit {
      background: rgba(16, 185, 129, 0.2);
      color: #34d399;
      border: 1px solid rgba(16, 185, 129, 0.4);
    }
    .status-tag.miss {
      background: rgba(225, 6, 0, 0.15);
      color: #f87171;
      border: 1px solid rgba(225, 6, 0, 0.3);
    }
    .status-tag.pending {
      background: rgba(245, 176, 0, 0.15);
      color: var(--gold);
      border: 1px solid rgba(245, 176, 0, 0.3);
    }
    @media (max-width: 768px) {
      .driver-picker-modal.comparison-modal {
        max-width: 100%;
        width: 96vw;
        height: 92vh;
        max-height: 92vh;
      }
      .comparison-modal-body {
        padding: 0.75rem;
        gap: 0.75rem;
      }
      .comp-header-row {
        display: none;
      }
      .comp-data-row {
        display: flex;
        flex-direction: column;
        align-items: flex-start;
        gap: 0.4rem;
        padding: 0.65rem 0.75rem;
        border: 1px solid var(--line);
        border-radius: var(--radius-sm);
        margin-bottom: 0.4rem;
        background: rgba(255, 255, 255, 0.02);
      }
      .comp-data-row .c-col {
        width: 100%;
        display: flex;
        justify-content: space-between;
        align-items: center;
      }
      .comp-data-row .c-col.cat {
        font-size: 0.95rem;
        border-bottom: 1px dashed var(--line);
        padding-bottom: 4px;
      }
      .comp-data-row .c-col::before {
        content: attr(data-label);
        font-size: 0.75rem;
        color: var(--text-dim);
        font-weight: 600;
        text-transform: uppercase;
      }
      .comp-data-row .c-col.cat::before {
        content: "";
      }
    }
    .dim {
      color: var(--text-dim);
    }
    @media (max-width: 768px) {
      .scoring-groups-list {
        gap: 1rem;
      }
      .scoring-subgroups-grid {
        display: flex;
        flex-direction: column;
        gap: 0.85rem;
      }
      .scoring-group-cards {
        flex-direction: column;
        gap: 0.45rem;
      }
      .scoring-rules-grid {
        display: flex;
        flex-direction: column;
        gap: 0.5rem;
      }
      .scoring-rule-card {
        width: 100%;
        box-sizing: border-box;
        justify-content: space-between;
      }
      .prediction-status-card {
        flex-direction: column;
        align-items: flex-start;
        gap: 0.75rem;
      }
      .podium-grid, .grid-two-cols, .counters-grid {
        grid-template-columns: 1fr;
      }
      .duel-arena-grid {
        grid-template-columns: 1fr;
        gap: 0.5rem;
      }
      .duel-vs-separator {
        margin: 0.2rem 0;
      }
      .picker-drivers-grid {
        grid-template-columns: 1fr;
      }
      .driver-picker-backdrop {
        padding: 0.75rem;
      }
      .driver-picker-modal {
        max-height: 94vh;
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
      .invite-row {
        flex-direction: column;
        align-items: stretch;
        gap: 0.75rem;
      }
      .league-password-bar {
        flex-direction: column;
        align-items: stretch;
        gap: 0.75rem;
      }
      .password-action-group {
        width: 100%;
        flex-wrap: wrap;
      }
      .password-field-container {
        width: 100%;
      }
      .password-display-input {
        width: 100%;
      }
      .copy-input {
        width: 100%;
      }
      .history-grid {
        grid-template-columns: 1fr;
      }
      .comp-header-row, .comp-data-row {
        grid-template-columns: 1fr;
        gap: 0.35rem;
      }
    }
  `]
})
export class DashboardComponent implements OnInit {
  private readonly api = inject(ApiService);
  public readonly auth = inject(AuthService);
  private readonly route = inject(ActivatedRoute);

  readonly drivers: F1Driver[] = F1_DRIVERS;
  readonly activeTab = signal<'pronostico' | 'ligas' | 'posiciones' | 'historial'>('pronostico');
  readonly leagueSubTab = signal<'list' | 'create' | 'join'>('list');
  readonly posicionesSubTab = signal<'jugadores' | 'pilotos' | 'equipos'>('jugadores');

  // Clasificaciones F1 oficiales (WDC y WCC desde Jolpica F1 API)
  readonly driverStandings = signal<JolpicaDriverStanding[]>([]);
  readonly constructorStandings = signal<JolpicaConstructorStanding[]>([]);

  // Item seleccionado en historial para comparar resultados
  readonly selectedHistoryItem = signal<PredictionHistoryItem | null>(null);

  @HostListener('document:keydown.escape')
  onEscapeKey() {
    if (this.selectedHistoryItem()) {
      this.selectedHistoryItem.set(null);
    }
    if (this.isPickerOpen()) {
      this.closeDriverPicker();
    }
  }

  // Sesión F1 activa
  readonly session = signal<NextSession | null>(null);
  readonly isLocked = computed(() => this.session()?.isLocked ?? false);
  readonly matchupDriver1 = computed(() => this.session()?.matchupDriver1 || 'norris');
  readonly matchupDriver2 = computed(() => this.session()?.matchupDriver2 || 'verstappen');
  readonly circuitShortName = computed<string>(() => {
    return resolveCircuitShortName(null, this.session());
  });

  // Estado reactivo del pronóstico con Signals
  readonly p1DriverId = signal<string>('');
  readonly p2DriverId = signal<string>('');
  readonly p3DriverId = signal<string>('');
  readonly poleDriverId = signal<string>('');
  readonly duelWinnerId = signal<string>('');
  readonly safetyCars = signal<number>(0);
  readonly dnfs = signal<number>(0);

  // Selector interactivo de pilotos
  readonly isPickerOpen = signal<boolean>(false);
  readonly pickerSlot = signal<'p1' | 'p2' | 'p3' | 'pole'>('p1');
  readonly pickerSearch = signal<string>('');

  readonly filteredDrivers = computed(() => {
    const q = this.pickerSearch().trim().toLowerCase();
    if (!q) return this.drivers;
    return this.drivers.filter(d =>
      d.name.toLowerCase().includes(q) ||
      d.team.toLowerCase().includes(q) ||
      d.code.toLowerCase().includes(q) ||
      d.number.toString().includes(q)
    );
  });

  readonly hasExistingPrediction = signal<boolean>(false);
  readonly predictionSubmittedAt = signal<string | null>(null);

  readonly isPodiumComplete = computed(() => {
    return !!(this.p1DriverId() && this.p2DriverId() && this.p3DriverId());
  });

  // Validación de podio duplicado reactiva (solo entre posiciones con piloto asignado)
  readonly isPodiumDuplicate = computed(() => {
    const picks = [this.p1DriverId(), this.p2DriverId(), this.p3DriverId()].filter(id => !!id && id.trim().length > 0);
    return new Set(picks).size !== picks.length;
  });

  readonly canSavePrediction = computed(() => {
    return !this.isPodiumDuplicate() && !this.isSaving() && !this.isLocked();
  });

  // Ligas privadas
  readonly myLeagues = signal<League[]>([]);
  readonly selectedLeague = signal<League | null>(null);
  readonly leagueLeaderboard = signal<LeaderboardEntry[]>([]);

  // Clasificación Global e Historial
  readonly globalLeaderboard = signal<LeaderboardEntry[]>([]);
  readonly isLoadingGlobalLeaderboard = signal<boolean>(false);
  readonly globalLeaderboardError = signal<string | null>(null);
  readonly historyItems = signal<PredictionHistoryItem[]>([]);

  // Estados de feedback de la UI
  readonly isSaving = signal(false);
  readonly saveSuccess = signal(false);
  readonly saveError = signal('');
  readonly copySuccess = signal(false);
  readonly showLeaguePassword = signal(false);
  readonly copyPasswordSuccess = signal(false);

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
    // 1. Restaurar inmediatamente desde caché local para evitar demoras y saltos visuales
    this.restoreLocalCache();

    this.loadNextSession();
    this.loadCurrentPrediction();
    this.loadUserLeagues();
    this.loadGlobalLeaderboard();
    this.loadHistory();
    this.loadF1Standings();

    // Comprobar parámetros de ruta (ej: /join/:inviteCode)
    const routeInvite = this.route.snapshot.paramMap.get('inviteCode');
    if (routeInvite) {
      this.activeTab.set('ligas');
      this.leagueSubTab.set('join');
      this.joinCode = routeInvite;
    }

    // Comprobar query params (ej: ?tab=ligas, ?tab=posiciones, ?tab=historial)
    this.route.queryParamMap.subscribe((params) => {
      const tabParam = params.get('tab');
      if (tabParam === 'ligas') {
        this.activeTab.set('ligas');
      } else if (tabParam === 'posiciones' || tabParam === 'global') {
        this.activeTab.set('posiciones');
        this.posicionesSubTab.set('jugadores');
        this.loadGlobalLeaderboard();
        this.loadF1Standings();
      } else if (tabParam === 'historial') {
        this.activeTab.set('historial');
      } else {
        this.activeTab.set('pronostico');
      }
    });
  }

  loadF1Standings() {
    this.api.jolpicaDriverStandings().subscribe({
      next: (ds) => this.driverStandings.set(ds || []),
      error: () => this.driverStandings.set([])
    });
    this.api.jolpicaConstructorStandings().subscribe({
      next: (cs) => this.constructorStandings.set(cs || []),
      error: () => this.constructorStandings.set([])
    });
  }

  private loadNextSession() {
    this.api.nextSession().subscribe({
      next: (sess) => {
        this.session.set(sess);
      },
      error: () => {}
    });
  }

  clearPredictionState() {
    this.p1DriverId.set('');
    this.p2DriverId.set('');
    this.p3DriverId.set('');
    this.poleDriverId.set('');
    this.duelWinnerId.set('');
    this.safetyCars.set(0);
    this.dnfs.set(0);
    this.hasExistingPrediction.set(false);
    this.predictionSubmittedAt.set(null);
  }

  private restoreLocalCache() {
    const user = this.auth.username();
    const cachedLb = this.api.getCachedGlobalLeaderboard?.();
    if (cachedLb && cachedLb.length > 0) {
      this.globalLeaderboard.set(cachedLb);
    }
    const cachedPred = this.api.getCachedPrediction?.(user);
    if (cachedPred && (cachedPred.predictionId || (cachedPred.podium && cachedPred.podium.length > 0))) {
      this.applyPredictionToState(cachedPred);
    }
    const cachedLeagues = this.api.getCachedLeagues?.(user);
    if (cachedLeagues && cachedLeagues.length > 0) {
      if (typeof localStorage !== 'undefined') {
        for (const l of cachedLeagues) {
          if (!l.password && l.hasPassword) {
            const cached = localStorage.getItem('apex_lpwd_' + l.id);
            if (cached) {
              l.password = cached;
            }
          }
        }
      }
      this.myLeagues.set(cachedLeagues);
      if (!this.selectedLeague()) {
        this.selectedLeague.set(cachedLeagues[0]);
      }
    }
  }

  private applyPredictionToState(pred: PredictionDetail) {
    if (pred.podium && pred.podium.length >= 3) {
      this.p1DriverId.set(pred.podium[0] || '');
      this.p2DriverId.set(pred.podium[1] || '');
      this.p3DriverId.set(pred.podium[2] || '');
    } else {
      this.p1DriverId.set('');
      this.p2DriverId.set('');
      this.p3DriverId.set('');
    }

    this.poleDriverId.set(pred.polePositionDriverId || '');
    this.duelWinnerId.set(pred.duelDriverPick || '');
    this.safetyCars.set(pred.safetyCarCount != null ? pred.safetyCarCount : 0);
    this.dnfs.set(pred.dnfCount != null ? pred.dnfCount : 0);

    if (pred.predictionId || pred.submittedAt || (pred.podium && pred.podium.length > 0)) {
      this.hasExistingPrediction.set(true);
      this.predictionSubmittedAt.set(pred.submittedAt || null);
    } else {
      this.hasExistingPrediction.set(false);
      this.predictionSubmittedAt.set(null);
    }
  }

  private loadCurrentPrediction() {
    this.api.currentPrediction(this.auth.username()).subscribe({
      next: (pred) => {
        if (pred && (pred.predictionId || (pred.podium && pred.podium.length > 0))) {
          this.applyPredictionToState(pred);
        } else {
          this.clearPredictionState();
        }
      },
      error: () => {
        if (!this.hasExistingPrediction()) {
          this.clearPredictionState();
        }
      }
    });
  }

  private loadUserLeagues() {
    this.api.leagues(this.auth.username()).subscribe({
      next: (leagues) => {
        if (typeof localStorage !== 'undefined') {
          for (const l of leagues) {
            if (!l.password && l.hasPassword) {
              const cached = localStorage.getItem('apex_lpwd_' + l.id);
              if (cached) {
                l.password = cached;
              }
            }
          }
        }
        this.myLeagues.set(leagues);
        if (leagues.length > 0) {
          const current = this.selectedLeague();
          const match = current ? leagues.find(l => l.id === current.id) : null;
          this.selectLeague(match || leagues[0]);
        }
      },
      error: () => {
        if (!this.myLeagues().length) {
          this.myLeagues.set([]);
        }
      }
    });
  }

  selectLeague(league: League) {
    this.selectedLeague.set(league);
    this.showLeaguePassword.set(false);
    this.api.leagueLeaderboard(league.id).subscribe({
      next: (lb) => {
        this.leagueLeaderboard.set(lb);
      },
      error: () => {
        this.leagueLeaderboard.set([]);
      }
    });
  }

  loadGlobalLeaderboard() {
    this.isLoadingGlobalLeaderboard.set(true);
    this.globalLeaderboardError.set(null);
    this.api.globalLeaderboard().subscribe({
      next: (lb) => {
        this.globalLeaderboard.set(lb || []);
        this.isLoadingGlobalLeaderboard.set(false);
        // Sincronizar puntos de usuario actual en navbar si coincide
        const myName = this.auth.username()?.toLowerCase();
        if (myName) {
          const me = (lb || []).find(u => u.displayName.toLowerCase().includes(myName));
          if (me) {
            this.auth.userPoints.set(me.totalScore);
          }
        }
      },
      error: () => {
        this.isLoadingGlobalLeaderboard.set(false);
        if (this.globalLeaderboard().length === 0) {
          this.globalLeaderboardError.set(
            'El servidor backend se encuentra reiniciándose o conectando tras la última actualización.'
          );
        }
      }
    });
  }

  private loadHistory() {
    this.api.predictionHistory(this.auth.username()).subscribe({
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

  getDriver(id?: string | null): F1Driver | undefined {
    if (!id) return undefined;
    return this.drivers.find(d => d.id === id);
  }

  openDriverPicker(slot: 'p1' | 'p2' | 'p3' | 'pole') {
    if (this.isLocked()) return;
    this.pickerSlot.set(slot);
    this.pickerSearch.set('');
    this.isPickerOpen.set(true);
  }

  closeDriverPicker() {
    this.isPickerOpen.set(false);
  }

  getPickerTitle(): string {
    switch (this.pickerSlot()) {
      case 'p1': return 'Seleccionar Ganador P1';
      case 'p2': return 'Seleccionar 2° Lugar P2';
      case 'p3': return 'Seleccionar 3° Lugar P3';
      case 'pole': return 'Seleccionar Pole Position';
    }
  }

  isCurrentInSlot(driverId: string): boolean {
    const slot = this.pickerSlot();
    if (slot === 'p1') return this.p1DriverId() === driverId;
    if (slot === 'p2') return this.p2DriverId() === driverId;
    if (slot === 'p3') return this.p3DriverId() === driverId;
    if (slot === 'pole') return this.poleDriverId() === driverId;
    return false;
  }

  getDriverSlotName(driverId: string): string | null {
    if (this.p1DriverId() === driverId) return 'P1 Ganador';
    if (this.p2DriverId() === driverId) return 'P2 Segundo';
    if (this.p3DriverId() === driverId) return 'P3 Tercero';
    return null;
  }

  isDriverInAnotherSlot(driverId: string): boolean {
    const slot = this.pickerSlot();
    if (slot === 'pole') return false;
    if (slot === 'p1') return this.p2DriverId() === driverId || this.p3DriverId() === driverId;
    if (slot === 'p2') return this.p1DriverId() === driverId || this.p3DriverId() === driverId;
    if (slot === 'p3') return this.p1DriverId() === driverId || this.p2DriverId() === driverId;
    return false;
  }

  toggleDuelWinner(driverId: string) {
    if (this.isLocked()) return;
    if (this.duelWinnerId() === driverId) {
      this.duelWinnerId.set('');
    } else {
      this.duelWinnerId.set(driverId);
    }
  }

  selectDriver(slot: 'p1' | 'p2' | 'p3' | 'pole', driverId: string) {
    if (this.isLocked()) return;

    if (!driverId) {
      if (slot === 'pole') this.poleDriverId.set('');
      else if (slot === 'p1') this.p1DriverId.set('');
      else if (slot === 'p2') this.p2DriverId.set('');
      else if (slot === 'p3') this.p3DriverId.set('');
      this.closeDriverPicker();
      return;
    }

    if (slot === 'pole') {
      this.poleDriverId.set(driverId);
      this.closeDriverPicker();
      return;
    }

    // Lógica de auto-intercambio (swap) para evitar errores de duplicado
    const currentP1 = this.p1DriverId();
    const currentP2 = this.p2DriverId();
    const currentP3 = this.p3DriverId();

    if (slot === 'p1') {
      if (currentP2 === driverId) {
        this.p2DriverId.set(currentP1);
      } else if (currentP3 === driverId) {
        this.p3DriverId.set(currentP1);
      }
      this.p1DriverId.set(driverId);
    } else if (slot === 'p2') {
      if (currentP1 === driverId) {
        this.p1DriverId.set(currentP2);
      } else if (currentP3 === driverId) {
        this.p3DriverId.set(currentP2);
      }
      this.p2DriverId.set(driverId);
    } else if (slot === 'p3') {
      if (currentP1 === driverId) {
        this.p1DriverId.set(currentP3);
      } else if (currentP2 === driverId) {
        this.p2DriverId.set(currentP3);
      }
      this.p3DriverId.set(driverId);
    }

    this.closeDriverPicker();
  }

  getDriverName(id?: string | null | any): string {
    if (!id) return 'Sin selección';
    if (typeof id === 'object' && id !== null) {
      id = id.id || id.name || id.code || '';
    }
    const cleanId = String(id).trim();
    if (!cleanId || cleanId === 'undefined' || cleanId === 'null') return 'Sin selección';
    const found = this.drivers.find(d => d.id.toLowerCase() === cleanId.toLowerCase() || d.code.toLowerCase() === cleanId.toLowerCase());
    return found ? `${found.name} (${found.team})` : cleanId;
  }

  isPodiumHit(item: PredictionHistoryItem, index: number): boolean {
    if (!item?.podium?.[index] || !item?.officialResults?.podium?.[index]) return false;
    return item.podium[index].trim().toLowerCase() === item.officialResults.podium[index].trim().toLowerCase();
  }

  isPoleHit(item: PredictionHistoryItem): boolean {
    if (item.scoreBreakdown?.poleHit != null) return item.scoreBreakdown.poleHit;
    if (!item?.polePositionDriverId || !item?.officialResults?.polePositionDriverId) return false;
    return item.polePositionDriverId.trim().toLowerCase() === item.officialResults.polePositionDriverId.trim().toLowerCase();
  }

  isDuelHit(item: PredictionHistoryItem): boolean {
    if (item.scoreBreakdown?.duelHit != null) return item.scoreBreakdown.duelHit;
    if (!item?.duelDriverPick || !item?.officialResults?.duelWinnerId) return false;
    return item.duelDriverPick.trim().toLowerCase() === item.officialResults.duelWinnerId.trim().toLowerCase();
  }

  isSafetyCarHit(item: PredictionHistoryItem): boolean {
    if (item.scoreBreakdown?.safetyCarHit != null) return item.scoreBreakdown.safetyCarHit;
    if (item?.safetyCarCount == null || item?.officialResults?.safetyCarCount == null) return false;
    return Number(item.safetyCarCount) === Number(item.officialResults.safetyCarCount);
  }

  isDnfHit(item: PredictionHistoryItem): boolean {
    if (item.scoreBreakdown?.dnfHit != null) return item.scoreBreakdown.dnfHit;
    if (item?.dnfCount == null || item?.officialResults?.dnfCount == null) return false;
    return Number(item.dnfCount) === Number(item.officialResults.dnfCount);
  }

  handleModalDriverSelected(event: { slot: PodiumSlot; driverId: string }) {
    this.selectDriver(event.slot, event.driverId);
  }

  handleSavePodium(podium: PodiumSelection) {
    this.p1DriverId.set(podium.p1);
    this.p2DriverId.set(podium.p2);
    this.p3DriverId.set(podium.p3);
    this.savePrediction();
  }

  savePrediction() {
    if (this.isPodiumDuplicate()) {
      this.saveError.set('No podés repetir pilotos en el podio.');
      return;
    }
    if (this.isSaving() || this.isLocked()) return;
    
    const sess = this.session();
    const sessionId = sess?.id || 'f0c23d70-f7ca-411d-b827-7a9d45037101';

    this.isSaving.set(true);
    this.saveError.set('');
    this.saveSuccess.set(false);

    const hasAnyPodium = !!(this.p1DriverId() || this.p2DriverId() || this.p3DriverId());
    const payload = {
      podium: hasAnyPodium
        ? [this.p1DriverId() || '', this.p2DriverId() || '', this.p3DriverId() || '']
        : [],
      polePositionDriverId: this.poleDriverId() || null,
      duelDriverPick: this.duelWinnerId() || null,
      safetyCarCount: this.safetyCars(),
      dnfCount: this.dnfs()
    };

    this.api.submitPrediction(sessionId, payload, this.auth.username()).subscribe({
      next: (res) => {
        this.isSaving.set(false);
        this.saveSuccess.set(true);
        this.hasExistingPrediction.set(true);
        this.predictionSubmittedAt.set(res?.submittedAt || new Date().toISOString());
        this.api.setCachedPrediction?.({
          ...res,
          podium: payload.podium,
          polePositionDriverId: payload.polePositionDriverId,
          duelDriverPick: payload.duelDriverPick,
          safetyCarCount: payload.safetyCarCount,
          dnfCount: payload.dnfCount
        }, this.auth.username());
        this.loadHistory();
        this.loadGlobalLeaderboard();
        if (this.selectedLeague()) {
          this.selectLeague(this.selectedLeague()!);
        }
        setTimeout(() => this.saveSuccess.set(false), 4000);
      },
      error: (err) => {
        this.isSaving.set(false);
        if (err.status === 502 || err.status === 504) {
          this.saveError.set('Los servidores de telemetría tardaron en responder debido al arranque inicial. Volvé a presionar "Guardar Pronóstico" ahora que el canal ya está abierto.');
        } else {
          this.saveError.set(err.error?.description || err.error?.message || 'Error al persistir el pronóstico en la base de datos.');
        }
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

  toggleLeaguePasswordVisibility() {
    this.showLeaguePassword.update((v) => !v);
  }

  getLeaguePassword(league?: League | null): string {
    if (!league) return '';
    if (league.password) return league.password;
    if (typeof localStorage !== 'undefined' && league.id) {
      const cached = localStorage.getItem('apex_lpwd_' + league.id);
      if (cached) return cached;
    }
    return '';
  }

  copyLeaguePassword() {
    const pwd = this.getLeaguePassword(this.selectedLeague());
    if (!pwd) return;
    if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
      navigator.clipboard.writeText(pwd).then(() => {
        this.copyPasswordSuccess.set(true);
        setTimeout(() => this.copyPasswordSuccess.set(false), 2000);
      }).catch(() => {});
    }
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
        if (pwd) {
          created.password = pwd;
          try {
            localStorage.setItem('apex_lpwd_' + created.id, pwd);
          } catch {}
        }
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
        if (pwd) {
          joined.password = pwd;
          try {
            localStorage.setItem('apex_lpwd_' + joined.id, pwd);
          } catch {}
        }
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
