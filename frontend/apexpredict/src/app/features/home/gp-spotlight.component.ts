import { Component, signal, computed, inject, OnInit, OnDestroy, effect } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { RouterLink } from '@angular/router';
import { forkJoin } from 'rxjs';
import { ApiService } from '../../core/services/api.service';
import { AuthService } from '../../core/auth/auth.service';
import {
  NextSession,
  PredictionDetail,
  LeaderboardEntry,
  CircuitInfo,
  F1_CIRCUITS,
  DEFAULT_CIRCUIT,
  F1_DRIVERS,
  DriverOption,
  JolpicaDriverStanding,
  resolveCircuitShortName
} from '../../core/models/api.models';

export interface SessionSchedule {
  name: string;
  type: string;
  dateLabel: string;
  timeArg: string;
  status: 'COMPLETED' | 'LIVE' | 'UPCOMING' | 'PROGRAMMED';
}

export interface WeatherData {
  trackTemp: string;
  airTemp: string;
  humidity: string;
  wind: string;
  rainRisk: string;
  radarStatus: string;
  conditionDesc: string;
}

export interface PaddockStandingUser {
  rank: string;
  username: string;
  points: number;
  predictionsCount: number;
  isCurrentUser: boolean;
}

export interface TeamDetail {
  fullName: string;
  carModel: string;
  pitRecord: string;
}

const TEAM_DETAILS: Record<string, TeamDetail> = {
  mclaren: { fullName: 'MCLAREN FORMULA 1 TEAM', carModel: 'MCL40', pitRecord: '1.98s' },
  'red bull': { fullName: 'ORACLE RED BULL RACING', carModel: 'RB22', pitRecord: '1.90s' },
  ferrari: { fullName: 'SCUDERIA FERRARI HP', carModel: 'SF-26', pitRecord: '2.01s' },
  mercedes: { fullName: 'MERCEDES-AMG PETRONAS F1 TEAM', carModel: 'W16', pitRecord: '2.05s' },
  williams: { fullName: 'WILLIAMS RACING', carModel: 'FW47', pitRecord: '2.14s' },
  'aston martin': { fullName: 'ASTON MARTIN ARAMCO F1 TEAM', carModel: 'AMR25', pitRecord: '2.20s' },
  alpine: { fullName: 'BWT ALPINE F1 TEAM', carModel: 'A525', pitRecord: '2.18s' },
  'racing bulls': { fullName: 'VISA CASH APP RB F1 TEAM', carModel: 'VCARB 02', pitRecord: '2.25s' },
  audi: { fullName: 'AUDI F1 TEAM', carModel: 'C45', pitRecord: '2.30s' },
  haas: { fullName: 'MONEYGRAM HAAS F1 TEAM', carModel: 'VF-25', pitRecord: '2.22s' },
  cadillac: { fullName: 'CADILLAC FORMULA 1 TEAM', carModel: 'CAD-01', pitRecord: '2.40s' }
};

function getTeamDetail(teamName?: string): TeamDetail {
  if (!teamName) return { fullName: 'FORMULA 1 TEAM', carModel: 'F1-26', pitRecord: '2.10s' };
  const lower = teamName.toLowerCase();
  for (const [key, detail] of Object.entries(TEAM_DETAILS)) {
    if (lower.includes(key)) return detail;
  }
  return { fullName: `${teamName.toUpperCase()} F1 TEAM`, carModel: 'F1-26', pitRecord: '2.10s' };
}

@Component({
  selector: 'app-gp-spotlight',
  standalone: true,
  imports: [CommonModule, RouterLink],
  providers: [DatePipe],
  templateUrl: './gp-spotlight.component.html',
  styleUrls: ['./gp-spotlight.component.css']
})
export class GpSpotlightComponent implements OnInit, OnDestroy {
  protected readonly api = inject(ApiService);
  public readonly auth = inject(AuthService);
  private readonly http = inject(HttpClient);
  private timerInterval: any;
  private targetTimeMs: number = new Date('2026-11-01T20:00:00Z').getTime();

