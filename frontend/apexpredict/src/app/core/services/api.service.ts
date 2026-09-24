import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment';
import { Finish, League, Profile, Race } from '../models/api.models';

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
  createLeague(name: string) {
    return this.http.post<League>(`${this.base}/leagues`, { name });
  }
  adminStatus() {
    return this.http.get<{ status: string }>(`${this.base}/admin/status`);
  }
}
