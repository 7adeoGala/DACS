import { Component, inject, signal } from '@angular/core';
import { RouterOutlet, Router, NavigationEnd } from '@angular/router';
import { AuthService } from './core/auth/auth.service';
import { ApiService } from './core/services/api.service';
import { NavbarComponent } from './shared/components/navbar/navbar.component';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, NavbarComponent],
  templateUrl: './app.component.html',
})
export class App {
  readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  private readonly api = inject(ApiService);
  readonly isAuthRoute = signal(false);

  constructor() {
    this.router.events.subscribe((event) => {
      if (event instanceof NavigationEnd) {
        const url = event.urlAfterRedirects || event.url;
        this.isAuthRoute.set(url.startsWith('/login') || url.startsWith('/register'));
      }
    });

    // Despertar todos los microservicios (Keycloak, BFF, Domain, Connector) inmediatamente
    this.api.wakeServices();

    // Mantener todos los microservicios activos mientras la app esté abierta (cada 3 minutos)
    if (typeof window !== 'undefined') {
      setInterval(() => {
        this.api.wakeServices();
      }, 3 * 60 * 1000);
    }
  }
}