  // Estado reactivo con Signals
  readonly session = signal<NextSession | null>(null);
  readonly currentPrediction = signal<PredictionDetail | null>(null);
  readonly hasAnyPodiumPicks = computed(() => {
    const p = this.currentPrediction()?.podium;
    return !!(p && p.some(d => !!d && d.trim().length > 0));
  });
  readonly isLoading = signal<boolean>(true);

  // Meteorología Real (Open-Meteo)
  readonly weather = signal<WeatherData>({
    trackTemp: '32°C',
    airTemp: '24°C',
    humidity: '48%',
    wind: '14 km/h',
    rainRisk: '10%',
    radarStatus: 'RADAR SECO',
    conditionDesc: 'Pista Seca'
  });

  // Cuenta regresiva reactiva
  readonly days = signal<string>('00');
  readonly hours = signal<string>('00');
  readonly minutes = signal<string>('00');
  readonly seconds = signal<string>('00');

  // Clasificación oficial de pilotos de Jolpica (en vivo)
  readonly driverStandings = signal<JolpicaDriverStanding[]>([]);

  // Duelo dinámico de la fecha actual (según sesión activa)
  readonly duelDriver1Id = computed(() => this.session()?.matchupDriver1 || 'norris');
  readonly duelDriver2Id = computed(() => this.session()?.matchupDriver2 || 'leclerc');

  readonly duelDriver1 = computed<DriverOption>(() => this.getDriverById(this.duelDriver1Id()));
  readonly duelDriver2 = computed<DriverOption>(() => this.getDriverById(this.duelDriver2Id()));

  readonly driver1TeamDetails = computed(() => getTeamDetail(this.duelDriver1().team));
  readonly driver2TeamDetails = computed(() => getTeamDetail(this.duelDriver2().team));

  readonly driver1Standing = computed(() => this.findStanding(this.duelDriver1().id));
  readonly driver2Standing = computed(() => this.findStanding(this.duelDriver2().id));

  readonly driver1Points = computed<number>(() => {
    const std = this.driver1Standing();
    if (std?.points != null) return parseInt(std.points, 10);
    const d1 = this.duelDriver1().id.toLowerCase();
    if (d1 === 'norris') return 211;
    if (d1 === 'verstappen') return 236;
    if (d1 === 'leclerc') return 233;
    if (d1 === 'antonelli') return 365;
    return 150;
  });

  readonly driver2Points = computed<number>(() => {
    const std = this.driver2Standing();
    if (std?.points != null) return parseInt(std.points, 10);
    const d2 = this.duelDriver2().id.toLowerCase();
    if (d2 === 'leclerc') return 233;
    if (d2 === 'verstappen') return 236;
    if (d2 === 'norris') return 211;
    return 130;
  });

  readonly pointsDelta = computed<number>(() => Math.abs(this.driver1Points() - this.driver2Points()));

  readonly deltaLabel = computed<string>(() => {
    const diff = this.driver1Points() - this.driver2Points();
    if (diff === 0) return 'Δ 0';
    return diff > 0 ? `Δ +${diff}` : `Δ ${diff}`;
  });

  readonly driver1Wins = computed<number>(() => {
    const std = this.driver1Standing();
    if (std?.wins != null) return parseInt(std.wins, 10);
    if (this.duelDriver1().id.toLowerCase() === 'norris') return 2;
    return 0;
  });

  readonly driver2Wins = computed<number>(() => {
    const std = this.driver2Standing();
    if (std?.wins != null) return parseInt(std.wins, 10);
    const d2 = this.duelDriver2().id.toLowerCase();
    if (d2 === 'leclerc') return 1;
    if (d2 === 'verstappen') return 2;
    return 0;
  });

  readonly seasonYear = computed<number>(() => this.session()?.season || 2026);

