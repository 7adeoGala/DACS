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
  resolveCircuitShortName,
  getTeammateDuoForRound,
  TEAM_DUOS_CATALOG,
  TeamDuoOption,
  DynamicDriverStats,
  DuelCommunityStats,
  getTeamDuoById,
  findTeamDuoByDrivers
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
}

const TEAM_DETAILS: Record<string, TeamDetail> = {
  mclaren: { fullName: 'MCLAREN FORMULA 1 TEAM', carModel: 'MCL40' },
  'red bull': { fullName: 'ORACLE RED BULL RACING', carModel: 'RB22' },
  ferrari: { fullName: 'SCUDERIA FERRARI HP', carModel: 'SF-26' },
  mercedes: { fullName: 'MERCEDES-AMG PETRONAS F1 TEAM', carModel: 'W16' },
  williams: { fullName: 'WILLIAMS RACING', carModel: 'FW47' },
  'aston martin': { fullName: 'ASTON MARTIN ARAMCO F1 TEAM', carModel: 'AMR25' },
  alpine: { fullName: 'BWT ALPINE F1 TEAM', carModel: 'A525' },
  'racing bulls': { fullName: 'VISA CASH APP RB F1 TEAM', carModel: 'VCARB 02' },
  audi: { fullName: 'AUDI F1 TEAM', carModel: 'C45' },
  haas: { fullName: 'MONEYGRAM HAAS F1 TEAM', carModel: 'VF-26' },
  cadillac: { fullName: 'CADILLAC FORMULA 1 TEAM', carModel: 'CAD-01' }
};

