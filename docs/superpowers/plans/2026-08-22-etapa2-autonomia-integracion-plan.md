# Etapa 2 — Autonomía e integración Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** API REST propia en Node/TypeScript (crear/consultar/listar solicitudes), dockerizada junto a MariaDB y `servicio_mock`, con módulo de clasificación por IA desacoplado del proveedor, roles/contratos con autorización ligera, Swagger UI, y corrección auditable de los 3 defectos de `legacy_module.py`.

**Architecture:** Express + TypeScript con capas separadas (`routes` → `services` → `ia`), interfaz `IAProvider` desacoplando el proveedor concreto (implementación HTTP genérica + heurística de respaldo), middleware de error uniforme y de autorización por rol. Persistencia en memoria para esta etapa (la persistencia relacional se profundiza en Etapa 4 — ver Decisión D1). El fix de `legacy_module.py` vive en Python, copiado a `etapa2-api/legacy/` desde `materiales/legacy/` (que no se modifica).

**Tech Stack:** Node.js 20+, TypeScript, Express 4, Zod, `swagger-ui-express`, Vitest + Supertest, Python 3.11+ / pytest (legacy), Docker + Docker Compose.

**Spec:** `docs/superpowers/specs/2026-08-22-etapa2-autonomia-integracion-design.md` (y convenciones transversales en `docs/superpowers/specs/2026-08-22-arquitectura-general-design.md`).

## Decisiones de alcance (D1-D2)

- **D1 — Persistencia en memoria.** El Anexo A no exige un backend de datos para Etapa 2 ("API REST propia con 3 recursos"); "SQL" y "diseño de datos" son criterios de Etapa 1 y Etapa 4, no de Etapa 2. Se usa un store en memoria (`Map`) para mantener el foco en diseño de API/desacoplamiento de IA/robustez, que sí son los criterios evaluados. Se documenta como límite conocido en el README.
- **D2 — Proveedor de IA concreto.** El spec deja "proveedor a decidir". Se implementa un adapter HTTP genérico compatible con el formato `POST {base}/chat/completions` (`{model, messages:[{role,content}]}`, header `Authorization: Bearer <key>`) — compatible con la mayoría de proveedores y con servidores locales (Ollama, LM Studio). Configurable 100% por variables de entorno; cambiar de proveedor no requiere tocar código, solo `.env`.

## Global Constraints

- Rama de trabajo `etapa2-api`, distinta de `master`, creada después de que Etapa 1 esté acreditada.
- Ningún secreto en el repositorio: `.env` fuera de git, solo `.env.example` versionado (incluye el token del `servicio_mock` y la clave del proveedor de IA).
- La lógica de negocio nunca importa el SDK/cliente HTTP del proveedor de IA directamente — solo a través de `IAProvider` (`src/ia/`).
- Forma uniforme de error en toda la API: `{ error: { code, message, details? } }`.
- Cada corrección del legacy lleva prueba que falla antes y pasa después, más una línea de causa raíz (ver tabla de diagnóstico en el spec, reproducida en la Tarea 2-4).
- ≥8 commits atómicos, uno por tarea como mínimo.

---

## File Structure

```
etapa2-api/
├── package.json, tsconfig.json, vitest.config.ts
├── .env.example
├── Dockerfile
├── docker/{docker-compose.yml,.env.example}
├── openapi.yaml
├── docs/roles-y-contratos.md
├── legacy/
│   ├── legacy_module.py          (copiado de materiales/legacy/, luego corregido)
│   └── tests/test_legacy_module.py
├── src/
│   ├── config/env.ts             (carga + valida variables de entorno)
│   ├── errors.ts                 (AppError + errorHandler middleware)
│   ├── logger.ts                 (logger JSON + requestId middleware)
│   ├── store/solicitudesStore.ts (Map en memoria + tipos)
│   ├── middleware/authRole.ts    (autorización por header X-Role)
│   ├── ia/
│   │   ├── IAProvider.ts         (interfaz)
│   │   ├── HeuristicProvider.ts  (fallback por palabras clave)
│   │   ├── HttpChatProvider.ts   (adapter HTTP genérico)
│   │   ├── prompts.ts            (prompt de clasificación versionado)
│   │   └── ClasificadorService.ts (timeout/retry/modo degradado, envuelve IAProvider)
│   ├── routes/solicitudes.ts     (3 endpoints)
│   └── app.ts, server.ts
├── tests/
│   ├── errors.test.ts, authRole.test.ts
│   ├── solicitudesStore.test.ts
│   ├── ia/{HeuristicProvider,ClasificadorService}.test.ts
│   └── routes/solicitudes.test.ts
└── README.md
```

---

### Task 1: Rama y andamiaje del subproyecto Node/TS

**Files:**
- Create: `etapa2-api/package.json`, `etapa2-api/tsconfig.json`, `etapa2-api/vitest.config.ts`
- Create: `etapa2-api/.env.example`
- Create: `etapa2-api/src/config/env.ts`
- Create: `etapa2-api/src/app.ts`, `etapa2-api/src/server.ts`
- Create: `etapa2-api/README.md` (stub)

**Interfaces:**
- Consumes: nada.
- Produces: `cargarConfig(): Config` (`{ puerto, servicioMockUrl, servicioMockToken, aiProviderBaseUrl, aiProviderApiKey, aiTimeoutMs }`) en `src/config/env.ts`, usada por todas las tareas siguientes. `crearApp(): express.Express` en `app.ts`.

- [ ] **Step 1: Crear la rama de trabajo**

```bash
git checkout master
git checkout -b etapa2-api
```

- [ ] **Step 2: package.json y tsconfig**

`etapa2-api/package.json`:
```json
{
  "name": "etapa2-api",
  "version": "1.0.0",
  "type": "module",
  "scripts": {
    "dev": "tsx watch src/server.ts",
    "build": "tsc -p tsconfig.json",
    "start": "node dist/server.js",
    "test": "vitest run"
  },
  "dependencies": {
    "express": "^4.19.2",
    "zod": "^3.23.8",
    "swagger-ui-express": "^5.0.1",
    "yaml": "^2.5.0",
    "dotenv": "^16.4.5"
  },
  "devDependencies": {
    "typescript": "^5.5.4",
    "tsx": "^4.16.2",
    "vitest": "^2.0.5",
    "supertest": "^7.0.0",
    "@types/express": "^4.17.21",
    "@types/supertest": "^6.0.2",
    "@types/swagger-ui-express": "^4.1.6",
    "@types/node": "^20.14.15"
  }
}
```

`etapa2-api/tsconfig.json`:
```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "NodeNext",
    "moduleResolution": "NodeNext",
    "outDir": "dist",
    "rootDir": "src",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "resolveJsonModule": true
  },
  "include": ["src"]
}
```

`etapa2-api/vitest.config.ts`:
```ts
import { defineConfig } from "vitest/config";

export default defineConfig({
  test: { environment: "node" },
});
```

- [ ] **Step 3: Configuración y variables de entorno**

`etapa2-api/.env.example`:
```
PORT=3000

SERVICIO_MOCK_URL=http://localhost:8080
SERVICIO_MOCK_TOKEN=demo-token-prueba-2026

AI_PROVIDER_BASE_URL=http://localhost:11434/v1
AI_PROVIDER_API_KEY=cambia-esta-clave
AI_PROVIDER_MODEL=llama3
AI_TIMEOUT_MS=5000
AI_MAX_REINTENTOS=2
```

`etapa2-api/src/config/env.ts`:
```ts
import "dotenv/config";

export interface Config {
  puerto: number;
  servicioMockUrl: string;
  servicioMockToken: string;
  aiProviderBaseUrl: string;
  aiProviderApiKey: string;
  aiProviderModel: string;
  aiTimeoutMs: number;
  aiMaxReintentos: number;
}

function requerida(nombre: string): string {
  const valor = process.env[nombre];
  if (!valor || valor.trim() === "") {
    throw new Error(`Falta la variable de entorno requerida: ${nombre}`);
  }
  return valor;
}

export function cargarConfig(): Config {
  return {
    puerto: Number(process.env.PORT ?? 3000),
    servicioMockUrl: requerida("SERVICIO_MOCK_URL"),
    servicioMockToken: requerida("SERVICIO_MOCK_TOKEN"),
    aiProviderBaseUrl: requerida("AI_PROVIDER_BASE_URL"),
    aiProviderApiKey: requerida("AI_PROVIDER_API_KEY"),
    aiProviderModel: process.env.AI_PROVIDER_MODEL ?? "llama3",
    aiTimeoutMs: Number(process.env.AI_TIMEOUT_MS ?? 5000),
    aiMaxReintentos: Number(process.env.AI_MAX_REINTENTOS ?? 2),
  };
}
```

- [ ] **Step 4: App y servidor mínimos**

`etapa2-api/src/app.ts`:
```ts
import express from "express";

export function crearApp(): express.Express {
  const app = express();
  app.use(express.json());
  app.get("/health", (_req, res) => {
    res.json({ estado: "operativo" });
  });
  return app;
}
```

`etapa2-api/src/server.ts`:
```ts
import { crearApp } from "./app.js";
import { cargarConfig } from "./config/env.js";

const config = cargarConfig();
const app = crearApp();
app.listen(config.puerto, () => {
  console.log(`etapa2-api escuchando en :${config.puerto}`);
});
```

- [ ] **Step 5: Instalar dependencias y verificar**

```bash
cd etapa2-api
npm install
cp .env.example .env
npm run build
```

Expected: `npm run build` termina sin errores de TypeScript.

- [ ] **Step 6: README stub**

`etapa2-api/README.md`:
```markdown
# Etapa 2 — Autonomía e integración

En construcción. Ver `docs/superpowers/specs/2026-08-22-etapa2-autonomia-integracion-design.md`.
```