  // Telemetría comparada dinámica (Quali, Carrera, Podios, Poles)
  readonly qualiD1 = signal<number>(5);
  readonly qualiD2 = signal<number>(13);
  readonly raceD1 = signal<number>(7);
  readonly raceD2 = signal<number>(11);
  readonly driver1Podiums = signal<number>(5);
  readonly driver2Podiums = signal<number>(6);
  readonly driver1Poles = signal<number>(3);
  readonly driver2Poles = signal<number>(0);

  readonly qualiD1Pct = computed(() => {
    const tot = this.qualiD1() + this.qualiD2();
    return tot > 0 ? Math.round((this.qualiD1() / tot) * 100) : 50;
  });
  readonly qualiD2Pct = computed(() => 100 - this.qualiD1Pct());

  readonly raceD1Pct = computed(() => {
    const tot = this.raceD1() + this.raceD2();
    return tot > 0 ? Math.round((this.raceD1() / tot) * 100) : 50;
  });
  readonly raceD2Pct = computed(() => 100 - this.raceD1Pct());

  readonly pitD1Pct = computed(() => {
    const p1 = parseFloat(this.driver1TeamDetails().pitRecord) || 2.0;
    const p2 = parseFloat(this.driver2TeamDetails().pitRecord) || 2.0;
    const tot = p1 + p2;
    return tot > 0 ? Math.round((p2 / tot) * 100) : 50;
  });
  readonly pitD2Pct = computed(() => 100 - this.pitD1Pct());

  // Voto de comunidad en duelo directo
  readonly driver1Votes = signal<number>(54);
  readonly driver2Votes = signal<number>(46);
  readonly totalDuelVotes = signal<string>('14.820');
  readonly duelPick = signal<string | null>(null);

  // Compatibilidad con templates y bindings previos
  readonly norrisVotes = this.driver1Votes;
  readonly verstappenVotes = this.driver2Votes;

  // Circuito actual dinámico (datos oficiales reales)
  readonly circuit = computed<CircuitInfo>(() => {
    const s = this.session();
    const id = s?.circuitId || '';
    if (id && F1_CIRCUITS[id]) {
      return F1_CIRCUITS[id];
    }
    const search = `${s?.circuitId || ''} ${s?.circuit || ''} ${s?.name || ''}`.toLowerCase();
    for (const [key, c] of Object.entries(F1_CIRCUITS)) {
      if (
        (key && search.includes(key)) ||
        (c.name && search.includes(c.name.toLowerCase())) ||
        (c.shortName && search.includes(c.shortName.toLowerCase())) ||
        (c.city && search.includes(c.city.toLowerCase()))
      ) {
        return c;
      }
    }
    return F1_CIRCUITS['rodriguez'] || DEFAULT_CIRCUIT;
  });

  // Sigla / nombre corto del circuito dinámico (ej: AHR, COTA, INTERLAGOS)
  readonly circuitShortName = computed<string>(() => {
    return resolveCircuitShortName(this.circuit(), this.session());
  });

  readonly circuitCity = computed<string>(() => {
    return this.circuit().city || this.session()?.locality || 'la fecha';
  });

  // Estadísticas históricas del circuito dinámicas para ambos duelistas
  readonly driver1CircuitStat = computed(() => this.getDriverCircuitStat(this.duelDriver1().id));
  readonly driver2CircuitStat = computed(() => this.getDriverCircuitStat(this.duelDriver2().id));

  // Compatibilidad hacia atrás
  readonly norrisCircuitStat = this.driver1CircuitStat;
  readonly verCircuitStat = this.driver2CircuitStat;

