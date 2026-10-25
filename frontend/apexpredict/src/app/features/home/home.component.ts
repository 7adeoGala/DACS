import { Component, inject, OnInit, signal, OnDestroy } from '@angular/core';
import { DatePipe } from '@angular/common';
import { RouterLink } from '@angular/router';
import { ApiService } from '../../core/services/api.service';
import { AuthService } from '../../core/auth/auth.service';
import { Race, NextSession, CircuitInfo, F1_CIRCUITS, DEFAULT_CIRCUIT } from '../../core/models/api.models';

@Component({
  standalone: true,
  selector: 'app-home',
  imports: [DatePipe, RouterLink],
  template: `
    <!-- HERO SECTION WITH CIRCUIT SPOTLIGHT -->
    <section class="hero-spotlight">
      <div class="hero-copy">
        <p class="eyebrow">
          <span class="red-dot"></span> FORMULA 1 · TEMPORADA {{ season }}
        </p>
        <h1>La carrera empieza<br />con tu <em>predicción.</em></h1>
        <p class="lead">
          Competí pronosticando podios, pole positions, duelos directos e incidentes en cada Gran Premio oficial. 
          Creá tu liga privada y desafiá a tus amigos en tiempo real.
        </p>

        <div class="hero-actions">
          @if (auth.authenticated()) {
            <a class="button" routerLink="/dashboard">
              Ir a mi Centro de Control
            </a>
          } @else {
            <a class="button" routerLink="/login">
              Iniciar sesión
            </a>
            <a class="button quiet" routerLink="/register">
              Crear cuenta gratis
            </a>
          }
        </div>
      </div>

      <!-- SPOTLIGHT: CIRCUITO Y PRÓXIMA CARRERA -->
      <article class="spotlight-card">
        <div class="spotlight-header">
          <div>
            <div class="live-badge">
              <span class="red-dot"></span> PRÓXIMO GRAN PREMIO
            </div>
            <h2 style="font-size: 26px; margin-top: 10px;">{{ nextSession()?.name || 'Gran Premio de Fórmula 1' }}</h2>
            <p class="eyebrow" style="margin-top: 4px; color: var(--cyan);">
              {{ currentCircuit().city }}, {{ currentCircuit().country }} · {{ currentCircuit().name }}
            </p>
          </div>
        </div>

        <!-- SVG CIRCUITO REAL / ESTILIZADO -->
        <div class="circuit-svg-box">
          <svg viewBox="0 0 420 300">
            <path [attr.d]="currentCircuit().svgPath" />
            <path class="track-glow" [attr.d]="currentCircuit().svgPath" />
            <circle cx="100" cy="230" r="6" fill="#fff" stroke="var(--red)" stroke-width="4" />
          </svg>
        </div>

        <!-- DATOS TÉCNICOS DEL CIRCUITO -->
        <div class="circuit-specs-grid">
          <div class="spec-item">
            <span class="spec-label">Longitud</span>
            <span class="spec-val">{{ currentCircuit().lengthKm }}</span>
          </div>
          <div class="spec-item">
            <span class="spec-label">Vueltas</span>
            <span class="spec-val">{{ currentCircuit().laps }}</span>
          </div>
          <div class="spec-item">
            <span class="spec-label">Récord</span>
            <span class="spec-val">{{ currentCircuit().lapRecord }}</span>
          </div>
          <div class="spec-item">
            <span class="spec-label">Zonas DRS</span>
            <span class="spec-val">{{ currentCircuit().drsZones }}</span>
          </div>
        </div>

        <!-- HORARIOS OFICIALES DEL FIN DE SEMANA (HORARIO DE ARGENTINA - ART / UTC-3) -->
        <div class="schedule-list">
          <div class="schedule-row">
            <span class="sess-name">Práctica Libre 1 (FP1)</span>
            <span class="sess-time">
              {{ nextSession()?.fp1 ? (nextSession()?.fp1 | date: 'EEE dd/MM · HH:mm' : '-0300') + ' hs (Arg)' : 'Viernes 30/10 · 15:30 hs (Arg)' }}
            </span>
          </div>
          <div class="schedule-row">
            <span class="sess-name">Práctica Libre 2 (FP2)</span>
            <span class="sess-time">
              {{ nextSession()?.fp2 ? (nextSession()?.fp2 | date: 'EEE dd/MM · HH:mm' : '-0300') + ' hs (Arg)' : 'Viernes 30/10 · 19:00 hs (Arg)' }}
            </span>
          </div>
          <div class="schedule-row">
            <span class="sess-name">Clasificación Oficial (Q)</span>
            <span class="sess-time">
              {{ nextSession()?.qualifying ? (nextSession()?.qualifying | date: 'EEE dd/MM · HH:mm' : '-0300') + ' hs (Arg)' : 'Sábado 31/10 · 18:00 hs (Arg)' }}
            </span>
          </div>
          <div class="schedule-row active">
            <span class="sess-name">Gran Premio (Carrera)</span>
            <span class="sess-time">
              {{ nextSession()?.startsAt ? (nextSession()?.startsAt | date: 'EEE dd/MM · HH:mm' : '-0300') + ' hs (Arg)' : 'Domingo 01/11 · 17:00 hs (Arg)' }}
            </span>
          </div>
        </div>
      </article>
    </section>

    <!-- CALENDARIO DE CARRERAS FUTURAS -->
    <section class="section" aria-labelledby="calendar-title">
      <div class="section-heading">
        <div>
          <p class="eyebrow"><span class="red-dot"></span> TEMPORADA {{ season }}</p>
          <h2 id="calendar-title">Próximos Grandes Premios</h2>
        </div>
        <div style="display: flex; align-items: center; gap: 14px;">
          <span class="muted">{{ upcomingRaces().length }} carreras restantes</span>
          @if (pastRaces().length > 0) {
            <button class="button small quiet" (click)="toggleShowPast()">
              {{ showPast() ? 'Ocultar disputadas' : 'Ver disputadas (' + pastRaces().length + ')' }}
            </button>
          }
        </div>
      </div>

      @if (loading()) {
        <p role="status" class="empty">Cargando calendario oficial…</p>
      } @else if (error()) {
        <div class="notice error" role="alert">
          {{ error() }} <button class="button small quiet" (click)="load()">Reintentar</button>
        </div>
      } @else if (!upcomingRaces().length && !showPast()) {
        <p class="empty">No hay carreras futuras pendientes en el calendario de esta temporada.</p>
      } @else {
        <div class="race-grid">
          @for (race of displayedRaces(); track race.round) {
            <article class="race-card" [style.opacity]="isPast(race) ? '0.7' : '1'">
              <div class="race-top">
                <span class="round-badge">RONDA {{ race.round.toString().padStart(2, '0') }}</span>
                <span class="race-date">{{ race.date | date: 'dd MMM yyyy' : '-0300' }}</span>
              </div>
              <p class="country">{{ race.country }}</p>
              <h3>{{ race.name }}</h3>
              <p class="muted">{{ race.circuit }}</p>
              <div class="race-bottom">
                <span>{{
                  race.startsAt
                    ? (race.startsAt | date: 'HH:mm' : '-0300') + ' hs (Arg)'
                    : 'Horario oficial'
                }}</span>
                <span style="color: var(--cyan); font-weight: 700;">
                  {{ isPast(race) ? 'CONCLUIDA' : 'POR DISPUTAR ↗' }}
                </span>
              </div>
            </article>
          }
        </div>
      }
    </section>
  `,
})
export class HomeComponent implements OnInit, OnDestroy {
  private readonly api = inject(ApiService);
  readonly auth = inject(AuthService);
  readonly season = new Date().getUTCFullYear();