- [ ] **Step 7: Commit**

```bash
git add etapa2-api/package.json etapa2-api/tsconfig.json etapa2-api/vitest.config.ts \
        etapa2-api/.env.example etapa2-api/src/config/env.ts etapa2-api/src/app.ts \
        etapa2-api/src/server.ts etapa2-api/README.md etapa2-api/package-lock.json
git commit -m "chore(etapa2): andamiaje del subproyecto Node/TypeScript"
```

---

### Task 2: Legacy — copiar módulo y corregir S1 (pierde tickets)

**Files:**
- Create: `etapa2-api/legacy/legacy_module.py` (copiado de `materiales/legacy/legacy_module.py`, luego corregido)
- Create: `etapa2-api/legacy/tests/__init__.py`, `etapa2-api/legacy/tests/test_legacy_module.py`
- Create: `etapa2-api/legacy/requirements.txt`

**Interfaces:**
- Consumes: nada.
- Produces: `filtrar_por_periodo`, `resumir_por_area`, `contar_reaperturas`, `informe_mensual` (firmas sin cambios respecto al original) — Tareas 3-4 siguen modificando este mismo archivo.

- [ ] **Step 1: Copiar el módulo original tal cual**

```bash
mkdir -p etapa2-api/legacy/tests
cp materiales/legacy/legacy_module.py etapa2-api/legacy/legacy_module.py
```

`etapa2-api/legacy/requirements.txt`:
```
pytest>=8.0,<9
```

`etapa2-api/legacy/tests/__init__.py`: (vacío)

- [ ] **Step 2: Write the failing test (S1)**

`etapa2-api/legacy/tests/test_legacy_module.py`:
```python
from datetime import date

from legacy_module import filtrar_por_periodo


def test_s1_incluye_tickets_creados_el_primer_dia_del_periodo():
    """Causa raíz: filtrar_por_periodo usaba comparadores estrictos
    (fc > inicio and fc < fin), excluyendo los tickets creados exactamente
    el primer o el último día del periodo."""
    tickets = [{"fecha_creacion": "2025-03-01"}]
    resultado = filtrar_por_periodo(tickets, date(2025, 3, 1), date(2025, 3, 31))
    assert len(resultado) == 1


def test_s1_incluye_tickets_creados_el_ultimo_dia_del_periodo():
    tickets = [{"fecha_creacion": "2025-03-31"}]
    resultado = filtrar_por_periodo(tickets, date(2025, 3, 1), date(2025, 3, 31))
    assert len(resultado) == 1
```

- [ ] **Step 2b: Run test to verify it fails**

```bash
cd etapa2-api/legacy
python -m venv .venv
.venv/Scripts/activate  # Windows; en Linux/Mac: source .venv/bin/activate
pip install -r requirements.txt
python -m pytest tests/test_legacy_module.py -v
```

Expected: FAIL — ambos tests devuelven una lista vacía porque `fc > inicio and fc < fin` excluye los bordes.

- [ ] **Step 3: Aplicar el fix**

En `etapa2-api/legacy/legacy_module.py`, dentro de `filtrar_por_periodo`, cambiar:

```python
        if fc > inicio and fc < fin:
```

por:

```python
        # Causa raíz (S1): comparadores estrictos excluían los tickets
        # creados exactamente el primer o el último día del periodo.
        if fc >= inicio and fc <= fin:
```

- [ ] **Step 4: Run test to verify it passes**

```bash
python -m pytest tests/test_legacy_module.py -v
```

Expected: 2 tests PASS.

- [ ] **Step 5: Commit**

```bash
git add etapa2-api/legacy/legacy_module.py etapa2-api/legacy/tests/ etapa2-api/legacy/requirements.txt
git commit -m "fix(etapa2): legacy S1 - incluir tickets en los bordes del periodo"
```

---

### Task 3: Legacy — corregir S2 (cifras infladas)

**Files:**
- Modify: `etapa2-api/legacy/legacy_module.py`
- Modify: `etapa2-api/legacy/tests/test_legacy_module.py`

**Interfaces:**
- Consumes: nada nuevo.
- Produces: `resumir_por_area` sin efectos colaterales entre llamadas.

- [ ] **Step 1: Write the failing test (S2)**

Agregar a `etapa2-api/legacy/tests/test_legacy_module.py`:
```python
from legacy_module import resumir_por_area


def test_s2_llamadas_sucesivas_no_comparten_conteos():
    """Causa raíz: resumir_por_area(tickets, acumulador={}) tiene un
    argumento por defecto mutable — el diccionario se crea una sola vez
    y se reutiliza entre llamadas sucesivas dentro del mismo proceso."""
    primera = resumir_por_area([{"area": "Compras"}])
    segunda = resumir_por_area([{"area": "Calidad"}])
    assert primera == {"Compras": 1}
    assert segunda == {"Calidad": 1}
```

- [ ] **Step 2: Run test to verify it fails**

```bash
python -m pytest tests/test_legacy_module.py::test_s2_llamadas_sucesivas_no_comparten_conteos -v
```

Expected: FAIL — `segunda` incluye `{"Compras": 1, "Calidad": 1}` porque el diccionario se comparte entre llamadas.

- [ ] **Step 3: Aplicar el fix**

Cambiar la firma y cuerpo de `resumir_por_area`:

```python
def resumir_por_area(tickets, acumulador={}):
```

por:

```python
def resumir_por_area(tickets, acumulador=None):
    """Cuenta los tickets por área.

    Devuelve un diccionario {area: cantidad}.
    """
    # Causa raíz (S2): argumento por defecto mutable — se reemplaza por
    # None y se crea un diccionario nuevo en cada llamada.
    if acumulador is None:
        acumulador = {}
```

(mantener el resto del cuerpo de la función sin cambios).

- [ ] **Step 4: Run test to verify it passes**

```bash
python -m pytest tests/test_legacy_module.py -v
```

Expected: 3 tests PASS.

- [ ] **Step 5: Commit**

```bash
git add etapa2-api/legacy/legacy_module.py etapa2-api/legacy/tests/test_legacy_module.py
git commit -m "fix(etapa2): legacy S2 - argumento por defecto mutable en resumir_por_area"
```

---

### Task 4: Legacy — corregir S3 (reaperturas subestimadas)

**Files:**
- Modify: `etapa2-api/legacy/legacy_module.py`
- Modify: `etapa2-api/legacy/tests/test_legacy_module.py`

**Interfaces:**
- Consumes: nada nuevo.
- Produces: `contar_reaperturas` insensible a mayúsculas/minúsculas.

- [ ] **Step 1: Write the failing test (S3)**

Agregar a `etapa2-api/legacy/tests/test_legacy_module.py`:
```python
from legacy_module import contar_reaperturas


def test_s3_cuenta_reabierto_en_mayusculas():
    """Causa raíz: contar_reaperturas comparaba estado == "reabierto" en
    minúscula exacta, pero el dato real trae "REABIERTO" (verificado en
    tickets_historicos.csv, fila TK-00183)."""
    tickets = [{"estado": "REABIERTO"}, {"estado": "Abierto"}]
    assert contar_reaperturas(tickets) == 1
```

- [ ] **Step 2: Run test to verify it fails**

```bash
python -m pytest tests/test_legacy_module.py::test_s3_cuenta_reabierto_en_mayusculas -v
```

Expected: FAIL — devuelve 0 porque `"REABIERTO" == "reabierto"` es `False`.

- [ ] **Step 3: Aplicar el fix**

Cambiar en `contar_reaperturas`:

```python
        if t.get("estado") == "reabierto":
```

por:

```python
        # Causa raíz (S3): comparación sensible a mayúsculas; el dato
        # real trae "REABIERTO" en mayúsculas.
        if (t.get("estado") or "").strip().lower() == "reabierto":
```

- [ ] **Step 4: Run test to verify it passes**

```bash
python -m pytest tests/test_legacy_module.py -v
```

Expected: 4 tests PASS.

- [ ] **Step 5: Commit**

```bash
git add etapa2-api/legacy/legacy_module.py etapa2-api/legacy/tests/test_legacy_module.py
git commit -m "fix(etapa2): legacy S3 - normalizar mayusculas en contar_reaperturas"
```

---

### Task 5: Forma uniforme de error

**Files:**
- Create: `etapa2-api/src/errors.ts`
- Test: `etapa2-api/tests/errors.test.ts`
- Modify: `etapa2-api/src/app.ts`

**Interfaces:**
- Consumes: `crearApp` de la Tarea 1.
- Produces: `class AppError extends Error` (`{ status, code, message, details? }`), `errorHandler` (middleware Express de 4 argumentos) — usados por todas las rutas de las Tareas 7-9 y por `authRole` (Tarea 15).

- [ ] **Step 1: Write the failing test**

`etapa2-api/tests/errors.test.ts`:
```ts
import express from "express";
import request from "supertest";
import { describe, expect, it } from "vitest";
import { AppError, errorHandler } from "../src/errors.js";

function appDePrueba() {
  const app = express();
  app.get("/rompe", () => {
    throw new AppError(400, "ENTRADA_INVALIDA", "El campo 'asunto' es requerido", {
      campo: "asunto",
    });
  });
  app.get("/rompe-generico", () => {
    throw new Error("boom");
  });
  app.use(errorHandler);
  return app;
}

describe("errorHandler", () => {
  it("devuelve la forma uniforme para un AppError", async () => {
    const res = await request(appDePrueba()).get("/rompe");
    expect(res.status).toBe(400);
    expect(res.body).toEqual({
      error: {
        code: "ENTRADA_INVALIDA",
        message: "El campo 'asunto' es requerido",
        details: { campo: "asunto" },
      },
    });
  });

  it("devuelve 500 con la forma uniforme para un error no controlado", async () => {
    const res = await request(appDePrueba()).get("/rompe-generico");
    expect(res.status).toBe(500);
    expect(res.body.error.code).toBe("ERROR_INTERNO");
    expect(res.body.error.message).toBeTypeOf("string");
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
npx vitest run tests/errors.test.ts
```

