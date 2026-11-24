import { TestBed } from '@angular/core/testing';
import { of, throwError } from 'rxjs';
import { vi } from 'vitest';
import { AdminComponent } from './admin.component';
import { ApiService } from '../../core/services/api.service';

describe('AdminComponent', () => {
  it('carga sesiones y permite sincronizar calendario y calcular puntajes cuando el acceso admin esta confirmado', () => {
    const apiStub = {
      adminStatus: vi.fn(() => of({ status: 'authorized' })),
      adminUsers: vi.fn(() =>
        of([
          {
            id: 'u1',
            displayName: 'Piloto1',
            email: 'p1@example.com',
            firstName: 'Juan',
            lastName: 'Perez',
            country: 'Argentina',
            favoriteTeamId: 'ferrari',
            favoriteDriverId: 'leclerc',
            notificationsEnabled: true,
            totalScore: 19,
            predictionsCount: 3,
          },
        ])
      ),
      adminSessions: vi.fn(() =>
        of([
          {
            id: 's1',
            season: 2026,
            round: 20,
            name: 'Sao Paulo Grand Prix',
            circuit: 'Interlagos',
            raceDate: '2026-11-08',
            startsAt: '2026-11-08T17:00:00Z',
            isLocked: true,
            hasOfficialResult: true,
            predictionsCount: 5,
            scoredCount: 5,
          },
        ])
      ),
      syncSessions: vi.fn(() =>
        of({ season: 2026, sessionsAdded: 2, resultsSynced: 1, status: 'SUCCESS' })
      ),
      scoreSession: vi.fn(() => of([])),
      sendSessionReminders: vi.fn(() =>
        of({ sessionId: 's1', remindersSent: 3, status: 'SUCCESS' })
      ),
    };

    TestBed.configureTestingModule({
      imports: [AdminComponent],
      providers: [{ provide: ApiService, useValue: apiStub }],
    });

    const fixture = TestBed.createComponent(AdminComponent);
    const component = fixture.componentInstance;
    fixture.detectChanges();

    expect(component.isAuthorized()).toBe(true);
    expect(component.sessions().length).toBe(1);
    expect(component.users().length).toBe(1);
    expect(component.users()[0].displayName).toBe('Piloto1');

    component.syncCalendarAndResults();
    expect(apiStub.syncSessions).toHaveBeenCalledTimes(1);
    expect(component.actionSuccess()).toContain('2 sesiones nuevas');

    component.scoreSession(component.sessions()[0]);
    expect(apiStub.scoreSession).toHaveBeenCalledWith('s1');
  });

  it('muestra error de autorizacion cuando adminStatus falla', () => {
    const apiStub = {
      adminStatus: vi.fn(() => throwError(() => ({ status: 403 }))),
      adminSessions: vi.fn(() => of([])),
    };

    TestBed.configureTestingModule({
      imports: [AdminComponent],
      providers: [{ provide: ApiService, useValue: apiStub }],
    });

    const fixture = TestBed.createComponent(AdminComponent);
    const component = fixture.componentInstance;
    fixture.detectChanges();

    expect(component.isAuthorized()).toBe(false);
    expect(component.status()).toContain('No pudimos confirmar el acceso');
    expect(apiStub.adminSessions).not.toHaveBeenCalled();
  });
});
