import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { SolicitudesApiService } from './solicitudes-api.service';
import type { Solicitud } from './solicitud';

const solicitudEjemplo: Solicitud = {
  id: 'abc-123',
  asunto: 'No enciende el portatil',
  descripcion: 'desde ayer',
  area: 'TI',
  solicitante: 'x@y.com',
  categoria: 'Hardware',
  prioridad: 'Alta',
  confianzaClasificacion: 0.9,
  estado: 'Abierto',
  fechaCreacion: '2026-08-24T00:00:00.000Z',
};

describe('SolicitudesApiService', () => {
  let service: SolicitudesApiService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    service = TestBed.inject(SolicitudesApiService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('crear() hace POST /api/solicitudes con el cuerpo dado', () => {
    service.crear({ asunto: 'a', descripcion: 'd', area: 'TI', solicitante: 'x@y.com' }).subscribe();
    const req = httpMock.expectOne('/api/solicitudes');
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual({ asunto: 'a', descripcion: 'd', area: 'TI', solicitante: 'x@y.com' });
    req.flush(solicitudEjemplo);
  });

  it('obtenerPorId() hace GET /api/solicitudes/:id', () => {
    service.obtenerPorId('abc-123').subscribe();
    const req = httpMock.expectOne('/api/solicitudes/abc-123');
    expect(req.request.method).toBe('GET');
    req.flush(solicitudEjemplo);
  });

  it('listar() hace GET /api/solicitudes con los filtros como query params', () => {
    service.listar({ area: 'TI', estado: 'Abierto', categoria: 'Hardware', limite: 10, desplazamiento: 0 }).subscribe();
    const req = httpMock.expectOne(
      (r) => r.url === '/api/solicitudes' && r.params.get('area') === 'TI' && r.params.get('estado') === 'Abierto' && r.params.get('categoria') === 'Hardware' && r.params.get('limite') === '10' && r.params.get('desplazamiento') === '0'
    );
    expect(req.request.method).toBe('GET');
    req.flush([solicitudEjemplo]);
  });

  it('listar() sin filtros no agrega query params', () => {
    service.listar({}).subscribe();
    const req = httpMock.expectOne('/api/solicitudes');
    expect(req.request.params.keys().length).toBe(0);
    req.flush([]);
  });
});