Expected: FAIL — `../src/errors.js` no existe.

- [ ] **Step 3: Write minimal implementation**

`etapa2-api/src/errors.ts`:
```ts
import type { NextFunction, Request, Response } from "express";

export class AppError extends Error {
  status: number;
  code: string;
  details?: unknown;

  constructor(status: number, code: string, message: string, details?: unknown) {
    super(message);
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

export function errorHandler(
  err: unknown,
  _req: Request,
  res: Response,
  _next: NextFunction
): void {
  if (err instanceof AppError) {
    res.status(err.status).json({
      error: { code: err.code, message: err.message, ...(err.details !== undefined && { details: err.details }) },
    });
    return;
  }
  const mensaje = err instanceof Error ? err.message : "Error interno";
  res.status(500).json({ error: { code: "ERROR_INTERNO", message: mensaje } });
}
```

- [ ] **Step 4: Run test to verify it passes**

```bash
npx vitest run tests/errors.test.ts
```

Expected: 2 tests PASS.

- [ ] **Step 5: Registrar el middleware en la app**

En `etapa2-api/src/app.ts`, importar y usar al final (después de las rutas que se agreguen en tareas siguientes):
```ts
import { errorHandler } from "./errors.js";
// ... rutas ...
app.use(errorHandler);
```

- [ ] **Step 6: Commit**

```bash
git add etapa2-api/src/errors.ts etapa2-api/tests/errors.test.ts etapa2-api/src/app.ts
git commit -m "feat(etapa2): forma uniforme de error y errorHandler"
```

---

### Task 6: Store en memoria de solicitudes

**Files:**
- Create: `etapa2-api/src/store/solicitudesStore.ts`
- Test: `etapa2-api/tests/solicitudesStore.test.ts`

**Interfaces:**
- Consumes: nada.
- Produces: `interface Solicitud { id: string; asunto: string; descripcion: string; area: string; solicitante: string; categoria: string | null; prioridad: string | null; confianzaClasificacion: number | null; estado: "Abierto" | "Escalado"; fechaCreacion: string }`; `crear(datos): Solicitud`; `obtenerPorId(id): Solicitud | undefined`; `listar(filtros: { area?: string; estado?: string; categoria?: string }): Solicitud[]` — usadas por las rutas (Tareas 7-9).

- [ ] **Step 1: Write the failing test**

`etapa2-api/tests/solicitudesStore.test.ts`:
```ts
import { beforeEach, describe, expect, it } from "vitest";
import { crear, listar, obtenerPorId, _reiniciar } from "../src/store/solicitudesStore.js";

beforeEach(() => {
  _reiniciar();
});

describe("solicitudesStore", () => {
  it("crea una solicitud con id generado y estado Abierto", () => {
    const s = crear({ asunto: "Portátil no enciende", descripcion: "", area: "Operaciones", solicitante: "ana@lafortuna.com.co" });
    expect(s.id).toBeTypeOf("string");
    expect(s.estado).toBe("Abierto");
    expect(s.categoria).toBeNull();
  });

  it("obtenerPorId devuelve undefined si no existe", () => {
    expect(obtenerPorId("no-existe")).toBeUndefined();
  });

  it("listar filtra por area y estado", () => {
    crear({ asunto: "A1", descripcion: "", area: "Compras", solicitante: "a@x.com" });
    crear({ asunto: "A2", descripcion: "", area: "Calidad", solicitante: "b@x.com" });
    const resultado = listar({ area: "Compras" });
    expect(resultado).toHaveLength(1);
    expect(resultado[0].area).toBe("Compras");
  });

  it("listar sin filtros ni resultados devuelve lista vacia, no error", () => {
    expect(listar({})).toEqual([]);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
npx vitest run tests/solicitudesStore.test.ts
```

Expected: FAIL — el módulo no existe.

- [ ] **Step 3: Write minimal implementation**

`etapa2-api/src/store/solicitudesStore.ts`:
```ts
import { randomUUID } from "node:crypto";

export interface Solicitud {
  id: string;
  asunto: string;
  descripcion: string;
  area: string;
  solicitante: string;
  categoria: string | null;
  prioridad: string | null;
  confianzaClasificacion: number | null;
  estado: "Abierto" | "Escalado";
  fechaCreacion: string;
}

export interface DatosNuevaSolicitud {
  asunto: string;
  descripcion: string;
  area: string;
  solicitante: string;
}

let solicitudes = new Map<string, Solicitud>();

export function crear(datos: DatosNuevaSolicitud): Solicitud {
  const solicitud: Solicitud = {
    id: randomUUID(),
    asunto: datos.asunto,
    descripcion: datos.descripcion,
    area: datos.area,
    solicitante: datos.solicitante,
    categoria: null,
    prioridad: null,
    confianzaClasificacion: null,
    estado: "Abierto",
    fechaCreacion: new Date().toISOString(),
  };
  solicitudes.set(solicitud.id, solicitud);
  return solicitud;
}

export function obtenerPorId(id: string): Solicitud | undefined {
  return solicitudes.get(id);
}

export function actualizarClasificacion(
  id: string,
  categoria: string,
  prioridad: string,
  confianza: number,
  umbralEscalamiento: number
): Solicitud | undefined {
  const s = solicitudes.get(id);
  if (!s) return undefined;
  s.categoria = categoria;
  s.prioridad = prioridad;
  s.confianzaClasificacion = confianza;
  s.estado = confianza < umbralEscalamiento ? "Escalado" : "Abierto";
  return s;
}

export function listar(filtros: { area?: string; estado?: string; categoria?: string }): Solicitud[] {
  return [...solicitudes.values()].filter((s) => {
    if (filtros.area && s.area.toLowerCase() !== filtros.area.toLowerCase()) return false;
    if (filtros.estado && s.estado.toLowerCase() !== filtros.estado.toLowerCase()) return false;
    if (filtros.categoria && s.categoria?.toLowerCase() !== filtros.categoria.toLowerCase()) return false;
    return true;
  });
}

/** Solo para pruebas: limpia el store entre tests. */
export function _reiniciar(): void {
  solicitudes = new Map();
}
```

- [ ] **Step 4: Run test to verify it passes**

```bash
npx vitest run tests/solicitudesStore.test.ts
```

Expected: 4 tests PASS.

- [ ] **Step 5: Commit**

```bash
git add etapa2-api/src/store/solicitudesStore.ts etapa2-api/tests/solicitudesStore.test.ts
git commit -m "feat(etapa2): store en memoria de solicitudes"
```

---

### Task 7: Recurso crear solicitud (POST /solicitudes)

**Files:**
- Create: `etapa2-api/src/routes/solicitudes.ts`
- Test: `etapa2-api/tests/routes/solicitudes.test.ts`
- Modify: `etapa2-api/src/app.ts`

**Interfaces:**
- Consumes: `crear` de `store/solicitudesStore.ts` (Tarea 6); `AppError` de `errors.ts` (Tarea 5).
- Produces: router Express exportado como `solicitudesRouter`, montado en `/solicitudes` — extendido por las Tareas 8-9 y 11 (clasificación).

- [ ] **Step 1: Write the failing test**

`etapa2-api/tests/routes/solicitudes.test.ts`:
```ts
import request from "supertest";
import { beforeEach, describe, expect, it } from "vitest";
import { crearApp } from "../../src/app.js";
import { _reiniciar } from "../../src/store/solicitudesStore.js";

beforeEach(() => {
  _reiniciar();
});

describe("POST /solicitudes", () => {
  it("crea una solicitud y devuelve 201 con el cuerpo creado", async () => {
    const res = await request(crearApp())
      .post("/solicitudes")
      .send({ asunto: "El portátil no enciende", descripcion: "Desde ayer", area: "Operaciones", solicitante: "ana@lafortuna.com.co" });

    expect(res.status).toBe(201);
    expect(res.body.id).toBeTypeOf("string");
    expect(res.body.asunto).toBe("El portátil no enciende");
    expect(res.body.estado).toBe("Abierto");
  });

  it("devuelve 422 si falta un campo requerido", async () => {
    const res = await request(crearApp())
      .post("/solicitudes")
      .send({ descripcion: "sin asunto", area: "Operaciones", solicitante: "ana@lafortuna.com.co" });

    expect(res.status).toBe(422);
    expect(res.body.error.code).toBe("ENTRADA_INVALIDA");
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
npx vitest run tests/routes/solicitudes.test.ts
```

Expected: FAIL — `POST /solicitudes` no existe (404) o el router no existe.

- [ ] **Step 3: Write minimal implementation**

