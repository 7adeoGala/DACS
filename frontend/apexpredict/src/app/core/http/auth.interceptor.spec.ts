import { TestBed } from '@angular/core/testing';
import { HttpClient, provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { firstValueFrom } from 'rxjs';
import Keycloak from 'keycloak-js';
import { environment } from '../../../environments/environment';
import { authInterceptor } from './auth.interceptor';
import { secureApiTarget } from './api-url';

describe('authInterceptor', () => {
  const keycloak = {
    authenticated: true,
    token: 'signed-token',
    updateToken: vi.fn().mockResolvedValue(false),
  };
  beforeEach(() => {
    keycloak.authenticated = true;
    keycloak.updateToken.mockReset().mockResolvedValue(false);
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(withInterceptors([authInterceptor])),
        provideHttpClientTesting(),
        { provide: Keycloak, useValue: keycloak },
      ],
    });
  });
  afterEach(() => TestBed.inject(HttpTestingController).verify());
  it('eleva la URL de desarrollo a HTTPS conservando puerto, ruta y query', () => {
    expect(
      secureApiTarget('http://localhost:8080/api/leagues?q=1', 'http://localhost:8080/api'),
    ).toBe('https://localhost:8080/api/leagues?q=1');
  });
  it('refresca y envia JWT solo a la API', async () => {
    const result = firstValueFrom(TestBed.inject(HttpClient).get(`${environment.apiUrl}/leagues`));
    await Promise.resolve();
    const request = TestBed.inject(HttpTestingController).expectOne(
      `${environment.apiUrl.replace('http:', 'https:')}/leagues`,
    );
    expect(request.request.headers.get('Authorization')).toBe('Bearer signed-token');
    expect(keycloak.updateToken).toHaveBeenCalledWith(30);
    request.flush([]);
    await result;
  });
  it('no filtra JWT a dominios o rutas parecidas', async () => {
    for (const url of ['https://external.example/api', `${environment.apiUrl}-evil/leagues`]) {
      const result = firstValueFrom(TestBed.inject(HttpClient).get(url));
      const request = TestBed.inject(HttpTestingController).expectOne(url);
      expect(request.request.headers.has('Authorization')).toBe(false);
      request.flush({});
      await result;
    }
    expect(keycloak.updateToken).not.toHaveBeenCalled();
  });
  it('no envia solicitudes si falla la renovacion', async () => {
    keycloak.updateToken.mockRejectedValue(new Error('expired'));
    await expect(
      firstValueFrom(TestBed.inject(HttpClient).get(`${environment.apiUrl}/leagues`)),
    ).rejects.toThrow('expired');
    TestBed.inject(HttpTestingController).expectNone(`${environment.apiUrl}/leagues`);
  });
});
