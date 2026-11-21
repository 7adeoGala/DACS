import { CommonModule } from '@angular/common';
import { Component, inject, OnInit, signal } from '@angular/core';
import { ApiService } from '../../core/services/api.service';
import { AdminSessionView } from '../../core/models/api.models';

@Component({
  standalone: true,
  selector: 'app-admin',
  imports: [CommonModule],
  styles: [`
    .admin-shell {
      max-width: 1120px;
      margin: 2rem auto 3rem;
      padding: 0 1.25rem;
    }
    .admin-header {
      display: flex;
      justify-content: space-between;
      align-items: flex-end;
      flex-wrap: wrap;
      gap: 1rem;
      margin-bottom: 1.5rem;
    }
    .admin-card {
      background: #10141d;
      border: 1px solid rgba(255, 255, 255, 0.1);
      border-radius: 14px;
      padding: 1.5rem;
      margin-bottom: 1.5rem;
    }
    .admin-banner {
      padding: 0.85rem 1rem;
      border-radius: 8px;
      margin-bottom: 1rem;
      font-size: 0.9rem;
    }
    .admin-banner.success {
      background: rgba(16, 185, 129, 0.14);
      border: 1px solid rgba(16, 185, 129, 0.4);
      color: #6ee7b7;
    }
    .admin-banner.error {
      background: rgba(239, 68, 68, 0.14);
      border: 1px solid rgba(239, 68, 68, 0.4);
      color: #fca5a5;
    }
    .admin-table {
      width: 100%;
      border-collapse: collapse;
      font-size: 0.88rem;
    }
    .admin-table th, .admin-table td {
      text-align: left;
      padding: 0.75rem 0.65rem;
      border-bottom: 1px solid rgba(255, 255, 255, 0.08);
      vertical-align: middle;
    }
    .admin-table th {
      font-size: 0.72rem;
      letter-spacing: 0.06em;
      text-transform: uppercase;
      color: #94a3b8;
    }
    .status-pill {
      display: inline-block;
      padding: 2px 8px;
      border-radius: 999px;
      font-size: 0.72rem;
      font-weight: 700;
      font-family: var(--font-mono);
    }
    .status-pill.ready {
      background: rgba(16, 185, 129, 0.16);
      color: #34d399;
    }
    .status-pill.pending {
      background: rgba(245, 176, 0, 0.16);
      color: #fbbf24;
    }
    .status-pill.open {
      background: rgba(56, 189, 248, 0.16);
      color: #38bdf8;
    }
    .action-group {
      display: flex;
      gap: 0.5rem;
      flex-wrap: wrap;
    }
  `],
  template: `
    <section class="admin-shell">
      <div class="admin-header">
        <div>
          <p class="eyebrow">GESTION DE TEMPORADA</p>
          <h1>Panel de Administración</h1>
          <p class="lead" role="status">{{ status() }}</p>
        </div>
        @if (isAuthorized()) {
          <button
            type="button"
            class="button"
            [disabled]="isSyncing()"
            (click)="syncCalendarAndResults()">
            {{ isSyncing() ? 'Sincronizando con FIA…' : 'Sincronizar Calendario y Resultados' }}
          </button>
        }
      </div>

      @if (actionSuccess()) {
        <div class="admin-banner success" role="status">{{ actionSuccess() }}</div>
      }
      @if (actionError()) {
        <div class="admin-banner error" role="alert">{{ actionError() }}</div>
      }

      @if (isAuthorized()) {
        <div class="admin-card">
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1rem;">
            <h2 style="margin: 0; font-size: 1.15rem;">Sesiones y Grandes Premios ({{ sessions().length }})</h2>
            <button type="button" class="button small quiet" [disabled]="isLoadingSessions()" (click)="loadSessions()">
              {{ isLoadingSessions() ? 'Actualizando…' : 'Refrescar' }}
            </button>
          </div>

          @if (isLoadingSessions() && sessions().length === 0) {
            <p class="dim">Cargando sesiones registradas…</p>
          } @else if (sessions().length === 0) {
            <p class="dim">No hay sesiones cargadas. Usá el botón de sincronización para importar el calendario.</p>
          } @else {
            <div style="overflow-x: auto;">
              <table class="admin-table">
                <thead>
                  <tr>
                    <th>Ronda</th>
                    <th>Gran Premio</th>
                    <th>Lock Time (UTC)</th>
                    <th>Estado</th>
                    <th>Pronósticos</th>
                    <th>Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  @for (s of sessions(); track s.id) {
                    <tr>
                      <td><strong>{{ s.season }} R{{ s.round }}</strong></td>
                      <td>
                        <div style="color: #fff; font-weight: 600;">{{ s.name }}</div>
                        <div class="dim" style="font-size: 0.78rem;">{{ s.circuit }}</div>
                      </td>
                      <td style="font-family: var(--font-mono); font-size: 0.8rem;">
                        {{ s.startsAt ? (s.startsAt | date:'dd/MM/yyyy HH:mm':'UTC') : 'Sin fecha' }}
                      </td>
                      <td>
                        @if (s.hasOfficialResult) {
                          <span class="status-pill ready">RESULTADO OFICIAL</span>
                        } @else if (s.isLocked) {
                          <span class="status-pill pending">CERRADA / ESPERA FIA</span>
                        } @else {
                          <span class="status-pill open">ABIERTA</span>
                        }
                      </td>
                      <td style="font-family: var(--font-mono);">
                        {{ s.scoredCount }}/{{ s.predictionsCount }} puntuados
                      </td>
                      <td>
                        <div class="action-group">
                          <button
                            type="button"
                            class="button small"
                            [disabled]="!s.hasOfficialResult || busySessionId() === s.id"
                            (click)="scoreSession(s)">
                            {{ busySessionId() === s.id ? 'Procesando…' : 'Calcular Puntajes' }}
                          </button>
                          <button
                            type="button"
                            class="button small quiet"
                            [disabled]="s.isLocked || busySessionId() === s.id"
                            (click)="sendReminders(s)">
                            Enviar Recordatorios
                          </button>
                        </div>
                      </td>
                    </tr>
                  }
                </tbody>
              </table>
            </div>
          }
        </div>
      }
    </section>
  `,
})
export class AdminComponent implements OnInit {
  private readonly api = inject(ApiService);

