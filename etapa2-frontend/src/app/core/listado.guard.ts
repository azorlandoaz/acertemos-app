import { inject } from '@angular/core';
import type { CanActivateFn } from '@angular/router';
import { Router } from '@angular/router';
import { RolService } from './rol.service';
import { NotificacionService } from './notificacion.service';

export const listadoGuard: CanActivateFn = () => {
  const rolService = inject(RolService);
  const router = inject(Router);
  const notificacion = inject(NotificacionService);
  const sesion = rolService.sesion();
  if (sesion && (sesion.rol === 'responsable_area' || sesion.rol === 'administrador')) {
    return true;
  }
  notificacion.mostrarError('Tu rol no tiene permiso para ver el listado.');
  return router.createUrlTree(['/rol']);
};
