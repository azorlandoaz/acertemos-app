import { TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';
import type { ActivatedRouteSnapshot, RouterStateSnapshot } from '@angular/router';
import { vi } from 'vitest';
import { listadoGuard } from './listado.guard';
import { RolService } from './rol.service';
import { NotificacionService } from './notificacion.service';

describe('listadoGuard', () => {
  let notificacion: { mostrarError: ReturnType<typeof vi.fn> };

  beforeEach(() => {
    localStorage.clear();
    notificacion = { mostrarError: vi.fn() };
    TestBed.configureTestingModule({
      providers: [provideRouter([]), { provide: NotificacionService, useValue: notificacion }],
    });
  });

  afterEach(() => localStorage.clear());

  it('permite el paso para responsable_area', () => {
    TestBed.inject(RolService).establecer({ rol: 'responsable_area', nombre: 'x@y.com' });
    const resultado = TestBed.runInInjectionContext(() =>
      listadoGuard({} as ActivatedRouteSnapshot, {} as RouterStateSnapshot)
    );
    expect(resultado).toBe(true);
  });

  it('permite el paso para administrador', () => {
    TestBed.inject(RolService).establecer({ rol: 'administrador', nombre: 'x@y.com' });
    const resultado = TestBed.runInInjectionContext(() =>
      listadoGuard({} as ActivatedRouteSnapshot, {} as RouterStateSnapshot)
    );
    expect(resultado).toBe(true);
  });

  it('bloquea a solicitante, avisa y redirige a /rol', () => {
    TestBed.inject(RolService).establecer({ rol: 'solicitante', nombre: 'x@y.com' });
    const resultado = TestBed.runInInjectionContext(() =>
      listadoGuard({} as ActivatedRouteSnapshot, {} as RouterStateSnapshot)
    );
    const router = TestBed.inject(Router);
    expect(resultado).toEqual(router.createUrlTree(['/rol']));
    expect(notificacion.mostrarError).toHaveBeenCalled();
  });

  it('bloquea si no hay sesion activa', () => {
    const resultado = TestBed.runInInjectionContext(() =>
      listadoGuard({} as ActivatedRouteSnapshot, {} as RouterStateSnapshot)
    );
    const router = TestBed.inject(Router);
    expect(resultado).toEqual(router.createUrlTree(['/rol']));
  });
});
