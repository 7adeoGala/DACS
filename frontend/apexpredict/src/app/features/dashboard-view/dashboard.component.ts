import { Component, inject, OnInit, signal } from '@angular/core';
import { FormControl, ReactiveFormsModule, Validators } from '@angular/forms';
import { switchMap } from 'rxjs';
import { ApiService } from '../../core/services/api.service';
import { League } from '../../core/models/api.models';

@Component({
  standalone: true,
  selector: 'app-dashboard',
  imports: [ReactiveFormsModule],
  template: `
    <section class="section page">
      <p class="eyebrow">TU COMUNIDAD EN LA PARRILLA</p>
      <h1>Mis ligas</h1>
      <p class="lead">Un lugar para compartir cada gran premio.</p>
      @if (loading()) {
        <p role="status">Cargando tus ligas…</p>
      }
      @if (error()) {
        <p class="notice error" role="alert">{{ error() }}</p>
      }
      @if (!loading() && ready()) {
        <form class="create-league" (ngSubmit)="create()">
          <label for="league-name">Nombre de la nueva liga</label>
          <div>
            <input
              id="league-name"
              [formControl]="name"
              maxlength="100"
              placeholder="Por ejemplo, La ultima curva"
              required
            /><button class="button" type="submit" [disabled]="name.invalid || saving()">
              {{ saving() ? 'Creando…' : 'Crear liga' }}
            </button>
          </div>
        </form>
        <div class="race-grid">
          @for (league of leagues(); track league.id) {
            <article class="race-card">
              <p class="eyebrow">LIGA</p>
              <h2>{{ league.name }}</h2>
            </article>
          } @empty {
            <p class="empty">Todavia no perteneces a ninguna liga. Crea la primera para empezar.</p>
          }
        </div>
      }
    </section>
  `,
})
export class DashboardComponent implements OnInit {
  private readonly api = inject(ApiService);
  readonly name = new FormControl('', {
    nonNullable: true,
    validators: [Validators.required, Validators.maxLength(100), Validators.pattern(/\S/)],
  });
  readonly leagues = signal<League[]>([]);
  readonly loading = signal(true);
  readonly saving = signal(false);
  readonly ready = signal(false);
  readonly error = signal('');
  ngOnInit() {
    this.api
      .profile()
      .pipe(switchMap(() => this.api.leagues()))
      .subscribe({
        next: (leagues) => {
          this.leagues.set(leagues);
          this.loading.set(false);
          this.ready.set(true);
        },
        error: () => {
          this.loading.set(false);
          this.error.set('No pudimos cargar tu perfil. Reintenta iniciando sesion.');
        },
      });
  }
  create() {
    if (this.name.invalid || this.saving()) return;
    this.saving.set(true);
    this.error.set('');
    this.api.createLeague(this.name.value.trim()).subscribe({
      next: (league) => {
        this.leagues.update((leagues) => [league, ...leagues]);
        this.name.reset();
        this.saving.set(false);
      },
      error: () => {
        this.saving.set(false);
        this.error.set('No pudimos crear la liga. Intenta nuevamente.');
      },
    });
  }
}