  // Cronograma dinámico calculado a partir de la API de Jolpica y hora actual
  readonly schedule = computed<SessionSchedule[]>(() => {
    const s = this.session();
    if (!s) return [];

    const items: { name: string; type: string; iso?: string | null }[] = [];

    // Verificamos si es formato Sprint
    if (s.sprint) {
      items.push({ name: 'Práctica Libre 1 (FP1)', type: 'FP1', iso: s.fp1 });
      items.push({ name: 'Clasificación Sprint', type: 'SPRINT_QUALY', iso: s.sprintQualifying || s.fp2 });
      items.push({ name: 'Carrera Sprint', type: 'SPRINT', iso: s.sprint });
      items.push({ name: 'Clasificación GP', type: 'QUALY', iso: s.qualifying });
      items.push({ name: 'Carrera (Gran Premio)', type: 'RACE', iso: s.startsAt });
    } else {
      items.push({ name: 'Práctica Libre 1 (FP1)', type: 'FP1', iso: s.fp1 });
      items.push({ name: 'Práctica Libre 2 (FP2)', type: 'FP2', iso: s.fp2 });
      items.push({ name: 'Práctica Libre 3 (FP3)', type: 'FP3', iso: s.fp3 });
      items.push({ name: 'Clasificación GP', type: 'QUALY', iso: s.qualifying });
      items.push({ name: 'Carrera (Gran Premio)', type: 'RACE', iso: s.startsAt });
    }

    return items
      .filter((item) => item.iso != null)
      .map((item) => {
        const { dateLabel, timeArg } = this.formatArgTime(item.iso);
        const status = this.calculateSessionStatus(item.iso);
        return {
          name: item.name,
          type: item.type,
          dateLabel,
          timeArg,
          status
        };
      });
  });

  // Mini Leaderboard de la Liga / Global real (sin mocks)
  readonly paddockStandings = signal<PaddockStandingUser[]>([]);
  readonly isLoadingLeaderboard = signal<boolean>(false);

  readonly isLocked = computed(() => this.session()?.isLocked ?? false);

  constructor() {
    // 0. Calcular cuenta regresiva inicial inmediatamente con la hora oficial (17hs Argentina)
    this.tickCountdown();

    // 1. Restaurar de inmediato caché local de clasificación si existe
    const cachedLb = this.api.getCachedGlobalLeaderboard?.();
    if (cachedLb && cachedLb.length > 0) {
      this.populatePaddockStandings(cachedLb);
    }

    // 2. Reaccionar automáticamente en cuanto el usuario se autentique o sincronice token
    effect(() => {
      const isAuth = this.auth.authenticated();
      const username = this.auth.username();
      const sess = this.session();

      if (isAuth) {
        // Restaurar caché de pronóstico SOLO si corresponde a la sesión activa
        const cachedPred = this.api.getCachedPrediction?.(username, sess?.id);
        if (cachedPred && (cachedPred.predictionId || (cachedPred.podium && cachedPred.podium.length > 0))) {
          if (!sess || !cachedPred.sessionId || cachedPred.sessionId === sess.id) {
            this.currentPrediction.set(cachedPred);
            if (cachedPred.duelDriverPick) {
              this.duelPick.set(cachedPred.duelDriverPick);
            }
          } else {
            this.currentPrediction.set(null);
            this.duelPick.set(null);
          }
        } else {
          this.currentPrediction.set(null);
          this.duelPick.set(null);
        }

        // Cargar pronóstico fresco desde el backend para esta sesión
        this.loadUserPrediction(username);

        // Cargar tabla de líderes con autenticación
        this.loadLeaderboard();
      }
    });
  }

  ngOnInit(): void {
    this.startCountdown();
    this.loadData();
    if (this.auth.authenticated()) {
      this.loadLeaderboard();
    }
  }

  ngOnDestroy(): void {
    if (this.timerInterval) clearInterval(this.timerInterval);
  }

