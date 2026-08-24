# Cliente Angular de Etapa 2 — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Construir una app Angular (`etapa2-frontend/`) que consuma los 3 endpoints reales de `etapa2-api` (crear/consultar/listar solicitudes) desde una interfaz real, simulando el rol vía el header `X-Role` que la API ya exige.

**Architecture:** Angular standalone (Angular CLI 21.2.x) + Angular Material, con un `HttpInterceptorFn` que agrega `X-Role` a cada petición (leyendo un `RolService` respaldado por `localStorage`) y otro que centraliza la reacción a `403`/`5xx`. Cuatro vistas enrutadas (selector de rol, nueva solicitud, listado, detalle) más dos guards de ruta. `proxy.conf.json` reenvía `/api/*` al backend en desarrollo — `etapa2-api` no se toca en ningún punto de este plan.

**Tech Stack:** Angular 21.2.x (standalone, sin NgModules, signals), Angular Material 21.2.x, Vitest (test runner por defecto de esta versión del CLI, confirmado en vivo), TypeScript ~5.9.2 — todo en `etapa2-frontend/package.json` propio, **fuera** del workspace npm raíz del monorepo.

**Spec:** `docs/superpowers/specs/2026-08-23-etapa2-frontend-angular-design.md`.

## Global Constraints

- **Esto no es parte de los 5 entregables calificados del Anexo A** (ver spec, sección 1) — ninguna tarea de este plan toca `CHANGELOG.md` ni el `README.md` raíz del monorepo; esa convención de las 5 etapas no aplica aquí.
- `etapa2-api/` (código fuente) no se modifica en ningún punto de este plan.
- Angular CLI **21.2.x**, no `@angular/cli@latest` (línea 22.x) — verificado en vivo: el Node.js de este entorno (`22.19.0`) no cumple el mínimo que exige la línea 22.x del CLI (`≥22.22.3`); `21.2.21` sí es compatible (`node: ^20.19.0 || ^22.12.0 || >=24.0.0`).
- Componentes **standalone**, sin `NgModule`. Nombres de archivo estilo "2025" del propio Angular CLI — sin infijo `.component.`/`.service.` más allá de lo que el generador produce (`rol-selector.ts`, no `rol-selector.component.ts`); nombre de clase en PascalCase del nombre del archivo, sin sufijo `Component`/`Service` salvo que el generador lo agregue (`RolSelector`, no `RolSelectorComponent`) — verificado corriendo `ng generate component` en este mismo entorno.
- Test runner: **Vitest** (default real de esta versión del CLI, no Karma). Verificar SIEMPRE con `npx ng test --watch=false` (nunca `npx ng test` a secas en un paso de verificación — por defecto queda en modo watch y no termina).
- Angular Material 21.2.x vía `ng add @angular/material --theme=azure-blue --typography=true --animations=enable --skip-confirmation` — **no** agrega ni requiere `provideAnimationsAsync()` en esta versión (verificado en vivo: el theming de Material 3 es puramente CSS aquí). No agregar ese provider a mano sin una razón nueva y verificada.
- `etapa2-frontend/package.json` + `package-lock.json` son propios, **no** se agregan al array `workspaces` del `package.json` raíz del monorepo (evita el conflicto de versión de TypeScript entre Angular y los subproyectos Node existentes).
- Todas las llamadas HTTP del cliente usan la ruta `/api/...` (nunca `http://localhost:3000/...` hardcodeado) — `proxy.conf.json` hace el reenvío en desarrollo.
- Rol: exactamente `'solicitante' | 'responsable_area' | 'administrador'`, header `X-Role` — verificado contra `etapa2-api/src/middleware/authRole.ts`.
- Forma de error de la API: `{ error: { code: string, message: string, details?: unknown } }` — verificado contra `etapa2-api/src/errors.ts`. Los errores `422` traen `details` con la forma de `zod`'s `.flatten()`: `{ formErrors: string[], fieldErrors: Record<string, string[]> }`.
- Modelo real de `Solicitud` (verificado contra `etapa2-api/src/store/solicitudesStore.ts`): `{ id, asunto, descripcion, area, solicitante, categoria: string | null, prioridad: string | null, confianzaClasificacion: number | null, estado: 'Abierto' | 'Escalado', fechaCreacion: string }`. `GET /solicitudes` devuelve un array plano (`Solicitud[]`), sin envoltorio de paginación ni conteo total.
- Todas las pruebas usan `HttpTestingController` (nunca el backend real corriendo) — a diferencia de las Etapas 1-4, este proyecto consume una API ajena a su propio código, no tiene infraestructura propia que levantar en cada corrida (ver spec, sección 5).
- Cada componente accede a miembros `protected` de sus propias specs vía `(instancia as any)` — patrón estándar de Angular para probar sin exponer la superficie pública del componente.
- Commits atómicos y frecuentes, uno por tarea (salvo que una tarea tenga varios pasos de commit explícitos).

---

### Task 1: Scaffold del proyecto Angular + Material

**Files:**
- Create: todo el workspace `etapa2-frontend/` (vía `ng new`)
- Modify: `etapa2-frontend/package.json` (vía `ng add @angular/material`)
- Create: `etapa2-frontend/proxy.conf.json`
- Modify: `etapa2-frontend/angular.json` (agrega `proxyConfig` al target `serve`)

**Interfaces:**
- Consumes: nada.
- Produces: el workspace Angular base sobre el que corren todas las tareas siguientes; el proxy `/api` → `http://localhost:3000`.

- [ ] **Step 1: Generar el workspace**

Desde la raíz del worktree (`etapa2-frontend/` como carpeta NO debe existir todavía — verificar con `ls` antes de correr esto):

```bash
npx -y @angular/cli@21 new etapa2-frontend --routing --style=scss --skip-git --ssr=false --test-runner=vitest --package-manager=npm --defaults
```

Expected: crea la carpeta `etapa2-frontend/` con `src/app/{app.ts,app.html,app.scss,app.spec.ts,app.config.ts,app.routes.ts}`, `angular.json`, `package.json` con `"@angular/cli": "^21.2.21"` y `"vitest"` en `devDependencies`, e instala los paquetes.

- [ ] **Step 2: Agregar Angular Material**

```bash
cd etapa2-frontend
npx ng add @angular/material --theme=azure-blue --typography=true --animations=enable --skip-confirmation
```

Expected: agrega `@angular/cdk`/`@angular/material` a `package.json`, actualiza `src/styles.scss` (con un bloque `@include mat.theme(...)`) y `src/index.html`. Verificar con `grep -c "provideAnimations" src/app/app.config.ts` que da `0` — si diera más de `0`, algo cambió respecto a lo verificado en el diseño; no lo elimines a ciegas, repórtalo como concern.

- [ ] **Step 3: Configurar el proxy de desarrollo**

`etapa2-frontend/proxy.conf.json`:
```json
{
  "/api": {
    "target": "http://localhost:3000",
    "pathRewrite": { "^/api": "" },
    "secure": false,
    "changeOrigin": true
  }
}
```

En `etapa2-frontend/angular.json`, dentro de `projects.etapa2-frontend.architect.serve`, agregar la clave `"options"` (hermana de `"configurations"` y `"defaultConfiguration"`):
```json
"serve": {
  "builder": "@angular/build:dev-server",
  "options": {
    "proxyConfig": "proxy.conf.json"
  },
  "configurations": {
    "production": {
      "buildTarget": "etapa2-frontend:build:production"
    },
    "development": {
      "buildTarget": "etapa2-frontend:build:development"
    }
  },
  "defaultConfiguration": "development"
}
```
(Los valores exactos de `configurations`/`defaultConfiguration` ya generados por `ng new` no se tocan — solo se agrega la clave `"options"`.)

