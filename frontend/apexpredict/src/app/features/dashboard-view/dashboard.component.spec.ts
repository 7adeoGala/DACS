import { TestBed } from '@angular/core/testing';
import { of, Subject } from 'rxjs';
import { signal } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { ApiService } from '../../core/services/api.service';
import { AuthService } from '../../core/auth/auth.service';
import { League } from '../../core/models/api.models';
import { DashboardComponent } from './dashboard.component';

describe('Formulario de ligas', () => {
  function setup() {
    const created = new Subject<League>();
    const api = {
      profile: vi.fn(() => of({ id: 'player', displayName: 'Jugador', email: null })),
      leagues: vi.fn(() => of([])),
      createLeague: vi.fn(() => created),
      nextSession: vi.fn(() => of(null)),
      currentPrediction: vi.fn(() => of(null)),
      submitPrediction: vi.fn(() => of({})),
      globalLeaderboard: vi.fn(() => of([])),
      predictionHistory: vi.fn(() => of([])),
      leagueLeaderboard: vi.fn(() => of([])),
      jolpicaDriverStandings: vi.fn(() => of([])),
      jolpicaConstructorStandings: vi.fn(() => of([])),
      getCachedPrediction: vi.fn(() => null),
      setCachedPrediction: vi.fn(),
      getCachedLeagues: vi.fn(() => null),
      setCachedLeagues: vi.fn()
    };
    const auth = {
      username: signal('player'),
      authenticated: signal(true),
      userPoints: signal(0)
    };
    const route = {
      snapshot: { paramMap: { get: () => null } },
      queryParamMap: of({ get: () => 'ligas' })
    };

    TestBed.configureTestingModule({
      providers: [
        { provide: ApiService, useValue: api },
        { provide: AuthService, useValue: auth },
        { provide: ActivatedRoute, useValue: route }
      ]
    });
    const fixture = TestBed.createComponent(DashboardComponent);
    fixture.detectChanges();
    fixture.componentInstance.activeTab.set('ligas');
    fixture.componentInstance.leagueSubTab.set('create');
    fixture.detectChanges();
    return { fixture, api, created };
  }

  it('envia el nombre y actualiza la lista con la liga devuelta por la API', () => {
    const { fixture, api, created } = setup();
    const comp = fixture.componentInstance;
    comp.newLeagueName = '  Liga del paddock  ';
    comp.createLeague();
    expect(api.createLeague).toHaveBeenCalledWith('Liga del paddock', undefined, undefined);

    // Un segundo envio mientras espera la respuesta no duplica la peticion
    comp.createLeague();
    expect(api.createLeague).toHaveBeenCalledTimes(1);

    created.next({ id: 'league-1', name: 'Liga del paddock' });
    fixture.detectChanges();
    expect(comp.myLeagues().some(l => l.id === 'league-1')).toBe(true);
    expect(comp.selectedLeague()?.id).toBe('league-1');
    expect(comp.newLeagueName).toBe('');
  });

  it('no envia un nombre vacio o compuesto solo por espacios', () => {
    const { fixture, api } = setup();
    const comp = fixture.componentInstance;
    comp.newLeagueName = '   ';
    comp.createLeague();
    expect(api.createLeague).not.toHaveBeenCalled();
  });

  it('permite guardar predicciones incompletas o con posiciones vacias', () => {
    const { fixture, api } = setup();
    const comp = fixture.componentInstance;
    comp.activeTab.set('pronostico');

    // Inicialmente vacio: canSavePrediction es true (permite guardar predicciones vacias)
    expect(comp.canSavePrediction()).toBe(true);

    // Selecciona solo P1
    comp.p1DriverId.set('norris');
    expect(comp.canSavePrediction()).toBe(true);
    comp.savePrediction();

    expect(api.submitPrediction).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({
        podium: ['norris', '', ''],
        polePositionDriverId: null,
        duelDriverPick: null
      }),
      'player'
    );
  });

  it('permite guardar predicciones completamente vacias', () => {
    const { fixture, api } = setup();
    const comp = fixture.componentInstance;
    comp.activeTab.set('pronostico');
    comp.p1DriverId.set('');
    comp.p2DriverId.set('');
    comp.p3DriverId.set('');

    expect(comp.canSavePrediction()).toBe(true);
    comp.savePrediction();

    expect(api.submitPrediction).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({
        podium: [],
        polePositionDriverId: null,
        duelDriverPick: null
      }),
      'player'
    );
  });
});