  readonly status = signal('Verificando tu acceso…');
  readonly isAuthorized = signal(false);
  readonly sessions = signal<AdminSessionView[]>([]);
  readonly isLoadingSessions = signal(false);
  readonly isSyncing = signal(false);
  readonly busySessionId = signal<string | null>(null);
  readonly actionSuccess = signal('');
  readonly actionError = signal('');

  ngOnInit() {
    this.api.adminStatus().subscribe({
      next: () => {
        this.isAuthorized.set(true);
        this.status.set('Acceso de administrador confirmado.');
        this.loadSessions();
      },
      error: () => {
        this.isAuthorized.set(false);
        this.status.set(
          'No pudimos confirmar el acceso. Iniciá sesión con una cuenta de administrador.',
        );
      },
    });
  }

  loadSessions() {
    this.isLoadingSessions.set(true);
    this.api.adminSessions().subscribe({
      next: (list) => {
        this.sessions.set(list || []);
        this.isLoadingSessions.set(false);
      },
      error: (err) => {
        this.isLoadingSessions.set(false);
        this.actionError.set(err?.error?.description || 'No se pudieron cargar las sesiones.');
      },
    });
  }

  syncCalendarAndResults() {
    if (this.isSyncing()) return;
    this.isSyncing.set(true);
    this.actionError.set('');
    this.actionSuccess.set('');

    this.api.syncSessions().subscribe({
      next: (res) => {
        this.isSyncing.set(false);
        this.actionSuccess.set(
          `Sincronización temporada ${res.season} completada: ${res.sessionsAdded} sesiones nuevas, ${res.resultsSynced} resultados oficiales importados.`,
        );
        this.loadSessions();
      },
      error: (err) => {
        this.isSyncing.set(false);
        this.actionError.set(
          err?.error?.description || err?.error?.message || 'Error al sincronizar con el conector F1.',
        );
      },
    });
  }

  scoreSession(session: AdminSessionView) {
    if (this.busySessionId()) return;
    this.busySessionId.set(session.id);
    this.actionError.set('');
    this.actionSuccess.set('');

    this.api.scoreSession(session.id).subscribe({
      next: (scored) => {
        this.busySessionId.set(null);
        this.actionSuccess.set(
          `Cálculo completado para ${session.name}: ${scored.length} pronósticos puntuados.`,
        );
        this.loadSessions();
      },
      error: (err) => {
        this.busySessionId.set(null);
        this.actionError.set(
          err?.error?.message || err?.error?.description || `No se pudo puntuar ${session.name}.`,
        );
      },
    });
  }

  sendReminders(session: AdminSessionView) {
    if (this.busySessionId()) return;
    this.busySessionId.set(session.id);
    this.actionError.set('');
    this.actionSuccess.set('');

    this.api.sendSessionReminders(session.id).subscribe({
      next: (res) => {
        this.busySessionId.set(null);
        this.actionSuccess.set(
          `Recordatorios despachados para ${session.name}: ${res.remindersSent} usuarios notificados.`,
        );
      },
      error: (err) => {
        this.busySessionId.set(null);
        this.actionError.set(
          err?.error?.message || err?.error?.description || `No se pudieron enviar recordatorios para ${session.name}.`,
        );
      },
    });
  }
}
