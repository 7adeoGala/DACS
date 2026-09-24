import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';
@Component({
  standalone: true,
  selector: 'app-forbidden',
  imports: [RouterLink],
  template: `
    <section class="section page">
      <p class="eyebrow">ACCESO RESTRINGIDO</p>
      <h1>Esta zona requiere<br />otro permiso.</h1>
      <p class="lead">Tu cuenta no tiene el rol necesario para acceder a esta pantalla.</p>
      <a class="button" routerLink="/">Volver al calendario</a>
    </section>
  `,
})
export class ForbiddenComponent {}