`etapa2-api/src/routes/solicitudes.ts`:
```ts
import { Router } from "express";
import { z } from "zod";
import { AppError } from "../errors.js";
import { crear, listar, obtenerPorId } from "../store/solicitudesStore.js";

export const solicitudesRouter = Router();

const EntradaSolicitud = z.object({
  asunto: z.string().min(3, "El asunto debe tener al menos 3 caracteres"),
  descripcion: z.string().default(""),
  area: z.string().min(2, "El área es requerida"),
  solicitante: z.string().email("El solicitante debe ser un correo válido"),
});

solicitudesRouter.post("/", (req, res, next) => {
  const parseo = EntradaSolicitud.safeParse(req.body);
  if (!parseo.success) {
    return next(
      new AppError(422, "ENTRADA_INVALIDA", "Cuerpo de la solicitud inválido", parseo.error.flatten())
    );
  }
  const solicitud = crear(parseo.data);
  res.status(201).json(solicitud);
});

solicitudesRouter.get("/:id", (req, res, next) => {
  const solicitud = obtenerPorId(req.params.id);
  if (!solicitud) {
    return next(new AppError(404, "NO_ENCONTRADA", "Solicitud no encontrada"));
  }
  res.json(solicitud);
});

solicitudesRouter.get("/", (req, res) => {
  const { area, estado, categoria } = req.query;
  res.json(
    listar({
      area: typeof area === "string" ? area : undefined,
      estado: typeof estado === "string" ? estado : undefined,
      categoria: typeof categoria === "string" ? categoria : undefined,
    })
  );
});
```

- [ ] **Step 4: Montar el router en la app**

En `etapa2-api/src/app.ts`, agregar antes de `app.use(errorHandler)`:
```ts
import { solicitudesRouter } from "./routes/solicitudes.js";
// ...
app.use("/solicitudes", solicitudesRouter);
```

- [ ] **Step 5: Run test to verify it passes**

```bash
npx vitest run tests/routes/solicitudes.test.ts
```

Expected: 2 tests PASS.

- [ ] **Step 6: Commit**

```bash
git add etapa2-api/src/routes/solicitudes.ts etapa2-api/tests/routes/solicitudes.test.ts etapa2-api/src/app.ts
git commit -m "feat(etapa2): recurso crear solicitud (POST /solicitudes)"
```

---

### Task 8: Recurso consultar estado (GET /solicitudes/:id)

**Files:**
- Modify: `etapa2-api/tests/routes/solicitudes.test.ts`

**Interfaces:**
- Consumes: el endpoint `GET /:id` ya implementado en la Tarea 7 (el router ya lo define — esta tarea es de verificación explícita con sus propios tests, como pide el spec).
- Produces: nada nuevo.

- [ ] **Step 1: Write the failing test**

Agregar a `etapa2-api/tests/routes/solicitudes.test.ts`:
```ts
describe("GET /solicitudes/:id", () => {
  it("devuelve 200 con la solicitud si existe", async () => {
    const app = crearApp();
    const creada = await request(app)
      .post("/solicitudes")
      .send({ asunto: "Cuántos días de vacaciones tengo", descripcion: "", area: "Talento Humano", solicitante: "ana@lafortuna.com.co" });

    const res = await request(app).get(`/solicitudes/${creada.body.id}`);
    expect(res.status).toBe(200);
    expect(res.body.id).toBe(creada.body.id);
  });

  it("devuelve 404 con la forma uniforme si no existe", async () => {
    const res = await request(crearApp()).get("/solicitudes/no-existe");
    expect(res.status).toBe(404);
    expect(res.body).toEqual({ error: { code: "NO_ENCONTRADA", message: "Solicitud no encontrada" } });
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
npx vitest run tests/routes/solicitudes.test.ts
```

Expected: si la Tarea 7 quedó bien implementada, estos tests ya PASAN de inmediato (no hay código nuevo que escribir) — esto confirma la cobertura. Si algo falla, corregir `routes/solicitudes.ts` antes de continuar.

- [ ] **Step 3: Run full test file to confirm no regressions**

```bash
npx vitest run tests/routes/solicitudes.test.ts
```

Expected: 4 tests PASS (2 de la Tarea 7 + 2 nuevos).

- [ ] **Step 4: Commit**

```bash
git add etapa2-api/tests/routes/solicitudes.test.ts
git commit -m "test(etapa2): cobertura explicita de GET /solicitudes/:id"
```

---

### Task 9: Recurso listar con filtros (GET /solicitudes)

**Files:**
- Modify: `etapa2-api/tests/routes/solicitudes.test.ts`

**Interfaces:**
- Consumes: el endpoint `GET /` ya implementado en la Tarea 7.
- Produces: nada nuevo.

- [ ] **Step 1: Write the failing test**

Agregar a `etapa2-api/tests/routes/solicitudes.test.ts`:
```ts
describe("GET /solicitudes", () => {
  it("lista con filtro de area", async () => {
    const app = crearApp();
    await request(app).post("/solicitudes").send({ asunto: "Uno", descripcion: "", area: "Compras", solicitante: "a@x.com" });
    await request(app).post("/solicitudes").send({ asunto: "Dos", descripcion: "", area: "Calidad", solicitante: "b@x.com" });

    const res = await request(app).get("/solicitudes?area=Compras");
    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(1);
    expect(res.body[0].area).toBe("Compras");
  });

  it("devuelve lista vacia (200, no error) si no hay resultados", async () => {
    const res = await request(crearApp()).get("/solicitudes?area=NoExiste");
    expect(res.status).toBe(200);
    expect(res.body).toEqual([]);
  });
});
```

- [ ] **Step 2: Run test to verify it passes (ya implementado en Tarea 7)**

```bash
npx vitest run tests/routes/solicitudes.test.ts
```

Expected: 6 tests PASS. Si falla, corregir `listar` en `solicitudesStore.ts` o el handler `GET /` en `routes/solicitudes.ts`.

- [ ] **Step 3: Commit**

```bash
git add etapa2-api/tests/routes/solicitudes.test.ts
git commit -m "test(etapa2): cobertura explicita de GET /solicitudes con filtros"
```

---

### Task 10: Interfaz IAProvider y HeuristicProvider (fallback)

**Files:**
- Create: `etapa2-api/src/ia/IAProvider.ts`
- Create: `etapa2-api/src/ia/HeuristicProvider.ts`
- Test: `etapa2-api/tests/ia/HeuristicProvider.test.ts`

**Interfaces:**
- Consumes: nada.
- Produces: `interface IAProvider { clasificar(texto): Promise<{categoria,confianza}>; generarRespuesta(prompt,contexto): Promise<string>; embeber(textos): Promise<number[][]> }` (ver spec maestro §4.1); `class HeuristicProvider implements IAProvider` — usada como fallback por `ClasificadorService` (Tarea 11).

- [ ] **Step 1: Write the failing test**

`etapa2-api/tests/ia/HeuristicProvider.test.ts`:
```ts
import { describe, expect, it } from "vitest";
import { HeuristicProvider } from "../../src/ia/HeuristicProvider.js";

describe("HeuristicProvider", () => {
  const provider = new HeuristicProvider();

  it("clasifica por palabra clave de vacaciones", async () => {
    const r = await provider.clasificar("Necesito solicitar mis vacaciones de diciembre");
    expect(r.categoria).toBe("Vacaciones");
    expect(r.confianza).toBeGreaterThan(0);
  });

  it("clasifica por palabra clave de hardware", async () => {
    const r = await provider.clasificar("El portátil no enciende desde ayer");
    expect(r.categoria).toBe("Hardware");
  });

  it("devuelve categoria 'Sin clasificar' con confianza baja si no reconoce nada", async () => {
    const r = await provider.clasificar("xyz texto sin señales reconocibles 123");
    expect(r.categoria).toBe("Sin clasificar");
    expect(r.confianza).toBeLessThan(0.5);
  });

  it("generarRespuesta devuelve un mensaje fijo de no disponible", async () => {
    const r = await provider.generarRespuesta("hola", []);
    expect(r).toContain("no está disponible");
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
npx vitest run tests/ia/HeuristicProvider.test.ts
```

Expected: FAIL — los módulos no existen.

- [ ] **Step 3: Write minimal implementation**

`etapa2-api/src/ia/IAProvider.ts`:
```ts
export interface ResultadoClasificacion {
  categoria: string;
  confianza: number;
}

/** Interfaz común para cualquier proveedor de IA (ver spec maestro §4.1). */
export interface IAProvider {
  clasificar(texto: string): Promise<ResultadoClasificacion>;
  generarRespuesta(prompt: string, contexto: string[]): Promise<string>;
  embeber(textos: string[]): Promise<number[][]>;
}
```

