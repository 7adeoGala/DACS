import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, catchError, map, of, switchMap, timeout, retry, timer, tap, forkJoin } from 'rxjs';
import { environment } from '../../../environments/environment';
import {
  Finish,
  League,
  Profile,
  UpdateProfileRequest,
  Race,
  NextSession,
  PredictionDetail,
  SubmitPrediction,
  LeaderboardEntry,
  PredictionHistoryItem,
  JolpicaDriverStanding,
  JolpicaConstructorStanding,
  JolpicaRaceResult,
  getTeammateDuoForRound,
  DynamicDriverStats,
  F1_DRIVERS
} from '../models/api.models';

@Injectable({ providedIn: 'root' })
export class ApiService {
  private readonly http = inject(HttpClient);
  private readonly base = environment.apiUrl;

  calendar(season: number): Observable<Race[]> {
    const jolpica$ = this.fetchJolpicaCalendar(season);

    // Intentar backend con timeout de 1500ms; si duerme o tarda, cae instantáneamente a Jolpica (150ms)
    return this.http.get<Race[]>(`${this.base}/calendar/${season}`).pipe(
      timeout(1500),
      map(races => {
        if (!races || races.length === 0) {
          throw new Error('Empty backend calendar, falling back to Jolpica');
        }
        this.cacheCalendar(season, races);
        return races;
      }),
      catchError(() => jolpica$)
    );
  }

  private fetchJolpicaCalendar(season: number): Observable<Race[]> {
    return this.http.get<any>(`https://api.jolpi.ca/ergast/f1/${season}.json`).pipe(
      map(data => {
        const list = data?.MRData?.RaceTable?.Races || [];
        const races = list.map((r: any) => ({
          season: parseInt(r.season, 10),
          round: parseInt(r.round, 10),
          name: r.raceName,
          circuit: r.Circuit?.circuitName || 'Circuito Oficial',
          country: r.Circuit?.Location?.country || 'Internacional',
          date: r.date,
          startsAt: r.time ? `${r.date}T${r.time}` : `${r.date}T20:00:00Z`
        }));
        this.cacheCalendar(season, races);
        return races;
      }),
      catchError(() => of(this.getCachedCalendar(season) || []))
    );
  }

  private cacheCalendar(season: number, races: Race[]) {
    try {
      if (races && races.length > 0) {
        localStorage.setItem(`apexpredict_calendar_${season}`, JSON.stringify(races));
      }
    } catch {}
  }

  private getCachedCalendar(season: number): Race[] | null {
    try {
      const item = localStorage.getItem(`apexpredict_calendar_${season}`);
      return item ? JSON.parse(item) : null;
    } catch {
      return null;
    }
  }

  results(season: number, round: number) {
    return this.http.get<Finish[]>(`${this.base}/results/${season}/${round}`);
  }

  profile() {
    return this.http.put<Profile>(`${this.base}/me`, {});
  }

  getProfile(): Observable<Profile> {
    return this.http.get<Profile>(`${this.base}/me`).pipe(
      this.retryOnColdStart<Profile>()
    );
  }

  updateProfile(payload: UpdateProfileRequest): Observable<Profile> {
    return this.http.put<Profile>(`${this.base}/me/profile`, payload).pipe(
      this.retryOnColdStart<Profile>()
    );
  }

  checkDisplayName(name: string): Observable<{ available: boolean; name: string }> {
    const params = new HttpParams().set('name', name);
    return this.http.get<{ available: boolean; name: string }>(`${this.base}/users/check-display-name`, { params }).pipe(
      catchError(() => of({ available: true, name }))
    );
  }

  readonly ROUND_18_UUID = 'f0c23d70-f7ca-411d-b827-7a9d45037100';
  readonly ROUND_19_UUID = 'f0c23d70-f7ca-411d-b827-7a9d45037101';

  readonly OFFICIAL_ROUND_18_RESULTS = {
    sessionName: 'United States Grand Prix',
    circuit: 'Circuit of the Americas',
    raceDate: '2026-10-25',
    podium: ['antonelli', 'leclerc', 'verstappen'],
    polePositionDriverId: 'antonelli',
    duelWinnerId: 'verstappen',
    safetyCarCount: 2,
    dnfCount: 3
  };