  readonly allRaces = signal<Race[]>([]);
  readonly upcomingRaces = signal<Race[]>([]);
  readonly pastRaces = signal<Race[]>([]);
  readonly nextSession = signal<NextSession | null>(null);
  readonly currentCircuit = signal<CircuitInfo>(F1_CIRCUITS['rodriguez'] || DEFAULT_CIRCUIT);

  readonly showPast = signal<boolean>(false);
  readonly loading = signal(true);
  readonly error = signal('');

  ngOnInit() {
    this.load();
  }

  ngOnDestroy() {}

  load() {
    this.loading.set(true);
    this.error.set('');

    // Si ya existe calendario en caché local, mostrarlo al instante (0ms)
    try {
      const cached = localStorage.getItem(`apexpredict_calendar_${this.season}`);
      if (cached) {
        const parsed = JSON.parse(cached);
        if (parsed && parsed.length > 0) {
          this.allRaces.set(parsed);
          this.filterRaces(parsed);
          this.loading.set(false);
        }
      }
    } catch {}

    // Cargar siguiente sesión desde Jolpica/Backend
    this.api.nextSession().subscribe({
      next: (session) => {
        this.nextSession.set(session);
        this.resolveCircuit(session.name, session.circuit, session.circuitId);
      },
      error: () => {
        this.resolveCircuit('United States', 'Circuit of the Americas', 'americas');
      }
    });

    // Cargar calendario completo
    this.api.calendar(this.season).subscribe({
      next: (races) => {
        this.allRaces.set(races);
        this.filterRaces(races);
        this.loading.set(false);
      },
      error: () => {
        if (this.allRaces().length === 0) {
          this.error.set('No pudimos cargar el calendario oficial. Por favor intenta nuevamente.');
        }
        this.loading.set(false);
      },
    });
  }

