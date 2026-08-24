import type { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { RolService } from './rol.service';

export const xRoleInterceptor: HttpInterceptorFn = (req, next) => {
  const rolService = inject(RolService);
  const sesion = rolService.sesion();
  if (!sesion) {
    return next(req);
  }
  return next(req.clone({ setHeaders: { 'X-Role': sesion.rol } }));
};
