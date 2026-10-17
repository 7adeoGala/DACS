import { Component, signal, computed, inject, OnInit, OnDestroy } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { RouterLink } from '@angular/router';
import { ApiService } from '../../core/services/api.service';
import { AuthService } from '../../core/auth/auth.service';
import { NextSession, PredictionDetail, LeaderboardEntry } from '../../core/models/api.models';

interface SessionSchedule {
  name: string;
  type: 'FP1' | 'SPRINT_QUALY' | 'SPRINT' | 'QUALY' | 'RACE';
  dateLabel: string;
  timeArg: string;
  status: 'COMPLETED' | 'LIVE' | 'UPCOMING' | 'LOCKED';
  poleOrWinner?: string;
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
  private timerInterval: any;

  // Estado reactivo con Signals
  readonly session = signal<NextSession | null>(null);
  readonly currentPrediction = signal<PredictionDetail | null>(null);
  readonly isLoading = signal<boolean>(true);

  // Cuenta regresiva reactiva
  readonly days = signal<string>('02');
  readonly hours = signal<string>('14');
  readonly minutes = signal<string>('35');
  readonly seconds = signal<string>('14');

  // Voto de comunidad en duelo directo
  readonly norrisVotes = signal<number>(58);
  readonly verstappenVotes = signal<number>(42);
  readonly totalDuelVotes = signal<string>('14.820');
  readonly duelPick = signal<'norris' | 'verstappen' | null>('verstappen');

  // Cronograma de sesiones del GP (Austin COTA 2026 - Sprint Weekend)
  readonly schedule = signal<SessionSchedule[]>([
    {
      name: 'Práctica Libre 1',
      type: 'FP1',
      dateLabel: 'Viernes 18',
      timeArg: '14:30 hs (Arg)',
      status: 'COMPLETED',
      poleOrWinner: 'P1: LEC (1:36.520)'
    },
    {
      name: 'Clasificación Sprint',
      type: 'SPRINT_QUALY',
      dateLabel: 'Viernes 18',
      timeArg: '18:30 hs (Arg)',
      status: 'COMPLETED',
      poleOrWinner: 'POLE: VER (1:35.812)'
    },
    {
      name: 'Carrera Sprint ⚡',
      type: 'SPRINT',
      dateLabel: 'Sábado 19',
      timeArg: '15:00 hs (Arg)',
      status: 'LIVE',
      poleOrWinner: 'Vta 14/19 • 1. VER 2. NOR 3. SAI'
    },
    {
      name: 'Clasificación GP',
      type: 'QUALY',
      dateLabel: 'Sábado 19',
      timeArg: '19:00 hs (Arg)',
      status: 'UPCOMING'
    },
    {
      name: 'Gran Premio Oficial',
      type: 'RACE',
      dateLabel: 'Domingo 20',
      timeArg: '16:00 hs (Arg)',
      status: 'LOCKED'
    }
  ]);

  // Mini Leaderboard de la Liga Principal del Usuario
  readonly paddockStandings = signal([
    { rank: 'P1', username: '@lucas_flart', city: 'Buenos Aires', points: 1340, trend: '+25 pts', trendUp: true, isCurrentUser: false },
    { rank: 'P2', username: '@tadeogala7 (Tú)', city: 'Rosario', points: 1240, trend: '+18 pts', trendUp: true, isCurrentUser: true },
    { rank: 'P3', username: '@martin_redbull', city: 'Córdoba', points: 1215, trend: '-4 pts', trendUp: false, isCurrentUser: false },
    { rank: 'P4', username: '@enzo_scuderia', city: 'Mendoza', points: 1180, trend: '+12 pts', trendUp: true, isCurrentUser: false }
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
      },
      error: () => {
        this.isLoading.set(false);
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

    // Sincronizar mini leaderboard con usuarios reales de la base de datos
    this.api.globalLeaderboard().subscribe({
      next: (entries: LeaderboardEntry[]) => {
        if (entries && entries.length > 0) {
          const currentUsername = this.auth.username()?.toLowerCase();
          const mapped = entries.slice(0, 4).map((e) => {
            const isMe = currentUsername ? e.displayName.toLowerCase().includes(currentUsername) : false;
            return {
              rank: `P${e.rank}`,
              username: `@${e.displayName}${isMe ? ' (Tú)' : ''}`,
              city: 'Argentina',
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

  selectDuelPick(driver: 'norris' | 'verstappen'): void {
    if (this.isLocked()) return;
    this.duelPick.set(driver);
    const sess = this.session();
    if (sess && this.auth.authenticated()) {
      this.api.submitPrediction(sess.id, {
        podium: this.currentPrediction()?.podium ?? ['norris', 'verstappen', 'leclerc'],
        duelDriverPick: driver
      }).subscribe();
    }
  }
}