- [ ] **Step 4: Verificar el estado base**

```bash
npx ng build 2>&1 | tail -20
npx ng test --watch=false 2>&1 | tail -20
```

Expected: build sin errores; `Test Files 1 passed (1)`, `Tests 2 passed (2)` (los 2 tests que trae `app.spec.ts` por defecto).

- [ ] **Step 5: Commit**

```bash
cd ..
git add etapa2-frontend
git -c user.name="azorlandoaz" -c user.email="k.horlando@hotmail.com" commit -m "feat(frontend): scaffold Angular 21 + Material + proxy de desarrollo"
```

---

### Task 2: Modelo de rol y `RolService`

**Files:**
- Create: `etapa2-frontend/src/app/core/rol.ts`
- Create: `etapa2-frontend/src/app/core/rol.service.ts`
- Test: `etapa2-frontend/src/app/core/rol.service.spec.ts`

**Interfaces:**
- Consumes: nada.
- Produces: `type Rol = 'solicitante' | 'responsable_area' | 'administrador'`, `interface SesionRol { rol: Rol; nombre: string }` (en `core/rol.ts`); `RolService` con `sesion: Signal<SesionRol | null>` (readonly), `establecer(sesion: SesionRol): void`, `limpiar(): void` (en `core/rol.service.ts`) — usados por el interceptor de `X-Role` (Tarea 3), los guards (Tarea 6) y todas las vistas.

- [ ] **Step 1: Write the failing test**

`etapa2-frontend/src/app/core/rol.service.spec.ts`:
```ts
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
```

- [ ] **Step 2: Run test to verify it fails**

```bash
cd etapa2-frontend
npx ng test --watch=false 2>&1 | tail -20
```
Expected: FAIL — no se puede resolver `./rol.service` (el archivo no existe).

- [ ] **Step 3: Write minimal implementation**

`etapa2-frontend/src/app/core/rol.ts`:
```ts
export type Rol = 'solicitante' | 'responsable_area' | 'administrador';

export interface SesionRol {
  rol: Rol;
  nombre: string;
}
```

`etapa2-frontend/src/app/core/rol.service.ts`:
```ts
import { Injectable, signal } from '@angular/core';
import type { SesionRol } from './rol';

const CLAVE_ALMACENAMIENTO = 'etapa2-frontend.sesion';

@Injectable({ providedIn: 'root' })
export class RolService {
  private readonly _sesion = signal<SesionRol | null>(this.leerDeAlmacenamiento());

  readonly sesion = this._sesion.asReadonly();

  establecer(sesion: SesionRol): void {
    this._sesion.set(sesion);
    localStorage.setItem(CLAVE_ALMACENAMIENTO, JSON.stringify(sesion));
  }

  limpiar(): void {
    this._sesion.set(null);
    localStorage.removeItem(CLAVE_ALMACENAMIENTO);
  }

  private leerDeAlmacenamiento(): SesionRol | null {
    const crudo = localStorage.getItem(CLAVE_ALMACENAMIENTO);
    if (!crudo) {
      return null;
    }
    try {
      const parseado = JSON.parse(crudo);
      if (parseado && typeof parseado.rol === 'string' && typeof parseado.nombre === 'string') {
        return parseado as SesionRol;
      }
      return null;
    } catch {
      return null;
    }
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

```bash
npx ng test --watch=false 2>&1 | tail -20
```
Expected: PASS — 7 tests (2 de `app.spec.ts` + 5 nuevos).

- [ ] **Step 5: Commit**

```bash
cd ..
git add etapa2-frontend/src/app/core/rol.ts etapa2-frontend/src/app/core/rol.service.ts etapa2-frontend/src/app/core/rol.service.spec.ts
git -c user.name="azorlandoaz" -c user.email="k.horlando@hotmail.com" commit -m "feat(frontend): modelo de rol y RolService respaldado por localStorage"
```

---

### Task 3: Interceptor de `X-Role`

**Files:**
- Create: `etapa2-frontend/src/app/core/x-role.interceptor.ts`
- Test: `etapa2-frontend/src/app/core/x-role.interceptor.spec.ts`
- Modify: `etapa2-frontend/src/app/app.config.ts`

**Interfaces:**
- Consumes: `RolService.sesion` (Tarea 2).
- Produces: `xRoleInterceptor: HttpInterceptorFn`, registrado en `appConfig` — todas las llamadas HTTP posteriores (Tareas 5, 8, 9, 10) ya salen con el header `X-Role` puesto.

- [ ] **Step 1: Write the failing test**

`etapa2-frontend/src/app/core/x-role.interceptor.spec.ts`:
```ts
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
```

- [ ] **Step 2: Run test to verify it fails**

```bash
cd etapa2-frontend
npx ng test --watch=false 2>&1 | tail -20
```
Expected: FAIL — no se puede resolver `./x-role.interceptor`.

- [ ] **Step 3: Write minimal implementation**

`etapa2-frontend/src/app/core/x-role.interceptor.ts`:
```ts
import type { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { RolService } from './rol.service';

export const xRoleInterceptor: HttpInterceptorFn = (req, next) => {
  const rolService = inject(RolService);
  const sesion = rolService.sesion();
  if (!sesion) {
    return next(req);
  }
  return next(req.clone({ setHeaders: { 'X-Role': sesion.rol } }));
};
```

En `etapa2-frontend/src/app/app.config.ts`, reemplazar el contenido completo por:
```ts
import { ApplicationConfig, provideBrowserGlobalErrorListeners } from '@angular/core';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { provideRouter } from '@angular/router';

import { routes } from './app.routes';
import { xRoleInterceptor } from './core/x-role.interceptor';

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideRouter(routes),
    provideHttpClient(withInterceptors([xRoleInterceptor])),
  ],
};
```

- [ ] **Step 4: Run test to verify it passes**

```bash
npx ng test --watch=false 2>&1 | tail -20
```
Expected: PASS — 9 tests.

- [ ] **Step 5: Commit**

```bash
cd ..
git add etapa2-frontend/src/app/core/x-role.interceptor.ts etapa2-frontend/src/app/core/x-role.interceptor.spec.ts etapa2-frontend/src/app/app.config.ts
git -c user.name="azorlandoaz" -c user.email="k.horlando@hotmail.com" commit -m "feat(frontend): interceptor que agrega X-Role a cada peticion HTTP"
```

---

### Task 4: `NotificacionService` + interceptor de errores (403/5xx)

**Files:**
- Create: `etapa2-frontend/src/app/core/notificacion.service.ts`
- Test: `etapa2-frontend/src/app/core/notificacion.service.spec.ts`
- Create: `etapa2-frontend/src/app/core/error.interceptor.ts`
- Test: `etapa2-frontend/src/app/core/error.interceptor.spec.ts`
- Modify: `etapa2-frontend/src/app/app.config.ts`

**Interfaces:**
- Consumes: nada nuevo (usa `MatSnackBar`, `Router`).
- Produces: `NotificacionService` con `mostrarError(mensaje: string): void` y `mostrarExito(mensaje: string): void`; `errorInterceptor: HttpInterceptorFn`, registrado en `appConfig` junto a `xRoleInterceptor`. `NotificacionService` la usan también las Tareas 6 (`listadoGuard`) y opcionalmente las vistas.

- [ ] **Step 1: Write the failing tests**

`etapa2-frontend/src/app/core/notificacion.service.spec.ts`:
```ts
import { TestBed } from '@angular/core/testing';
import { MatSnackBar } from '@angular/material/snack-bar';
import { vi } from 'vitest';
import { NotificacionService } from './notificacion.service';