`etapa2-api/src/ia/HeuristicProvider.ts`:
```ts
import type { IAProvider, ResultadoClasificacion } from "./IAProvider.js";

const PALABRAS_CLAVE: Record<string, string[]> = {
  Vacaciones: ["vacaciones", "días libres", "descanso"],
  Hardware: ["portátil", "portatil", "computador", "no enciende", "pantalla", "teclado"],
  Software: ["aplicación", "aplicacion", "error al guardar", "se cierra"],
  "Gestión de accesos": ["bloqueó mi usuario", "bloqueo", "acceso", "contraseña", "contrasena"],
  Viáticos: ["viático", "viatico", "hospedaje", "reembolso"],
  Conectividad: ["conexión", "conexion", "internet", "red lenta", "wifi"],
  Compras: ["cotización", "cotizacion", "orden de compra", "proveedor"],
  Incidentes: ["incidente", "pérdida de información", "perdida de informacion"],
};

/** Fallback determinista sin dependencias externas: clasifica por
 * coincidencia de palabras clave. Se activa cuando el proveedor real
 * no responde (ver ClasificadorService). No sustituye un LLM real —
 * es intencionalmente simple para no fallar nunca. */
export class HeuristicProvider implements IAProvider {
  async clasificar(texto: string): Promise<ResultadoClasificacion> {
    const normalizado = texto.toLowerCase();
    for (const [categoria, palabras] of Object.entries(PALABRAS_CLAVE)) {
      if (palabras.some((p) => normalizado.includes(p))) {
        return { categoria, confianza: 0.6 };
      }
    }
    return { categoria: "Sin clasificar", confianza: 0.1 };
  }

  async generarRespuesta(_prompt: string, _contexto: string[]): Promise<string> {
    return "El servicio de generación de respuestas no está disponible en este momento.";
  }

  async embeber(textos: string[]): Promise<number[][]> {
    // Vector determinista basado en longitud/hash simple — solo para que
    // el contrato de la interfaz se cumpla en modo degradado; no apto
    // para recuperación semántica real (eso lo resuelve Etapa 3).
    return textos.map((t) => [t.length % 97, [...t].reduce((acc, c) => acc + c.charCodeAt(0), 0) % 97]);
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

```bash
npx vitest run tests/ia/HeuristicProvider.test.ts
```

Expected: 4 tests PASS.

- [ ] **Step 5: Commit**

```bash
git add etapa2-api/src/ia/IAProvider.ts etapa2-api/src/ia/HeuristicProvider.ts etapa2-api/tests/ia/HeuristicProvider.test.ts
git commit -m "feat(etapa2): interfaz IAProvider y heuristica de respaldo"
```

---

### Task 11: HttpChatProvider y ClasificadorService (timeout/retry/modo degradado)

**Files:**
- Create: `etapa2-api/src/ia/HttpChatProvider.ts`
- Create: `etapa2-api/src/ia/ClasificadorService.ts`
- Test: `etapa2-api/tests/ia/ClasificadorService.test.ts`
- Modify: `etapa2-api/src/routes/solicitudes.ts` (integra clasificación en `POST /`)
- Modify: `etapa2-api/tests/routes/solicitudes.test.ts`

**Interfaces:**
- Consumes: `IAProvider`, `HeuristicProvider` (Tarea 10); `AppError` (Tarea 5); `actualizarClasificacion` de `store/solicitudesStore.ts` (Tarea 6); `cargarConfig` (Tarea 1).
- Produces: `class ClasificadorService { constructor(proveedorPrincipal: IAProvider, respaldo: IAProvider, timeoutMs: number, maxReintentos: number); clasificar(texto: string): Promise<ResultadoClasificacion> }` — usado por `routes/solicitudes.ts` y reutilizable en Etapas 3-4.

- [ ] **Step 1: Write the failing test**

`etapa2-api/tests/ia/ClasificadorService.test.ts`:
```ts
import { describe, expect, it, vi } from "vitest";
import { ClasificadorService } from "../../src/ia/ClasificadorService.js";
import type { IAProvider } from "../../src/ia/IAProvider.js";

function proveedorQueFalla(): IAProvider {
  return {
    clasificar: vi.fn().mockRejectedValue(new Error("timeout simulado")),
    generarRespuesta: vi.fn(),
    embeber: vi.fn(),
  };
}

function proveedorQueResponde(categoria: string, confianza: number): IAProvider {
  return {
    clasificar: vi.fn().mockResolvedValue({ categoria, confianza }),
    generarRespuesta: vi.fn(),
    embeber: vi.fn(),
  };
}

