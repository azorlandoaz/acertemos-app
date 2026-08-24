import { TestBed } from '@angular/core/testing';
import { RolService } from './rol.service';

describe('RolService', () => {
  const CLAVE = 'etapa2-frontend.sesion';

  beforeEach(() => {
    localStorage.clear();
    TestBed.configureTestingModule({});
  });

  afterEach(() => {
    localStorage.clear();
  });

  it('inicia sin sesion si no hay nada en localStorage', () => {
    const service = TestBed.inject(RolService);
    expect(service.sesion()).toBeNull();
  });

  it('establecer() guarda la sesion en memoria y en localStorage', () => {
    const service = TestBed.inject(RolService);
    service.establecer({ rol: 'administrador', nombre: 'ana@ejemplo.com' });
    expect(service.sesion()).toEqual({ rol: 'administrador', nombre: 'ana@ejemplo.com' });
    expect(JSON.parse(localStorage.getItem(CLAVE)!)).toEqual({ rol: 'administrador', nombre: 'ana@ejemplo.com' });
  });

  it('limpiar() borra la sesion de memoria y de localStorage', () => {
    const service = TestBed.inject(RolService);
    service.establecer({ rol: 'solicitante', nombre: 'x@y.com' });
    service.limpiar();
    expect(service.sesion()).toBeNull();
    expect(localStorage.getItem(CLAVE)).toBeNull();
  });

  it('lee una sesion valida ya guardada en localStorage al construirse', () => {
    localStorage.setItem(CLAVE, JSON.stringify({ rol: 'responsable_area', nombre: 'r@x.com' }));
    const service = TestBed.inject(RolService);
    expect(service.sesion()).toEqual({ rol: 'responsable_area', nombre: 'r@x.com' });
  });

  it('ignora contenido corrupto en localStorage y inicia sin sesion', () => {
    localStorage.setItem(CLAVE, '{esto no es json valido');
    const service = TestBed.inject(RolService);
    expect(service.sesion()).toBeNull();
  });
});
