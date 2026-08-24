import { TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';
import { vi } from 'vitest';
import { RolSelector } from './rol-selector';
import { RolService } from '../../core/rol.service';

describe('RolSelector', () => {
  beforeEach(() => {
    localStorage.clear();
    TestBed.configureTestingModule({
      imports: [RolSelector],
      providers: [provideRouter([])],
    });
  });

  afterEach(() => localStorage.clear());

  it('no deja continuar si el formulario es invalido', () => {
    const fixture = TestBed.createComponent(RolSelector);
    const instancia = fixture.componentInstance as any;
    instancia.formulario.controls.nombre.setValue('no-es-un-correo');
    instancia.continuar();
    const rolService = TestBed.inject(RolService);
    expect(rolService.sesion()).toBeNull();
  });

  it('guarda la sesion y navega a /solicitudes/nueva cuando el formulario es valido', () => {
    const fixture = TestBed.createComponent(RolSelector);
    const instancia = fixture.componentInstance as any;
    const router = TestBed.inject(Router);
    const navigateSpy = vi.spyOn(router, 'navigate').mockResolvedValue(true);

    instancia.formulario.controls.rol.setValue('administrador');
    instancia.formulario.controls.nombre.setValue('ana@ejemplo.com');
    instancia.continuar();

    const rolService = TestBed.inject(RolService);
    expect(rolService.sesion()).toEqual({ rol: 'administrador', nombre: 'ana@ejemplo.com' });
    expect(navigateSpy).toHaveBeenCalledWith(['/solicitudes/nueva']);
  });
});
