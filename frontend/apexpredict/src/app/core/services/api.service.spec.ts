import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { firstValueFrom } from 'rxjs';
import { environment } from '../../../environments/environment';
import { ApiService } from './api.service';

describe('ApiService (BFF-only integration)', () => {
  let service: ApiService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    service = TestBed.inject(ApiService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => httpMock.verify());

  it('consulta el puntaje calculado del Prode exclusivamente a través del BFF', async () => {
    const promise = firstValueFrom(service.getProdeScore(2026, 19));

    const req = httpMock.expectOne(`${environment.apiUrl}/scores/me/2026/19`);
    expect(req.request.method).toBe('GET');
    req.flush({
      season: 2026,
      round: 19,
      sessionName: 'Mexico City Grand Prix',
      hasPrediction: true,
      hasOfficialResults: true,
      totalPoints: 19,
      breakdown: null,
      officialResults: null,
    });

    const res = await promise;
    expect(res.totalPoints).toBe(19);
    expect(res.season).toBe(2026);
  });

  it('obtiene standings F1 únicamente mediante el BFF sin llamadas directas a Jolpica', async () => {
    const promise = firstValueFrom(service.jolpicaDriverStandings());

    const req = httpMock.expectOne(`${environment.apiUrl}/f1/standings/drivers`);
    expect(req.request.method).toBe('GET');
    req.flush([{ position: '1', points: '350', wins: '6', driverId: 'antonelli', code: 'ANT', name: 'Kimi Antonelli', nationality: 'Italian', team: 'Mercedes' }]);

    const standings = await promise;
    expect(standings.length).toBe(1);
    expect(standings[0].driverId).toBe('antonelli');
  });

  it('no reintenta 502 en estadisticas de piloto y evita cachear permanentemente el fallback fallido', async () => {
    const firstPromise = firstValueFrom(service.getDynamicDriverStats('perez'));
    const firstReq = httpMock.expectOne(`${environment.apiUrl}/f1/drivers/perez/stats`);
    firstReq.flush({ status: 502, code: 'conector_502' }, { status: 502, statusText: 'Bad Gateway' });

    const fallback = await firstPromise;
    expect(fallback.driverId).toBe('perez');
    expect(fallback.points).toBe(0);
    expect(fallback.standingPosition).toBe('-');

    const secondPromise = firstValueFrom(service.getDynamicDriverStats('perez'));
    const secondReq = httpMock.expectOne(`${environment.apiUrl}/f1/drivers/perez/stats`);
    secondReq.flush({
      driverId: 'perez',
      nationality: 'Mexican',
      points: 12,
      standingPosition: 'P14',
      wins: 0,
      podiums: 0,
      poles: 0,
      fastestLaps: 0,
      dnfs: 1,
      racesCount: 10,
      bestFinish: 'P7',
      careerWins: 6,
      careerPoles: 4,
      careerStarts: 304,
      seasonResults: []
    });

    const recovered = await secondPromise;
    expect(recovered.points).toBe(12);
    expect(recovered.standingPosition).toBe('P14');
    expect(recovered.careerWins).toBe(6);
  });

  it('omite /sessions/next en modo invitado para evitar 401 y consulta directo /f1/next', async () => {
    const promise = firstValueFrom(service.nextSession(false));

    httpMock.expectNone(`${environment.apiUrl}/sessions/next`);
    const req = httpMock.expectOne(`${environment.apiUrl}/f1/next`);
    expect(req.request.method).toBe('GET');
    req.flush({
      season: 2026,
      round: 22,
      name: 'Qatar Grand Prix',
      circuit: 'Losail International Circuit',
      circuitId: 'losail',
      raceDate: '2026-11-29',
      startsAt: '2026-11-29T16:00:00Z',
    });

    const session = await promise;
    expect(session.round).toBe(22);
    expect(session.name).toBe('Qatar Grand Prix');
  });

  it('wakeServices despierta BFF directo con /ping y activa los servicios de Render sin /conectorping', () => {
    const originalFetch = globalThis.fetch;
    const originalWakeUrls = [...environment.renderWakeUrls];
    const fetchSpy = vi.fn(() => Promise.resolve(new Response()));
    globalThis.fetch = fetchSpy as unknown as typeof fetch;
    environment.renderWakeUrls.splice(
      0,
      environment.renderWakeUrls.length,
      'https://dacs-f0st.onrender.com/backend/ping',
      'https://dacs-1-jpud.onrender.com/conector/ping'
    );

    try {
      service.wakeServices();
      const pingReq = httpMock.expectOne(`${environment.apiUrl}/ping`);
      pingReq.flush({ status: 'UP' });
      httpMock.expectNone(`${environment.apiUrl}/backendping`);
      httpMock.expectNone(`${environment.apiUrl}/conectorping`);
      expect(fetchSpy).toHaveBeenCalledWith(
        'https://dacs-f0st.onrender.com/backend/ping',
        expect.objectContaining({ mode: 'no-cors' })
      );
      expect(fetchSpy).toHaveBeenCalledWith(
        'https://dacs-1-jpud.onrender.com/conector/ping',
        expect.objectContaining({ mode: 'no-cors' })
      );
    } finally {
      environment.renderWakeUrls.splice(0, environment.renderWakeUrls.length, ...originalWakeUrls);
      globalThis.fetch = originalFetch;
    }
  });
});
