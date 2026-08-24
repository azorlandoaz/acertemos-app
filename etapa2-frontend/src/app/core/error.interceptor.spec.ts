import { TestBed } from '@angular/core/testing';
import { HttpClient, provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { Router, provideRouter } from '@angular/router';
import { vi } from 'vitest';
import { errorInterceptor } from './error.interceptor';
import { NotificacionService } from './notificacion.service';

describe('errorInterceptor', () => {
  let httpClient: HttpClient;
  let httpMock: HttpTestingController;
  let router: Router;
  let notificacion: { mostrarError: ReturnType<typeof vi.fn> };

  beforeEach(() => {
    notificacion = { mostrarError: vi.fn() };
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(withInterceptors([errorInterceptor])),
        provideHttpClientTesting(),
        provideRouter([]),
        { provide: NotificacionService, useValue: notificacion },
      ],
    });
    httpClient = TestBed.inject(HttpClient);
    httpMock = TestBed.inject(HttpTestingController);
    router = TestBed.inject(Router);
    vi.spyOn(router, 'navigate').mockResolvedValue(true);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('en un 403, muestra un mensaje y redirige a /rol', () => {
    httpClient.get('/api/solicitudes').subscribe({ error: () => {} });
    const req = httpMock.expectOne('/api/solicitudes');
    req.flush({ error: { code: 'ROL_NO_AUTORIZADO', message: 'no' } }, { status: 403, statusText: 'Forbidden' });
    expect(notificacion.mostrarError).toHaveBeenCalledWith('Tu rol no tiene permiso para esto.');
    expect(router.navigate).toHaveBeenCalledWith(['/rol']);
  });

  it('en un error 500, muestra un mensaje generico sin redirigir', () => {
    httpClient.get('/api/solicitudes').subscribe({ error: () => {} });
    const req = httpMock.expectOne('/api/solicitudes');
    req.flush({ error: { code: 'ERROR_INTERNO', message: 'x' } }, { status: 500, statusText: 'Server Error' });
    expect(notificacion.mostrarError).toHaveBeenCalledWith('Hubo un problema con el servidor. Intenta de nuevo.');
    expect(router.navigate).not.toHaveBeenCalled();
  });

  it('en un 422, no muestra mensaje ni redirige (lo maneja el componente)', () => {
    httpClient.get('/api/solicitudes').subscribe({ error: () => {} });
    const req = httpMock.expectOne('/api/solicitudes');
    req.flush({ error: { code: 'ENTRADA_INVALIDA', message: 'x' } }, { status: 422, statusText: 'Unprocessable Entity' });
    expect(notificacion.mostrarError).not.toHaveBeenCalled();
    expect(router.navigate).not.toHaveBeenCalled();
  });

  it('en un 404, no muestra mensaje ni redirige (lo maneja el componente)', () => {
    httpClient.get('/api/solicitudes/x').subscribe({ error: () => {} });
    const req = httpMock.expectOne('/api/solicitudes/x');
    req.flush({ error: { code: 'NO_ENCONTRADA', message: 'x' } }, { status: 404, statusText: 'Not Found' });
    expect(notificacion.mostrarError).not.toHaveBeenCalled();
    expect(router.navigate).not.toHaveBeenCalled();
  });

  it('re-lanza el error para que el llamador tambien pueda reaccionar', () => {
    let errorRecibido: unknown;
    httpClient.get('/api/solicitudes').subscribe({ error: (e) => { errorRecibido = e; } });
    const req = httpMock.expectOne('/api/solicitudes');
    req.flush({ error: { code: 'ERROR_INTERNO', message: 'x' } }, { status: 500, statusText: 'Server Error' });
    expect(errorRecibido).toBeTruthy();
  });
});
