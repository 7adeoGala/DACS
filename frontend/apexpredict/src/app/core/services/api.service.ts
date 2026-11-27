import { Injectable, inject, signal } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, catchError, map, of, switchMap, timeout, retry, timer, tap, shareReplay } from 'rxjs';
import { environment } from '../../../environments/environment';
import {
  Finish,
  League,
  Profile,
  UpdateProfileRequest,
  ChangePasswordRequest,
  Race,
  NextSession,
  PredictionDetail,
  SubmitPrediction,
  LeaderboardEntry,
  PredictionHistoryItem,
  ProdeScore,
  JolpicaDriverStanding,
  JolpicaConstructorStanding,
  JolpicaRaceResult,
  getTeammateDuoForRound,
  DynamicDriverStats,
  F1_DRIVERS,
  NotificationItem,
  AdminSessionView,
  ScoredPredictionSummary,
  SyncSessionsResponse,
  DuelCommunityStats
} from '../models/api.models';

@Injectable({ providedIn: 'root' })
export class ApiService {
  private readonly http = inject(HttpClient);
  private readonly base = environment.apiUrl;
  readonly profileUpdated = signal<Profile | null>(null);

  calendar(season: number): Observable<Race[]> {
    return this.http.get<Race[]>(`${this.base}/calendar/${season}`).pipe(
      this.retryOnColdStart(),
      map(races => {
        if (races && races.length > 0) {
          this.cacheCalendar(season, races);
          return races;
        }
        return this.getCachedCalendar(season) || [];
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
    return this.http.put<Profile>(`${this.base}/me`, {}).pipe(
      this.retryOnColdStart<Profile>()
    );
  }

  getProfile(): Observable<Profile> {
    return this.http.get<Profile>(`${this.base}/me`).pipe(
      this.retryOnColdStart<Profile>()
    );
  }

  updateProfile(payload: UpdateProfileRequest): Observable<Profile> {
    return this.http.put<Profile>(`${this.base}/me/profile`, payload).pipe(
      this.retryOnColdStart<Profile>(),
      tap((updated) => this.profileUpdated.set(updated))
    );
  }

  changePassword(payload: ChangePasswordRequest): Observable<{ status: string; message: string }> {
    return this.http.put<{ status: string; message: string }>(`${this.base}/me/password`, payload);
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

  private lastRenderWakeAt = 0;

  private triggerExternalRenderWakeup(force = false): void {
    if (typeof window === 'undefined' || typeof fetch !== 'function') return;
    const now = Date.now();
    if (!force && now - this.lastRenderWakeAt < 20000) {
      return;
    }
    this.lastRenderWakeAt = now;

    const wakeUrls = (environment as { renderWakeUrls?: string[] }).renderWakeUrls || [];
    for (const wakeUrl of wakeUrls) {
      fetch(wakeUrl, { mode: 'no-cors', cache: 'no-store' }).catch(() => {});
    }
  }

  private retryDriverStats<T>() {
    return retry<T>({
      count: 3,
      delay: (error, retryCount) => {
        if (error.status === 429 || error.status === 0 || error.status === 503 || error.status === 504) {
          this.triggerExternalRenderWakeup();
          const waitMs = Math.min(2500 + retryCount * 2000, 8000);
          console.warn(`[ApexPredict] Reintentando telemetria de piloto (${retryCount}/3, status: ${error.status})...`);
          return timer(waitMs);
        }
        throw error;
      }
    });
  }

  private retryF1Telemetry<T>() {
    return retry<T>({
      count: 5,
      delay: (error, retryCount) => {
        if (error.status === 429 || error.status === 0 || error.status === 502 || error.status === 503 || error.status === 504) {
          this.triggerExternalRenderWakeup();
          const waitMs = Math.min(2000 + retryCount * 2000, 10000);
          console.warn(`[ApexPredict] Telemetria F1 iniciando en Render (${retryCount}/5, status: ${error.status})...`);
          return timer(waitMs);
        }
        throw error;
      }
    });
  }

  private retryOnColdStart<T>() {
    return retry<T>({
      count: 6,
      delay: (error, retryCount) => {
        if (error.status === 429 || error.status === 502 || error.status === 503 || error.status === 504 || error.status === 0) {
          this.triggerExternalRenderWakeup();
          const waitMs = Math.min(2000 + retryCount * 2000, 10000);
          console.warn(`[ApexPredict] Despertando servidor backend (${retryCount}/6, status: ${error.status})...`);
          return timer(waitMs);
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
    this.http.get(`${this.base}/ping`).pipe(catchError(() => of(null))).subscribe();
    this.triggerExternalRenderWakeup(true);
    fetch(`${environment.keycloak.url}/realms/${environment.keycloak.realm}/.well-known/openid-configuration`).catch(() => {});
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

  nextSession(includeBackendSession = true): Observable<NextSession> {
    const bffNextF1$ = this.http.get<any>(`${this.base}/f1/next`).pipe(
      timeout(25000),
      this.retryF1Telemetry(),
      map(data => this.mapConnectorNextSession(data)),
      catchError(() => of(this.getFallbackNextSession()))
    );

    if (!includeBackendSession) {
      return bffNextF1$;
    }

    return this.http.get<NextSession>(`${this.base}/sessions/next`).pipe(
      timeout(20000),
      this.retryOnColdStart<NextSession>(),
      switchMap(backendSession => {
        const isBackendExpired = backendSession?.startsAt && (new Date(backendSession.startsAt).getTime() <= Date.now());
        if (isBackendExpired) {
          return bffNextF1$;
        }
        const roundNum = backendSession.round || 21;
        const duo = getTeammateDuoForRound(roundNum, backendSession.season || 2026);
        return this.http.get<any>(`${this.base}/f1/next`).pipe(
          timeout(20000),
          this.retryF1Telemetry(),
          map(f1Data => {
            const mapped = this.mapConnectorNextSession(f1Data);
            return {
              ...mapped,
              id: backendSession.id || mapped.id,
              name: backendSession.name || mapped.name,
              circuit: backendSession.circuit || mapped.circuit,
              startsAt: backendSession.startsAt || mapped.startsAt,
              isLocked: backendSession.isLocked ?? mapped.isLocked,
              matchupDriver1: backendSession.matchupDriver1 || duo.driver1,
              matchupDriver2: backendSession.matchupDriver2 || duo.driver2,
            };
          }),
          catchError(() => of({
            ...this.getFallbackNextSession(),
            ...backendSession,
            matchupDriver1: backendSession.matchupDriver1 || duo.driver1,
            matchupDriver2: backendSession.matchupDriver2 || duo.driver2,
            startsAt: backendSession.startsAt || '2026-11-22T04:00:00Z'
          }))
        );
      }),
      catchError(() => bffNextF1$)
    );
  }

  private mapConnectorNextSession(data: any): NextSession {
    if (!data || !data.name) {
      return this.getFallbackNextSession();
    }
    const roundNum = Number(data.round) || 21;
    const seasonNum = Number(data.season) || 2026;
    const duo = getTeammateDuoForRound(roundNum, seasonNum);
    const startsAt = data.startsAt || (data.raceDate ? `${data.raceDate}T20:00:00Z` : '2026-11-22T04:00:00Z');
    const id = roundNum === 19 ? this.ROUND_19_UUID : (roundNum === 18 ? this.ROUND_18_UUID : `jolpica-${seasonNum}-${roundNum}`);

    return {
      id,
      season: seasonNum,
      round: roundNum,
      name: data.name,
      circuit: data.circuit || 'Circuito Oficial',
      type: 'RACE',
      raceDate: data.raceDate || '',
      startsAt,
      isLocked: new Date() > new Date(startsAt),
      matchupDriver1: duo.driver1,
      matchupDriver2: duo.driver2,
      circuitId: data.circuitId || 'vegas',
      locality: data.locality || '',
      country: data.country || '',
      fp1: data.fp1 || undefined,
      fp2: data.fp2 || undefined,
      fp3: data.fp3 || undefined,
      qualifying: data.qualifying || undefined,
      sprint: data.sprint || null,
      sprintQualifying: data.sprintQualifying || null,
      lat: data.lat || '36.1147',
      long: data.lon || '-115.173'
    };
  }

  jolpicaDriverStandings(): Observable<JolpicaDriverStanding[]> {
    return this.http.get<JolpicaDriverStanding[]>(`${this.base}/f1/standings/drivers`).pipe(
      timeout(20000),
      this.retryF1Telemetry(),
      catchError(() => of([]))
    );
  }

  jolpicaConstructorStandings(): Observable<JolpicaConstructorStanding[]> {
    return this.http.get<JolpicaConstructorStanding[]>(`${this.base}/f1/standings/constructors`).pipe(
      timeout(20000),
      this.retryF1Telemetry(),
      catchError(() => of([]))
    );
  }

  jolpicaLastResults(): Observable<{ raceName: string; round: number; circuit: string; date: string; results: JolpicaRaceResult[] }> {
    return this.http.get<{ raceName: string; round: number; circuit: string; date: string; results: JolpicaRaceResult[] }>(`${this.base}/f1/results/last`).pipe(
      this.retryOnColdStart()
    );
  }

  private readonly driverStatsRequestCache = new Map<string, Observable<DynamicDriverStats>>();

  private fetchDriverStatsFromBff(cleanId: string): Observable<DynamicDriverStats> {
    const existing = this.driverStatsRequestCache.get(cleanId);
    if (existing) {
      return existing;
    }

    const driverOpt = F1_DRIVERS.find(d => d.id.toLowerCase() === cleanId) || {
      id: cleanId,
      name: cleanId.toUpperCase(),
      code: cleanId.slice(0, 3).toUpperCase(),
      number: 0,
      team: 'F1 Team',
      teamColor: '#E10600'
    };

    const req$ = this.http.get<DynamicDriverStats>(`${this.base}/f1/drivers/${encodeURIComponent(cleanId)}/stats`).pipe(
      this.retryDriverStats(),
      map(apiStats => ({
        ...apiStats,
        driverId: cleanId,
        name: driverOpt.name,
        code: driverOpt.code,
        number: driverOpt.number,
        team: driverOpt.team,
        teamColor: driverOpt.teamColor
      })),
      catchError(() => {
        this.driverStatsRequestCache.delete(cleanId);
        return of({
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
          careerStarts: 0,
          seasonResults: []
        });
      }),
      shareReplay(1)
    );

    this.driverStatsRequestCache.set(cleanId, req$);
    return req$;
  }

  jolpicaDriverSeasonResults(driverId: string): Observable<any[]> {
    const cleanId = (driverId || '').toLowerCase().trim();
    return this.fetchDriverStatsFromBff(cleanId).pipe(
      map(stats => (stats.seasonResults || []).map(r => ({
        round: r.round,
        raceName: r.raceName,
        Results: [{ position: String(r.position), grid: String(r.grid), status: r.status }]
      }))),
      catchError(() => of([]))
    );
  }

  getDynamicDriverStats(driverId: string): Observable<DynamicDriverStats> {
    const cleanId = (driverId || '').toLowerCase().trim();
    return this.fetchDriverStatsFromBff(cleanId);
  }

  getProdeScore(year: number, round: number): Observable<ProdeScore> {
    return this.http.get<ProdeScore>(`${this.base}/scores/me/${year}/${round}`).pipe(
      this.retryOnColdStart()
    );
  }

  currentPrediction(username?: string): Observable<PredictionDetail | null> {
    return this.http.get<PredictionDetail>(`${this.base}/predictions/current`).pipe(
      this.retryOnColdStart(),
      tap(pred => {
        if (pred && (pred.predictionId || (pred.podium && pred.podium.length > 0))) {
          this.setCachedPrediction(pred, username);
        } else {
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
    let podiumHits = 0;
    const userPodium = p.podium || [];
    for (let i = 0; i < 3 && i < userPodium.length && i < official.podium.length; i++) {
      if (userPodium[i] && official.podium[i] && userPodium[i].trim().toLowerCase() === official.podium[i].trim().toLowerCase()) {
        podiumHits++;
      }
    }
    const podiumPoints = podiumHits === 3 ? 10 : (podiumHits === 2 ? 7 : (podiumHits === 1 ? 3 : 0));

    const poleHit = !!(p.polePositionDriverId && p.polePositionDriverId.trim().toLowerCase() === official.polePositionDriverId.trim().toLowerCase());
    const polePoints = poleHit ? 4 : 0;

    const duelHit = !!(p.duelDriverPick && p.duelDriverPick.trim().toLowerCase() === official.duelWinnerId.trim().toLowerCase());
    const duelPoints = duelHit ? 3 : 0;

    const safetyCarHit = p.safetyCarCount != null && Number(p.safetyCarCount) === official.safetyCarCount;
    const safetyCarPoints = safetyCarHit ? 6 : 0;

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
          if (item.predictionId && isRound18 && (item.score == null || !item.scoreBreakdown || !item.officialResults)) {
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

  notifications(): Observable<NotificationItem[]> {
    return this.http.get<NotificationItem[]>(`${this.base}/notifications`).pipe(
      this.retryOnColdStart(),
      catchError(() => of([]))
    );
  }

  markNotificationAsRead(id: string): Observable<NotificationItem> {
    return this.http.put<NotificationItem>(`${this.base}/notifications/${id}/read`, {});
  }

  markAllNotificationsAsRead(): Observable<{ updated: number; status: string }> {
    return this.http.put<{ updated: number; status: string }>(`${this.base}/notifications/read-all`, {});
  }

  dismissNotification(id: string): Observable<void> {
    return this.http.delete<void>(`${this.base}/notifications/${id}`);
  }

  dismissAllNotifications(): Observable<{ dismissed: number; status: string }> {
    return this.http.delete<{ dismissed: number; status: string }>(`${this.base}/notifications`);
  }

  duelCommunityStats(): Observable<DuelCommunityStats | null> {
    return this.http.get<DuelCommunityStats>(`${this.base}/sessions/next/duel-stats`).pipe(
      this.retryOnColdStart(),
      catchError(() => of(null))
    );
  }

  adminStatus() {
    return this.http.get<{ status: string }>(`${this.base}/admin/status`);
  }

  adminUsers(): Observable<Profile[]> {
    return this.http.get<Profile[]>(`${this.base}/admin/users`).pipe(
      this.retryOnColdStart()
    );
  }

  adminSessions(): Observable<AdminSessionView[]> {
    return this.http.get<AdminSessionView[]>(`${this.base}/admin/sessions`).pipe(
      this.retryOnColdStart()
    );
  }

  syncSessions(): Observable<SyncSessionsResponse> {
    return this.http.post<SyncSessionsResponse>(`${this.base}/admin/sessions/sync`, {});
  }

  scoreSession(sessionId: string): Observable<ScoredPredictionSummary[]> {
    return this.http.post<ScoredPredictionSummary[]>(`${this.base}/admin/sessions/${sessionId}/score`, {});
  }

  sendSessionReminders(sessionId: string): Observable<{ sessionId: string; remindersSent: number; status: string }> {
    return this.http.post<{ sessionId: string; remindersSent: number; status: string }>(
      `${this.base}/admin/notifications/send-reminders/${sessionId}`,
      {}
    );
  }
}