describe("ClasificadorService", () => {
  it("usa el proveedor principal si responde", async () => {
    const principal = proveedorQueResponde("Vacaciones", 0.9);
    const respaldo = proveedorQueResponde("Sin clasificar", 0.1);
    const servicio = new ClasificadorService(principal, respaldo, 1000, 1);

    const r = await servicio.clasificar("texto");
    expect(r.categoria).toBe("Vacaciones");
    expect(respaldo.clasificar).not.toHaveBeenCalled();
  });

  it("cae al respaldo cuando el principal falla tras agotar reintentos, sin lanzar excepcion", async () => {
    const principal = proveedorQueFalla();
    const respaldo = proveedorQueResponde("Sin clasificar", 0.1);
    const servicio = new ClasificadorService(principal, respaldo, 1000, 2);

    const r = await servicio.clasificar("texto");
    expect(r.categoria).toBe("Sin clasificar");
    expect(principal.clasificar).toHaveBeenCalledTimes(2);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
npx vitest run tests/ia/ClasificadorService.test.ts
```

Expected: FAIL — el módulo no existe.

- [ ] **Step 3: Write minimal implementation**

`etapa2-api/src/ia/HttpChatProvider.ts`:
```ts
import type { IAProvider, ResultadoClasificacion } from "./IAProvider.js";

interface OpcionesHttpChatProvider {
  baseUrl: string;
  apiKey: string;
  modelo: string;
  timeoutMs: number;
}

/** Adapter HTTP genérico compatible con endpoints estilo
 * "POST {baseUrl}/chat/completions" (OpenAI-compatible: la mayoría de
 * proveedores y servidores locales como Ollama/LM Studio lo soportan).
 * Cambiar de proveedor es cuestión de variables de entorno, no de código. */
export class HttpChatProvider implements IAProvider {
  constructor(private readonly opciones: OpcionesHttpChatProvider) {}

  private async completar(prompt: string): Promise<string> {
    const controlador = new AbortController();
    const timeout = setTimeout(() => controlador.abort(), this.opciones.timeoutMs);
    try {
      const respuesta = await fetch(`${this.opciones.baseUrl}/chat/completions`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${this.opciones.apiKey}`,
        },
        body: JSON.stringify({
          model: this.opciones.modelo,
          messages: [{ role: "user", content: prompt }],
        }),
        signal: controlador.signal,
      });
      if (!respuesta.ok) {
        throw new Error(`Proveedor de IA respondió HTTP ${respuesta.status}`);
      }
      const cuerpo = (await respuesta.json()) as {
        choices: { message: { content: string } }[];
      };
      return cuerpo.choices[0].message.content;
    } finally {
      clearTimeout(timeout);
    }
  }

  async clasificar(texto: string): Promise<ResultadoClasificacion> {
    const { promptClasificacion } = await import("./prompts.js");
    const salida = await this.completar(promptClasificacion(texto));
    const parseado = JSON.parse(salida) as ResultadoClasificacion;
    return parseado;
  }

  async generarRespuesta(prompt: string, contexto: string[]): Promise<string> {
    const promptCompleto = contexto.length > 0 ? `${contexto.join("\n")}\n\n${prompt}` : prompt;
    return this.completar(promptCompleto);
  }

  async embeber(textos: string[]): Promise<number[][]> {
    const respuesta = await fetch(`${this.opciones.baseUrl}/embeddings`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${this.opciones.apiKey}`,
      },
      body: JSON.stringify({ model: this.opciones.modelo, input: textos }),
    });
    const cuerpo = (await respuesta.json()) as { data: { embedding: number[] }[] };
    return cuerpo.data.map((d) => d.embedding);
  }
}
```

`etapa2-api/src/ia/ClasificadorService.ts`:
```ts
import type { IAProvider, ResultadoClasificacion } from "./IAProvider.js";

/** Envuelve un IAProvider principal con timeout, reintentos y un
 * proveedor de respaldo activado cuando el principal se agota — nunca
 * lanza hacia el caller, siempre devuelve una clasificación utilizable
 * (modo degradado en vez de un 500). */
export class ClasificadorService {
  constructor(
    private readonly principal: IAProvider,
    private readonly respaldo: IAProvider,
    private readonly timeoutMs: number,
    private readonly maxReintentos: number
  ) {}

  private async conTimeout<T>(promesa: Promise<T>): Promise<T> {
    return Promise.race([
      promesa,
      new Promise<T>((_resolve, reject) =>
        setTimeout(() => reject(new Error("timeout del proveedor de IA")), this.timeoutMs)
      ),
    ]);
  }

  async clasificar(texto: string): Promise<ResultadoClasificacion> {
    for (let intento = 1; intento <= this.maxReintentos; intento++) {
      try {
        return await this.conTimeout(this.principal.clasificar(texto));
      } catch {
        if (intento === this.maxReintentos) break;
        await new Promise((r) => setTimeout(r, 2 ** intento * 50));
      }
    }
    return this.respaldo.clasificar(texto);
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

```bash
npx vitest run tests/ia/ClasificadorService.test.ts
```

Expected: 2 tests PASS.

- [ ] **Step 5: Integrar en la creación de solicitudes**

En `etapa2-api/src/routes/solicitudes.ts`, agregar arriba (junto a los demás imports):
```ts
import { ClasificadorService } from "../ia/ClasificadorService.js";
import { HeuristicProvider } from "../ia/HeuristicProvider.js";
import { HttpChatProvider } from "../ia/HttpChatProvider.js";
import { actualizarClasificacion } from "../store/solicitudesStore.js";
import { cargarConfig } from "../config/env.js";

const config = cargarConfig();
const clasificador = new ClasificadorService(
  new HttpChatProvider({
    baseUrl: config.aiProviderBaseUrl,
    apiKey: config.aiProviderApiKey,
    modelo: config.aiProviderModel,
    timeoutMs: config.aiTimeoutMs,
  }),
  new HeuristicProvider(),
  config.aiTimeoutMs,
  config.aiMaxReintentos
);
const UMBRAL_ESCALAMIENTO = 0.4;
```

Y reemplazar el handler `POST /` para clasificar tras crear:
```ts
solicitudesRouter.post("/", async (req, res, next) => {
  const parseo = EntradaSolicitud.safeParse(req.body);
  if (!parseo.success) {
    return next(
      new AppError(422, "ENTRADA_INVALIDA", "Cuerpo de la solicitud inválido", parseo.error.flatten())
    );
  }
  const solicitud = crear(parseo.data);
  const clasificacion = await clasificador.clasificar(`${solicitud.asunto} ${solicitud.descripcion}`);
  const actualizada = actualizarClasificacion(
    solicitud.id,
    clasificacion.categoria,
    clasificacion.confianza >= UMBRAL_ESCALAMIENTO ? "Media" : "Alta",
    clasificacion.confianza,
    UMBRAL_ESCALAMIENTO
  );
  res.status(201).json(actualizada);
});
```

- [ ] **Step 6: Actualizar el test de creación (ahora incluye categoría) y correr todo**

En `etapa2-api/tests/routes/solicitudes.test.ts`, en el test "crea una solicitud y devuelve 201 con el cuerpo creado", agregar tras las aserciones existentes:
```ts
    expect(["Vacaciones", "Sin clasificar", "Hardware", "Software", "Gestión de accesos", "Viáticos", "Conectividad", "Compras", "Incidentes"]).toContain(res.body.categoria);
```

```bash
npx vitest run
```

Expected: toda la suite pasa (el proveedor HTTP real fallará contra `AI_PROVIDER_BASE_URL` de ejemplo y caerá al `HeuristicProvider`, que sí clasifica "portátil no enciende" → "Hardware" de forma determinista).

- [ ] **Step 7: Commit**

```bash
git add etapa2-api/src/ia/HttpChatProvider.ts etapa2-api/src/ia/ClasificadorService.ts \
        etapa2-api/tests/ia/ClasificadorService.test.ts etapa2-api/src/routes/solicitudes.ts \
        etapa2-api/tests/routes/solicitudes.test.ts
git commit -m "feat(etapa2): HttpChatProvider y ClasificadorService con modo degradado"
```

---

### Task 12: Prompt de clasificación versionado

**Files:**
- Create: `etapa2-api/src/ia/prompts.ts`
- Test: `etapa2-api/tests/ia/prompts.test.ts`

**Interfaces:**
- Consumes: nada.
- Produces: `promptClasificacion(texto: string): string`, ya importado dinámicamente por `HttpChatProvider.clasificar` (Tarea 11).

- [ ] **Step 1: Write the failing test**

`etapa2-api/tests/ia/prompts.test.ts`:
```ts
import { describe, expect, it } from "vitest";
import { promptClasificacion } from "../../src/ia/prompts.js";

describe("promptClasificacion", () => {
  it("incluye el texto de la solicitud y el catálogo de categorías", () => {
    const prompt = promptClasificacion("El portátil no enciende desde ayer");
    expect(prompt).toContain("El portátil no enciende desde ayer");
    expect(prompt).toContain("Hardware");
    expect(prompt).toContain("JSON");
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
npx vitest run tests/ia/prompts.test.ts
```

Expected: FAIL — el módulo no existe.

- [ ] **Step 3: Write minimal implementation**

`etapa2-api/src/ia/prompts.ts`:
```ts
const CATEGORIAS = [
  "Vacaciones",
  "Hardware",
  "Software",
  "Gestión de accesos",
  "Viáticos",
  "Conectividad",
  "Compras",
  "Incidentes",
  "Sin clasificar",
] as const;

const EJEMPLOS = [
  { texto: "Necesito solicitar mis vacaciones de diciembre", categoria: "Vacaciones" },
  { texto: "El portátil no enciende desde ayer", categoria: "Hardware" },
  { texto: "Se bloqueó mi usuario tras varios intentos", categoria: "Gestión de accesos" },
  { texto: "Cuál es el monto autorizado para hospedaje", categoria: "Viáticos" },
];

/** Prompt versionado (v1) de clasificación. Few-shot con ejemplos reales
 * del histórico de tickets; exige salida JSON estricta para que
 * HttpChatProvider.clasificar pueda parsearla sin post-procesamiento. */
export function promptClasificacion(texto: string): string {
  const ejemplos = EJEMPLOS.map((e) => `Texto: "${e.texto}"\nCategoría: ${e.categoria}`).join("\n\n");
  return [
    `Clasifica la siguiente solicitud interna en una de estas categorías: ${CATEGORIAS.join(", ")}.`,
    `Responde ÚNICAMENTE con JSON válido de la forma {"categoria": "...", "confianza": 0.0-1.0}, sin texto adicional.`,
    ``,
    `Ejemplos:`,
    ejemplos,
    ``,
    `Texto a clasificar: "${texto}"`,
  ].join("\n");
}
```

- [ ] **Step 4: Run test to verify it passes**

```bash
npx vitest run tests/ia/prompts.test.ts
```

Expected: 1 test PASS.

- [ ] **Step 5: Documentar el razonamiento del prompt en el README**

Agregar a `etapa2-api/README.md` (se completa del todo en la Tarea 16) una sección:
```markdown
## Prompt de clasificación (v1)

Few-shot con 4 ejemplos reales del histórico, exige salida JSON estricta
para evitar post-procesamiento frágil de texto libre. Ver
`src/ia/prompts.ts`.
```

- [ ] **Step 6: Commit**

```bash
git add etapa2-api/src/ia/prompts.ts etapa2-api/tests/ia/prompts.test.ts etapa2-api/README.md
git commit -m "feat(etapa2): prompt de clasificacion versionado (few-shot)"
```

---

### Task 13: Configuración y secretos — validación al arranque

**Files:**
- Test: `etapa2-api/tests/config/env.test.ts`

**Interfaces:**
- Consumes: `cargarConfig` (Tarea 1).
- Produces: nada nuevo — esta tarea es de verificación explícita, como pide el spec (criterio "configuración, registro y secretos").

- [ ] **Step 1: Write the failing test**

`etapa2-api/tests/config/env.test.ts`:
```ts
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { cargarConfig } from "../../src/config/env.js";

const ORIGINAL_ENV = { ...process.env };

beforeEach(() => {
  process.env = { ...ORIGINAL_ENV };
});

afterEach(() => {
  process.env = { ...ORIGINAL_ENV };
});

describe("cargarConfig", () => {
  it("lanza un error claro si falta SERVICIO_MOCK_URL", () => {
    delete process.env.SERVICIO_MOCK_URL;
    expect(() => cargarConfig()).toThrow("SERVICIO_MOCK_URL");
  });

  it("lanza un error claro si falta AI_PROVIDER_API_KEY", () => {
    delete process.env.AI_PROVIDER_API_KEY;
    expect(() => cargarConfig()).toThrow("AI_PROVIDER_API_KEY");
  });

  it("carga correctamente cuando todas las variables requeridas existen", () => {
    process.env.SERVICIO_MOCK_URL = "http://localhost:8080";
    process.env.SERVICIO_MOCK_TOKEN = "t";
    process.env.AI_PROVIDER_BASE_URL = "http://localhost:11434/v1";
    process.env.AI_PROVIDER_API_KEY = "k";
    const config = cargarConfig();
    expect(config.servicioMockUrl).toBe("http://localhost:8080");
  });
});
```

- [ ] **Step 2: Run test to verify it passes (ya implementado en Tarea 1)**

```bash
npx vitest run tests/config/env.test.ts
```

Expected: 3 tests PASS de inmediato, confirmando que `requerida()` de la Tarea 1 ya cumple el criterio. Si falla, ajustar `src/config/env.ts`.

- [ ] **Step 3: Revisión manual de secretos**

```bash
git log -p --all -- etapa2-api/ | grep -iE "sk-[a-zA-Z0-9]{10,}|Bearer [a-zA-Z0-9]{10,}|api[_-]?key\s*[:=]\s*['\"][a-zA-Z0-9]"
```

Expected: sin coincidencias (todas las claves están en `.env`/`.env.example` con valores de ejemplo, nunca en código versionado).

- [ ] **Step 4: Commit**

```bash
git add etapa2-api/tests/config/env.test.ts
git commit -m "test(etapa2): validacion explicita de configuracion y secretos"
```

---

### Task 14: Registro estructurado (logger JSON + requestId)

**Files:**
- Create: `etapa2-api/src/logger.ts`
- Test: `etapa2-api/tests/logger.test.ts`
- Modify: `etapa2-api/src/app.ts`

**Interfaces:**
- Consumes: `crearApp` (Tarea 1).
- Produces: `requestLogger` (middleware Express que agrega `req.id` y loggea al finalizar la respuesta).

- [ ] **Step 1: Write the failing test**

`etapa2-api/tests/logger.test.ts`:
```ts
import express from "express";
import request from "supertest";
import { describe, expect, it, vi } from "vitest";
import { requestLogger } from "../src/logger.js";

describe("requestLogger", () => {
  it("loggea un JSON con requestId, metodo, ruta, status y duracion", async () => {
    const app = express();
    app.use(requestLogger);
    app.get("/algo", (_req, res) => res.json({ ok: true }));

    const spy = vi.spyOn(console, "log").mockImplementation(() => {});
    await request(app).get("/algo");

    expect(spy).toHaveBeenCalledTimes(1);
    const logueado = JSON.parse(spy.mock.calls[0][0] as string);
    expect(logueado.metodo).toBe("GET");
    expect(logueado.ruta).toBe("/algo");
    expect(logueado.status).toBe(200);
    expect(logueado.requestId).toBeTypeOf("string");
    expect(logueado.duracionMs).toBeTypeOf("number");

    spy.mockRestore();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
npx vitest run tests/logger.test.ts
```

Expected: FAIL — el módulo no existe.

- [ ] **Step 3: Write minimal implementation**

`etapa2-api/src/logger.ts`:
```ts
import { randomUUID } from "node:crypto";
import type { NextFunction, Request, Response } from "express";

export function requestLogger(req: Request, res: Response, next: NextFunction): void {
  const requestId = randomUUID();
  const inicio = Date.now();
  res.on("finish", () => {
    console.log(
      JSON.stringify({
        requestId,
        metodo: req.method,
        ruta: req.path,
        status: res.statusCode,
        duracionMs: Date.now() - inicio,
      })
    );
  });
  next();
}
```

- [ ] **Step 4: Run test to verify it passes**

```bash
npx vitest run tests/logger.test.ts
```

Expected: 1 test PASS.

- [ ] **Step 5: Registrar el middleware en la app (antes de las rutas)**

En `etapa2-api/src/app.ts`:
```ts
import { requestLogger } from "./logger.js";
// ...
app.use(express.json());
app.use(requestLogger);
```

- [ ] **Step 6: Commit**

```bash
git add etapa2-api/src/logger.ts etapa2-api/tests/logger.test.ts etapa2-api/src/app.ts
git commit -m "feat(etapa2): registro estructurado JSON con requestId"
```

---

### Task 15: Roles y contratos

**Files:**
- Create: `etapa2-api/docs/roles-y-contratos.md`
- Create: `etapa2-api/src/middleware/authRole.ts`
- Test: `etapa2-api/tests/authRole.test.ts`
- Modify: `etapa2-api/src/routes/solicitudes.ts`

**Interfaces:**
- Consumes: `AppError` (Tarea 5).
- Produces: `type Rol = "solicitante" | "responsable_area" | "administrador"`; `requiereRol(...roles: Rol[])` (middleware factory) — aplicado a los 3 endpoints de `routes/solicitudes.ts`.

- [ ] **Step 1: Write the failing test**

`etapa2-api/tests/authRole.test.ts`:
```ts
import express from "express";
import request from "supertest";
import { describe, expect, it } from "vitest";
import { errorHandler } from "../src/errors.js";
import { requiereRol } from "../src/middleware/authRole.js";

function appDePrueba() {
  const app = express();
  app.get("/solo-admin", requiereRol("administrador"), (_req, res) => res.json({ ok: true }));
  app.use(errorHandler);
  return app;
}

describe("requiereRol", () => {
  it("permite el acceso con el rol correcto", async () => {
    const res = await request(appDePrueba()).get("/solo-admin").set("X-Role", "administrador");
    expect(res.status).toBe(200);
  });

  it("devuelve 403 con un rol sin permiso", async () => {
    const res = await request(appDePrueba()).get("/solo-admin").set("X-Role", "solicitante");
    expect(res.status).toBe(403);
    expect(res.body.error.code).toBe("ROL_NO_AUTORIZADO");
  });

  it("devuelve 403 si el header X-Role esta ausente", async () => {
    const res = await request(appDePrueba()).get("/solo-admin");
    expect(res.status).toBe(403);
  });

  it("devuelve 403 si el header trae un valor no reconocido", async () => {
    const res = await request(appDePrueba()).get("/solo-admin").set("X-Role", "invitado");
    expect(res.status).toBe(403);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
npx vitest run tests/authRole.test.ts
```

Expected: FAIL — el módulo no existe.

- [ ] **Step 3: Write minimal implementation**

`etapa2-api/src/middleware/authRole.ts`:
```ts
import type { NextFunction, Request, Response } from "express";
import { AppError } from "../errors.js";

export type Rol = "solicitante" | "responsable_area" | "administrador";
const ROLES_VALIDOS: readonly Rol[] = ["solicitante", "responsable_area", "administrador"];

/** Autorización simplificada por header X-Role (Etapa 2 no exige
 * autenticación completa — límite conocido, documentado en
 * docs/roles-y-contratos.md). */
export function requiereRol(...permitidos: Rol[]) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    const valor = req.header("X-Role");
    if (!valor || !(ROLES_VALIDOS as string[]).includes(valor)) {
      return next(new AppError(403, "ROL_NO_AUTORIZADO", "Header X-Role ausente o no reconocido"));
    }
    if (!permitidos.includes(valor as Rol)) {
      return next(new AppError(403, "ROL_NO_AUTORIZADO", `El rol '${valor}' no puede realizar esta acción`));
    }
    next();
  };
}
```

- [ ] **Step 4: Run test to verify it passes**

```bash
npx vitest run tests/authRole.test.ts
```

Expected: 4 tests PASS.

- [ ] **Step 5: Aplicar la matriz a los 3 endpoints**

En `etapa2-api/src/routes/solicitudes.ts`, importar `requiereRol` y envolver cada handler:
```ts
import { requiereRol } from "../middleware/authRole.js";

solicitudesRouter.post("/", requiereRol("solicitante", "responsable_area", "administrador"), async (req, res, next) => {
  /* ...cuerpo sin cambios... */
});

solicitudesRouter.get("/:id", requiereRol("solicitante", "responsable_area", "administrador"), (req, res, next) => {
  /* ...cuerpo sin cambios... */
});

solicitudesRouter.get("/", requiereRol("responsable_area", "administrador"), (req, res) => {
  /* ...cuerpo sin cambios... */
});
```

- [ ] **Step 6: Escribir el archivo de roles y contratos**

`etapa2-api/docs/roles-y-contratos.md`:
```markdown
# Roles y contratos — API de Mesa de Ayuda (Etapa 2)

## Límite conocido

Esta etapa no implementa autenticación completa (fuera del alcance del
Anexo A para Etapa 2). La autorización se simplifica a un header
`X-Role` que el cliente declara; en un sistema real este rol vendría de
un token verificado (JWT/OAuth), no de un header sin firmar.

## Roles

| Rol | Descripción |
|---|---|
| `solicitante` | Colaborador que crea y consulta sus propias solicitudes. |
| `responsable_area` | Responsable de un área (ver `areas.responsable` en `esquema.sql`); lista y consulta solicitudes de su área. |
| `administrador` | Coordinación de Aplicaciones; acceso total. |

## Matriz de permisos

| Endpoint | `solicitante` | `responsable_area` | `administrador` |
|---|---|---|---|
| `POST /solicitudes` | ✅ | ✅ | ✅ |
| `GET /solicitudes/:id` | ✅ | ✅ | ✅ |
| `GET /solicitudes` (listar) | ❌ | ✅ | ✅ |

## Contratos por endpoint

### `POST /solicitudes`
- **Request:** `{ asunto: string (min 3), descripcion?: string, area: string (min 2), solicitante: string (email) }`
- **201:** cuerpo de la solicitud creada, incluida `categoria`/`prioridad`/`confianzaClasificacion` ya resueltas.
- **422:** `{ error: { code: "ENTRADA_INVALIDA", message, details } }`

### `GET /solicitudes/:id`
- **200:** cuerpo de la solicitud.
- **404:** `{ error: { code: "NO_ENCONTRADA", message } }`

### `GET /solicitudes?area=&estado=&categoria=`
- **200:** arreglo de solicitudes (vacío si no hay coincidencias).

Ver `openapi.yaml` (Tarea 16) para el contrato formal machine-readable;
este archivo es el complemento legible por humanos con el cruce de roles.
```

- [ ] **Step 7: Actualizar tests de rutas para incluir el header**

En `etapa2-api/tests/routes/solicitudes.test.ts`, agregar `.set("X-Role", "administrador")` a cada llamada `request(app).post(...)` / `.get(...)` existente. Ejemplo para el primer test:
```ts
    const res = await request(crearApp())
      .post("/solicitudes")
      .set("X-Role", "administrador")
      .send({ asunto: "El portátil no enciende", descripcion: "Desde ayer", area: "Operaciones", solicitante: "ana@lafortuna.com.co" });
```//
(Aplicar el mismo `.set("X-Role", "administrador")` a todas las demás llamadas del archivo.)

- [ ] **Step 8: Run full suite**

```bash
npx vitest run
```

Expected: toda la suite pasa.

- [ ] **Step 9: Commit**

```bash
git add etapa2-api/src/middleware/authRole.ts etapa2-api/tests/authRole.test.ts \
        etapa2-api/src/routes/solicitudes.ts etapa2-api/docs/roles-y-contratos.md \
        etapa2-api/tests/routes/solicitudes.test.ts
git commit -m "feat(etapa2): roles y contratos con autorizacion por header X-Role"
```

---

### Task 16: Documentación técnica — Swagger UI y README

**Files:**
- Create: `etapa2-api/openapi.yaml`
- Modify: `etapa2-api/src/app.ts`
- Test: `etapa2-api/tests/docs.test.ts`
- Modify: `etapa2-api/README.md`

**Interfaces:**
- Consumes: `crearApp` (Tarea 1).
- Produces: `GET /docs` sirviendo Swagger UI.

- [ ] **Step 1: Escribir el contrato OpenAPI**

`etapa2-api/openapi.yaml`:
```yaml
openapi: 3.0.3
info:
  title: API de Mesa de Ayuda — Etapa 2
  version: 1.0.0
  description: Crear, consultar y listar solicitudes, con clasificación por IA.
paths:
  /solicitudes:
    post:
      summary: Crea una solicitud
      requestBody:
        required: true
        content:
          application/json:
            schema:
              type: object
              required: [asunto, area, solicitante]
              properties:
                asunto: { type: string, minLength: 3 }
                descripcion: { type: string }
                area: { type: string, minLength: 2 }
                solicitante: { type: string, format: email }
      responses:
        '201': { description: Creada }
        '422': { description: Entrada inválida }
        '403': { description: Rol no autorizado }
    get:
      summary: Lista solicitudes con filtros
      parameters:
        - { in: query, name: area, schema: { type: string } }
        - { in: query, name: estado, schema: { type: string } }
        - { in: query, name: categoria, schema: { type: string } }
      responses:
        '200': { description: Listado }
        '403': { description: Rol no autorizado }
  /solicitudes/{id}:
    get:
      summary: Consulta una solicitud por id
      parameters:
        - { in: path, name: id, required: true, schema: { type: string } }
      responses:
        '200': { description: Encontrada }
        '404': { description: No existe }
```

- [ ] **Step 2: Write the failing test**

`etapa2-api/tests/docs.test.ts`:
```ts
import request from "supertest";
import { describe, expect, it } from "vitest";
import { crearApp } from "../src/app.js";

describe("GET /docs", () => {
  it("sirve la interfaz de Swagger UI (HTML), no el YAML crudo", async () => {
    const res = await request(crearApp()).get("/docs/");
    expect(res.status).toBe(200);
    expect(res.type).toContain("html");
    expect(res.text).toContain("swagger-ui");
  });
});
```

- [ ] **Step 3: Run test to verify it fails**

```bash
npx vitest run tests/docs.test.ts
```

Expected: FAIL — 404, `/docs` no existe.

- [ ] **Step 4: Montar Swagger UI en la app**

En `etapa2-api/src/app.ts`:
```ts
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";
import swaggerUi from "swagger-ui-express";
import YAML from "yaml";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const openapiDoc = YAML.parse(readFileSync(path.join(__dirname, "../openapi.yaml"), "utf-8"));

// ... dentro de crearApp(), antes de app.use(errorHandler):
app.use("/docs", swaggerUi.serve, swaggerUi.setup(openapiDoc));
```

- [ ] **Step 5: Run test to verify it passes**

```bash
npx vitest run tests/docs.test.ts
```

Expected: 1 test PASS.

- [ ] **Step 6: Completar el README**

`etapa2-api/README.md` (reemplaza el stub, conserva la sección de prompt de la Tarea 12):
```markdown
# Etapa 2 — Autonomía e integración

API REST de Mesa de Ayuda: crear, consultar y listar solicitudes, con
clasificación automática por IA (desacoplada del proveedor) y
autorización por rol.

## Instalación

\`\`\`bash
cd etapa2-api
npm install
cp .env.example .env
\`\`\`

## Ejecución

\`\`\`bash
npm run dev        # desarrollo
npm test           # suite de pruebas
\`\`\`

Documentación interactiva: http://localhost:3000/docs
Roles y contratos: [`docs/roles-y-contratos.md`](docs/roles-y-contratos.md)

## Qué resuelve y para quién

El área de Aplicaciones recibe solicitudes en texto libre; esta API les
da estructura (crear/consultar/listar), las clasifica automáticamente
por categoría y prioridad, y expone quién puede hacer qué mediante
roles — para que Talento Humano y las áreas de negocio puedan
integrarse sin depender de la mesa de ayuda manual.

## Prompt de clasificación (v1)

Few-shot con 4 ejemplos reales del histórico, exige salida JSON estricta
para evitar post-procesamiento frágil de texto libre. Ver
`src/ia/prompts.ts`.

## Qué se supuso

- Persistencia en memoria para esta etapa (ver Decisión D1 del plan de
  implementación); no sobrevive un reinicio del proceso.
- Catálogo de categorías inferido del histórico de tickets (no hay un
  catálogo oficial de 12 categorías en los materiales entregados);
  ajustar si difiere del catálogo real de servicios.
- Autorización simplificada por header `X-Role`, sin autenticación
  completa (ver `docs/roles-y-contratos.md`).

## Qué quedó fuera

- Pantalla Angular (opcional con puntaje, no incluida en este plan).
```

- [ ] **Step 7: Commit**

```bash
git add etapa2-api/openapi.yaml etapa2-api/src/app.ts etapa2-api/tests/docs.test.ts etapa2-api/README.md
git commit -m "feat(etapa2): Swagger UI interactivo en /docs y README completo"
```

---

### Task 17: Dockerización de los servicios

**Files:**
- Create: `etapa2-api/Dockerfile`
- Create: `etapa2-api/docker/docker-compose.yml`
- Create: `etapa2-api/docker/.env.example`
- Create: `etapa2-api/docker/servicio-mock.Dockerfile`

**Interfaces:**
- Consumes: `etapa2-api/package.json` (Tarea 1), `materiales/servicio_mock/` (sin modificar), la definición del servicio `mariadb` de `etapa1-fundamentos/docker/docker-compose.yml`.
- Produces: `docker compose up -d` levanta `api` + `mariadb` + `servicio-mock`.

- [ ] **Step 1: Dockerfile de la API (multi-stage)**

`etapa2-api/Dockerfile`:
```dockerfile
FROM node:20-slim AS build
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM node:20-slim
WORKDIR /app
ENV NODE_ENV=production
COPY package.json package-lock.json ./
RUN npm ci --omit=dev
COPY --from=build /app/dist ./dist
COPY --from=build /app/openapi.yaml ./openapi.yaml
EXPOSE 3000
CMD ["node", "dist/server.js"]
```

- [ ] **Step 2: Dockerfile del servicio_mock (sin modificar el código)**

`etapa2-api/docker/servicio-mock.Dockerfile`:
```dockerfile
FROM python:3.11-slim
WORKDIR /app
COPY materiales/servicio_mock/requirements.txt ./requirements.txt
RUN pip install --no-cache-dir -r requirements.txt
COPY materiales/servicio_mock/app.py ./app.py
EXPOSE 8080
CMD ["uvicorn", "app:app", "--host", "0.0.0.0", "--port", "8080"]
```

- [ ] **Step 3: docker-compose.yml de Etapa 2**

`etapa2-api/docker/.env.example`:
```
DB_NAME=mesa_ayuda
DB_PORT=3306
MARIADB_ROOT_PASSWORD=cambia-esta-clave-root
MARIADB_USER=mesa_ayuda_app
MARIADB_PASSWORD=cambia-esta-clave-app

API_PORT=3000
SERVICIO_MOCK_TOKEN=demo-token-prueba-2026
AI_PROVIDER_BASE_URL=http://localhost:11434/v1
AI_PROVIDER_API_KEY=cambia-esta-clave
AI_PROVIDER_MODEL=llama3
```

`etapa2-api/docker/docker-compose.yml`:
```yaml
services:
  mariadb:
    image: mariadb:11.4
    container_name: mesa_ayuda_db
    restart: unless-stopped
    env_file: [.env]
    environment:
      MARIADB_DATABASE: ${DB_NAME:-mesa_ayuda}
    ports:
      - "${DB_PORT:-3306}:3306"
    volumes:
      - db_data:/var/lib/mysql
      - ../../materiales/datos/esquema.sql:/docker-entrypoint-initdb.d/01-esquema.sql:ro
    healthcheck:
      test: ["CMD-SHELL", "mysqladmin ping -h 127.0.0.1 -uroot -p$$MARIADB_ROOT_PASSWORD --silent"]
      interval: 5s
      timeout: 5s
      retries: 10
      start_period: 20s

  servicio-mock:
    build:
      context: ../..
      dockerfile: etapa2-api/docker/servicio-mock.Dockerfile
    container_name: mesa_ayuda_servicio_mock
    restart: unless-stopped
    ports:
      - "8080:8080"

  api:
    build:
      context: ..
      dockerfile: Dockerfile
    container_name: mesa_ayuda_api
    restart: unless-stopped
    depends_on:
      mariadb:
        condition: service_healthy
      servicio-mock:
        condition: service_started
    env_file: [.env]
    environment:
      PORT: ${API_PORT:-3000}
      SERVICIO_MOCK_URL: http://servicio-mock:8080
      SERVICIO_MOCK_TOKEN: ${SERVICIO_MOCK_TOKEN}
      AI_PROVIDER_BASE_URL: ${AI_PROVIDER_BASE_URL}
      AI_PROVIDER_API_KEY: ${AI_PROVIDER_API_KEY}
      AI_PROVIDER_MODEL: ${AI_PROVIDER_MODEL}
    ports:
      - "${API_PORT:-3000}:3000"

volumes:
  db_data:
```

- [ ] **Step 4: Levantar y verificar**

```bash
cd etapa2-api/docker
cp .env.example .env
docker compose up -d --build
docker compose ps
```

Expected: `mesa_ayuda_db` en `healthy`; `mesa_ayuda_servicio_mock` y `mesa_ayuda_api` en `running`. Si Docker no está disponible en el entorno de ejecución, documentarlo como en la Tarea 8 de Etapa 1 (`DONE_WITH_CONCERNS`, verificación pendiente de alguien con acceso a Docker) — los 4 archivos siguen siendo el entregable de esta tarea.

- [ ] **Step 5: Smoke test manual**

```bash
curl http://localhost:3000/health
```

Expected: `{"estado":"operativo"}`.

- [ ] **Step 6: Commit**

```bash
git add etapa2-api/Dockerfile etapa2-api/docker/docker-compose.yml \
        etapa2-api/docker/.env.example etapa2-api/docker/servicio-mock.Dockerfile
git commit -m "feat(etapa2): dockerizacion de api, mariadb y servicio_mock"
```

---

## Self-Review (completado por el autor del plan)

1. **Cobertura del spec**: las 18 filas de la tabla de tareas del spec están cubiertas: 1→Task1, 2-4→Tasks2-4, 5→Task1, 6→Task17, 7-9→Tasks7-9, 10→Task5, 11→Task10, 12→Task11, 13→Task12, 14→Task13, 15→Task14, 16→Task15, 17→Task16, 18→omitida a propósito (opcional, nota en README). Sin huecos en lo obligatorio.
2. **Placeholders**: ninguno — todo paso de código trae contenido completo.
3. **Consistencia de tipos/nombres**: `IAProvider`, `ResultadoClasificacion`, `HeuristicProvider`, `HttpChatProvider`, `ClasificadorService`, `Solicitud`, `crear/obtenerPorId/listar/actualizarClasificacion`, `AppError/errorHandler`, `requiereRol/Rol`, `cargarConfig/Config` se usan con la misma firma en todas las tareas que los consumen.

---

## Siguiente paso

Este plan cubre exclusivamente la Etapa 2 y depende de que Etapa 1 esté
acreditada (≥60/100) antes de ejecutarlo. Al terminarlo, el siguiente
plan a escribir es el de la Etapa 3, a partir de
`docs/superpowers/specs/2026-08-22-etapa3-rag-calidad-design.md`.