describe('NotificacionService', () => {
  it('mostrarError abre un snackbar con el mensaje dado', () => {
    const snackBarMock = { open: vi.fn() };
    TestBed.configureTestingModule({
      providers: [{ provide: MatSnackBar, useValue: snackBarMock }],
    });
    const service = TestBed.inject(NotificacionService);
    service.mostrarError('algo salio mal');
    expect(snackBarMock.open).toHaveBeenCalledWith('algo salio mal', 'Cerrar', { duration: 5000 });
  });

  it('mostrarExito abre un snackbar con duracion mas corta', () => {
    const snackBarMock = { open: vi.fn() };
    TestBed.configureTestingModule({
      providers: [{ provide: MatSnackBar, useValue: snackBarMock }],
    });
    const service = TestBed.inject(NotificacionService);
    service.mostrarExito('todo bien');
    expect(snackBarMock.open).toHaveBeenCalledWith('todo bien', 'Cerrar', { duration: 3000 });
  });
});
```

`etapa2-frontend/src/app/core/error.interceptor.spec.ts`:
```ts
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
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
cd etapa2-frontend
npx ng test --watch=false 2>&1 | tail -20
```
Expected: FAIL — no se puede resolver `./notificacion.service` ni `./error.interceptor`.

- [ ] **Step 3: Write minimal implementation**

`etapa2-frontend/src/app/core/notificacion.service.ts`:
```ts
import { Injectable, inject } from '@angular/core';
import { MatSnackBar } from '@angular/material/snack-bar';

@Injectable({ providedIn: 'root' })
export class NotificacionService {
  private readonly snackBar = inject(MatSnackBar);

  mostrarError(mensaje: string): void {
    this.snackBar.open(mensaje, 'Cerrar', { duration: 5000 });
  }