  private loadData(): void {
    // 1. Cargar clasificación oficial WDC de pilotos desde la API Jolpica
    this.api.jolpicaDriverStandings().subscribe({
      next: (standings) => {
        if (standings && standings.length > 0) {
          this.driverStandings.set(standings);
        }
      }
    });

    // 2. Cargar sesión activa
    this.api.nextSession().subscribe({
      next: (sessionData) => {
        const prevSessionId = this.session()?.id;
        this.session.set(sessionData);
        this.isLoading.set(false);
        this.updateCountdownFromDate(sessionData.startsAt);
        this.fetchRealWeather(sessionData.lat, sessionData.long);

        const d1 = sessionData.matchupDriver1 || 'norris';
        const d2 = sessionData.matchupDriver2 || 'leclerc';
        this.loadDuelHeadToHead(d1, d2);

        // Al cambiar de carrera, reestablecer el estado del pronóstico
        if (prevSessionId && prevSessionId !== sessionData.id) {
          this.currentPrediction.set(null);
          this.duelPick.set(null);
          this.api.clearCachedPrediction?.(this.auth.username());
        }

        if (this.auth.authenticated()) {
          this.loadUserPrediction(this.auth.username());
        }
      },
      error: () => {
        this.isLoading.set(false);
        const fallback = this.api.getFallbackNextSession();
        this.session.set(fallback);
        this.updateCountdownFromDate(fallback.startsAt);
        this.fetchRealWeather(fallback.lat, fallback.long);
        this.loadDuelHeadToHead(fallback.matchupDriver1 || 'norris', fallback.matchupDriver2 || 'leclerc');
      }
    });
  }

  private loadUserPrediction(username?: string): void {
    if (!this.auth.authenticated()) {
      return;
    }
    const sess = this.session();
    const request$ = sess?.id
      ? this.api.predictionForSession(sess.id, username)
      : this.api.currentPrediction(username);

    request$.subscribe({
      next: (predData) => {
        if (predData && (predData.predictionId || (predData.podium && predData.podium.length > 0))) {
          // Comprobar que el pronóstico devuelto pertenece a la sesión activa
          if (!sess || !predData.sessionId || predData.sessionId === sess.id) {
            this.currentPrediction.set(predData);
            if (predData.duelDriverPick) {
              this.duelPick.set(predData.duelDriverPick);
            }
            return;
          }
        }
        // Carrera nueva o sin pronóstico para esta fecha: reestablecer a limpio
        this.currentPrediction.set(null);
        this.duelPick.set(null);
        this.api.clearCachedPrediction?.(username);
      },
      error: () => {
        const current = this.currentPrediction();
        if (sess && current?.sessionId && current.sessionId !== sess.id) {
          this.currentPrediction.set(null);
          this.duelPick.set(null);
        }
      }
    });
  }

  private loadLeaderboard(): void {
    if (!this.auth.authenticated()) {
      this.isLoadingLeaderboard.set(false);
      return;
    }
    this.isLoadingLeaderboard.set(true);
    this.api.globalLeaderboard().subscribe({
      next: (entries: LeaderboardEntry[]) => {
        this.isLoadingLeaderboard.set(false);
        if (entries && entries.length > 0) {
          this.populatePaddockStandings(entries);
        }
      },
      error: () => {
        this.isLoadingLeaderboard.set(false);
      }
    });
  }

  private populatePaddockStandings(entries: LeaderboardEntry[]): void {
    const currentUsername = this.auth.username()?.toLowerCase();
    const mapped: PaddockStandingUser[] = entries.slice(0, 4).map((e) => {
      const isMe = currentUsername ? e.displayName.toLowerCase().includes(currentUsername) : false;
      return {
        rank: `P${e.rank}`,
        username: `@${e.displayName}${isMe ? ' (Tú)' : ''}`,
        points: Number(e.totalScore),
        predictionsCount: Number(e.predictionsCount || 0),
        isCurrentUser: isMe
      };
    });
    this.paddockStandings.set(mapped);
  }

  formatDriverName(id: string | null | undefined): string {
    if (!id) return '-';
    const found = F1_DRIVERS.find(d => d.id.toLowerCase() === id.toLowerCase());
    return found ? found.name.toUpperCase() : id.toUpperCase();
  }

  getDriverById(id?: string | null): DriverOption {
    if (!id) return F1_DRIVERS[0];
    const clean = id.toLowerCase().trim();
    const found = F1_DRIVERS.find(d => d.id.toLowerCase() === clean || d.code.toLowerCase() === clean);
    return found || {
      id: clean,
      name: id.toUpperCase(),
      code: id.slice(0, 3).toUpperCase(),
      number: 0,
      team: 'F1 Team',
      teamColor: '#E10600'
    };
  }

