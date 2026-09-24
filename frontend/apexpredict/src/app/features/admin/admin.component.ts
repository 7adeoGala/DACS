import { Component, inject, OnInit, signal } from '@angular/core';
import { ApiService } from '../../core/services/api.service';
@Component({
  standalone: true,
  selector: 'app-admin',
  template: `
    <section class="section page">
      <p class="eyebrow">GESTION DE TEMPORADA</p>
      <h1>Administracion</h1>
      <p class="lead" role="status">{{ status() }}</p>
    </section>
  `,
})
export class AdminComponent implements OnInit {
  private readonly api = inject(ApiService);
  readonly status = signal('Verificando tu acceso…');
  ngOnInit() {
    this.api.adminStatus().subscribe({
      next: () => this.status.set('Tu acceso de administrador esta confirmado.'),
      error: () =>
        this.status.set(
          'No pudimos confirmar el acceso. Inicia sesion con una cuenta de administrador.',
        ),
    });
  }
}
