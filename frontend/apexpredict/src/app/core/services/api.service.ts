import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment';
import {
  Finish,
  League,
  Profile,
  Race,
  NextSession,
  PredictionDetail,
  SubmitPrediction,
  LeaderboardEntry
} from '../models/api.models';

@Injectable({ providedIn: 'root' })
export class ApiService {
  private readonly http = inject(HttpClient);
  private readonly base = environment.apiUrl;

  calendar(season: number) {
    return this.http.get<Race[]>(`${this.base}/calendar/${season}`);
  }

  results(season: number, round: number) {
    return this.http.get<Finish[]>(`${this.base}/results/${season}/${round}`);
  }

  profile() {
    return this.http.put<Profile>(`${this.base}/me`, {});
  }

  leagues() {
    return this.http.get<League[]>(`${this.base}/leagues`);
  }

  createLeague(name: string, description?: string) {
    return this.http.post<League>(`${this.base}/leagues`, { name, description });
  }

  editLeague(id: string, name: string, description?: string) {
    return this.http.put<League>(`${this.base}/leagues/${id}`, { name, description });
  }

  joinLeague(inviteCode: string) {
    return this.http.post<League>(`${this.base}/leagues/join/${inviteCode}`, {});
  }

  globalLeaderboard() {
    return this.http.get<LeaderboardEntry[]>(`${this.base}/leaderboard/global`);
  }

  leagueLeaderboard(leagueId: string) {
    return this.http.get<LeaderboardEntry[]>(`${this.base}/leagues/${leagueId}/leaderboard`);
  }

  nextSession() {
    return this.http.get<NextSession>(`${this.base}/sessions/next`);
  }

  currentPrediction() {
    return this.http.get<PredictionDetail>(`${this.base}/predictions/current`);
  }

  submitPrediction(sessionId: string, prediction: SubmitPrediction) {
    return this.http.post<PredictionDetail>(`${this.base}/predictions/session/${sessionId}`, prediction);
  }

  adminStatus() {
    return this.http.get<{ status: string }>(`${this.base}/admin/status`);
  }
}