  findStanding(driverId: string): JolpicaDriverStanding | null {
    const list = this.driverStandings();
    if (!list || list.length === 0) return null;
    const target = (driverId || '').toLowerCase().replace(/[^a-z0-9]/g, '');
    return list.find(s => {
      const sId = (s.driverId || '').toLowerCase().replace(/[^a-z0-9]/g, '');
      const sCode = (s.code || '').toLowerCase();
      const sName = (s.name || '').toLowerCase().replace(/[^a-z0-9]/g, '');
      return sId === target ||
        (sId === 'maxverstappen' && target === 'verstappen') ||
        (target === 'maxverstappen' && sId === 'verstappen') ||
        sCode === target ||
        sName.includes(target);
    }) || null;
  }

  getDriverCircuitStat(driverId: string): { val: string; lbl: string } {
    const short = this.circuitShortName();
    const dId = (driverId || '').toLowerCase();

    if (short === 'AHR') {
      if (dId === 'norris') return { val: 'P2 (2024)', lbl: 'Mejor Puesto en AHR' };
      if (dId === 'leclerc') return { val: 'P3 (2023)', lbl: 'Mejor Puesto en AHR' };
      if (dId === 'verstappen') return { val: '5 (2017-23)', lbl: 'Victorias Previas en AHR' };
      if (dId === 'sainz') return { val: 'P1 (2024)', lbl: 'Último Ganador en AHR' };
      if (dId === 'hamilton') return { val: '2 (2016, 19)', lbl: 'Victorias en AHR' };
      if (dId === 'perez') return { val: '2 Podios', lbl: 'Héroe Local en AHR' };
      if (dId === 'colapinto') return { val: 'P12 (2024)', lbl: 'Historial en AHR' };
      if (dId === 'russell') return { val: 'P4 (2022)', lbl: 'Mejor Puesto en AHR' };
      if (dId === 'piastri') return { val: 'P8 (2023)', lbl: 'Historial en AHR' };
      if (dId === 'antonelli') return { val: 'FP1 Rookie', lbl: 'Debut Oficial en AHR' };
    } else if (short === 'COTA') {
      if (dId === 'norris') return { val: '21 vtas', lbl: 'Vueltas Lideradas en COTA' };
      if (dId === 'verstappen') return { val: '3 (2021-23)', lbl: 'Victorias Previas en COTA' };
      if (dId === 'leclerc') return { val: 'P1 (2024)', lbl: 'Último Ganador en COTA' };
      if (dId === 'sainz') return { val: 'P2 (2024)', lbl: 'Podio en COTA' };
      if (dId === 'hamilton') return { val: '5 Victorias', lbl: 'Récord Histórico en COTA' };
    } else if (short === 'INTERLAGOS') {
      if (dId === 'norris') return { val: 'P2 (2023)', lbl: 'Mejor Puesto en Interlagos' };
      if (dId === 'verstappen') return { val: '2 (2019, 23)', lbl: 'Victorias en Interlagos' };
      if (dId === 'russell') return { val: 'P1 (2022)', lbl: 'Ganador en Interlagos' };
      if (dId === 'hamilton') return { val: '3 (2016-21)', lbl: 'Victorias en Interlagos' };
      if (dId === 'leclerc') return { val: 'P4 (2022)', lbl: 'Mejor Puesto en Interlagos' };
    }

    const standing = this.findStanding(dId);
    if (standing) {
      return { val: `P${standing.position} (${standing.points} pts)`, lbl: `Posición Oficial WDC` };
    }
    return { val: 'Puntos F1', lbl: `Historial en ${short}` };
  }

