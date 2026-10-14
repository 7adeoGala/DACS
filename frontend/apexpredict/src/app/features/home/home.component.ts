import { Component, inject, OnInit, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { ApiService } from '../../core/services/api.service';
import { AuthService } from '../../core/auth/auth.service';
import { Race } from '../../core/models/api.models';

@Component({
  standalone: true,
  selector: 'app-home',
  imports: [DatePipe],
  template: `
    <section class="hero">
      <div class="hero-copy">
        <p class="eyebrow"><span class="red-dot"></span> FORMULA 1 · TEMPORADA {{ season }}</p>
        <h1>La carrera empieza<br />con tu <em>prediccion.</em></h1>
        <p class="lead">
          Arma tu liga. Comparte la pasion por la Formula 1.<br />Cada fin de semana, una nueva
          historia.
        </p>
        <div class="hero-actions">
          <button class="button" [disabled]="!auth.available()" (click)="auth.login()">
            Entrar a mis ligas <span aria-hidden="true">→</span>
          </button>
          @if (!auth.authenticated()) {
            <button class="button quiet" [disabled]="!auth.available()" (click)="auth.register()">
              Crear cuenta
            </button>
          }
        </div>
      </div>
      <div class="track-art" aria-hidden="true">
        <svg viewBox="0 0 440 310">
          <path
            d="M90 220 L56 122 Q45 72 110 62 L284 45 Q353 39 377 82 Q405 126 357 147 L271 164 Q242 170 251 192 L273 241 Q280 262 250 265 L152 272 Q108 273 90 220Z"
          />
          <path class="track-accent" d="M90 220 L56 122 Q45 72 110 62" />
          <circle cx="60" cy="126" r="7" /></svg
        ><span>LIGHTS OUT. GAME ON.</span>
      </div>
    </section>
    <section class="section" aria-labelledby="calendar-title">
      <div class="section-heading">
        <div>
          <p class="eyebrow">EL MUNDO ES EL CIRCUITO</p>
          <h2 id="calendar-title">Calendario {{ season }}</h2>
        </div>
        <span class="muted">{{ races().length }} grandes premios</span>
      </div>
      @if (loading()) {
        <p role="status" class="empty">Cargando calendario…</p>
      } @else if (error()) {
        <div class="notice error" role="alert">
          {{ error() }} <button class="text-button" (click)="load()">Reintentar</button>
        </div>
      } @else if (!races().length) {
        <p class="empty">El calendario de esta temporada todavia no esta publicado.</p>
      } @else {
        <div class="race-grid">
          @for (race of races(); track race.round) {
            <article class="race-card">
              <div class="race-top">
                <span class="eyebrow">RONDA {{ race.round.toString().padStart(2, '0') }}</span
                ><span class="race-date">{{ race.date | date: 'dd MMM' : 'UTC' }}</span>
              </div>
              <p class="country">{{ race.country }}</p>
              <h3>{{ race.name }}</h3>
              <p class="muted">{{ race.circuit }}</p>
              <div class="race-bottom">
                <span>{{
                  race.startsAt
                    ? (race.startsAt | date: 'HH:mm' : 'UTC') + ' UTC'
                    : 'Horario por confirmar'
                }}</span
                ><span aria-hidden="true">↗</span>
              </div>
            </article>
          }
        </div>
      }
    </section>
  `,
})
export class HomeComponent implements OnInit {
  private readonly api = inject(ApiService);
  readonly auth = inject(AuthService);
  readonly season = new Date().getUTCFullYear();
  readonly races = signal<Race[]>([]);
  readonly loading = signal(true);
  readonly error = signal('');
  ngOnInit() {
    this.load();
  }
  load() {
    this.loading.set(true);
    this.error.set('');
    this.api.calendar(this.season).subscribe({
      next: (races) => {
        this.races.set(races);
        this.loading.set(false);
      },
      error: () => {
        this.error.set('No pudimos cargar el calendario. Intenta nuevamente.');
        this.loading.set(false);
      },
    });
  }
}
