import { Component, signal, computed, inject, OnInit, OnDestroy, effect } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { RouterLink } from '@angular/router';
import { ApiService } from '../../core/services/api.service';
import { AuthService } from '../../core/auth/auth.service';
import {
  NextSession,
  PredictionDetail,
  LeaderboardEntry,
  CircuitInfo,
  F1_CIRCUITS,
  DEFAULT_CIRCUIT,
  F1_DRIVERS
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

  // Voto de comunidad en duelo directo
  readonly norrisVotes = signal<number>(58);
  readonly verstappenVotes = signal<number>(42);
  readonly totalDuelVotes = signal<string>('14.820');
  readonly duelPick = signal<'norris' | 'verstappen' | null>('verstappen');

  // Circuito actual dinámico (datos oficiales reales)
  readonly circuit = computed<CircuitInfo>(() => {
    const s = this.session();
    const id = s?.circuitId || 'rodriguez';
    return F1_CIRCUITS[id] || F1_CIRCUITS['rodriguez'] || DEFAULT_CIRCUIT;
  });

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

      if (isAuth) {
        // Restaurar caché de pronóstico de inmediato (evita estado "Sin definir")
        const cachedPred = this.api.getCachedPrediction?.(username);
        if (cachedPred && (cachedPred.predictionId || (cachedPred.podium && cachedPred.podium.length > 0))) {
          this.currentPrediction.set(cachedPred);
          if (cachedPred.duelDriverPick) {
            this.duelPick.set(cachedPred.duelDriverPick as 'norris' | 'verstappen');
          }
        }

        // Cargar pronóstico fresco desde el backend
        this.loadUserPrediction(username);

        // Cargar tabla de líderes con autenticación
        this.loadLeaderboard();
      }
    });
  }

  ngOnInit(): void {
    this.startCountdown();
    this.loadData();
    this.loadLeaderboard();
  }

  ngOnDestroy(): void {
    if (this.timerInterval) clearInterval(this.timerInterval);
  }

  private loadData(): void {
    this.api.nextSession().subscribe({
      next: (sessionData) => {
        this.session.set(sessionData);
        this.isLoading.set(false);
        this.updateCountdownFromDate(sessionData.startsAt);
        this.fetchRealWeather(sessionData.lat, sessionData.long);
      },
      error: () => {
        this.isLoading.set(false);
        const fallback = this.api.getFallbackNextSession();
        this.session.set(fallback);
        this.updateCountdownFromDate(fallback.startsAt);
        this.fetchRealWeather(fallback.lat, fallback.long);
      }
    });
  }

  private loadUserPrediction(username?: string): void {
    this.api.currentPrediction(username).subscribe({
      next: (predData) => {
        if (predData) {
          this.currentPrediction.set(predData);
          if (predData.duelDriverPick) {
            this.duelPick.set(predData.duelDriverPick as 'norris' | 'verstappen');
          }
        }
      },
      error: () => {}
    });
  }

  private loadLeaderboard(): void {
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
