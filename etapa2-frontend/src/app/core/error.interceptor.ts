import { HttpErrorResponse, type HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { catchError, throwError } from 'rxjs';
import { NotificacionService } from './notificacion.service';

export const errorInterceptor: HttpInterceptorFn = (req, next) => {
  const router = inject(Router);
  const notificacion = inject(NotificacionService);

  return next(req).pipe(
    catchError((err: unknown) => {
      if (err instanceof HttpErrorResponse) {
        if (err.status === 403) {
          notificacion.mostrarError('Tu rol no tiene permiso para esto.');
          router.navigate(['/rol']);
        } else if (err.status === 0 || err.status >= 500) {
          notificacion.mostrarError('Hubo un problema con el servidor. Intenta de nuevo.');
        }
      }
      return throwError(() => err);
    })
  );
};