  loadDuelHeadToHead(d1Id: string, d2Id: string): void {
    const clean1 = (d1Id || 'norris').toLowerCase();
    const clean2 = (d2Id || 'leclerc').toLowerCase();

    // Valores iniciales consistentes de la temporada
    if (clean1 === 'norris' && clean2 === 'leclerc') {
      this.qualiD1.set(5);
      this.qualiD2.set(13);
      this.raceD1.set(7);
      this.raceD2.set(11);
      this.driver1Podiums.set(5);
      this.driver2Podiums.set(6);
      this.driver1Poles.set(3);
      this.driver2Poles.set(0);
      this.driver1Votes.set(54);
      this.driver2Votes.set(46);
    } else if (clean1 === 'norris' && clean2 === 'verstappen') {
      this.qualiD1.set(10);
      this.qualiD2.set(8);
      this.raceD1.set(8);
      this.raceD2.set(10);
      this.driver1Podiums.set(5);
      this.driver2Podiums.set(10);
      this.driver1Poles.set(3);
      this.driver2Poles.set(2);
      this.driver1Votes.set(58);
      this.driver2Votes.set(42);
    }

    // Consulta en vivo a Jolpica Ergast API para resultados carrera por carrera de la temporada actual
    forkJoin({
      r1: this.api.jolpicaDriverSeasonResults(clean1),
      r2: this.api.jolpicaDriverSeasonResults(clean2)
    }).subscribe({
      next: ({ r1, r2 }) => {
        if (!r1 || !r2 || r1.length === 0 || r2.length === 0) return;

        let q1 = 0, q2 = 0;
        let rc1 = 0, rc2 = 0;
        let pod1 = 0, pod2 = 0;
        let pole1 = 0, pole2 = 0;

        const maxCommon = Math.min(r1.length, r2.length);
        for (let i = 0; i < maxCommon; i++) {
          const res1 = r1[i]?.Results?.[0];
          const res2 = r2[i]?.Results?.[0];
          if (res1 && res2) {
            const g1 = parseInt(res1.grid, 10);
            const g2 = parseInt(res2.grid, 10);
            if (g1 > 0 && g2 > 0) {
              if (g1 < g2) q1++;
              else if (g2 < g1) q2++;
            }
            const p1 = parseInt(res1.position, 10);
            const p2 = parseInt(res2.position, 10);
            if (p1 > 0 && p2 > 0) {
              if (p1 < p2) rc1++;
              else if (p2 < p1) rc2++;
            }
          }
        }

        for (const race of r1) {
          const p = parseInt(race?.Results?.[0]?.position, 10);
          const g = parseInt(race?.Results?.[0]?.grid, 10);
          if (p > 0 && p <= 3) pod1++;
          if (g === 1) pole1++;
        }

        for (const race of r2) {
          const p = parseInt(race?.Results?.[0]?.position, 10);
          const g = parseInt(race?.Results?.[0]?.grid, 10);
          if (p > 0 && p <= 3) pod2++;
          if (g === 1) pole2++;
        }

        if (q1 > 0 || q2 > 0) {
          this.qualiD1.set(q1);
          this.qualiD2.set(q2);
        }
        if (rc1 > 0 || rc2 > 0) {
          this.raceD1.set(rc1);
          this.raceD2.set(rc2);
        }
        this.driver1Podiums.set(pod1);
        this.driver2Podiums.set(pod2);
        this.driver1Poles.set(pole1);
        this.driver2Poles.set(pole2);
      },
      error: () => {}
    });
  }

  selectDuelWinner(driverId: string): void {
    this.duelPick.set(driverId);
    const sess = this.session();
    if (sess?.id) {
      const cur = this.currentPrediction() || {
        predictionId: null,
        sessionId: sess.id,
        sessionName: sess.name,
        circuit: sess.circuit,
        startsAt: sess.startsAt,
        isLocked: sess.isLocked,
        podium: [],
        polePositionDriverId: null,
        duelDriverPick: driverId,
        safetyCarCount: null,
        dnfCount: null,
        score: null,
        submittedAt: null,
        matchupDriver1: sess.matchupDriver1,
        matchupDriver2: sess.matchupDriver2
      };
      cur.duelDriverPick = driverId;
      this.currentPrediction.set(cur);
      this.api.setCachedPrediction?.(cur, this.auth.username());
    }
  }

