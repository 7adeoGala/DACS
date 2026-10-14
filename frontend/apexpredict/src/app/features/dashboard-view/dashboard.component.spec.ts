import { TestBed } from '@angular/core/testing';
import { of, Subject } from 'rxjs';
import { ApiService } from '../../core/services/api.service';
import { League } from '../../core/models/api.models';
import { DashboardComponent } from './dashboard.component';

describe('Formulario de ligas', () => {
  function setup() {
    const created = new Subject<League>();
    const api = {
      profile: vi.fn(() => of({ id: 'player', displayName: 'Jugador', email: null })),
      leagues: vi.fn(() => of([])),
      createLeague: vi.fn(() => created),
    };
    TestBed.configureTestingModule({ providers: [{ provide: ApiService, useValue: api }] });
    const fixture = TestBed.createComponent(DashboardComponent);
    fixture.detectChanges();
    const input: HTMLInputElement = fixture.nativeElement.querySelector('input');
    const form: HTMLFormElement = fixture.nativeElement.querySelector('form');
    return { fixture, input, form, api, created };
  }

  it('envia el nombre sin navegar y muestra la liga devuelta por la API', () => {
    const { fixture, input, form, api, created } = setup();
    input.value = '  Liga del paddock  ';
    input.dispatchEvent(new Event('input', { bubbles: true }));
    fixture.detectChanges();
    const submit = new Event('submit', { bubbles: true, cancelable: true });
    form.dispatchEvent(submit);
    expect(submit.defaultPrevented).toBe(true);
    expect(api.createLeague).toHaveBeenCalledWith('Liga del paddock');
    // Un segundo envio mientras espera la respuesta no duplica la peticion.
    form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
    expect(api.createLeague).toHaveBeenCalledTimes(1);
    created.next({ id: 'league-1', name: 'Liga del paddock' });
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('h2').textContent).toBe('Liga del paddock');
    expect(input.value).toBe('');
  });

  it('no envia un nombre vacio o compuesto solo por espacios', () => {
    const { fixture, input, form, api } = setup();
    input.value = '   ';
    input.dispatchEvent(new Event('input', { bubbles: true }));
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('button').disabled).toBe(true);
    form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
    expect(api.createLeague).not.toHaveBeenCalled();
  });
});
