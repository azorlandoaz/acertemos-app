import type { Routes } from '@angular/router';
import { rolGuard } from './core/rol.guard';
import { listadoGuard } from './core/listado.guard';

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
  {
    path: 'solicitudes',
    canActivate: [rolGuard, listadoGuard],
    loadComponent: () =>
      import('./features/listado-solicitudes/listado-solicitudes').then((m) => m.ListadoSolicitudes),
  },
];
