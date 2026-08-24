import type { Routes } from '@angular/router';

export const routes: Routes = [
  {
    path: 'rol',
    loadComponent: () => import('./features/rol-selector/rol-selector').then((m) => m.RolSelector),
  },
];