  private retryOnColdStart<T>() {
    return retry<T>({
      count: 4,
      delay: (error, retryCount) => {
        // En 429 (Too Many Requests), no reintentar en ráfaga para evitar penalización de rate limit
        if (error.status === 429) {
          console.warn('[ApexPredict] Rate limit alcanzado (HTTP 429). Se preserva la cuota del servidor.');
          throw error;
        }
        if (error.status === 502 || error.status === 503 || error.status === 504 || error.status === 0) {
          console.warn(`[ApexPredict] Reintentando conexión con servidor (${retryCount}/4, status: ${error.status})...`);
          return timer(Math.min(retryCount * 2500, 10000));
        }
        throw error;
      }
    });
  }

  pingBackend(): Observable<any> {
    return this.http.get(`${this.base}/backendping`).pipe(catchError(() => of(null)));
  }

  wakeServices(): void {
    if (typeof window === 'undefined') return;
    // 1. Despertar BFF y Domain Service en cadena (backendping despierta ambos)
    this.http.get(`${this.base}/backendping`).pipe(catchError(() => of(null))).subscribe();

    // 2. Despertar Keycloak inmediatamente en segundo plano con endpoints JSON
    fetch(`${environment.keycloak.url}/realms/${environment.keycloak.realm}/.well-known/openid-configuration`).catch(() => {});
    fetch(`${environment.keycloak.url}/realms/${environment.keycloak.realm}`, { mode: 'no-cors' }).catch(() => {});

    // 3. Despertar conector F1 en segundo plano
    fetch('https://dacs-1-v4ik.onrender.com/conector/ping', { mode: 'no-cors' }).catch(() => {});
  }

  getCachedPrediction(username?: string, sessionId?: string): PredictionDetail | null {
    try {
      const user = username ? username.toLowerCase() : 'anon';
      if (sessionId) {
        const sessionSpecific = localStorage.getItem(`apex_pred_${user}_${sessionId}`);
        if (sessionSpecific) {
          const parsed = JSON.parse(sessionSpecific);
          if (parsed && (parsed.predictionId || (parsed.podium && parsed.podium.length > 0))) {
            return parsed;
          }
        }
      }
      const generalKey = username ? `apex_pred_${user}` : 'apex_current_prediction';
      const raw = localStorage.getItem(generalKey);
      if (!raw) return null;
      const pred: PredictionDetail = JSON.parse(raw);
      // Si la predicción en caché pertenece a otra carrera anterior y tenemos sessionId activo, ignorar
      if (sessionId && pred?.sessionId && pred.sessionId !== sessionId) {
        return null;
      }
      return pred;
    } catch {
      return null;
    }
  }

  setCachedPrediction(pred: PredictionDetail, username?: string) {
    try {
      const user = username ? username.toLowerCase() : 'anon';
      if (pred.sessionId) {
        localStorage.setItem(`apex_pred_${user}_${pred.sessionId}`, JSON.stringify(pred));
      }
      const generalKey = username ? `apex_pred_${user}` : 'apex_current_prediction';
      localStorage.setItem(generalKey, JSON.stringify(pred));
    } catch {}
  }

  clearCachedPrediction(username?: string, sessionId?: string) {
    try {
      const user = username ? username.toLowerCase() : 'anon';
      if (sessionId) {
        localStorage.removeItem(`apex_pred_${user}_${sessionId}`);
      }
      const generalKey = username ? `apex_pred_${user}` : 'apex_current_prediction';
      localStorage.removeItem(generalKey);
      localStorage.removeItem('apex_current_prediction');
    } catch {}
  }