  mostrarExito(mensaje: string): void {
    this.snackBar.open(mensaje, 'Cerrar', { duration: 3000 });
  }
}
```

`etapa2-frontend/src/app/core/error.interceptor.ts`:
```ts
import { HttpErrorResponse, type HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { catchError, throwError } from 'rxjs';
import { NotificacionService } from './notificacion.service';

export const errorInterceptor: HttpInterceptorFn = (req, next) => {
  const router = inject(Router);
  const notificacion = inject(NotificacionService);

  return next(req).pipe(
    catchError((err: unknown) => {
      if (err instanceof HttpErrorResponse) {
        if (err.status === 403) {
          notificacion.mostrarError('Tu rol no tiene permiso para esto.');
          router.navigate(['/rol']);
        } else if (err.status === 0 || err.status >= 500) {
          notificacion.mostrarError('Hubo un problema con el servidor. Intenta de nuevo.');
        }
      }
      return throwError(() => err);
    })
  );
};
```

En `etapa2-frontend/src/app/app.config.ts`, agregar `errorInterceptor` al arreglo de `withInterceptors`:
```ts
import { ApplicationConfig, provideBrowserGlobalErrorListeners } from '@angular/core';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { provideRouter } from '@angular/router';

import { routes } from './app.routes';
import { xRoleInterceptor } from './core/x-role.interceptor';
import { errorInterceptor } from './core/error.interceptor';

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideRouter(routes),
    provideHttpClient(withInterceptors([xRoleInterceptor, errorInterceptor])),
  ],
};
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
npx ng test --watch=false 2>&1 | tail -20
```
Expected: PASS — 16 tests.

- [ ] **Step 5: Commit**

```bash
cd ..
git add etapa2-frontend/src/app/core/notificacion.service.ts etapa2-frontend/src/app/core/notificacion.service.spec.ts etapa2-frontend/src/app/core/error.interceptor.ts etapa2-frontend/src/app/core/error.interceptor.spec.ts etapa2-frontend/src/app/app.config.ts
git -c user.name="azorlandoaz" -c user.email="k.horlando@hotmail.com" commit -m "feat(frontend): NotificacionService e interceptor centralizado de errores 403/5xx"
```

---

### Task 5: Modelo de `Solicitud` y `SolicitudesApiService`

**Files:**
- Create: `etapa2-frontend/src/app/solicitudes/solicitud.ts`
- Create: `etapa2-frontend/src/app/solicitudes/solicitudes-api.service.ts`
- Test: `etapa2-frontend/src/app/solicitudes/solicitudes-api.service.spec.ts`

**Interfaces:**
- Consumes: nada nuevo.
- Produces: `interface Solicitud`, `interface DatosNuevaSolicitud`, `interface FiltrosListado`, `interface ErrorApi` (en `solicitudes/solicitud.ts`); `SolicitudesApiService` con `crear(datos: DatosNuevaSolicitud): Observable<Solicitud>`, `obtenerPorId(id: string): Observable<Solicitud>`, `listar(filtros: FiltrosListado): Observable<Solicitud[]>` — consumido por las Tareas 8, 9, 10.

- [ ] **Step 1: Write the failing test**

`etapa2-frontend/src/app/solicitudes/solicitudes-api.service.spec.ts`:
```ts
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
    service.listar({ area: 'TI', estado: 'Abierto', limite: 10, desplazamiento: 0 }).subscribe();
    const req = httpMock.expectOne(
      (r) => r.url === '/api/solicitudes' && r.params.get('area') === 'TI' && r.params.get('estado') === 'Abierto' && r.params.get('limite') === '10' && r.params.get('desplazamiento') === '0'
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
```

- [ ] **Step 2: Run test to verify it fails**

```bash
cd etapa2-frontend
npx ng test --watch=false 2>&1 | tail -20
```
Expected: FAIL — no se puede resolver `./solicitudes-api.service`.

- [ ] **Step 3: Write minimal implementation**

`etapa2-frontend/src/app/solicitudes/solicitud.ts`:
```ts
export type EstadoSolicitud = 'Abierto' | 'Escalado';

export interface Solicitud {
  id: string;
  asunto: string;
  descripcion: string;
  area: string;
  solicitante: string;
  categoria: string | null;
  prioridad: string | null;
  confianzaClasificacion: number | null;
  estado: EstadoSolicitud;
  fechaCreacion: string;
}

export interface DatosNuevaSolicitud {
  asunto: string;
  descripcion: string;
  area: string;
  solicitante: string;
}

export interface FiltrosListado {
  area?: string;
  estado?: string;
  categoria?: string;
  limite?: number;
  desplazamiento?: number;
}

export interface ErrorApi {
  code: string;
  message: string;
  details?: { formErrors?: string[]; fieldErrors?: Record<string, string[]> };
}
```

`etapa2-frontend/src/app/solicitudes/solicitudes-api.service.ts`:
```ts
import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import type { Observable } from 'rxjs';
import type { DatosNuevaSolicitud, FiltrosListado, Solicitud } from './solicitud';

@Injectable({ providedIn: 'root' })
export class SolicitudesApiService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = '/api/solicitudes';

  crear(datos: DatosNuevaSolicitud): Observable<Solicitud> {
    return this.http.post<Solicitud>(this.baseUrl, datos);
  }

  obtenerPorId(id: string): Observable<Solicitud> {
    return this.http.get<Solicitud>(`${this.baseUrl}/${id}`);
  }

  listar(filtros: FiltrosListado): Observable<Solicitud[]> {
    let params = new HttpParams();
    if (filtros.area) params = params.set('area', filtros.area);
    if (filtros.estado) params = params.set('estado', filtros.estado);
    if (filtros.categoria) params = params.set('categoria', filtros.categoria);
    if (filtros.limite !== undefined) params = params.set('limite', filtros.limite);
    if (filtros.desplazamiento !== undefined) params = params.set('desplazamiento', filtros.desplazamiento);
    return this.http.get<Solicitud[]>(this.baseUrl, { params });
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

```bash
npx ng test --watch=false 2>&1 | tail -20
```
Expected: PASS — 20 tests.

- [ ] **Step 5: Commit**

```bash
cd ..
git add etapa2-frontend/src/app/solicitudes
git -c user.name="azorlandoaz" -c user.email="k.horlando@hotmail.com" commit -m "feat(frontend): modelo de Solicitud y SolicitudesApiService"
```

---

### Task 6: Guards de ruta (`rolGuard`, `listadoGuard`)

**Files:**
- Create: `etapa2-frontend/src/app/core/rol.guard.ts`
- Test: `etapa2-frontend/src/app/core/rol.guard.spec.ts`
- Create: `etapa2-frontend/src/app/core/listado.guard.ts`
- Test: `etapa2-frontend/src/app/core/listado.guard.spec.ts`

**Interfaces:**
- Consumes: `RolService.sesion` (Tarea 2), `NotificacionService.mostrarError` (Tarea 4).
- Produces: `rolGuard: CanActivateFn` (exige sesión activa, si no hay redirige a `/rol`); `listadoGuard: CanActivateFn` (exige `responsable_area`/`administrador`, si no muestra un aviso y redirige a `/rol`) — usados por las rutas de las Tareas 8, 9, 10.

- [ ] **Step 1: Write the failing tests**

`etapa2-frontend/src/app/core/rol.guard.spec.ts`:
```ts
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
```

`etapa2-frontend/src/app/core/listado.guard.spec.ts`:
```ts
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
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
cd etapa2-frontend
npx ng test --watch=false 2>&1 | tail -20
```
Expected: FAIL — no se puede resolver `./rol.guard` ni `./listado.guard`.

- [ ] **Step 3: Write minimal implementation**

`etapa2-frontend/src/app/core/rol.guard.ts`:
```ts
import { inject } from '@angular/core';
import type { CanActivateFn } from '@angular/router';
import { Router } from '@angular/router';
import { RolService } from './rol.service';

export const rolGuard: CanActivateFn = () => {
  const rolService = inject(RolService);
  const router = inject(Router);
  if (rolService.sesion()) {
    return true;
  }
  return router.createUrlTree(['/rol']);
};
```

`etapa2-frontend/src/app/core/listado.guard.ts`:
```ts
import { inject } from '@angular/core';
import type { CanActivateFn } from '@angular/router';
import { Router } from '@angular/router';
import { RolService } from './rol.service';
import { NotificacionService } from './notificacion.service';

export const listadoGuard: CanActivateFn = () => {
  const rolService = inject(RolService);
  const router = inject(Router);
  const notificacion = inject(NotificacionService);
  const sesion = rolService.sesion();
  if (sesion && (sesion.rol === 'responsable_area' || sesion.rol === 'administrador')) {
    return true;
  }
  notificacion.mostrarError('Tu rol no tiene permiso para ver el listado.');
  return router.createUrlTree(['/rol']);
};
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
npx ng test --watch=false 2>&1 | tail -20
```
Expected: PASS — 26 tests.

- [ ] **Step 5: Commit**

```bash
cd ..
git add etapa2-frontend/src/app/core/rol.guard.ts etapa2-frontend/src/app/core/rol.guard.spec.ts etapa2-frontend/src/app/core/listado.guard.ts etapa2-frontend/src/app/core/listado.guard.spec.ts
git -c user.name="azorlandoaz" -c user.email="k.horlando@hotmail.com" commit -m "feat(frontend): guards de ruta por sesion y por rol para el listado"
```

---

### Task 7: Vista "Selector de rol"

**Files:**
- Create: `etapa2-frontend/src/app/features/rol-selector/rol-selector.ts`
- Create: `etapa2-frontend/src/app/features/rol-selector/rol-selector.html`
- Create: `etapa2-frontend/src/app/features/rol-selector/rol-selector.scss`
- Test: `etapa2-frontend/src/app/features/rol-selector/rol-selector.spec.ts`
- Modify: `etapa2-frontend/src/app/app.routes.ts`

**Interfaces:**
- Consumes: `Rol` (Tarea 2, `core/rol.ts`), `RolService` (Tarea 2).
- Produces: la ruta `/rol` — entrada obligatoria cuando `rolGuard`/`listadoGuard` (Tarea 6) redirigen por falta de sesión.

- [ ] **Step 1: Write the failing test**

`etapa2-frontend/src/app/features/rol-selector/rol-selector.spec.ts`:
```ts
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
```

- [ ] **Step 2: Run test to verify it fails**

```bash
cd etapa2-frontend
npx ng test --watch=false 2>&1 | tail -20
```
Expected: FAIL — no se puede resolver `./rol-selector`.

- [ ] **Step 3: Write minimal implementation**

`etapa2-frontend/src/app/features/rol-selector/rol-selector.ts`:
```ts
import { Component, inject } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSelectModule } from '@angular/material/select';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import type { Rol } from '../../core/rol';
import { RolService } from '../../core/rol.service';

interface OpcionRol {
  valor: Rol;
  etiqueta: string;
}

@Component({
  selector: 'app-rol-selector',
  imports: [ReactiveFormsModule, MatFormFieldModule, MatSelectModule, MatInputModule, MatButtonModule],
  templateUrl: './rol-selector.html',
  styleUrl: './rol-selector.scss',
})
export class RolSelector {
  private readonly fb = inject(FormBuilder);
  private readonly rolService = inject(RolService);
  private readonly router = inject(Router);

  protected readonly opciones: OpcionRol[] = [
    { valor: 'solicitante', etiqueta: 'Solicitante' },
    { valor: 'responsable_area', etiqueta: 'Responsable de área' },
    { valor: 'administrador', etiqueta: 'Administrador' },
  ];

  protected readonly formulario = this.fb.nonNullable.group({
    rol: this.fb.nonNullable.control<Rol>('solicitante', Validators.required),
    nombre: this.fb.nonNullable.control('', [Validators.required, Validators.email]),
  });

  protected continuar(): void {
    if (this.formulario.invalid) {
      this.formulario.markAllAsTouched();
      return;
    }
    const { rol, nombre } = this.formulario.getRawValue();
    this.rolService.establecer({ rol, nombre });
    this.router.navigate(['/solicitudes/nueva']);
  }
}
```

`etapa2-frontend/src/app/features/rol-selector/rol-selector.html`:
```html
<div class="contenedor">
  <h1>¿Con qué rol querés entrar?</h1>
  <p>La API de Etapa 2 no tiene login real — esto simula el header <code>X-Role</code> que ya usa.</p>
  <form [formGroup]="formulario" (ngSubmit)="continuar()">
    <mat-form-field appearance="outline">
      <mat-label>Rol</mat-label>
      <mat-select formControlName="rol">
        @for (opcion of opciones; track opcion.valor) {
          <mat-option [value]="opcion.valor">{{ opcion.etiqueta }}</mat-option>
        }
      </mat-select>
    </mat-form-field>

    <mat-form-field appearance="outline">
      <mat-label>Correo</mat-label>
      <input matInput formControlName="nombre" type="email" placeholder="tu@correo.com" />
      @if (formulario.controls.nombre.invalid && formulario.controls.nombre.touched) {
        <mat-error>Ingresá un correo válido</mat-error>
      }
    </mat-form-field>

    <button mat-flat-button type="submit">Continuar</button>
  </form>
</div>
```

`etapa2-frontend/src/app/features/rol-selector/rol-selector.scss`:
```scss
.contenedor {
  max-width: 420px;
  margin: 3rem auto;
  display: flex;
  flex-direction: column;
  gap: 1rem;

  form {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
  }
}
```

En `etapa2-frontend/src/app/app.routes.ts`, reemplazar el contenido completo por:
```ts
import type { Routes } from '@angular/router';

export const routes: Routes = [
  {
    path: 'rol',
    loadComponent: () => import('./features/rol-selector/rol-selector').then((m) => m.RolSelector),
  },
];
```

- [ ] **Step 4: Run test to verify it passes**

```bash
npx ng test --watch=false 2>&1 | tail -20
```
Expected: PASS — 28 tests.

- [ ] **Step 5: Commit**

```bash
cd ..
git add etapa2-frontend/src/app/features/rol-selector etapa2-frontend/src/app/app.routes.ts
git -c user.name="azorlandoaz" -c user.email="k.horlando@hotmail.com" commit -m "feat(frontend): vista de seleccion de rol (/rol)"
```

---

### Task 8: Vista "Nueva solicitud"

**Files:**
- Create: `etapa2-frontend/src/app/features/nueva-solicitud/nueva-solicitud.ts`
- Create: `etapa2-frontend/src/app/features/nueva-solicitud/nueva-solicitud.html`
- Create: `etapa2-frontend/src/app/features/nueva-solicitud/nueva-solicitud.scss`
- Test: `etapa2-frontend/src/app/features/nueva-solicitud/nueva-solicitud.spec.ts`
- Modify: `etapa2-frontend/src/app/app.routes.ts`

**Interfaces:**
- Consumes: `RolService.sesion` (Tarea 2), `SolicitudesApiService.crear` (Tarea 5), `rolGuard` (Tarea 6), `ErrorApi` (Tarea 5).
- Produces: la ruta `/solicitudes/nueva`, y la redirección de la ruta raíz `''` hacia ella.

- [ ] **Step 1: Write the failing test**

`etapa2-frontend/src/app/features/nueva-solicitud/nueva-solicitud.spec.ts`:
```ts
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
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
cd etapa2-frontend
npx ng test --watch=false 2>&1 | tail -20
```
Expected: FAIL — no se puede resolver `./nueva-solicitud`.

- [ ] **Step 3: Write minimal implementation**

`etapa2-frontend/src/app/features/nueva-solicitud/nueva-solicitud.ts`:
```ts
import { Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { HttpErrorResponse } from '@angular/common/http';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { RolService } from '../../core/rol.service';
import { SolicitudesApiService } from '../../solicitudes/solicitudes-api.service';
import type { ErrorApi } from '../../solicitudes/solicitud';

@Component({
  selector: 'app-nueva-solicitud',
  imports: [ReactiveFormsModule, MatFormFieldModule, MatInputModule, MatButtonModule],
  templateUrl: './nueva-solicitud.html',
  styleUrl: './nueva-solicitud.scss',
})
export class NuevaSolicitud {
  private readonly fb = inject(FormBuilder);
  private readonly api = inject(SolicitudesApiService);
  private readonly rolService = inject(RolService);
  private readonly router = inject(Router);

  protected readonly enviando = signal(false);

  protected readonly formulario = this.fb.nonNullable.group({
    asunto: this.fb.nonNullable.control('', [Validators.required, Validators.minLength(3)]),
    descripcion: this.fb.nonNullable.control(''),
    area: this.fb.nonNullable.control('', [Validators.required, Validators.minLength(2)]),
    solicitante: this.fb.nonNullable.control(this.rolService.sesion()?.nombre ?? '', [
      Validators.required,
      Validators.email,
    ]),
  });

  protected enviar(): void {
    if (this.formulario.invalid) {
      this.formulario.markAllAsTouched();
      return;
    }
    this.enviando.set(true);
    this.api.crear(this.formulario.getRawValue()).subscribe({
      next: (creada) => {
        this.router.navigate(['/solicitudes', creada.id]);
      },
      error: (err: unknown) => {
        this.enviando.set(false);
        this.aplicarErroresDeCampo(err);
      },
    });
  }

  private aplicarErroresDeCampo(err: unknown): void {
    if (!(err instanceof HttpErrorResponse) || err.status !== 422) {
      return;
    }
    const cuerpo = err.error as { error?: ErrorApi };
    const camposConError = cuerpo.error?.details?.fieldErrors ?? {};
    for (const [campo, mensajes] of Object.entries(camposConError)) {
      const control = this.formulario.get(campo);
      if (control && mensajes.length > 0) {
        control.setErrors({ servidor: mensajes[0] });
      }
    }
  }
}
```

`etapa2-frontend/src/app/features/nueva-solicitud/nueva-solicitud.html`:
```html
<div class="contenedor">
  <h1>Nueva solicitud</h1>
  <form [formGroup]="formulario" (ngSubmit)="enviar()">
    <mat-form-field appearance="outline">
      <mat-label>Asunto</mat-label>
      <input matInput formControlName="asunto" />
      @if (formulario.controls.asunto.invalid && formulario.controls.asunto.touched) {
        <mat-error>{{ formulario.controls.asunto.errors?.['servidor'] ?? 'El asunto debe tener al menos 3 caracteres' }}</mat-error>
      }
    </mat-form-field>

    <mat-form-field appearance="outline">
      <mat-label>Descripción</mat-label>
      <textarea matInput formControlName="descripcion" rows="4"></textarea>
    </mat-form-field>

    <mat-form-field appearance="outline">
      <mat-label>Área</mat-label>
      <input matInput formControlName="area" />
      @if (formulario.controls.area.invalid && formulario.controls.area.touched) {
        <mat-error>{{ formulario.controls.area.errors?.['servidor'] ?? 'El área es requerida' }}</mat-error>
      }
    </mat-form-field>

    <mat-form-field appearance="outline">
      <mat-label>Solicitante</mat-label>
      <input matInput formControlName="solicitante" type="email" />
      @if (formulario.controls.solicitante.invalid && formulario.controls.solicitante.touched) {
        <mat-error>{{ formulario.controls.solicitante.errors?.['servidor'] ?? 'Ingresá un correo válido' }}</mat-error>
      }
    </mat-form-field>

    <button mat-flat-button type="submit" [disabled]="enviando()">
      {{ enviando() ? 'Enviando...' : 'Crear solicitud' }}
    </button>
  </form>
</div>
```

`etapa2-frontend/src/app/features/nueva-solicitud/nueva-solicitud.scss`:
```scss
.contenedor {
  max-width: 480px;
  margin: 2rem auto;

  form {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
  }
}
```

En `etapa2-frontend/src/app/app.routes.ts`, agregar la ruta y la redirección raíz (el arreglo `routes` completo queda así):
```ts
import type { Routes } from '@angular/router';
import { rolGuard } from './core/rol.guard';

export const routes: Routes = [
  { path: '', pathMatch: 'full', redirectTo: 'solicitudes/nueva' },
  {
    path: 'rol',
    loadComponent: () => import('./features/rol-selector/rol-selector').then((m) => m.RolSelector),
  },
  {
    path: 'solicitudes/nueva',
    canActivate: [rolGuard],
    loadComponent: () => import('./features/nueva-solicitud/nueva-solicitud').then((m) => m.NuevaSolicitud),
  },
];
```

- [ ] **Step 4: Run test to verify it passes**

```bash
npx ng test --watch=false 2>&1 | tail -20
```
Expected: PASS — 31 tests.

- [ ] **Step 5: Commit**

```bash
cd ..
git add etapa2-frontend/src/app/features/nueva-solicitud etapa2-frontend/src/app/app.routes.ts
git -c user.name="azorlandoaz" -c user.email="k.horlando@hotmail.com" commit -m "feat(frontend): vista de nueva solicitud, con mapeo de errores 422 a campos"
```

---

### Task 9: Vista "Listado de solicitudes"

**Files:**
- Create: `etapa2-frontend/src/app/features/listado-solicitudes/listado-solicitudes.ts`
- Create: `etapa2-frontend/src/app/features/listado-solicitudes/listado-solicitudes.html`
- Create: `etapa2-frontend/src/app/features/listado-solicitudes/listado-solicitudes.scss`
- Test: `etapa2-frontend/src/app/features/listado-solicitudes/listado-solicitudes.spec.ts`
- Modify: `etapa2-frontend/src/app/app.routes.ts`

**Interfaces:**
- Consumes: `SolicitudesApiService.listar` (Tarea 5), `Solicitud` (Tarea 5), `rolGuard`/`listadoGuard` (Tarea 6).
- Produces: la ruta `/solicitudes`.

- [ ] **Step 1: Write the failing test**

`etapa2-frontend/src/app/features/listado-solicitudes/listado-solicitudes.spec.ts`:
```ts
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
```

- [ ] **Step 2: Run test to verify it fails**

```bash
cd etapa2-frontend
npx ng test --watch=false 2>&1 | tail -20
```
Expected: FAIL — no se puede resolver `./listado-solicitudes`.

- [ ] **Step 3: Write minimal implementation**

`etapa2-frontend/src/app/features/listado-solicitudes/listado-solicitudes.ts`:
```ts
import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { FormBuilder, ReactiveFormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { MatTableModule } from '@angular/material/table';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { SolicitudesApiService } from '../../solicitudes/solicitudes-api.service';
import type { Solicitud } from '../../solicitudes/solicitud';

const TAMANO_PAGINA = 10;

@Component({
  selector: 'app-listado-solicitudes',
  imports: [
    DatePipe,
    ReactiveFormsModule,
    RouterLink,
    MatTableModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
  ],
  templateUrl: './listado-solicitudes.html',
  styleUrl: './listado-solicitudes.scss',
})
export class ListadoSolicitudes implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly api = inject(SolicitudesApiService);

  protected readonly columnas = ['asunto', 'area', 'categoria', 'prioridad', 'estado', 'fechaCreacion', 'acciones'];
  protected readonly solicitudes = signal<Solicitud[]>([]);
  protected readonly pagina = signal(0);
  protected readonly cargando = signal(false);
  protected readonly haySiguientePagina = computed(() => this.solicitudes().length === TAMANO_PAGINA);

  protected readonly filtros = this.fb.nonNullable.group({
    area: this.fb.nonNullable.control(''),
    estado: this.fb.nonNullable.control(''),
    categoria: this.fb.nonNullable.control(''),
  });

  ngOnInit(): void {
    this.buscar();
  }

  protected buscar(): void {
    this.pagina.set(0);
    this.cargar();
  }

  protected paginaAnterior(): void {
    if (this.pagina() === 0) return;
    this.pagina.update((p) => p - 1);
    this.cargar();
  }

  protected paginaSiguiente(): void {
    if (!this.haySiguientePagina()) return;
    this.pagina.update((p) => p + 1);
    this.cargar();
  }

  private cargar(): void {
    this.cargando.set(true);
    const { area, estado, categoria } = this.filtros.getRawValue();
    this.api
      .listar({
        area: area || undefined,
        estado: estado || undefined,
        categoria: categoria || undefined,
        limite: TAMANO_PAGINA,
        desplazamiento: this.pagina() * TAMANO_PAGINA,
      })
      .subscribe({
        next: (resultado) => {
          this.solicitudes.set(resultado);
          this.cargando.set(false);
        },
        error: () => this.cargando.set(false),
      });
  }
}
```

`etapa2-frontend/src/app/features/listado-solicitudes/listado-solicitudes.html`:
```html
<div class="contenedor">
  <h1>Solicitudes</h1>

  <form [formGroup]="filtros" (ngSubmit)="buscar()" class="filtros">
    <mat-form-field appearance="outline">
      <mat-label>Área</mat-label>
      <input matInput formControlName="area" />
    </mat-form-field>
    <mat-form-field appearance="outline">
      <mat-label>Estado</mat-label>
      <input matInput formControlName="estado" placeholder="Abierto o Escalado" />
    </mat-form-field>
    <mat-form-field appearance="outline">
      <mat-label>Categoría</mat-label>
      <input matInput formControlName="categoria" />
    </mat-form-field>
    <button mat-flat-button type="submit">Buscar</button>
  </form>

  @if (cargando()) {
    <p>Cargando...</p>
  } @else if (solicitudes().length === 0) {
    <p>No hay solicitudes con estos filtros.</p>
  } @else {
    <table mat-table [dataSource]="solicitudes()">
      <ng-container matColumnDef="asunto">
        <th mat-header-cell *matHeaderCellDef>Asunto</th>
        <td mat-cell *matCellDef="let s">{{ s.asunto }}</td>
      </ng-container>
      <ng-container matColumnDef="area">
        <th mat-header-cell *matHeaderCellDef>Área</th>
        <td mat-cell *matCellDef="let s">{{ s.area }}</td>
      </ng-container>
      <ng-container matColumnDef="categoria">
        <th mat-header-cell *matHeaderCellDef>Categoría</th>
        <td mat-cell *matCellDef="let s">{{ s.categoria ?? '—' }}</td>
      </ng-container>
      <ng-container matColumnDef="prioridad">
        <th mat-header-cell *matHeaderCellDef>Prioridad</th>
        <td mat-cell *matCellDef="let s">{{ s.prioridad ?? '—' }}</td>
      </ng-container>
      <ng-container matColumnDef="estado">
        <th mat-header-cell *matHeaderCellDef>Estado</th>
        <td mat-cell *matCellDef="let s">{{ s.estado }}</td>
      </ng-container>
      <ng-container matColumnDef="fechaCreacion">
        <th mat-header-cell *matHeaderCellDef>Creada</th>
        <td mat-cell *matCellDef="let s">{{ s.fechaCreacion | date: 'short' }}</td>
      </ng-container>
      <ng-container matColumnDef="acciones">
        <th mat-header-cell *matHeaderCellDef></th>
        <td mat-cell *matCellDef="let s">
          <a mat-button [routerLink]="['/solicitudes', s.id]">Ver</a>
        </td>
      </ng-container>
      <tr mat-header-row *matHeaderRowDef="columnas"></tr>
      <tr mat-row *matRowDef="let row; columns: columnas"></tr>
    </table>

    <div class="paginacion">
      <button mat-button (click)="paginaAnterior()" [disabled]="pagina() === 0">Anterior</button>
      <span>Página {{ pagina() + 1 }}</span>
      <button mat-button (click)="paginaSiguiente()" [disabled]="!haySiguientePagina()">Siguiente</button>
    </div>
  }
</div>
```

`etapa2-frontend/src/app/features/listado-solicitudes/listado-solicitudes.scss`:
```scss
.contenedor {
  max-width: 960px;
  margin: 2rem auto;
}

.filtros {
  display: flex;
  gap: 0.75rem;
  align-items: flex-start;
  flex-wrap: wrap;
}

.paginacion {
  display: flex;
  align-items: center;
  gap: 1rem;
  margin-top: 1rem;
}
```

En `etapa2-frontend/src/app/app.routes.ts`, agregar la ruta del listado (el arreglo `routes` completo queda así):
```ts
import type { Routes } from '@angular/router';
import { rolGuard } from './core/rol.guard';
import { listadoGuard } from './core/listado.guard';

export const routes: Routes = [
  { path: '', pathMatch: 'full', redirectTo: 'solicitudes/nueva' },
  {
    path: 'rol',
    loadComponent: () => import('./features/rol-selector/rol-selector').then((m) => m.RolSelector),
  },
  {
    path: 'solicitudes/nueva',
    canActivate: [rolGuard],
    loadComponent: () => import('./features/nueva-solicitud/nueva-solicitud').then((m) => m.NuevaSolicitud),
  },
  {
    path: 'solicitudes',
    canActivate: [rolGuard, listadoGuard],
    loadComponent: () =>
      import('./features/listado-solicitudes/listado-solicitudes').then((m) => m.ListadoSolicitudes),
  },
];
```

- [ ] **Step 4: Run test to verify it passes**

```bash
npx ng test --watch=false 2>&1 | tail -20
```
Expected: PASS — 35 tests.

- [ ] **Step 5: Commit**

```bash
cd ..
git add etapa2-frontend/src/app/features/listado-solicitudes etapa2-frontend/src/app/app.routes.ts
git -c user.name="azorlandoaz" -c user.email="k.horlando@hotmail.com" commit -m "feat(frontend): vista de listado de solicitudes con filtros y paginacion simple"
```

---

### Task 10: Vista "Detalle de solicitud"

**Files:**
- Create: `etapa2-frontend/src/app/features/detalle-solicitud/detalle-solicitud.ts`
- Create: `etapa2-frontend/src/app/features/detalle-solicitud/detalle-solicitud.html`
- Create: `etapa2-frontend/src/app/features/detalle-solicitud/detalle-solicitud.scss`
- Test: `etapa2-frontend/src/app/features/detalle-solicitud/detalle-solicitud.spec.ts`
- Modify: `etapa2-frontend/src/app/app.routes.ts`

**Interfaces:**
- Consumes: `SolicitudesApiService.obtenerPorId` (Tarea 5), `Solicitud` (Tarea 5), `rolGuard` (Tarea 6).
- Produces: la ruta `/solicitudes/:id`, y el `**` final que cierra el enrutamiento del proyecto.

- [ ] **Step 1: Write the failing test**

`etapa2-frontend/src/app/features/detalle-solicitud/detalle-solicitud.spec.ts`:
```ts
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
```

- [ ] **Step 2: Run test to verify it fails**

```bash
cd etapa2-frontend
npx ng test --watch=false 2>&1 | tail -20
```
Expected: FAIL — no se puede resolver `./detalle-solicitud`.

- [ ] **Step 3: Write minimal implementation**

`etapa2-frontend/src/app/features/detalle-solicitud/detalle-solicitud.ts`:
```ts
import { Component, inject, signal } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { SolicitudesApiService } from '../../solicitudes/solicitudes-api.service';
import type { Solicitud } from '../../solicitudes/solicitud';

@Component({
  selector: 'app-detalle-solicitud',
  imports: [RouterLink, MatButtonModule],
  templateUrl: './detalle-solicitud.html',
  styleUrl: './detalle-solicitud.scss',
})
export class DetalleSolicitud {
  private readonly ruta = inject(ActivatedRoute);
  private readonly api = inject(SolicitudesApiService);

  protected readonly solicitud = signal<Solicitud | null>(null);
  protected readonly noEncontrada = signal(false);

  constructor() {
    const id = this.ruta.snapshot.paramMap.get('id');
    if (!id) {
      this.noEncontrada.set(true);
      return;
    }
    this.api.obtenerPorId(id).subscribe({
      next: (s) => this.solicitud.set(s),
      error: () => this.noEncontrada.set(true),
    });
  }
}
```

`etapa2-frontend/src/app/features/detalle-solicitud/detalle-solicitud.html`:
```html
<div class="contenedor">
  @if (noEncontrada()) {
    <h1>Solicitud no encontrada</h1>
    <a mat-button routerLink="/solicitudes">Volver al listado</a>
  } @else if (solicitud(); as s) {
    <h1>{{ s.asunto }}</h1>
    <dl>
      <dt>Área</dt>
      <dd>{{ s.area }}</dd>
      <dt>Solicitante</dt>
      <dd>{{ s.solicitante }}</dd>
      <dt>Descripción</dt>
      <dd>{{ s.descripcion || '—' }}</dd>
      <dt>Categoría</dt>
      <dd>{{ s.categoria ?? 'Sin clasificar todavía' }}</dd>
      <dt>Prioridad</dt>
      <dd>{{ s.prioridad ?? '—' }}</dd>
      <dt>Confianza de clasificación</dt>
      <dd>{{ s.confianzaClasificacion ?? '—' }}</dd>
      <dt>Estado</dt>
      <dd>{{ s.estado }}</dd>
      <dt>Creada</dt>
      <dd>{{ s.fechaCreacion }}</dd>
    </dl>
    <a mat-button routerLink="/solicitudes/nueva">Nueva solicitud</a>
  } @else {
    <p>Cargando...</p>
  }
</div>
```

`etapa2-frontend/src/app/features/detalle-solicitud/detalle-solicitud.scss`:
```scss
.contenedor {
  max-width: 640px;
  margin: 2rem auto;

  dl {
    display: grid;
    grid-template-columns: max-content 1fr;
    gap: 0.5rem 1rem;
  }

  dt {
    font-weight: 600;
  }
}
```

En `etapa2-frontend/src/app/app.routes.ts`, agregar la ruta de detalle y el `**` final (el arreglo `routes` completo, y final del archivo, queda así):
```ts
import type { Routes } from '@angular/router';
import { rolGuard } from './core/rol.guard';
import { listadoGuard } from './core/listado.guard';

export const routes: Routes = [
  { path: '', pathMatch: 'full', redirectTo: 'solicitudes/nueva' },
  {
    path: 'rol',
    loadComponent: () => import('./features/rol-selector/rol-selector').then((m) => m.RolSelector),
  },
  {
    path: 'solicitudes/nueva',
    canActivate: [rolGuard],
    loadComponent: () => import('./features/nueva-solicitud/nueva-solicitud').then((m) => m.NuevaSolicitud),
  },
  {
    path: 'solicitudes',
    canActivate: [rolGuard, listadoGuard],
    loadComponent: () =>
      import('./features/listado-solicitudes/listado-solicitudes').then((m) => m.ListadoSolicitudes),
  },
  {
    path: 'solicitudes/:id',
    canActivate: [rolGuard],
    loadComponent: () => import('./features/detalle-solicitud/detalle-solicitud').then((m) => m.DetalleSolicitud),
  },
  { path: '**', redirectTo: 'rol' },
];
```

- [ ] **Step 4: Run test to verify it passes**

```bash
npx ng test --watch=false 2>&1 | tail -20
```
Expected: PASS — 38 tests.

- [ ] **Step 5: Commit**

```bash
cd ..
git add etapa2-frontend/src/app/features/detalle-solicitud etapa2-frontend/src/app/app.routes.ts
git -c user.name="azorlandoaz" -c user.email="k.horlando@hotmail.com" commit -m "feat(frontend): vista de detalle de solicitud, con pantalla de no-encontrada"
```

---

### Task 11: Barra superior, README y verificación end-to-end

**Files:**
- Modify: `etapa2-frontend/src/app/app.ts`
- Modify: `etapa2-frontend/src/app/app.html`
- Modify: `etapa2-frontend/src/app/app.scss`
- Modify: `etapa2-frontend/src/app/app.spec.ts`
- Create: `etapa2-frontend/README.md`

**Interfaces:**
- Consumes: `RolService` (Tarea 2) — todo lo demás ya está construido.
- Produces: nada — es el cierre del proyecto.

- [ ] **Step 1: Write the failing test**

Reemplazar el contenido completo de `etapa2-frontend/src/app/app.spec.ts` (el test por defecto de `ng new` verifica un `<h1>` que ya no vamos a tener):
```ts
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { App } from './app';
import { RolService } from './core/rol.service';

describe('App', () => {
  beforeEach(() => {
    localStorage.clear();
    TestBed.configureTestingModule({
      imports: [App],
      providers: [provideRouter([])],
    });
  });

  afterEach(() => localStorage.clear());

  it('se crea correctamente', () => {
    const fixture = TestBed.createComponent(App);
    expect(fixture.componentInstance).toBeTruthy();
  });

  it('no muestra el boton de cambiar rol sin sesion activa', () => {
    const fixture = TestBed.createComponent(App);
    fixture.detectChanges();
    const boton = fixture.nativeElement.querySelector('button');
    expect(boton).toBeNull();
  });

  it('muestra el boton de cambiar rol cuando hay sesion activa', () => {
    TestBed.inject(RolService).establecer({ rol: 'administrador', nombre: 'ana@ejemplo.com' });
    const fixture = TestBed.createComponent(App);
    fixture.detectChanges();
    const boton = fixture.nativeElement.querySelector('button');
    expect(boton?.textContent).toContain('Cambiar rol');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
cd etapa2-frontend
npx ng test --watch=false 2>&1 | tail -20
```
Expected: FAIL — el `app.spec.ts` nuevo busca un botón que `app.html`/`app.ts` (todavía sin editar) no tienen.

- [ ] **Step 3: Write minimal implementation**

Reemplazar el contenido completo de `etapa2-frontend/src/app/app.ts`:
```ts
import { Component, inject } from '@angular/core';
import { Router, RouterOutlet } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatToolbarModule } from '@angular/material/toolbar';
import { RolService } from './core/rol.service';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, MatButtonModule, MatToolbarModule],
  templateUrl: './app.html',
  styleUrl: './app.scss',
})
export class App {
  private readonly rolService = inject(RolService);
  private readonly router = inject(Router);

  protected readonly sesion = this.rolService.sesion;

  protected cambiarRol(): void {
    this.rolService.limpiar();
    this.router.navigate(['/rol']);
  }
}
```

Reemplazar el contenido completo de `etapa2-frontend/src/app/app.html`:
```html
<mat-toolbar color="primary">
  <span>Mesa de Ayuda — Etapa 2</span>
  <span class="separador"></span>
  @if (sesion(); as s) {
    <span class="rol-actual">{{ s.nombre }} ({{ s.rol }})</span>
    <button mat-button (click)="cambiarRol()">Cambiar rol</button>
  }
</mat-toolbar>

<main>
  <router-outlet />
</main>
```

Reemplazar el contenido completo de `etapa2-frontend/src/app/app.scss`:
```scss
.separador {
  flex: 1 1 auto;
}

.rol-actual {
  margin-right: 1rem;
  font-size: 0.9rem;
}

main {
  padding: 1rem;
}
```

- [ ] **Step 4: Run test to verify it passes**

```bash
npx ng test --watch=false 2>&1 | tail -20
```
Expected: PASS — 39 tests (el `app.spec.ts` de esta tarea reemplaza los 2 tests originales por 3 nuevos: 38 de las Tareas 1-10, menos los 2 originales, más los 3 nuevos).

- [ ] **Step 5: Verificación completa: build de producción**

```bash
npx ng build 2>&1 | tail -20
```
Expected: build sin errores ni warnings de tipo (`strict: true` desde el scaffold de la Tarea 1).

- [ ] **Step 6: Escribir el README**

`etapa2-frontend/README.md`:
```markdown
# Etapa 2 — Cliente Angular

Aplicación Angular que consume la API REST de `etapa2-api` (ya
acreditada). **No es parte de los 5 entregables calificados del Anexo
A** — es una adición aparte que vive en su propia rama
(`etapa2-frontend`).

## Instalación y ejecución

Requiere dos procesos corriendo en paralelo:

```bash
# Terminal 1 — API de Etapa 2
cd etapa2-api
cp .env.example .env
npm install
npm run dev

# Terminal 2 — Cliente Angular
cd etapa2-frontend
npm install
npm start
```

Abrir `http://localhost:4200`. El proxy de Angular (`proxy.conf.json`)
reenvía `/api/*` al backend en `http://localhost:3000`, así que no
hace falta configurar CORS en `etapa2-api`.

## Cómo probar los distintos roles

La API no tiene login real — el acceso se controla con el header
`X-Role`. Al entrar por primera vez, la app pide elegir un rol
(`solicitante`, `responsable_area` o `administrador`) y un correo; ese
rol se usa en cada petición hasta que se cambie con el botón "Cambiar
rol" de la barra superior. El listado de solicitudes (`/solicitudes`)
solo es accesible para `responsable_area`/`administrador` — un
`solicitante` que intente entrar es redirigido de vuelta a la
selección de rol.

## Pruebas

```bash
npm test -- --watch=false
```

## Qué no incluye

- Autenticación real — ver spec,
  `docs/superpowers/specs/2026-08-23-etapa2-frontend-angular-design.md`.
- Pipeline de CI propio — es una demo local, no un entregable
  calificado del Anexo A.
```

- [ ] **Step 7: Verificación manual end-to-end**

Con `etapa2-api` corriendo (`npm run dev` desde `etapa2-api/`, puerto 3000) y `etapa2-frontend` corriendo (`npm start` desde `etapa2-frontend/`, puerto 4200):

1. Abrir `http://localhost:4200` → debe redirigir a `/rol`.
2. Elegir rol `solicitante`, correo `demo@ejemplo.com`, continuar → debe navegar a `/solicitudes/nueva` con el campo "Solicitante" precargado.
3. Crear una solicitud (asunto ≥3 caracteres, área ≥2 caracteres) → debe navegar a `/solicitudes/:id` mostrando los datos, con `categoria`/`prioridad` en `null` si `AI_PROVIDER_BASE_URL` no apunta a un proveedor real corriendo (comportamiento esperado, no es un bug de esta vista).
4. Ir a `http://localhost:4200/solicitudes` directamente → debe redirigir a `/rol` con un mensaje (el rol activo es `solicitante`).
5. Cambiar de rol a `administrador`, ir a `/solicitudes` → debe mostrar la tabla con la solicitud creada en el paso 3.
6. Click en "Ver" de esa fila → debe llevar al detalle correcto.
7. Navegar a `http://localhost:4200/solicitudes/id-inexistente` → debe mostrar "Solicitud no encontrada".

Si algún paso no se comporta como se describe, no continuar — reportar como concern con el paso exacto que falló y lo que se observó en su lugar.

- [ ] **Step 8: Commit**

```bash
cd ..
git add etapa2-frontend/src/app/app.ts etapa2-frontend/src/app/app.html etapa2-frontend/src/app/app.scss etapa2-frontend/src/app/app.spec.ts etapa2-frontend/README.md
git -c user.name="azorlandoaz" -c user.email="k.horlando@hotmail.com" commit -m "feat(frontend): barra superior con cambio de rol, README y verificacion end-to-end"
```
