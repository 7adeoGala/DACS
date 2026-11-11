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
});