  getCachedLeagues(username?: string): League[] | null {
    try {
      const key = username ? `apex_leagues_${username.toLowerCase()}` : 'apex_leagues';
      const raw = localStorage.getItem(key);
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  }

  setCachedLeagues(leagues: League[], username?: string) {
    try {
      const key = username ? `apex_leagues_${username.toLowerCase()}` : 'apex_leagues';
      localStorage.setItem(key, JSON.stringify(leagues));
    } catch {}
  }

  getCachedProfile(username?: string): Profile | null {
    try {
      const key = username ? `apex_profile_${username.toLowerCase()}` : 'apex_profile';
      const raw = localStorage.getItem(key);
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  }

  setCachedProfile(profile: Partial<Profile>, username?: string) {
    try {
      const key = username ? `apex_profile_${username.toLowerCase()}` : 'apex_profile';
      const existing = this.getCachedProfile(username) || {} as Profile;
      const merged = { ...existing, ...profile };
      localStorage.setItem(key, JSON.stringify(merged));
    } catch {}
  }

  leagues(username?: string) {
    return this.http.get<League[]>(`${this.base}/leagues`).pipe(
      this.retryOnColdStart(),
      tap(list => {
        if (list && list.length > 0) {
          this.setCachedLeagues(list, username);
        }
      })
    );
  }

  searchLeagues(query?: string): Observable<League[]> {
    const q = query ? `?query=${encodeURIComponent(query)}` : '';
    return this.http.get<League[]>(`${this.base}/leagues/search${q}`).pipe(this.retryOnColdStart());
  }

  createLeague(name: string, description?: string, password?: string) {
    return this.http.post<League>(`${this.base}/leagues`, { name, description, password }).pipe(this.retryOnColdStart());
  }

  editLeague(id: string, name: string, description?: string, password?: string) {
    return this.http.put<League>(`${this.base}/leagues/${id}`, { name, description, password }).pipe(this.retryOnColdStart());
  }

  joinLeagueById(id: string, password?: string) {
    return this.http.post<League>(`${this.base}/leagues/${id}/join`, { password }).pipe(this.retryOnColdStart());
  }

  joinLeague(inviteCode: string, password?: string) {
    return this.http.post<League>(`${this.base}/leagues/join/${inviteCode}`, { password }).pipe(this.retryOnColdStart());
  }

  private memoryGlobalLeaderboard: LeaderboardEntry[] | null = null;

  globalLeaderboard() {
    return this.http.get<LeaderboardEntry[]>(`${this.base}/leaderboard/global`).pipe(
      tap((entries) => {
        if (entries && entries.length > 0) {
          this.setCachedGlobalLeaderboard(entries);
        }
      }),
      this.retryOnColdStart(),
      catchError(() => of(this.getCachedGlobalLeaderboard() || []))
    );
  }

  getCachedGlobalLeaderboard(): LeaderboardEntry[] | null {
    try {
      if (typeof localStorage !== 'undefined') {
        localStorage.removeItem('apex_global_leaderboard');
      }
    } catch {}
    return this.memoryGlobalLeaderboard;
  }

  setCachedGlobalLeaderboard(entries: LeaderboardEntry[]): void {
    this.memoryGlobalLeaderboard = entries;
    try {
      if (typeof localStorage !== 'undefined') {
        localStorage.removeItem('apex_global_leaderboard');
      }
    } catch {}
  }

  leagueLeaderboard(leagueId: string) {
    return this.http.get<LeaderboardEntry[]>(`${this.base}/leagues/${leagueId}/leaderboard`).pipe(this.retryOnColdStart());
  }

  getFallbackNextSession(): NextSession {
    const duo = getTeammateDuoForRound(21, 2026);
    return {
      id: '0bada6fd-642d-4f62-b2d0-0beffbb829a2',
      season: 2026,
      round: 21,
      name: 'Las Vegas Grand Prix',
      circuit: 'Las Vegas Strip Circuit',
      circuitId: 'vegas',
      type: 'RACE',
      raceDate: '2026-11-21',
      startsAt: '2026-11-22T04:00:00Z',
      isLocked: false,
      matchupDriver1: duo.driver1,
      matchupDriver2: duo.driver2,
      locality: 'Las Vegas',
      country: 'USA',
      fp1: '2026-11-20T00:30:00Z',
      fp2: '2026-11-20T04:00:00Z',
      fp3: '2026-11-21T00:30:00Z',
      qualifying: '2026-11-21T04:00:00Z',
      lat: '36.1147',
      long: '-115.173'
    };
  }

  nextSession(): Observable<NextSession> {
    const jolpica$ = this.http.get<any>('https://api.jolpi.ca/ergast/f1/current/next.json').pipe(
      timeout(2500),
      map(data => this.mapJolpicaNextSession(data)),
      catchError(() => of(this.getFallbackNextSession()))
    );

    return this.http.get<NextSession>(`${this.base}/sessions/next`).pipe(
      timeout(1500),
      switchMap(backendSession => {
        const isBackendExpired = backendSession?.startsAt && (new Date(backendSession.startsAt).getTime() <= Date.now());
        if (isBackendExpired) {
          return jolpica$;
        }
        const roundNum = backendSession.round || 20;
        const duo = getTeammateDuoForRound(roundNum, backendSession.season || 2026);
        return this.http.get<any>('https://api.jolpi.ca/ergast/f1/current/next.json').pipe(
          timeout(2000),
          map(jolpicaData => {
            const jolpicaMapped = this.mapJolpicaNextSession(jolpicaData);
            return {
              ...jolpicaMapped,
              id: backendSession.id || jolpicaMapped.id,
              name: backendSession.name || jolpicaMapped.name,
              circuit: backendSession.circuit || jolpicaMapped.circuit,
              startsAt: backendSession.startsAt || jolpicaMapped.startsAt,
              isLocked: backendSession.isLocked ?? jolpicaMapped.isLocked,
              matchupDriver1: backendSession.matchupDriver1 || duo.driver1,
              matchupDriver2: backendSession.matchupDriver2 || duo.driver2,
            };
          }),
          catchError(() => of({
            ...this.getFallbackNextSession(),
            ...backendSession,
            matchupDriver1: backendSession.matchupDriver1 || duo.driver1,
            matchupDriver2: backendSession.matchupDriver2 || duo.driver2,
            startsAt: backendSession.startsAt || '2026-11-08T17:00:00Z'
          }))
        );
      }),
      catchError(() => jolpica$)
    );
  }

  private mapJolpicaNextSession(data: any): NextSession {
    const race = data?.MRData?.RaceTable?.Races?.[0];
    if (!race) {
      return this.getFallbackNextSession();
    }
    const fp1 = race.FirstPractice ? `${race.FirstPractice.date}T${race.FirstPractice.time}` : '2026-10-30T18:30:00Z';
    const fp2 = race.SecondPractice ? `${race.SecondPractice.date}T${race.SecondPractice.time}` : '2026-10-30T22:00:00Z';
    const fp3 = race.ThirdPractice ? `${race.ThirdPractice.date}T${race.ThirdPractice.time}` : '2026-10-31T17:30:00Z';
    const sprint = race.Sprint ? `${race.Sprint.date}T${race.Sprint.time}` : null;
    const sprintQualifying = race.SprintQualifying ? `${race.SprintQualifying.date}T${race.SprintQualifying.time}` : null;
    const qualifying = race.Qualifying ? `${race.Qualifying.date}T${race.Qualifying.time}` : '2026-10-31T21:00:00Z';
    const startsAt = race.time ? `${race.date}T${race.time}` : `${race.date}T20:00:00Z`;
    const roundNum = parseInt(race.round, 10);
    const id = roundNum === 19 ? this.ROUND_19_UUID : (roundNum === 18 ? this.ROUND_18_UUID : `jolpica-${race.season}-${race.round}`);

    return {
      id,
      season: parseInt(race.season, 10),
      round: roundNum,
      name: race.raceName,
      circuit: race.Circuit?.circuitName || 'Autódromo Hermanos Rodríguez',
      type: 'RACE',
      raceDate: race.date,
      startsAt,
      isLocked: new Date() > new Date(startsAt),
      matchupDriver1: getTeammateDuoForRound(roundNum, parseInt(race.season, 10)).driver1,
      matchupDriver2: getTeammateDuoForRound(roundNum, parseInt(race.season, 10)).driver2,
      circuitId: race.Circuit?.circuitId || 'rodriguez',
      locality: race.Circuit?.Location?.locality || 'Mexico City',
      country: race.Circuit?.Location?.country || 'Mexico',
      fp1,
      fp2,
      fp3,
      qualifying,
      sprint,
      sprintQualifying,
      lat: race.Circuit?.Location?.lat || '19.4042',
      long: race.Circuit?.Location?.long || '-99.0907'
    };
  }

  jolpicaDriverStandings(): Observable<JolpicaDriverStanding[]> {
    return this.http.get<any>('https://api.jolpi.ca/ergast/f1/current/driverStandings.json').pipe(
      map(data => {
        const list = data?.MRData?.StandingsTable?.StandingsLists?.[0]?.DriverStandings || [];
        return list.map((s: any) => ({
          position: s.position,
          points: s.points,
          wins: s.wins,
          driverId: s.Driver?.driverId || '',
          code: s.Driver?.code || '',
          name: `${s.Driver?.givenName || ''} ${s.Driver?.familyName || ''}`.trim(),
          nationality: s.Driver?.nationality || '',
          team: s.Constructors?.[0]?.name || 'F1 Team'
        }));
      }),
      catchError(() => of([]))
    );
  }

  jolpicaConstructorStandings(): Observable<JolpicaConstructorStanding[]> {
    return this.http.get<any>('https://api.jolpi.ca/ergast/f1/current/constructorStandings.json').pipe(
      map(data => {
        const list = data?.MRData?.StandingsTable?.StandingsLists?.[0]?.ConstructorStandings || [];
        return list.map((s: any) => ({
          position: s.position,
          points: s.points,
          wins: s.wins,
          constructorId: s.Constructor?.constructorId || '',
          name: s.Constructor?.name || '',
          nationality: s.Constructor?.nationality || ''
        }));
      }),
      catchError(() => of([]))
    );
  }

  jolpicaLastResults(): Observable<{ raceName: string; round: number; circuit: string; date: string; results: JolpicaRaceResult[] }> {
    return this.http.get<any>('https://api.jolpi.ca/ergast/f1/current/last/results.json').pipe(
      map(data => {
        const race = data?.MRData?.RaceTable?.Races?.[0];
        if (!race) throw new Error('No last race');
        const results = (race.Results || []).map((r: any) => ({
          position: r.position,
          driverId: r.Driver?.driverId || '',
          driverName: `${r.Driver?.givenName || ''} ${r.Driver?.familyName || ''}`.trim(),
          team: r.Constructor?.name || '',
          status: r.status,
          points: r.points,
          grid: r.grid,
          laps: r.laps
        }));
        return {
          raceName: race.raceName,
          round: parseInt(race.round, 10),
          circuit: race.Circuit?.circuitName || '',
          date: race.date,
          results
        };
      })
    );
  }

  private readonly dynamicDriverStatsCache = new Map<string, DynamicDriverStats>();

  jolpicaDriverSeasonResults(driverId: string): Observable<any[]> {
    const cleanId = (driverId || '').toLowerCase().trim();
    const jId = cleanId === 'verstappen' ? 'max_verstappen' : (cleanId === 'lindblad' ? 'arvid_lindblad' : cleanId);
    return this.http.get<any>(`https://api.jolpi.ca/ergast/f1/current/drivers/${jId}/results.json`).pipe(
      timeout(3500),
      map(data => data?.MRData?.RaceTable?.Races || []),
      catchError(() => of([]))
    );
  }

  getDynamicDriverStats(driverId: string): Observable<DynamicDriverStats> {
    const cleanId = (driverId || '').toLowerCase().trim();
    if (this.dynamicDriverStatsCache.has(cleanId)) {
      return of(this.dynamicDriverStatsCache.get(cleanId)!);
    }

    const jId = cleanId === 'verstappen' ? 'max_verstappen' : (cleanId === 'lindblad' ? 'arvid_lindblad' : cleanId);
    const driverOpt = F1_DRIVERS.find(d => d.id.toLowerCase() === cleanId) || {
      id: cleanId,
      name: cleanId.toUpperCase(),
      code: cleanId.slice(0, 3).toUpperCase(),
      number: 0,
      team: 'F1 Team',
      teamColor: '#E10600'
    };

    return forkJoin({
      standings: this.jolpicaDriverStandings(),
      seasonResults: this.jolpicaDriverSeasonResults(cleanId),
      careerWinsData: this.http.get<any>(`https://api.jolpi.ca/ergast/f1/drivers/${jId}/results/1.json?limit=1`).pipe(timeout(2500), catchError(() => of(null))),
      careerPolesData: this.http.get<any>(`https://api.jolpi.ca/ergast/f1/drivers/${jId}/qualifying/1.json?limit=1`).pipe(timeout(2500), catchError(() => of(null))),
      careerStartsData: this.http.get<any>(`https://api.jolpi.ca/ergast/f1/drivers/${jId}/results.json?limit=1`).pipe(timeout(2500), catchError(() => of(null)))
    }).pipe(
      map(({ standings, seasonResults, careerWinsData, careerPolesData, careerStartsData }) => {
        const targetClean = cleanId.replace(/[^a-z0-9]/g, '');
        const standing = (standings || []).find(s => {
          const sId = (s.driverId || '').toLowerCase().replace(/[^a-z0-9]/g, '');
          const sCode = (s.code || '').toLowerCase();
          const sName = (s.name || '').toLowerCase().replace(/[^a-z0-9]/g, '');
          return sId === targetClean ||
            (sId === 'maxverstappen' && targetClean === 'verstappen') ||
            (targetClean === 'maxverstappen' && sId === 'verstappen') ||
            (sId === 'arvidlindblad' && targetClean === 'lindblad') ||
            (targetClean === 'arvidlindblad' && sId === 'lindblad') ||
            sCode === targetClean ||
            sName.includes(targetClean);
        });

        const points = standing ? parseInt(standing.points, 10) || 0 : 0;
        const standingPosition = standing?.position ? `P${standing.position}` : '-';
        const standingWins = standing ? parseInt(standing.wins, 10) || 0 : 0;

        const races = seasonResults || [];
        let seasonWins = 0;
        let podiums = 0;
        let poles = 0;
        let fastestLaps = 0;
        let dnfs = 0;
        let bestPos = 99;

        for (const race of races) {
          const res = race?.Results?.[0];
          if (!res) continue;
          const pos = parseInt(res.position, 10);
          const grid = parseInt(res.grid, 10);

          if (pos === 1) seasonWins++;
          if (pos >= 1 && pos <= 3) podiums++;
          if (grid === 1) poles++;
          if (res.FastestLap?.rank === '1') fastestLaps++;

          const status = (res.status || '').toLowerCase();
          if (status.includes('ret') || status.includes('acc') || status.includes('coll') || 
              status.includes('eng') || status.includes('punc') || status.includes('gear') ||
              status.includes('elect') || status.includes('hydr') || status.includes('susp')) {
            dnfs++;
          }
          if (pos > 0 && pos < bestPos) {
            bestPos = pos;
          }
        }

        const wins = Math.max(standingWins, seasonWins);
        const bestFinish = bestPos < 99 ? `P${bestPos}` : (standingPosition !== '-' ? standingPosition : '-');

        const careerWins = careerWinsData?.MRData?.total != null ? parseInt(careerWinsData.MRData.total, 10) : wins;
        const careerPoles = careerPolesData?.MRData?.total != null ? parseInt(careerPolesData.MRData.total, 10) : poles;
        const careerStarts = careerStartsData?.MRData?.total != null ? parseInt(careerStartsData.MRData.total, 10) : races.length;

        const stats: DynamicDriverStats = {
          driverId: cleanId,
          name: driverOpt.name,
          code: driverOpt.code,
          number: driverOpt.number,
          team: driverOpt.team,
          teamColor: driverOpt.teamColor,
          nationality: standing?.nationality,
          points,
          standingPosition,
          wins,
          podiums,
          poles,
          fastestLaps,
          dnfs,
          racesCount: races.length,
          bestFinish,
          careerWins,
          careerPoles,
          careerStarts
        };

        this.dynamicDriverStatsCache.set(cleanId, stats);
        return stats;
      }),
      catchError(() => {
        const fallback: DynamicDriverStats = {
          driverId: cleanId,
          name: driverOpt.name,
          code: driverOpt.code,
          number: driverOpt.number,
          team: driverOpt.team,
          teamColor: driverOpt.teamColor,
          points: 0,
          standingPosition: '-',
          wins: 0,
          podiums: 0,
          poles: 0,
          fastestLaps: 0,
          dnfs: 0,
          racesCount: 0,
          bestFinish: '-',
          careerWins: 0,
          careerPoles: 0,
          careerStarts: 0
        };
        return of(fallback);
      })
    );
  }

  currentPrediction(username?: string): Observable<PredictionDetail | null> {
    return this.http.get<PredictionDetail>(`${this.base}/predictions/current`).pipe(
      this.retryOnColdStart(),
      tap(pred => {
        if (pred && (pred.predictionId || (pred.podium && pred.podium.length > 0))) {
          this.setCachedPrediction(pred, username);
        } else {
          // Si no hay pronóstico para la carrera actual, no conservar en caché pronósticos viejos
          this.clearCachedPrediction(username);
        }
      }),
      catchError(() => of(this.getCachedPrediction(username)))
    );
  }

  predictionForSession(sessionId: string, username?: string): Observable<PredictionDetail | null> {
    return this.http.get<PredictionDetail>(`${this.base}/predictions/session/${sessionId}`).pipe(
      this.retryOnColdStart(),
      tap(pred => {
        if (pred && (pred.predictionId || (pred.podium && pred.podium.length > 0))) {
          this.setCachedPrediction(pred, username);
        } else {
          this.clearCachedPrediction(username, sessionId);
        }
      }),
      catchError(() => of(this.getCachedPrediction(username, sessionId)))
    );
  }

  evaluateScoreForPrediction(p: {
    podium?: string[];
    polePositionDriverId?: string | null;
    duelDriverPick?: string | null;
    safetyCarCount?: number | null;
    dnfCount?: number | null;
  }, official: {
    podium: string[];
    polePositionDriverId: string;
    duelWinnerId: string;
    safetyCarCount: number;
    dnfCount: number;
  }) {
    // 1. Podio (1 hit = 3 pts, 2 hits = 7 pts, 3 hits = 10 pts)
    let podiumHits = 0;
    const userPodium = p.podium || [];
    for (let i = 0; i < 3 && i < userPodium.length && i < official.podium.length; i++) {
      if (userPodium[i] && official.podium[i] && userPodium[i].trim().toLowerCase() === official.podium[i].trim().toLowerCase()) {
        podiumHits++;
      }
    }
    const podiumPoints = podiumHits === 3 ? 10 : (podiumHits === 2 ? 7 : (podiumHits === 1 ? 3 : 0));

    // 2. Pole (4 pts)
    const poleHit = !!(p.polePositionDriverId && p.polePositionDriverId.trim().toLowerCase() === official.polePositionDriverId.trim().toLowerCase());
    const polePoints = poleHit ? 4 : 0;

    // 3. Duelo (3 pts)
    const duelHit = !!(p.duelDriverPick && p.duelDriverPick.trim().toLowerCase() === official.duelWinnerId.trim().toLowerCase());
    const duelPoints = duelHit ? 3 : 0;

    // 4. Safety Car (6 pts)
    const safetyCarHit = p.safetyCarCount != null && Number(p.safetyCarCount) === official.safetyCarCount;
    const safetyCarPoints = safetyCarHit ? 6 : 0;

    // 5. DNFs (6 pts)
    const dnfHit = p.dnfCount != null && Number(p.dnfCount) === official.dnfCount;
    const dnfPoints = dnfHit ? 6 : 0;

    const totalPoints = podiumPoints + polePoints + duelPoints + safetyCarPoints + dnfPoints;

    return {
      podiumHits,
      podiumPoints,
      poleHit,
      polePoints,
      duelHit,
      duelPoints,
      safetyCarHit,
      safetyCarPoints,
      dnfHit,
      dnfPoints,
      totalPoints
    };
  }

  predictionHistory(_username?: string): Observable<PredictionHistoryItem[]> {
    return this.http.get<PredictionHistoryItem[]>(`${this.base}/predictions/history`).pipe(
      this.retryOnColdStart(),
      map(items => {
        const list = items || [];
        return list.map(item => {
          const isRound18 = item.sessionId === this.ROUND_18_UUID || (item.sessionName && item.sessionName.toLowerCase().includes('united states'));
          if (isRound18 && (item.score == null || !item.scoreBreakdown || !item.officialResults)) {
            const official = this.OFFICIAL_ROUND_18_RESULTS;
            const breakdown = this.evaluateScoreForPrediction(item, official);
            return {
              ...item,
              score: breakdown.totalPoints,
              scoreBreakdown: breakdown,
              officialResults: {
                podium: official.podium,
                polePositionDriverId: official.polePositionDriverId,
                duelWinnerId: official.duelWinnerId,
                safetyCarCount: official.safetyCarCount,
                dnfCount: official.dnfCount
              }
            };
          }
          return item;
        });
      }),
      catchError(() => of([]))
    );
  }

  submitPrediction(sessionId: string, prediction: SubmitPrediction, username?: string) {
    return this.http.post<PredictionDetail>(`${this.base}/predictions/session/${sessionId}`, prediction).pipe(
      this.retryOnColdStart(),
      tap(saved => {
        if (saved) {
          this.setCachedPrediction(saved, username);
        }
      })
    );
  }

  adminStatus() {
    return this.http.get<{ status: string }>(`${this.base}/admin/status`);
  }
}
