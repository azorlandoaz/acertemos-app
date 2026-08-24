import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { Router, provideRouter } from '@angular/router';
import { vi } from 'vitest';
import { NuevaSolicitud } from './nueva-solicitud';
import { RolService } from '../../core/rol.service';

describe('NuevaSolicitud', () => {
  let httpMock: HttpTestingController;

  beforeEach(() => {
    localStorage.clear();
    TestBed.configureTestingModule({
      imports: [NuevaSolicitud],
      providers: [provideHttpClient(), provideHttpClientTesting(), provideRouter([])],
    });
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
    localStorage.clear();
  });

  it('precarga el campo solicitante con el nombre de la sesion activa', () => {
    TestBed.inject(RolService).establecer({ rol: 'solicitante', nombre: 'ana@ejemplo.com' });
    const fixture = TestBed.createComponent(NuevaSolicitud);
    const instancia = fixture.componentInstance as any;
    expect(instancia.formulario.controls.solicitante.value).toBe('ana@ejemplo.com');
  });

  it('al enviar con exito, navega al detalle de la solicitud creada', () => {
    const fixture = TestBed.createComponent(NuevaSolicitud);
    const instancia = fixture.componentInstance as any;
    const router = TestBed.inject(Router);
    const navigateSpy = vi.spyOn(router, 'navigate').mockResolvedValue(true);

    instancia.formulario.setValue({ asunto: 'No enciende', descripcion: 'x', area: 'TI', solicitante: 'a@b.com' });
    instancia.enviar();

    const req = httpMock.expectOne('/api/solicitudes');
    req.flush({
      id: 'nueva-1', asunto: 'No enciende', descripcion: 'x', area: 'TI', solicitante: 'a@b.com',
      categoria: null, prioridad: null, confianzaClasificacion: null, estado: 'Abierto', fechaCreacion: '2026-01-01T00:00:00.000Z',
    });

    expect(navigateSpy).toHaveBeenCalledWith(['/solicitudes', 'nueva-1']);
  });

  it('en un 422, marca el campo con el mensaje devuelto por la API', () => {
    const fixture = TestBed.createComponent(NuevaSolicitud);
    const instancia = fixture.componentInstance as any;

    instancia.formulario.setValue({ asunto: 'Asunto valido', descripcion: '', area: 'TI', solicitante: 'a@b.com' });
    instancia.enviar();

    const req = httpMock.expectOne('/api/solicitudes');
    req.flush(
      { error: { code: 'ENTRADA_INVALIDA', message: 'invalido', details: { fieldErrors: { area: ['El área no existe'] } } } },
      { status: 422, statusText: 'Unprocessable Entity' }
    );

    expect(instancia.formulario.controls.area.errors?.['servidor']).toBe('El área no existe');
    expect(instancia.formulario.controls.area.touched).toBe(true);
  });
});
