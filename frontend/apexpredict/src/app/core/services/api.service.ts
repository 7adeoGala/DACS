import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, catchError, map, of, switchMap, timeout, retry, timer, tap } from 'rxjs';
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
  JolpicaRaceResult
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

  readonly ROUND_18_UUID = 'f0c23d70-f7ca-411d-b827-7a9d45037100';
  readonly ROUND_19_UUID = 'f0c23d70-f7ca-411d-b827-7a9d45037101';

  readonly OFFICIAL_ROUND_18_RESULTS = {
    sessionName: 'United States Grand Prix',
    circuit: 'Circuit of the Americas',
    raceDate: '2026-10-25',
    podium: ['antonelli', 'leclerc', 'verstappen'],
    polePositionDriverId: 'antonelli',
    duelWinnerId: 'verstappen',
    safetyCarCount: 1,
    dnfCount: 3
  };

  private retryOnColdStart<T>() {
    return retry<T>({
      count: 4,
      delay: (error, retryCount) => {
        if (error.status === 502 || error.status === 503 || error.status === 504 || error.status === 0) {
          console.warn(`[ApexPredict] Reintentando conexión con servidor (${retryCount}/4)...`);
          return timer(Math.min(retryCount * 3000, 10000));
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
    // 1. Despertar BFF y Domain Service en cadena
    this.http.get(`${this.base}/backendping`).pipe(catchError(() => of(null))).subscribe();
    this.http.get(`${this.base}/ping`).pipe(catchError(() => of(null))).subscribe();

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
    return {
      id: this.ROUND_19_UUID,
      season: 2026,
      round: 19,
      name: 'Mexico City Grand Prix',
      circuit: 'Autódromo Hermanos Rodríguez',
      circuitId: 'rodriguez',
      type: 'RACE',
      raceDate: '2026-11-01',
      startsAt: '2026-11-01T20:00:00Z',
      isLocked: false,
      matchupDriver1: 'norris',
      matchupDriver2: 'leclerc',
      locality: 'Mexico City',
      country: 'Mexico',
      fp1: '2026-10-30T18:30:00Z',
      fp2: '2026-10-30T22:00:00Z',
      fp3: '2026-10-31T17:30:00Z',
      qualifying: '2026-10-31T21:00:00Z',
      lat: '19.4042',
      long: '-99.0907'
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
        // Si la sesión del backend ya caducó o es del pasado, avanzar a la siguiente sesión
        const isBackendExpired = backendSession?.startsAt && (new Date(backendSession.startsAt).getTime() <= Date.now());
        if (isBackendExpired) {
          return jolpica$;
        }
        return this.http.get<any>('https://api.jolpi.ca/ergast/f1/current/next.json').pipe(
          timeout(2000),
          map(jolpicaData => {
            const jolpicaMapped = this.mapJolpicaNextSession(jolpicaData);
            return {
              ...jolpicaMapped,
              id: backendSession.id || jolpicaMapped.id,
              name: backendSession.name || jolpicaMapped.name,
              circuit: backendSession.circuit || jolpicaMapped.circuit,
              matchupDriver1: backendSession.matchupDriver1 || 'norris',
              matchupDriver2: backendSession.matchupDriver2 || 'leclerc',
            };
          }),
          catchError(() => of({
            ...this.getFallbackNextSession(),
            ...backendSession,
            startsAt: backendSession.startsAt || '2026-11-01T20:00:00Z'
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
      matchupDriver1: 'norris',
      matchupDriver2: 'leclerc',
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

  jolpicaDriverSeasonResults(driverId: string): Observable<any[]> {
    const cleanId = (driverId || '').toLowerCase().trim();
    const jId = cleanId === 'verstappen' ? 'max_verstappen' : cleanId;
    return this.http.get<any>(`https://api.jolpi.ca/ergast/f1/current/drivers/${jId}/results.json`).pipe(
      timeout(3500),
      map(data => data?.MRData?.RaceTable?.Races || []),
      catchError(() => of([]))
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

    // 4. Safety Car (10 pts)
    const safetyCarHit = p.safetyCarCount != null && Number(p.safetyCarCount) === official.safetyCarCount;
    const safetyCarPoints = safetyCarHit ? 10 : 0;

    // 5. DNFs (15 pts)
    const dnfHit = p.dnfCount != null && Number(p.dnfCount) === official.dnfCount;
    const dnfPoints = dnfHit ? 15 : 0;

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

  predictionHistory(username?: string): Observable<PredictionHistoryItem[]> {
    return this.http.get<PredictionHistoryItem[]>(`${this.base}/predictions/history`).pipe(
      this.retryOnColdStart(),
      map(items => {
        let list = items || [];
        if (list.length === 0) {
          const cached = this.getCachedPrediction(username);
          if (cached && (cached.predictionId || (cached.podium && cached.podium.length > 0))) {
            list = [{
              predictionId: cached.predictionId || 'cached-pred-r18',
              sessionId: cached.sessionId || this.ROUND_18_UUID,
              sessionName: cached.sessionName || 'United States Grand Prix',
              circuit: cached.circuit || 'Circuit of the Americas',
              raceDate: '2026-10-25',
              startsAt: cached.startsAt || '2026-10-25T20:00:00Z',
              podium: cached.podium || [],
              polePositionDriverId: cached.polePositionDriverId || null,
              duelDriverPick: cached.duelDriverPick || null,
              safetyCarCount: cached.safetyCarCount ?? null,
              dnfCount: cached.dnfCount ?? null,
              score: cached.score ?? null,
              submittedAt: cached.submittedAt || null,
              matchupDriver1: cached.matchupDriver1 || 'norris',
              matchupDriver2: cached.matchupDriver2 || 'verstappen'
            }];
          }
        }

        return list.map(item => {
          const isRound18 = item.sessionId === this.ROUND_18_UUID || (item.sessionName && item.sessionName.toLowerCase().includes('united states'));
          const isPast = isRound18 || (item.startsAt && new Date(item.startsAt).getTime() <= Date.now());

          if (isPast && (item.score == null || !item.scoreBreakdown || !item.officialResults)) {
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
      catchError(() => {
        const cached = this.getCachedPrediction(username);
        if (cached && (cached.predictionId || (cached.podium && cached.podium.length > 0))) {
          const official = this.OFFICIAL_ROUND_18_RESULTS;
          const breakdown = this.evaluateScoreForPrediction(cached, official);
          return of([{
            predictionId: cached.predictionId || 'cached-pred-r18',
            sessionId: cached.sessionId || this.ROUND_18_UUID,
            sessionName: cached.sessionName || 'United States Grand Prix',
            circuit: cached.circuit || 'Circuit of the Americas',
            raceDate: '2026-10-25',
            startsAt: cached.startsAt || '2026-10-25T20:00:00Z',
            podium: cached.podium || [],
            polePositionDriverId: cached.polePositionDriverId || null,
            duelDriverPick: cached.duelDriverPick || null,
            safetyCarCount: cached.safetyCarCount ?? null,
            dnfCount: cached.dnfCount ?? null,
            score: breakdown.totalPoints,
            submittedAt: cached.submittedAt || null,
            matchupDriver1: cached.matchupDriver1 || 'norris',
            matchupDriver2: cached.matchupDriver2 || 'verstappen',
            scoreBreakdown: breakdown,
            officialResults: {
              podium: official.podium,
              polePositionDriverId: official.polePositionDriverId,
              duelWinnerId: official.duelWinnerId,
              safetyCarCount: official.safetyCarCount,
              dnfCount: official.dnfCount
            }
          }]);
        }
        return of([]);
      })
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