  filterRaces(races: Race[]) {
    const now = new Date();
    const todayStr = now.toISOString().slice(0, 10);

    const upcoming: Race[] = [];
    const past: Race[] = [];

    for (const r of races) {
      if (r.date < todayStr) {
        past.push(r);
      } else {
        upcoming.push(r);
      }
    }

    this.upcomingRaces.set(upcoming);
    this.pastRaces.set(past);

    if (!this.nextSession() && upcoming.length > 0) {
      const first = upcoming[0];
      this.resolveCircuit(first.name, first.circuit);
    }
  }

  displayedRaces(): Race[] {
    return this.showPast() ? this.allRaces() : this.upcomingRaces();
  }

  isPast(race: Race): boolean {
    const todayStr = new Date().toISOString().slice(0, 10);
    return race.date < todayStr;
  }

  toggleShowPast() {
    this.showPast.update(v => !v);
  }

  private resolveCircuit(gpName?: string, circuitName?: string, circuitId?: string) {
    const search = `${circuitId || ''} ${gpName || ''} ${circuitName || ''}`.toLowerCase();
    if (search.includes('americas') || search.includes('cota') || search.includes('austin') || search.includes('united states') || search.includes('estados unidos')) {
      this.currentCircuit.set(F1_CIRCUITS['americas']);
    } else if (search.includes('rodriguez') || search.includes('mexic') || search.includes('hermanos')) {
      this.currentCircuit.set(F1_CIRCUITS['rodriguez']);
    } else if (search.includes('interlagos') || search.includes('brasil') || search.includes('brazil') || search.includes('pace') || search.includes('sao paulo')) {
      this.currentCircuit.set(F1_CIRCUITS['interlagos']);
    } else if (search.includes('vegas') || search.includes('strip')) {
      this.currentCircuit.set(F1_CIRCUITS['vegas']);
    } else if (search.includes('losail') || search.includes('lusail') || search.includes('qatar') || search.includes('catar')) {
      this.currentCircuit.set(F1_CIRCUITS['losail']);
    } else if (search.includes('yas') || search.includes('marina') || search.includes('abu dhabi') || search.includes('dabi')) {
      this.currentCircuit.set(F1_CIRCUITS['yas_marina']);
    } else if (search.includes('albert') || search.includes('melbourne') || search.includes('australia')) {
      this.currentCircuit.set(F1_CIRCUITS['albert_park']);
    } else if (search.includes('bahrain') || search.includes('sakhir') || search.includes('barein')) {
      this.currentCircuit.set(F1_CIRCUITS['bahrain']);
    } else if (search.includes('jeddah') || search.includes('yeda') || search.includes('saudi')) {
      this.currentCircuit.set(F1_CIRCUITS['jeddah']);
    } else if (search.includes('suzuka') || search.includes('japon') || search.includes('japan')) {
      this.currentCircuit.set(F1_CIRCUITS['suzuka']);
    } else if (search.includes('shanghai') || search.includes('china')) {
      this.currentCircuit.set(F1_CIRCUITS['shanghai']);
    } else if (search.includes('miami')) {
      this.currentCircuit.set(F1_CIRCUITS['miami']);
    } else if (search.includes('monaco') || search.includes('monte carlo')) {
      this.currentCircuit.set(F1_CIRCUITS['monaco']);
    } else if (search.includes('silverstone') || search.includes('brit') || search.includes('reino')) {
      this.currentCircuit.set(F1_CIRCUITS['silverstone']);
    } else if (search.includes('spa') || search.includes('francorchamps') || search.includes('belg')) {
      this.currentCircuit.set(F1_CIRCUITS['spa']);
    } else if (search.includes('monza') || search.includes('italia') || search.includes('italy')) {
      this.currentCircuit.set(F1_CIRCUITS['monza']);
    } else {
      this.currentCircuit.set(F1_CIRCUITS['rodriguez'] || DEFAULT_CIRCUIT);
    }
  }
}
