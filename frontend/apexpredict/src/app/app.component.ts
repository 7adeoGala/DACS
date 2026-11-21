import { Component, inject, signal } from '@angular/core';
import { RouterOutlet, Router, NavigationEnd } from '@angular/router';
import { AuthService } from './core/auth/auth.service';
import { ApiService } from './core/services/api.service';
import { ErrorBannerService } from './core/http/error-banner.service';
import { NavbarComponent } from './shared/components/navbar/navbar.component';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, NavbarComponent],
  templateUrl: './app.component.html',
})
export class App {
  readonly auth = inject(AuthService);
  readonly errorBanner = inject(ErrorBannerService);
  private readonly router = inject(Router);
  private readonly api = inject(ApiService);
  readonly isAuthRoute = signal(false);

  constructor() {
    this.router.events.subscribe((event) => {
      if (event instanceof NavigationEnd) {
        const url = event.urlAfterRedirects || event.url;
        this.isAuthRoute.set(
          url.startsWith('/login') ||
          url.startsWith('/register') ||
          url.startsWith('/forgot-password')
        );
      }
    });

    this.api.wakeServices();

    if (typeof window !== 'undefined' && typeof document !== 'undefined') {
      try {
        const link = (document.querySelector("link[rel*='icon']") as HTMLLinkElement) || document.createElement('link');
        link.type = 'image/svg+xml';
        link.rel = 'icon';
        link.href = 'favicon.svg?v=apex-original';
        document.head.appendChild(link);
      } catch {}

      setInterval(() => {
        this.api.wakeServices();
      }, 3 * 60 * 1000);
    }
  }
}
