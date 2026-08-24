import { TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';
import type { ActivatedRouteSnapshot, RouterStateSnapshot } from '@angular/router';
import { rolGuard } from './rol.guard';
import { RolService } from './rol.service';

describe('rolGuard', () => {
  beforeEach(() => {
    localStorage.clear();
    TestBed.configureTestingModule({ providers: [provideRouter([])] });
  });

  afterEach(() => localStorage.clear());

  it('permite el paso si hay una sesion activa', () => {
    TestBed.inject(RolService).establecer({ rol: 'solicitante', nombre: 'x@y.com' });
    const resultado = TestBed.runInInjectionContext(() =>
      rolGuard({} as ActivatedRouteSnapshot, {} as RouterStateSnapshot)
    );
    expect(resultado).toBe(true);
  });

  it('redirige a /rol si no hay sesion activa', () => {
    const resultado = TestBed.runInInjectionContext(() =>
      rolGuard({} as ActivatedRouteSnapshot, {} as RouterStateSnapshot)
    );
    const router = TestBed.inject(Router);
    expect(resultado).toEqual(router.createUrlTree(['/rol']));
  });
});
