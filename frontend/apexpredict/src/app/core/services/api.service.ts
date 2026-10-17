import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, catchError, map, of, switchMap, timeout } from 'rxjs';
import { environment } from '../../../environments/environment';
import {
  Finish,
  League,
  Profile,
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
          startsAt: r.time ? `${r.date}T${r.time}` : `${r.date}T14:00:00Z`
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

  private readonly ROUND_18_UUID = 'f0c23d70-f7ca-411d-b827-7a9d45037100';

  leagues() {
    return this.http.get<League[]>(`${this.base}/leagues`);
  }

  searchLeagues(query?: string): Observable<League[]> {
    const q = query ? `?query=${encodeURIComponent(query)}` : '';
    return this.http.get<League[]>(`${this.base}/leagues/search${q}`);
  }

  createLeague(name: string, description?: string, password?: string) {
    return this.http.post<League>(`${this.base}/leagues`, { name, description, password });
  }

  editLeague(id: string, name: string, description?: string, password?: string) {
    return this.http.put<League>(`${this.base}/leagues/${id}`, { name, description, password });
  }

  joinLeagueById(id: string, password?: string) {
    return this.http.post<League>(`${this.base}/leagues/${id}/join`, { password });
  }

  joinLeague(inviteCode: string, password?: string) {
    return this.http.post<League>(`${this.base}/leagues/join/${inviteCode}`, { password });
  }

  globalLeaderboard() {
    return this.http.get<LeaderboardEntry[]>(`${this.base}/leaderboard/global`);
  }

  leagueLeaderboard(leagueId: string) {
    return this.http.get<LeaderboardEntry[]>(`${this.base}/leagues/${leagueId}/leaderboard`);
  }

  nextSession(): Observable<NextSession> {
    return this.http.get<NextSession>(`${this.base}/sessions/next`).pipe(
      switchMap(backendSession => {
        return this.http.get<any>('https://api.jolpi.ca/ergast/f1/current/next.json').pipe(
          map(jolpicaData => {
            const jolpicaMapped = this.mapJolpicaNextSession(jolpicaData);
            return {
              ...jolpicaMapped,
              id: backendSession.id || jolpicaMapped.id,
              name: backendSession.name || jolpicaMapped.name,
              circuit: backendSession.circuit || jolpicaMapped.circuit,
              matchupDriver1: backendSession.matchupDriver1 || 'norris',
              matchupDriver2: backendSession.matchupDriver2 || 'verstappen',
            };
          }),
          catchError(() => of(backendSession))
        );
      }),
      catchError(() => {
        return this.http.get<any>('https://api.jolpi.ca/ergast/f1/current/next.json').pipe(
          map(data => this.mapJolpicaNextSession(data))
        );
      })
    );
  }

  private mapJolpicaNextSession(data: any): NextSession {
    const race = data?.MRData?.RaceTable?.Races?.[0];
    if (!race) {
      throw new Error('No race found in Jolpica');
    }
    const fp1 = race.FirstPractice ? `${race.FirstPractice.date}T${race.FirstPractice.time}` : null;
    const fp2 = race.SecondPractice ? `${race.SecondPractice.date}T${race.SecondPractice.time}` : null;
    const fp3 = race.ThirdPractice ? `${race.ThirdPractice.date}T${race.ThirdPractice.time}` : null;
    const sprint = race.Sprint ? `${race.Sprint.date}T${race.Sprint.time}` : null;
    const sprintQualifying = race.SprintQualifying ? `${race.SprintQualifying.date}T${race.SprintQualifying.time}` : null;
    const qualifying = race.Qualifying ? `${race.Qualifying.date}T${race.Qualifying.time}` : null;
    const startsAt = race.time ? `${race.date}T${race.time}` : `${race.date}T14:00:00Z`;
    const roundNum = parseInt(race.round, 10);
    const id = roundNum === 18 ? this.ROUND_18_UUID : `jolpica-${race.season}-${race.round}`;

    return {
      id,
      season: parseInt(race.season, 10),
      round: roundNum,
      name: race.raceName,
      circuit: race.Circuit?.circuitName || 'Circuit of the Americas',
      type: 'RACE',
      raceDate: race.date,
      startsAt,
      isLocked: new Date() > new Date(startsAt),
      matchupDriver1: 'norris',
      matchupDriver2: 'verstappen',
      circuitId: race.Circuit?.circuitId || 'americas',
      locality: race.Circuit?.Location?.locality || 'Austin',
      country: race.Circuit?.Location?.country || 'USA',
      fp1,
      fp2,
      fp3,
      qualifying,
      sprint,
      sprintQualifying,
      lat: race.Circuit?.Location?.lat || '30.1328',
      long: race.Circuit?.Location?.long || '-97.6411'
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

  currentPrediction() {
    return this.http.get<PredictionDetail>(`${this.base}/predictions/current`);
  }

  predictionHistory() {
    return this.http.get<PredictionHistoryItem[]>(`${this.base}/predictions/history`);
  }

  submitPrediction(sessionId: string, prediction: SubmitPrediction) {
    return this.http.post<PredictionDetail>(`${this.base}/predictions/session/${sessionId}`, prediction);
  }

  adminStatus() {
    return this.http.get<{ status: string }>(`${this.base}/admin/status`);
  }
}
