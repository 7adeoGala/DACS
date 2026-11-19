import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

@Injectable({ providedIn: 'root' })
export class JolpicaF1Service {
  private readonly http = inject(HttpClient);
  private readonly bffUrl = environment.apiUrl;

  getNextRace(): Observable<any> {
    return this.http.get<any>(`${this.bffUrl}/f1/next`);
  }

  getDriverStandings(): Observable<any[]> {
    return this.http.get<any[]>(`${this.bffUrl}/f1/standings/drivers`);
  }

  formatToArgTime(dateStr: string, timeStr?: string): string {
    if (!dateStr) return '--:-- hs (Arg)';
    const isoString = timeStr ? `${dateStr}T${timeStr}` : dateStr;
    const date = new Date(isoString);
    return (
      new Intl.DateTimeFormat('es-AR', {
        timeZone: 'America/Argentina/Buenos_Aires',
        weekday: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        hour12: false
      }).format(date) + ' hs (Arg)'
    );
  }
}
