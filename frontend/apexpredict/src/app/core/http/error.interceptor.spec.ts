import { TestBed } from '@angular/core/testing';
import { HttpClient, provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { errorInterceptor } from './error.interceptor';
import { ErrorBannerService } from './error-banner.service';

describe('errorInterceptor', () => {
  let http: HttpClient;
  let httpMock: HttpTestingController;
  let banner: ErrorBannerService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(withInterceptors([errorInterceptor])),
        provideHttpClientTesting(),
      ],
    });
    http = TestBed.inject(HttpClient);
    httpMock = TestBed.inject(HttpTestingController);
    banner = TestBed.inject(ErrorBannerService);
    banner.dismiss();
  });

  afterEach(() => {
    httpMock.verify();
    banner.dismiss();
  });

  it('muestra aviso global ante error 401', () => {
    http.get('/api/leagues').subscribe({ error: () => {} });
    httpMock.expectOne('/api/leagues').flush({}, { status: 401, statusText: 'Unauthorized' });
    expect(banner.message()).toContain('sesión expiró');
  });

  it('muestra descripcion del backend ante error 502', () => {
    http.get('/api/calendar/2026').subscribe({ error: () => {} });
    httpMock
      .expectOne('/api/calendar/2026')
      .flush({ description: 'Proveedor F1 temporalmente caido.' }, { status: 502, statusText: 'Bad Gateway' });
    expect(banner.message()).toBe('Proveedor F1 temporalmente caido.');
  });

  it('no interrumpe con banner global en pings silenciosos ni en 403 de Lock Time', () => {
    http.get('/api/backendping').subscribe({ error: () => {} });
    httpMock.expectOne('/api/backendping').flush({}, { status: 503, statusText: 'Service Unavailable' });
    expect(banner.message()).toBeNull();

    http.post('/api/predictions/session/123', {}).subscribe({ error: () => {} });
    httpMock
      .expectOne('/api/predictions/session/123')
      .flush({ message: 'Las predicciones para esta sesión se encuentran cerradas.' }, { status: 403, statusText: 'Forbidden' });
    expect(banner.message()).toBeNull();

    http.get('/api/f1/standings/drivers').subscribe({ error: () => {} });
    httpMock
      .expectOne('/api/f1/standings/drivers')
      .flush({}, { status: 429, statusText: 'Too Many Requests' });
    expect(banner.message()).toBeNull();

    http.get('/api/me').subscribe({ error: () => {} });
    httpMock
      .expectOne('/api/me')
      .flush({}, { status: 429, statusText: 'Too Many Requests' });
    expect(banner.message()).toBeNull();
  });
});