function getTeamDetail(teamName?: string): TeamDetail {
  if (!teamName) return { fullName: 'FORMULA 1 TEAM', carModel: 'F1-26' };
  const lower = teamName.toLowerCase();
  for (const [key, detail] of Object.entries(TEAM_DETAILS)) {
    if (lower.includes(key)) return detail;
  }
  return { fullName: `${teamName.toUpperCase()} F1 TEAM`, carModel: 'F1-26' };
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

  readonly session = signal<NextSession | null>(null);
  readonly currentPrediction = signal<PredictionDetail | null>(null);
  readonly hasAnyPodiumPicks = computed(() => {
    const p = this.currentPrediction()?.podium;
    return !!(p && p.some(d => !!d && d.trim().length > 0));
  });
  readonly isLoading = signal<boolean>(true);

  readonly weather = signal<WeatherData>({
    trackTemp: '32°C',
    airTemp: '24°C',
    humidity: '48%',
    wind: '14 km/h',
    rainRisk: '10%',
    radarStatus: 'RADAR SECO',
    conditionDesc: 'Pista Seca'
  });

  readonly days = signal<string>('00');
  readonly hours = signal<string>('00');
  readonly minutes = signal<string>('00');
  readonly seconds = signal<string>('00');

  readonly driverStandings = signal<JolpicaDriverStanding[]>([]);

  readonly teamOptions = TEAM_DUOS_CATALOG;
  readonly selectedTeamId = signal<string>('rb');
  readonly isTeamDropdownOpen = signal<boolean>(false);
  readonly statsMode = signal<'season' | 'career'>('season');
  readonly isLoadingStats = signal<boolean>(false);

  readonly officialMatchupTeamId = computed<string>(() => {
    const s = this.session();
    const duo = getTeammateDuoForRound(s?.round || 20);
    const d1 = s?.matchupDriver1 || duo.driver1;
    const d2 = s?.matchupDriver2 || duo.driver2;
    const found = findTeamDuoByDrivers(d1, d2);
    return found ? found.id : 'rb';
  });

  readonly activeTeam = computed<TeamDuoOption>(() => {
    return getTeamDuoById(this.selectedTeamId()) || this.teamOptions[0];
  });

  readonly duelDriver1Id = computed(() => this.activeTeam().driver1Id);
  readonly duelDriver2Id = computed(() => this.activeTeam().driver2Id);

  readonly duelDriver1 = computed<DriverOption>(() => this.getDriverById(this.duelDriver1Id()));
  readonly duelDriver2 = computed<DriverOption>(() => this.getDriverById(this.duelDriver2Id()));

  readonly driver1TeamDetails = computed(() => getTeamDetail(this.duelDriver1().team));
  readonly driver2TeamDetails = computed(() => getTeamDetail(this.duelDriver2().team));

  readonly driver1Stats = signal<DynamicDriverStats | null>(null);
  readonly driver2Stats = signal<DynamicDriverStats | null>(null);

  readonly driver1Standing = computed(() => this.findStanding(this.duelDriver1().id));
  readonly driver2Standing = computed(() => this.findStanding(this.duelDriver2().id));

  readonly driver1Points = computed<number>(() => this.driver1Stats()?.points ?? (this.driver1Standing()?.points ? parseInt(this.driver1Standing()!.points, 10) : 0));
  readonly driver2Points = computed<number>(() => this.driver2Stats()?.points ?? (this.driver2Standing()?.points ? parseInt(this.driver2Standing()!.points, 10) : 0));

  readonly pointsDelta = computed<number>(() => Math.abs(this.driver1Points() - this.driver2Points()));

  readonly deltaLabel = computed<string>(() => {
    const diff = this.driver1Points() - this.driver2Points();
    if (diff === 0) return 'Δ 0';
    return diff > 0 ? `Δ +${diff}` : `Δ ${diff}`;
  });

  readonly driver1Wins = computed<number>(() => {
    if (this.statsMode() === 'career') {
      return this.driver1Stats()?.careerWins ?? (this.driver1Stats()?.wins ?? 0);
    }
    return this.driver1Stats()?.wins ?? (this.driver1Standing()?.wins ? parseInt(this.driver1Standing()!.wins, 10) : 0);
  });

  readonly driver2Wins = computed<number>(() => {
    if (this.statsMode() === 'career') {
      return this.driver2Stats()?.careerWins ?? (this.driver2Stats()?.wins ?? 0);
    }
    return this.driver2Stats()?.wins ?? (this.driver2Standing()?.wins ? parseInt(this.driver2Standing()!.wins, 10) : 0);
  });

  readonly driver1Poles = computed<number>(() => {
    if (this.statsMode() === 'career') {
      return this.driver1Stats()?.careerPoles ?? (this.driver1Stats()?.poles ?? 0);
    }
    return this.driver1Stats()?.poles ?? 0;
  });

  readonly driver2Poles = computed<number>(() => {
    if (this.statsMode() === 'career') {
      return this.driver2Stats()?.careerPoles ?? (this.driver2Stats()?.poles ?? 0);
    }
    return this.driver2Stats()?.poles ?? 0;
  });

  readonly driver1Podiums = computed<number>(() => this.driver1Stats()?.podiums ?? 0);
  readonly driver2Podiums = computed<number>(() => this.driver2Stats()?.podiums ?? 0);

  readonly seasonYear = computed<number>(() => this.session()?.season || 2026);

  readonly qualiD1 = signal<number>(0);
  readonly qualiD2 = signal<number>(0);
  readonly raceD1 = signal<number>(0);
  readonly raceD2 = signal<number>(0);

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

  readonly pointsD1Pct = computed(() => {
    const tot = this.driver1Points() + this.driver2Points();
    return tot > 0 ? Math.round((this.driver1Points() / tot) * 100) : 50;
  });
  readonly pointsD2Pct = computed(() => 100 - this.pointsD1Pct());

  readonly duelCommunityStats = signal<DuelCommunityStats | null>(null);
  readonly totalDuelVotesCount = computed<number>(() => this.duelCommunityStats()?.totalVotes ?? 0);
  readonly driver1Votes = computed<number>(() => {
    const stats = this.duelCommunityStats();
    if (!stats || stats.totalVotes === 0) return 50;
    const d1 = this.duelDriver1Id().toLowerCase();
    if (stats.driver1Id?.toLowerCase() === d1) return stats.driver1Pct;
    if (stats.driver2Id?.toLowerCase() === d1) return stats.driver2Pct;
    return stats.driver1Pct;
  });
  readonly driver2Votes = computed<number>(() => {
    const stats = this.duelCommunityStats();
    if (!stats || stats.totalVotes === 0) return 50;
    return 100 - this.driver1Votes();
  });
  readonly duelPick = signal<string | null>(null);

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

  readonly circuitShortName = computed<string>(() => {
    return resolveCircuitShortName(this.circuit(), this.session());
  });

  readonly circuitCity = computed<string>(() => {
    return this.circuit().city || this.session()?.locality || 'la fecha';
  });

  readonly driver1CircuitStat = computed(() => this.getDriverCircuitStat(this.duelDriver1().id));
  readonly driver2CircuitStat = computed(() => this.getDriverCircuitStat(this.duelDriver2().id));

  readonly norrisCircuitStat = this.driver1CircuitStat;
  readonly verCircuitStat = this.driver2CircuitStat;

  readonly schedule = computed<SessionSchedule[]>(() => {
    const s = this.session();
    if (!s) return [];

    const items: { name: string; type: string; iso?: string | null }[] = [];

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

  readonly paddockStandings = signal<PaddockStandingUser[]>([]);
  readonly isLoadingLeaderboard = signal<boolean>(false);

  readonly isLocked = computed(() => this.session()?.isLocked ?? false);

  constructor() {
    this.tickCountdown();

    const cachedLb = this.api.getCachedGlobalLeaderboard?.();
    if (cachedLb && cachedLb.length > 0) {
      this.populatePaddockStandings(cachedLb);
    }

    effect(() => {
      const isAuth = this.auth.authenticated();
      const username = this.auth.username();
      const sess = this.session();

      if (isAuth) {
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

        this.loadUserPrediction(username);

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
    this.api.jolpicaDriverStandings().subscribe({
      next: (standings) => {
        if (standings && standings.length > 0) {
          this.driverStandings.set(standings);
        }
      }
    });

    this.api.duelCommunityStats().subscribe({
      next: (stats) => {
        this.duelCommunityStats.set(stats);
      }
    });

    this.api.nextSession().subscribe({
      next: (sessionData) => {
        const prevSessionId = this.session()?.id;
        this.session.set(sessionData);
        this.isLoading.set(false);
        this.updateCountdownFromDate(sessionData.startsAt);
        this.fetchRealWeather(sessionData.lat, sessionData.long);

        const duo = getTeammateDuoForRound(sessionData.round || 20);
        const d1 = sessionData.matchupDriver1 || duo.driver1;
        const d2 = sessionData.matchupDriver2 || duo.driver2;
        const matchTeam = findTeamDuoByDrivers(d1, d2) || getTeamDuoById('rb') || this.teamOptions[0];
        this.selectedTeamId.set(matchTeam.id);
        this.loadTeamDuoStats(matchTeam.driver1Id, matchTeam.driver2Id);

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
        const fallbackDuo = getTeammateDuoForRound(fallback.round || 20);
        const matchTeam = findTeamDuoByDrivers(fallbackDuo.driver1, fallbackDuo.driver2) || this.teamOptions[0];
        this.selectedTeamId.set(matchTeam.id);
        this.loadTeamDuoStats(matchTeam.driver1Id, matchTeam.driver2Id);
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
          if (!sess || !predData.sessionId || predData.sessionId === sess.id) {
            this.currentPrediction.set(predData);
            if (predData.duelDriverPick) {
              this.duelPick.set(predData.duelDriverPick);
            }
            return;
          }
        }
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
    const dId = (driverId || '').toLowerCase().trim();
    const isD1 = dId === this.duelDriver1Id().toLowerCase();
    const stats = isD1 ? this.driver1Stats() : this.driver2Stats();

    if (stats) {
      if (stats.bestFinish && stats.bestFinish !== '-') {
        return { val: stats.bestFinish, lbl: 'Mejor Puesto 2026' };
      }
      return { val: `${stats.points} pts`, lbl: `WDC (${stats.standingPosition})` };
    }

    const standing = this.findStanding(dId);
    if (standing) {
      return { val: `P${standing.position} (${standing.points} pts)`, lbl: 'Posición Oficial WDC' };
    }
    return { val: '--', lbl: 'Posición Oficial' };
  }

  selectTeamDuo(teamId: string): void {
    const team = getTeamDuoById(teamId);
    if (!team) return;
    this.selectedTeamId.set(team.id);
    this.isTeamDropdownOpen.set(false);
    this.loadTeamDuoStats(team.driver1Id, team.driver2Id);
  }

  toggleTeamDropdown(e?: MouseEvent): void {
    if (e) e.stopPropagation();
    this.isTeamDropdownOpen.update(v => !v);
  }

  isCurrentRoundMatchupTeam(teamId: string): boolean {
    return this.officialMatchupTeamId() === teamId;
  }

  loadTeamDuoStats(d1Id: string, d2Id: string): void {
    const clean1 = (d1Id || 'lawson').toLowerCase().trim();
    const clean2 = (d2Id || 'lindblad').toLowerCase().trim();
    this.isLoadingStats.set(true);

    forkJoin({
      s1: this.api.getDynamicDriverStats(clean1),
      s2: this.api.getDynamicDriverStats(clean2),
      r1: this.api.jolpicaDriverSeasonResults(clean1),
      r2: this.api.jolpicaDriverSeasonResults(clean2)
    }).subscribe({
      next: ({ s1, s2, r1, r2 }) => {
        this.driver1Stats.set(s1);
        this.driver2Stats.set(s2);

        let q1 = 0, q2 = 0;
        let rc1 = 0, rc2 = 0;

        const r2ByRound = new Map<number, any>();
        for (const item of r2 || []) {
          const roundNum = Number(item?.round);
          if (Number.isFinite(roundNum) && roundNum > 0) {
            r2ByRound.set(roundNum, item);
          }
        }

        for (const item1 of r1 || []) {
          const roundNum = Number(item1?.round);
          const item2 = r2ByRound.get(roundNum);
          const res1 = item1?.Results?.[0];
          const res2 = item2?.Results?.[0];
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

        this.qualiD1.set(q1);
        this.qualiD2.set(q2);
        this.raceD1.set(rc1);
        this.raceD2.set(rc2);

        this.isLoadingStats.set(false);
      },
      error: () => {
        this.isLoadingStats.set(false);
      }
    });
  }

  loadDuelHeadToHead(d1Id: string, d2Id: string): void {
    const matchTeam = findTeamDuoByDrivers(d1Id, d2Id) || this.teamOptions[0];
    this.selectTeamDuo(matchTeam.id);
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
      }
    });
  }

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

  private calculateSessionStatus(isoString?: string | null): 'COMPLETED' | 'LIVE' | 'UPCOMING' | 'PROGRAMMED' {
    if (!isoString) return 'PROGRAMMED';
    const start = new Date(isoString).getTime();
    const now = Date.now();
    const durationMs = 90 * 60 * 1000;

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
