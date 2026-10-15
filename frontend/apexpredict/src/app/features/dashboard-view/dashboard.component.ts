import { Component, inject, OnInit, signal } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { switchMap } from 'rxjs';
import { ApiService } from '../../core/services/api.service';
import { League, NextSession, PredictionDetail, LeaderboardEntry } from '../../core/models/api.models';

@Component({
  standalone: true,
  selector: 'app-dashboard',
  imports: [ReactiveFormsModule],
  template: `
    <section class="section page">
      <header class="dashboard-header">
        <p class="eyebrow">TEMPORADA F1 2026 · APEXPREDICT</p>
        <h1>Centro de Control & Pronósticos</h1>
        <p class="lead">Carga tus predicciones para la próxima sesión y compite en tiempo real.</p>
      </header>

      @if (loading()) {
        <p role="status">Cargando datos de la plataforma…</p>
      }
      @if (error()) {
        <p class="notice error" role="alert">{{ error() }}</p>
      }

      @if (!loading() && ready()) {
        <!-- SECCIÓN A: Siguiente Carrera & Formulario de Predicciones con Lock Time -->
        <article class="prediction-box">
          <div class="box-header">
            <div>
              <span class="badge">PRÓXIMO EVENTO</span>
              <h2>{{ nextSession()?.name || 'Gran Premio de Fórmula 1' }}</h2>
              <p class="subtext">
                Circuito: <strong>{{ nextSession()?.circuit || 'Circuito Oficial' }}</strong> · Fecha: {{ nextSession()?.raceDate || 'Próximamente' }}
              </p>
            </div>
            <div class="lock-status" [class.locked]="isLocked()">
              @if (isLocked()) {
                <span class="status-pill locked">🔒 LOCK TIME SUPERADO - CERRADO</span>
              } @else {
                <span class="status-pill open">⏱️ PRONÓSTICOS ABIERTOS HASTA {{ nextSession()?.startsAt }}</span>
              }
            </div>
          </div>

          @if (predictionSuccess()) {
            <p class="notice success" role="alert">¡Pronóstico guardado exitosamente!</p>
          }
          @if (predictionError()) {
            <p class="notice error" role="alert">{{ predictionError() }}</p>
          }

          <form class="prediction-form" [formGroup]="predForm" (ngSubmit)="savePrediction()">
            <div class="grid-form">
              <!-- Podio -->
              <div class="form-group">
                <h3>🏆 Podio Oficial</h3>
                <label for="p1">1º Puesto (P1)</label>
                <input id="p1" formControlName="p1" placeholder="Ej: norris" [readonly]="isLocked()" />

                <label for="p2">2º Puesto (P2)</label>
                <input id="p2" formControlName="p2" placeholder="Ej: verstappen" [readonly]="isLocked()" />

                <label for="p3">3º Puesto (P3)</label>
                <input id="p3" formControlName="p3" placeholder="Ej: leclerc" [readonly]="isLocked()" />
                <small>1 acierto = 3 pts · 2 aciertos = 7 pts · 3 aciertos = 10 pts</small>
              </div>

              <!-- Pole Position & Duelo -->
              <div class="form-group">
                <h3>⚡ Pole & Duelo del Fin de Semana</h3>
                <label for="pole">Pole Position (4 pts)</label>
                <input id="pole" formControlName="pole" placeholder="Piloto en Pole" [readonly]="isLocked()" />

                <label for="duel">Duelo de Pilotos (3 pts)</label>
                <div class="matchup-banner">
                  <span>{{ nextSession()?.matchupDriver1 || 'Piloto 1' }}</span> vs <span>{{ nextSession()?.matchupDriver2 || 'Piloto 2' }}</span>
                </div>
                <input id="duel" formControlName="duel" placeholder="Escribe tu piloto elegido" [readonly]="isLocked()" />
              </div>

              <!-- Autos de Seguridad & Abandonos -->
              <div class="form-group">
                <h3>🚩 Incidentes de Carrera</h3>
                <label for="safetyCars">Safety Cars (VSC - SC, 6 pts)</label>
                <input id="safetyCars" type="number" min="0" formControlName="safetyCars" [readonly]="isLocked()" />

                <label for="dnfs">Abandonos (DNF - DNS, 6 pts)</label>
                <input id="dnfs" type="number" min="0" formControlName="dnfs" [readonly]="isLocked()" />
              </div>
            </div>

            <button class="button" type="submit" [disabled]="isLocked() || savingPrediction() || predForm.invalid">
              {{ isLocked() ? 'Bloqueado (Lock Time)' : (savingPrediction() ? 'Guardando…' : 'Guardar Pronóstico') }}
            </button>
          </form>
        </article>

        <!-- SECCIÓN B: Ligas Privadas -->
        <section class="leagues-section">
          <h2>Mis ligas privadas</h2>
          <form class="create-league" [formGroup]="form" (ngSubmit)="create()">
            <label for="league-name">Nombre de la nueva liga</label>
            <div>
              <input
                id="league-name"
                formControlName="name"
                maxlength="100"
                placeholder="Por ejemplo, La última curva"
                required
              /><button class="button" type="submit" [disabled]="name.invalid || saving()">
                {{ saving() ? 'Creando…' : 'Crear liga' }}
              </button>
            </div>
          </form>

          <div class="join-league">
            <label for="invite-code">Unirse con código de invitación</label>
            <div style="display: flex; gap: 0.5rem; margin-top: 0.25rem;">
              <input id="invite-code" #inviteInput placeholder="Código UUID de invitación" />
              <button class="button" type="button" (click)="join(inviteInput.value)">Unirme</button>
            </div>
          </div>

          <div class="race-grid">
            @for (league of leagues(); track league.id) {
              <article class="race-card">
                <p class="eyebrow">LIGA PRIVADA</p>
                <h2>{{ league.name }}</h2>
                @if (league.inviteCode) {
                  <p class="subtext">Código: <code>{{ league.inviteCode }}</code></p>
                }
              </article>
            } @empty {
              <p class="empty">Todavía no perteneces a ninguna liga. Crea la primera para empezar.</p>
            }
          </div>
        </section>

        <!-- SECCIÓN C: Leaderboard Global -->
        <section class="leaderboard-section">
          <h2>Tabla de Posiciones Global (Tiempo Real)</h2>
          @if (leaderboard().length > 0) {
            <table class="leaderboard-table">
              <thead>
                <tr>
                  <th>Pos</th>
                  <th>Piloto / Jugador</th>
                  <th>Puntos</th>
                  <th>Pronósticos</th>
                </tr>
              </thead>
              <tbody>
                @for (entry of leaderboard(); track entry.userId) {
                  <tr>
                    <td>#{{ entry.rank }}</td>
                    <td><strong>{{ entry.displayName }}</strong></td>
                    <td>{{ entry.totalScore }} pts</td>
                    <td>{{ entry.predictionsCount }}</td>
                  </tr>
                }
              </tbody>
            </table>
          } @else {
            <p class="empty">Aún no hay puntuaciones acumuladas en la tabla global.</p>
          }
        </section>
      }
    </section>
  `,
})
export class DashboardComponent implements OnInit {
  private readonly api = inject(ApiService);

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
  readonly leaderboard = signal<LeaderboardEntry[]>([]);
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
    this.api
      .profile()
      .pipe(switchMap(() => this.api.leagues()))
      .subscribe({
        next: (leagues) => {
          this.leagues.set(leagues);
          this.loadDashboardData();
        },
        error: () => {
          this.loading.set(false);
          this.error.set('No pudimos cargar tu perfil. Reintenta iniciando sesión.');
        },
      });
  }

  private loadDashboardData() {
    if (this.api.nextSession) {
      this.api.nextSession().subscribe({
        next: (session) => {
          this.nextSession.set(session);
          if (session) {
            this.isLocked.set(session.isLocked);
            this.loadCurrentPrediction();
          }
        },
        error: () => {
          // Si aún no hay sesión o falla
        }
      });
    }

    if (this.api.globalLeaderboard) {
      this.api.globalLeaderboard().subscribe({
        next: (lb) => this.leaderboard.set(lb),
        error: () => {}
      });
    }

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

  savePrediction() {
    if (this.isLocked() || this.predForm.invalid || this.savingPrediction()) return;
    const session = this.nextSession();
    if (!session) return;

    this.savingPrediction.set(true);
    this.predictionError.set('');
    this.predictionSuccess.set(false);

    const val = this.predForm.value;
    const payload = {
      podium: [val.p1!.trim(), val.p2!.trim(), val.p3!.trim()],
      polePositionDriverId: val.pole ? val.pole.trim() : null,
      duelDriverPick: val.duel ? val.duel.trim() : null,
      safetyCarCount: val.safetyCars ?? 0,
      dnfCount: val.dnfs ?? 0,
    };

    this.api.submitPrediction(session.id, payload).subscribe({
      next: (res) => {
        this.savingPrediction.set(false);
        this.predictionSuccess.set(true);
        this.currentPrediction.set(res);
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
      },
      error: () => {
        this.error.set('Código de invitación no válido o ya eres miembro.');
      }
    });
  }
}
