import { TestBed } from '@angular/core/testing';
import { HttpClient, provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { xRoleInterceptor } from './x-role.interceptor';
import { RolService } from './rol.service';

describe('xRoleInterceptor', () => {
  let httpClient: HttpClient;
  let httpMock: HttpTestingController;
  let rolService: RolService;

  beforeEach(() => {
    localStorage.clear();
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(withInterceptors([xRoleInterceptor])),
        provideHttpClientTesting(),
      ],
    });
    httpClient = TestBed.inject(HttpClient);
    httpMock = TestBed.inject(HttpTestingController);
    rolService = TestBed.inject(RolService);
  });

  afterEach(() => {
    httpMock.verify();
    localStorage.clear();
  });

  it('agrega el header X-Role cuando hay una sesion activa', () => {
    rolService.establecer({ rol: 'administrador', nombre: 'a@b.com' });
    httpClient.get('/api/solicitudes').subscribe();
    const req = httpMock.expectOne('/api/solicitudes');
    expect(req.request.headers.get('X-Role')).toBe('administrador');
    req.flush([]);
  });

  it('no agrega el header X-Role cuando no hay sesion activa', () => {
    httpClient.get('/api/solicitudes').subscribe();
    const req = httpMock.expectOne('/api/solicitudes');
    expect(req.request.headers.has('X-Role')).toBe(false);
    req.flush([]);
  });
});
