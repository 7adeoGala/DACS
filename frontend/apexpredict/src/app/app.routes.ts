import { Routes } from '@angular/router';
import { requireRole } from './core/auth/require-role.guard';
export const routes: Routes = [
  {
    path: '',
    title: 'ApexPredict — GP Actual & Telemetría',
    loadComponent: () =>
      import('./features/home/gp-spotlight.component').then((m) => m.GpSpotlightComponent),
  },
  {
    path: 'dashboard',
    title: 'Mis ligas · ApexPredict',
    canActivate: [requireRole('player', 'admin')],
    loadComponent: () =>
      import('./features/dashboard-view/dashboard.component').then((m) => m.DashboardComponent),
  },
  {
    path: 'join/:inviteCode',
    title: 'Unirse a Liga · ApexPredict',
    canActivate: [requireRole('player', 'admin')],
    loadComponent: () =>
      import('./features/dashboard-view/dashboard.component').then((m) => m.DashboardComponent),
  },
  {
    path: 'admin',
    title: 'Administracion · ApexPredict',
    canActivate: [requireRole('admin')],
    loadComponent: () => import('./features/admin/admin.component').then((m) => m.AdminComponent),
  },
  {
    path: 'forbidden',
    title: 'Acceso restringido · ApexPredict',
    loadComponent: () =>
      import('./features/forbidden/forbidden.component').then((m) => m.ForbiddenComponent),
  },
  { path: '**', redirectTo: '' },
];
