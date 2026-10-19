import { Component, signal, computed, inject, OnInit, OnDestroy } from '@angular/core';
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
  DEFAULT_CIRCUIT
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

  // Estado reactivo con Signals
  readonly session = signal<NextSession | null>(null);
  readonly currentPrediction = signal<PredictionDetail | null>(null);
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
    const id = s?.circuitId || 'americas';
    return F1_CIRCUITS[id] || F1_CIRCUITS['americas'] || DEFAULT_CIRCUIT;
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

  // Mini Leaderboard de la Liga / Global
  readonly paddockStandings = signal([
    { rank: 'P1', username: 'demo-player', points: 0, trend: '0 pts', trendUp: true, isCurrentUser: false },
    { rank: 'P2', username: 'tadeogala7', points: 0, trend: '0 pts', trendUp: true, isCurrentUser: true },
    { rank: 'P3', username: 'martin', points: 0, trend: '0 pts', trendUp: true, isCurrentUser: false },
    { rank: 'P4', username: 'geroalu', points: 0, trend: '0 pts', trendUp: true, isCurrentUser: false }
  ]);

  readonly isLocked = computed(() => this.session()?.isLocked ?? false);

  ngOnInit(): void {
    this.loadData();
    this.startCountdown();
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
        this.session.set({
          id: 'round-18-cota',
          season: 2026,
          round: 18,
          name: 'United States Grand Prix',
          circuit: 'Circuit of the Americas',
          circuitId: 'americas',
          type: 'RACE',
          raceDate: '2026-10-25',
          startsAt: '2026-10-25T19:00:00Z',
          isLocked: false,
          matchupDriver1: 'norris',
          matchupDriver2: 'verstappen'
        });
        this.updateCountdownFromDate('2026-10-25T19:00:00Z');
        this.fetchRealWeather('30.1328', '-97.6411');
      }
    });

    if (this.auth.authenticated()) {
      this.api.currentPrediction().subscribe({
        next: (predData) => {
          this.currentPrediction.set(predData);
          if (predData?.duelDriverPick) {
            this.duelPick.set(predData.duelDriverPick as 'norris' | 'verstappen');
          }
        },
        error: () => {}
      });
    }

    // Sincronizar mini leaderboard con usuarios reales
    this.api.globalLeaderboard().subscribe({
      next: (entries: LeaderboardEntry[]) => {
        if (entries && entries.length > 0) {
          const currentUsername = this.auth.username()?.toLowerCase();
          const mapped = entries.slice(0, 4).map((e) => {
            const isMe = currentUsername ? e.displayName.toLowerCase().includes(currentUsername) : false;
            return {
              rank: `P${e.rank}`,
              username: `@${e.displayName}${isMe ? ' (Tú)' : ''}`,
              points: Number(e.totalScore),
              trend: `+${e.predictionsCount * 10} pts`,
              trendUp: true,
              isCurrentUser: isMe
            };
          });
          this.paddockStandings.set(mapped);
        }
      },
      error: () => {}
    });
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
    const now = Date.now();
    const diff = target - now;
    if (diff > 0) {
      const d = Math.floor(diff / (1000 * 60 * 60 * 24));
      const h = Math.floor((diff / (1000 * 60 * 60)) % 24);
      const m = Math.floor((diff / (1000 * 60)) % 60);
      const s = Math.floor((diff / 1000) % 60);
      this.days.set(d < 10 ? `0${d}` : `${d}`);
      this.hours.set(h < 10 ? `0${h}` : `${h}`);
      this.minutes.set(m < 10 ? `0${m}` : `${m}`);
      this.seconds.set(s < 10 ? `0${s}` : `${s}`);
    }
  }

  private startCountdown(): void {
    this.timerInterval = setInterval(() => {
      let sec = parseInt(this.seconds(), 10) - 1;
      if (sec < 0) {
        sec = 59;
        let min = parseInt(this.minutes(), 10) - 1;
        if (min < 0) {
          min = 59;
          let hr = parseInt(this.hours(), 10) - 1;
          if (hr < 0) {
            hr = 23;
            let d = parseInt(this.days(), 10) - 1;
            if (d >= 0) this.days.set(d < 10 ? `0${d}` : `${d}`);
          }
          this.hours.set(hr < 10 ? `0${hr}` : `${hr}`);
        }
        this.minutes.set(min < 10 ? `0${min}` : `${min}`);
      }
      this.seconds.set(sec < 10 ? `0${sec}` : `${sec}`);
    }, 1000);
  }
}
