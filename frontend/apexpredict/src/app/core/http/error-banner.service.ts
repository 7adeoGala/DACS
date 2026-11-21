import { Injectable, signal } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class ErrorBannerService {
  readonly message = signal<string | null>(null);
  private dismissTimer: ReturnType<typeof setTimeout> | null = null;

  show(msg: string, autoDismissMs = 7000): void {
    this.message.set(msg);
    if (this.dismissTimer) {
      clearTimeout(this.dismissTimer);
      this.dismissTimer = null;
    }
    if (autoDismissMs > 0) {
      this.dismissTimer = setTimeout(() => {
        this.message.set(null);
        this.dismissTimer = null;
      }, autoDismissMs);
    }
  }

  dismiss(): void {
    if (this.dismissTimer) {
      clearTimeout(this.dismissTimer);
      this.dismissTimer = null;
    }
    this.message.set(null);
  }
}
