import type { Routes } from '@angular/router';
import { rolGuard } from './core/rol.guard';

export const routes: Routes = [
  { path: '', pathMatch: 'full', redirectTo: 'solicitudes/nueva' },
  {
    path: 'rol',
    loadComponent: () => import('./features/rol-selector/rol-selector').then((m) => m.RolSelector),
  },
  {
    path: 'solicitudes/nueva',
    canActivate: [rolGuard],
    loadComponent: () => import('./features/nueva-solicitud/nueva-solicitud').then((m) => m.NuevaSolicitud),
  },
];
