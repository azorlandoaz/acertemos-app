import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ActivatedRoute, convertToParamMap, provideRouter } from '@angular/router';
import { DetalleSolicitud } from './detalle-solicitud';

describe('DetalleSolicitud', () => {
  let httpMock: HttpTestingController;

  function crearComponente(id: string | null) {
    TestBed.configureTestingModule({
      imports: [DetalleSolicitud],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        provideRouter([]),
        {
          provide: ActivatedRoute,
          useValue: { snapshot: { paramMap: convertToParamMap(id ? { id } : {}) } },
        },
      ],
    });
    httpMock = TestBed.inject(HttpTestingController);
    return TestBed.createComponent(DetalleSolicitud);
  }

  afterEach(() => httpMock.verify());

  it('pide la solicitud por id y la expone si la encuentra', () => {
    const fixture = crearComponente('abc-1');
    const req = httpMock.expectOne('/api/solicitudes/abc-1');
    req.flush({
      id: 'abc-1', asunto: 'x', descripcion: '', area: 'TI', solicitante: 'a@b.com',
      categoria: null, prioridad: null, confianzaClasificacion: null, estado: 'Abierto', fechaCreacion: '2026-01-01T00:00:00.000Z',
    });
    const instancia = fixture.componentInstance as any;
    expect(instancia.solicitud()?.id).toBe('abc-1');
    expect(instancia.noEncontrada()).toBe(false);
  });

  it('marca noEncontrada si la API devuelve 404', () => {
    const fixture = crearComponente('no-existe');
    const req = httpMock.expectOne('/api/solicitudes/no-existe');
    req.flush({ error: { code: 'NO_ENCONTRADA', message: 'x' } }, { status: 404, statusText: 'Not Found' });
    const instancia = fixture.componentInstance as any;
    expect(instancia.noEncontrada()).toBe(true);
  });

  it('marca noEncontrada si no hay id en la ruta', () => {
    const fixture = crearComponente(null);
    const instancia = fixture.componentInstance as any;
    expect(instancia.noEncontrada()).toBe(true);
  });
});
