import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, map } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class JolpicaF1Service {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = 'https://api.jolpi.ca/ergast/f1';

  getNextRace(): Observable<any> {
    return this.http.get<any>(`${this.baseUrl}/current/next.json`).pipe(
      map(res => res?.MRData?.RaceTable?.Races?.[0])
    );
  }

  getDriverStandings(): Observable<any[]> {
    return this.http.get<any>(`${this.baseUrl}/current/driverStandings.json`).pipe(
      map(res => res?.MRData?.StandingsTable?.StandingsLists?.[0]?.DriverStandings || [])
    );
  }

  /**
   * Convierte cualquier string UTC recibido a Hora de Argentina con sufijo oficial
   */
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
