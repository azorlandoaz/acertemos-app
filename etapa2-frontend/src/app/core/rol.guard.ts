import { inject } from '@angular/core';
import type { CanActivateFn } from '@angular/router';
import { Router } from '@angular/router';
import { RolService } from './rol.service';

export const rolGuard: CanActivateFn = () => {
  const rolService = inject(RolService);
  const router = inject(Router);
  if (rolService.sesion()) {
    return true;
  }
  return router.createUrlTree(['/rol']);
};
