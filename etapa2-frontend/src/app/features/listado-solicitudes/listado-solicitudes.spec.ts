import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';
import { ListadoSolicitudes } from './listado-solicitudes';
import type { Solicitud } from '../../solicitudes/solicitud';

function solicitud(id: string): Solicitud {
  return {
    id,
    asunto: `Asunto ${id}`,
    descripcion: '',
    area: 'TI',
    solicitante: 'a@b.com',
    categoria: 'Hardware',
    prioridad: 'Alta',
    confianzaClasificacion: 0.8,
    estado: 'Abierto',
    fechaCreacion: '2026-01-01T00:00:00.000Z',
  };
}

describe('ListadoSolicitudes', () => {
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [ListadoSolicitudes],
      providers: [provideHttpClient(), provideHttpClientTesting(), provideRouter([])],
    });
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => httpMock.verify());

  it('carga la primera pagina al iniciar', () => {
    const fixture = TestBed.createComponent(ListadoSolicitudes);
    fixture.detectChanges();

    const req = httpMock.expectOne(
      (r) => r.url === '/api/solicitudes' && r.params.get('limite') === '10' && r.params.get('desplazamiento') === '0'
    );
    req.flush([solicitud('1'), solicitud('2')]);

    const instancia = fixture.componentInstance as any;
    expect(instancia.solicitudes().length).toBe(2);
  });

  it('haySiguientePagina es true solo si la pagina esta llena', () => {
    const fixture = TestBed.createComponent(ListadoSolicitudes);
    fixture.detectChanges();
    httpMock.expectOne(() => true).flush(Array.from({ length: 10 }, (_, i) => solicitud(String(i))));

    const instancia = fixture.componentInstance as any;
    expect(instancia.haySiguientePagina()).toBe(true);
  });

  it('paginaSiguiente() pide el siguiente bloque con el desplazamiento correcto', () => {
    const fixture = TestBed.createComponent(ListadoSolicitudes);
    fixture.detectChanges();
    httpMock.expectOne(() => true).flush(Array.from({ length: 10 }, (_, i) => solicitud(String(i))));

    const instancia = fixture.componentInstance as any;
    instancia.paginaSiguiente();

    const req = httpMock.expectOne((r) => r.url === '/api/solicitudes' && r.params.get('desplazamiento') === '10');
    req.flush([]);
  });

  it('buscar() reinicia a la pagina 0 con los filtros del formulario', () => {
    const fixture = TestBed.createComponent(ListadoSolicitudes);
    fixture.detectChanges();
    httpMock.expectOne(() => true).flush([]);

    const instancia = fixture.componentInstance as any;
    instancia.filtros.controls.area.setValue('Compras');
    instancia.buscar();

    const req = httpMock.expectOne(
      (r) => r.url === '/api/solicitudes' && r.params.get('area') === 'Compras' && r.params.get('desplazamiento') === '0'
    );
    req.flush([]);
  });
});