  /**
   * Obtiene la meteorología real en vivo desde Open-Meteo usando las coordenadas del circuito.
   */
  private fetchRealWeather(lat?: string, lon?: string): void {
    const latitude = lat || '30.1328';
    const longitude = lon || '-97.6411';
    const url = `https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&current=temperature_2m,relative_humidity_2m,apparent_temperature,precipitation,weather_code,wind_speed_10m,wind_direction_10m&timezone=auto`;

    this.http.get<any>(url).subscribe({
      next: (res) => {
        const c = res?.current;
        if (c) {
          const temp = Math.round(c.temperature_2m);
          const track = Math.round(temp + 8);
          const precip = c.precipitation || 0;
          this.weather.set({
            airTemp: `${temp}°C`,
            trackTemp: `${track}°C`,
            humidity: `${c.relative_humidity_2m}%`,
            wind: `${Math.round(c.wind_speed_10m)} km/h`,
            rainRisk: precip > 0 ? '70%' : '10%',
            radarStatus: precip > 0 ? 'LLUVIA EN PISTA' : 'RADAR SECO',
            conditionDesc: precip > 0 ? 'Asfalto Húmedo' : 'Asfalto Seco C2/C3'
          });
        }
      },
      error: () => {
        // En caso de error de red, conserva el pronóstico estándar realista
      }
    });
  }

  /**
   * Formatea fecha y hora en huso horario oficial de Argentina (ART / UTC-3).
   */
  private formatArgTime(isoString?: string | null): { dateLabel: string; timeArg: string } {
    if (!isoString) return { dateLabel: 'A programar', timeArg: '--:-- hs (Arg)' };
    const date = new Date(isoString);
    const days = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
    const months = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
    const dName = days[date.getDay()];
    const dNum = date.getDate();
    const mName = months[date.getMonth()];
    const timeStr = date.toLocaleTimeString('es-AR', {
      timeZone: 'America/Argentina/Buenos_Aires',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false
    });
    return {
      dateLabel: `${dName} ${dNum} ${mName}`,
      timeArg: `${timeStr} hs (Arg)`
    };
  }

  /**
   * Determina con precisión el estado de la sesión comparando con el reloj actual.
   */
  private calculateSessionStatus(isoString?: string | null): 'COMPLETED' | 'LIVE' | 'UPCOMING' | 'PROGRAMMED' {
    if (!isoString) return 'PROGRAMMED';
    const start = new Date(isoString).getTime();
    const now = Date.now();
    const durationMs = 90 * 60 * 1000; // Duración típica de sesión: 1h 30m

    if (now > start + durationMs) {
      return 'COMPLETED';
    } else if (now >= start && now <= start + durationMs) {
      return 'LIVE';
    } else {
      return 'PROGRAMMED';
    }
  }

  private updateCountdownFromDate(targetDateStr?: string | null): void {
    if (!targetDateStr) return;
    const target = new Date(targetDateStr).getTime();
    if (!isNaN(target)) {
      this.targetTimeMs = target;
      this.tickCountdown();
    }
  }

  private startCountdown(): void {
    this.tickCountdown();
    if (this.timerInterval) clearInterval(this.timerInterval);
    this.timerInterval = setInterval(() => {
      this.tickCountdown();
    }, 1000);
  }

  private tickCountdown(): void {
    if (!this.targetTimeMs) return;
    const now = Date.now();
    const diff = this.targetTimeMs - now;
    if (diff > 0) {
      const d = Math.floor(diff / (1000 * 60 * 60 * 24));
      const h = Math.floor((diff / (1000 * 60 * 60)) % 24);
      const m = Math.floor((diff / (1000 * 60)) % 60);
      const s = Math.floor((diff / 1000) % 60);
      this.days.set(d < 10 ? `0${d}` : `${d}`);
      this.hours.set(h < 10 ? `0${h}` : `${h}`);
      this.minutes.set(m < 10 ? `0${m}` : `${m}`);
      this.seconds.set(s < 10 ? `0${s}` : `${s}`);
    } else {
      this.days.set('00');
      this.hours.set('00');
      this.minutes.set('00');
      this.seconds.set('00');
    }
  }
}
