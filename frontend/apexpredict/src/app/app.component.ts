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

    // Despertar backend inmediatamente al cargar la app
    this.api.pingBackend().subscribe();

    // Mantener backend despierto mientras el usuario tenga la aplicación abierta (cada 5 minutos)
    if (typeof window !== 'undefined') {
      setInterval(() => {
        this.api.pingBackend().subscribe();
      }, 5 * 60 * 1000);
    }
  }
}
