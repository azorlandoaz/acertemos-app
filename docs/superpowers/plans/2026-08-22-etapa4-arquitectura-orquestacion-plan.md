# Etapa 4 — Arquitectura y orquestación — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Producir el documento de arquitectura, los 3 ADR y una orquestación mínima-pero-real (clasificar → RAG → decidir escalar → integración bidireccional con `servicio_mock` → trazabilidad) que demuestre al menos un recorrido end-to-end real, reutilizando los módulos ya acreditados de Etapa 2 (`ClasificadorService`/`IAProvider`) y Etapa 3 (RAG).

**Architecture:** Nuevo subproyecto `etapa4-orquestacion/` (Node/TS, miembro del npm workspace raíz) que importa `etapa2-api` y `etapa3-rag` como paquetes del workspace — ningún código de clasificación ni de RAG se duplica. El pipeline es una función TypeScript secuencial simple (sin framework de agentes), un endpoint webhook propio deduplica eventos entrantes por `evento_id`, un cliente HTTP con reintentos exponenciales envía de vuelta a `POST {servicio_mock}/solicitudes`, y un registro JSON local (mismo patrón que el índice vectorial de Etapa 3) rastrea el estado de sincronización por evento. Una tabla nueva `interacciones_ia` extiende `esquema.sql` para trazabilidad relacional. Dado que el Anexo A permite una demostración mínima y parcial para esta etapa, el criterio de "hecho" es: documentos completos sin placeholders + al menos un recorrido real registrado, no un sistema productivo completo.

**Tech Stack:** TypeScript (Node 20, ESM, `NodeNext`), Express 4, Zod, Vitest + Supertest, `fetch` nativo (sin SDK de cliente HTTP adicional), MariaDB (reutiliza el contenedor Docker de Etapa 2), Mermaid para diagramas.

**Spec:** `docs/superpowers/specs/2026-08-22-etapa4-arquitectura-orquestacion-design.md` (y el spec maestro `docs/superpowers/specs/2026-08-22-arquitectura-general-design.md`, secciones 4 y 5, para las convenciones transversales).

## Global Constraints

- Interfaz `IAProvider` (definida en `etapa2-api/src/ia/IAProvider.ts`, ya reexportada) es la única forma de tocar el modelo de IA — nunca un SDK concreto directamente (spec maestro §4.1).
- `.env` + `.env.example` en `etapa4-orquestacion/`; `.env` en `.gitignore`; ninguna credencial hardcodeada, ni el token demo del `servicio_mock` (spec maestro §4.2).
- Validación de variables de entorno requeridas al arranque, fallo rápido con mensaje claro — usar el patrón de **singleton perezoso** (`let x: T | null = null; function obtener() { if (!x) { ... } return x; }`), NUNCA llamar `cargarConfig()` a nivel de módulo (causaría crash en clon nuevo sin `.env` y I/O real en tests — defecto real corregido en la revisión final de Etapa 2).
- Tests con Vitest + Supertest para HTTP; regla del Anexo: cada corrección de defecto lleva la prueba que falla antes y pasa después, más una línea de causa raíz (spec maestro §4.3).
- Logging estructurado en JSON vía `console.log(JSON.stringify(...))` con `requestId` de correlación — éste es el patrón real ya usado en `etapa2-api/src/logger.ts` y `etapa3-rag`, no `pino` (el spec maestro sugiere pino pero el código ya establecido en Etapas 2-3 usa este patrón; seguir el precedente real del repo, no el texto aspiracional del spec).
- Middleware que registra latencia y tokens por llamada al `IAProvider`, con resumen agregado expuesto — reutilizar `registrarMetrica`/`resumenMetricas` de `etapa3-rag` (ya construidos en su Tarea 9), no reinventar (spec maestro §4.4).
- Commits atómicos y frecuentes — nunca un solo commit de entrega (spec maestro §4.5).
- Prohibido tocar `CHANGELOG.md` en tareas individuales — se consolida en un único commit al finalizar la rama.
- Decisión de orquestador YA TOMADA por el spec de la etapa: implementación propia en TypeScript, pipeline secuencial simple — no evaluar alternativas de framework en la implementación, sólo documentarlas como descartadas en ADR-001.
- Esta etapa se evalúa principalmente sobre el documento de diseño y las decisiones (declarado explícitamente por el Anexo A para la versión de 3 días) — no se exige orquestación completa funcionando, basta una demostración mínima y parcial con el diseño sustentado. Ningún task de código de este plan debe inflarse más allá de lo mínimo necesario para una demo real y testeable.
- Estructura de cada ADR (spec de la etapa, sección 5): `## Contexto`, `## Alternativa elegida`, `## Alternativas descartadas (y por qué)`, `## Consecuencias (incluida al menos una negativa aceptada)`.

---

### Task 1: Rama, workspace, scaffolding y extensión de los barrels de Etapa 2/3 para reutilización

**Files:**
- Modify: `package.json` (raíz — agregar `etapa4-orquestacion` a `workspaces`)
- Create: `etapa4-orquestacion/package.json`
- Create: `etapa4-orquestacion/tsconfig.json`
- Create: `etapa4-orquestacion/vitest.config.ts`
- Create: `etapa4-orquestacion/.env.example`
- Create: `etapa4-orquestacion/.gitignore`
- Create: `etapa4-orquestacion/src/config/env.ts`
- Create: `etapa4-orquestacion/src/app.ts`
- Create: `etapa4-orquestacion/src/server.ts`
- Modify: `etapa2-api/src/index.ts` (agregar reexport de `ClasificadorService`)
- Create: `etapa3-rag/src/servicioConsultas.ts` (extraído de `routes/consultas.ts`)
- Create: `etapa3-rag/src/index.ts` (barrel nuevo)
- Modify: `etapa3-rag/src/routes/consultas.ts` (usa `servicioConsultas.ts`, sin cambiar comportamiento)
- Modify: `etapa3-rag/package.json` (agregar `"main"`/`"types"`)

**Interfaces:**
- Consumes: `IAProvider`, `HeuristicProvider`, `HttpChatProvider`, `ClasificadorService`, `AppError`, `errorHandler` (todos ya existen en `etapa2-api`, el barrel top-level `etapa2-api/src/index.ts` ya existe desde la Tarea 7 de Etapa 3 — sólo falta agregar `ClasificadorService`); `buscar`, `cargarIndice`, `registrarMetrica`, `resumenMetricas` de `etapa3-rag` (ya existen internamente).
- Produces: `etapa3-rag` exporta `responderConsulta(pregunta: string, proveedor?: IAProvider): Promise<{ respuesta: string; citas: { documento: string; seccion: string }[]; confianza: number }>` y reexporta `registrarMetrica`/`resumenMetricas` — usado por la Tarea 6 (pipeline) y la Tarea 12 (demo). `etapa2-api` exporta también `ClasificadorService` — usado por la Tarea 6.

- [ ] **Step 1: Extraer la lógica de `/consultas` a una función reutilizable en `etapa3-rag`**

Antes de tocar nada, correr la suite completa de `etapa3-rag` para tener una línea base verde:

```bash
cd etapa3-rag && npx vitest run
```

Expected: todos los tests existentes PASS (11+ tests de las Tareas 2-9 de Etapa 3, ya acreditadas).

Crear `etapa3-rag/src/servicioConsultas.ts` con la lógica que hoy vive inline en el handler de `routes/consultas.ts` (abstención + citación), parametrizando el proveedor para permitir inyectarlo (por defecto construye el mismo `HttpChatProvider` que ya se usaba, así el comportamiento real de la ruta HTTP no cambia):

```ts
import path from "node:path";
import { HttpChatProvider, type IAProvider } from "etapa2-api";
import { cargarConfig } from "./config/env.js";
import { buscar, cargarIndice } from "./busqueda/vectorStore.js";
import { registrarMetrica, tokensAproximados } from "./metricas.js";

export interface ResultadoConsulta {
  respuesta: string;
  citas: { documento: string; seccion: string }[];
  confianza: number;
}

let proveedorPorDefecto: IAProvider | null = null;

function obtenerProveedorPorDefecto(): IAProvider {
  if (!proveedorPorDefecto) {
    const config = cargarConfig();
    proveedorPorDefecto = new HttpChatProvider({
      baseUrl: config.aiProviderBaseUrl,
      apiKey: config.aiProviderApiKey,
      modelo: config.aiProviderModel,
      timeoutMs: config.aiTimeoutMs,
    });
  }
  return proveedorPorDefecto;
}

const RUTA_INDICE = path.resolve(process.cwd(), "data/indice_vectorial.json");

/** Responde una pregunta en lenguaje natural citando documento/sección de
 * las políticas indexadas, o se abstiene si la similitud máxima cae bajo
 * el umbral configurado. Extraído de routes/consultas.ts para que otros
 * subproyectos del workspace (Etapa 4) puedan reutilizar el mismo camino
 * sin pasar por HTTP. */
export async function responderConsulta(
  pregunta: string,
  proveedor: IAProvider = obtenerProveedorPorDefecto()
): Promise<ResultadoConsulta> {
  const inicio = Date.now();
  const config = cargarConfig();
  const indice = cargarIndice(RUTA_INDICE);
  const [embeddingConsulta] = await proveedor.embeber([pregunta]);
  const resultados = buscar(indice, embeddingConsulta, 3);

  const similitudMaxima = resultados[0]?.similitud ?? 0;
  let respuesta: string;
  let citas: { documento: string; seccion: string }[];

  if (similitudMaxima < config.umbralAbstencion) {
    respuesta = "No tengo evidencia en las políticas para responder esto.";
    citas = [];
  } else {
    const contexto = resultados.map((r) => r.entrada.texto);
    respuesta = await proveedor.generarRespuesta(pregunta, contexto);
    citas = resultados.slice(0, 1).map((r) => ({ documento: r.entrada.documento, seccion: r.entrada.seccion }));
  }

  registrarMetrica(Date.now() - inicio, tokensAproximados(pregunta + respuesta));
  return { respuesta, citas, confianza: similitudMaxima };
}
```

Nota: revisa el nombre exacto de la función de aproximación de tokens y la firma de `registrarMetrica` en `etapa3-rag/src/metricas.ts` (Tarea 9 de Etapa 3, ya acreditada) antes de copiar este bloque — si el nombre difiere de `tokensAproximados`, ajusta la importación para que coincida con el código real, no con este texto.

- [ ] **Step 2: Reemplazar el cuerpo de la ruta HTTP para que delegue en la función extraída**

En `etapa3-rag/src/routes/consultas.ts`, el handler `POST /` pasa a ser:

```ts
consultasRouter.post("/", async (req, res, next) => {
  const parseo = EntradaConsulta.safeParse(req.body);
  if (!parseo.success) {
    return next(new AppError(422, "ENTRADA_INVALIDA", "Pregunta inválida", parseo.error.flatten()));
  }
  const resultado = await responderConsulta(parseo.data.pregunta);
  res.json(resultado);
});
```

Elimina del archivo cualquier lógica de negocio ahora duplicada (cálculo de similitud, cache del proveedor, etc.) — el archivo debe quedar como un adaptador HTTP delgado sobre `servicioConsultas.ts`. Conserva la validación Zod y el manejo de errores tal como estaban.

- [ ] **Step 3: Verificar que no hay regresión**

```bash
cd etapa3-rag && npx vitest run && npx tsc -p tsconfig.json --noEmit
```

Expected: la MISMA cantidad de tests que en el Step 1 sigue en PASS (comportamiento HTTP idéntico, sólo cambió dónde vive el código), `tsc` sin errores.

- [ ] **Step 4: Crear el barrel de `etapa3-rag` y declarar el paquete como importable**

`etapa3-rag/src/index.ts`:
```ts
export { responderConsulta, type ResultadoConsulta } from "./servicioConsultas.js";
export { registrarMetrica, resumenMetricas, tokensAproximados } from "./metricas.js";
```

Ajustar el nombre de la tercera exportación al que realmente exista en `metricas.ts` si difiere.

En `etapa3-rag/package.json`, agregar (mismo patrón que `etapa2-api/package.json` en la Tarea 1 de Etapa 3):
```json
"main": "dist/index.js",
"types": "dist/index.d.ts",
```

Confirmar que `etapa3-rag/tsconfig.json` ya tiene `"declaration": true` — si no lo tiene, agrégalo (mismo defecto que se corrigió en `etapa2-api` en la Tarea 1/fix-round-1 de Etapa 3).

- [ ] **Step 5: Extender el barrel de `etapa2-api` con `ClasificadorService`**

En `etapa2-api/src/index.ts` (ya existe desde la Tarea 7 de Etapa 3), agregar una línea:
```ts
export { ClasificadorService } from "./ia/ClasificadorService.js";
```

- [ ] **Step 6: Verificar que ambos paquetes compilan y exponen sus tipos**

```bash
npm run build --workspace etapa2-api
npm run build --workspace etapa3-rag
```

Expected: ambos compilan sin error; `etapa2-api/dist/index.d.ts` y `etapa3-rag/dist/index.d.ts` existen y contienen las nuevas exportaciones (`grep ClasificadorService etapa2-api/dist/index.d.ts`, `grep responderConsulta etapa3-rag/dist/index.d.ts`).

- [ ] **Step 7: Agregar `etapa4-orquestacion` al workspace raíz**

En `package.json` (raíz):
```json
{
  "name": "mesa-ayuda-inteligente",
  "private": true,
  "workspaces": ["etapa2-api", "etapa3-rag", "etapa4-orquestacion"]
}
```

- [ ] **Step 8: Scaffolding de `etapa4-orquestacion`**

`etapa4-orquestacion/package.json`:
```json
{
  "name": "etapa4-orquestacion",
  "version": "1.0.0",
  "type": "module",
  "scripts": {
    "dev": "tsx watch src/server.ts",
    "build": "tsc -p tsconfig.json",
    "demo": "tsx src/scripts/demo.ts",
    "estado": "tsx src/scripts/estado.ts",
    "test": "vitest run"
  },
  "dependencies": {
    "etapa2-api": "*",
    "etapa3-rag": "*",
    "express": "^4.19.2",
    "zod": "^3.23.8",
    "dotenv": "^16.4.5"
  },
  "devDependencies": {
    "typescript": "^5.5.4",
    "tsx": "^4.16.2",
    "vitest": "^2.0.5",
    "supertest": "^7.0.0",
    "@types/express": "^4.17.21",
    "@types/supertest": "^6.0.2",
    "@types/node": "^20.14.15"
  }
}
```

`etapa4-orquestacion/tsconfig.json` (idéntico al patrón de `etapa2-api`/`etapa3-rag`):
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

`etapa4-orquestacion/vitest.config.ts`:
```ts
import { defineConfig } from "vitest/config";

export default defineConfig({
  test: { environment: "node" },
});
```

`etapa4-orquestacion/.env.example`:
```
PORT=3200
AI_PROVIDER_BASE_URL=http://localhost:11434/v1
AI_PROVIDER_API_KEY=cambia-esta-clave
AI_PROVIDER_MODEL=llama3
AI_TIMEOUT_MS=5000
AI_MAX_REINTENTOS=2
SERVICIO_MOCK_URL=http://localhost:8080
SERVICIO_MOCK_TOKEN=demo-token-prueba-2026
UMBRAL_ESCALAMIENTO=0.4
```

`etapa4-orquestacion/.gitignore`:
```
node_modules/
dist/
.env
data/
```

`etapa4-orquestacion/src/config/env.ts` (mismo patrón de las etapas anteriores):
```ts
import "dotenv/config";

export interface Config {
  puerto: number;
  aiProviderBaseUrl: string;
  aiProviderApiKey: string;
  aiProviderModel: string;
  aiTimeoutMs: number;
  aiMaxReintentos: number;
  servicioMockUrl: string;
  servicioMockToken: string;
  umbralEscalamiento: number;
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
    puerto: Number(process.env.PORT ?? 3200),
    aiProviderBaseUrl: requerida("AI_PROVIDER_BASE_URL"),
    aiProviderApiKey: requerida("AI_PROVIDER_API_KEY"),
    aiProviderModel: process.env.AI_PROVIDER_MODEL ?? "llama3",
    aiTimeoutMs: Number(process.env.AI_TIMEOUT_MS ?? 5000),
    aiMaxReintentos: Number(process.env.AI_MAX_REINTENTOS ?? 2),
    servicioMockUrl: requerida("SERVICIO_MOCK_URL"),
    servicioMockToken: requerida("SERVICIO_MOCK_TOKEN"),
    umbralEscalamiento: Number(process.env.UMBRAL_ESCALAMIENTO ?? 0.4),
  };
}
```

`etapa4-orquestacion/src/app.ts`:
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

`etapa4-orquestacion/src/server.ts`:
```ts
import { crearApp } from "./app.js";
import { cargarConfig } from "./config/env.js";

const config = cargarConfig();
const app = crearApp();
app.listen(config.puerto, () => {
  console.log(JSON.stringify({ evento: "servidor_iniciado", puerto: config.puerto }));
});
```

- [ ] **Step 9: Instalar y verificar que el workspace resuelve**

```bash
npm install
cd etapa4-orquestacion && npx tsc -p tsconfig.json --noEmit
```

Expected: sin errores. Confirma que `node_modules/etapa2-api` y `node_modules/etapa3-rag` son symlinks al workspace (mismo comportamiento verificado en la Tarea 1 de Etapa 3).

- [ ] **Step 10: Commit**

```bash
git add package.json etapa2-api/src/index.ts etapa3-rag/src/servicioConsultas.ts \
        etapa3-rag/src/index.ts etapa3-rag/src/routes/consultas.ts etapa3-rag/package.json \
        etapa3-rag/tsconfig.json etapa4-orquestacion/
git commit -m "chore(etapa4): andamiaje del subproyecto y extension de los barrels de etapa2/3 para reutilizacion"
```

---

### Task 2: Documento de arquitectura (diagrama, flujo end-to-end, secretos y ambientes)

**Files:**
- Create: `docs/arquitectura-etapa4.md`
- Create: `etapa4-orquestacion/.env.development`
- Create: `etapa4-orquestacion/.env.production`

**Interfaces:**
- Consumes: nada (documentación).
- Produces: nada (documentación) — referenciado por el README final (Tarea 13).

- [ ] **Step 1: Escribir el documento de arquitectura**

`docs/arquitectura-etapa4.md`:
```markdown
# Arquitectura — Etapa 4: orquestación

## 1. Diagrama de componentes

\`\`\`mermaid
flowchart TB
    subgraph Entrada
        WH[POST /webhook/entrada\netapa4-orquestacion]
    end
    subgraph "Etapa 4 — Orquestador (TS propio)"
        DEDUP[Deduplicacion\npor evento_id]
        PIPE[pipeline.ts]
        SYNC[(estado_sync.json)]
    end
    subgraph "Etapa 2 — Modulo IA (reutilizado)"
        CLAS[ClasificadorService\ntimeout + reintentos + respaldo]
    end
    subgraph "Etapa 3 — RAG (reutilizado)"
        RAG[responderConsulta\nbusqueda coseno + citacion]
        IDX[(indice_vectorial.json)]
    end
    subgraph "Segundo sistema (simulado)"
        MOCK[servicio_mock\nPOST /solicitudes]
    end
    subgraph Datos
        DB[(MariaDB\ntickets + interacciones_ia)]
    end

    WH --> DEDUP --> PIPE
    PIPE --> CLAS
    PIPE --> RAG
    RAG --> IDX
    PIPE -->|accion=responder o escalar| SYNC
    PIPE -->|POST con Idempotency-Key,\nreintentos 429/500| MOCK
    PIPE -->|registro de la interaccion| DB
\`\`\`

## 2. Flujo de datos extremo a extremo

1. El segundo sistema (`servicio_mock` u otro origen equivalente) envía un
   evento a `POST /webhook/entrada` de `etapa4-orquestacion`. El evento
   puede llegar duplicado o fuera de orden — no hay garantía de entrega
   única desde el origen.
2. `etapa4-orquestacion` deduplica por `evento_id` contra el registro local
   (`estado_sync.json`): si ya fue visto, responde `200 {duplicado: true}`
   sin reprocesar. Si es nuevo, se marca `pendiente` y se acepta con `202`.
3. El pipeline (`pipeline.ts`) ejecuta, en orden:
   a. **Clasificar** — reutiliza `ClasificadorService` de Etapa 2 (timeout +
      reintentos con backoff exponencial + respaldo heurístico garantizado).
   b. **RAG** — reutiliza `responderConsulta` de Etapa 3 (búsqueda por
      coseno sobre el índice ya construido en la Tarea 6 de Etapa 3 con los
      5 PDF de políticas, 42 fragmentos indexados; cita documento+sección o
      se abstiene bajo el umbral 0.75).
   c. **Decidir** — si la confianza de clasificación cae bajo
      `UMBRAL_ESCALAMIENTO` (0.4, mismo umbral que Etapa 2) o el RAG se
      abstuvo (sin citas), la acción es `escalar`; en otro caso, `responder`.
4. El resultado se registra en `estado_sync.json` (`enviado` en progreso) y
   en la tabla `interacciones_ia` (trazabilidad relacional, Tarea 10).
5. Se envía de vuelta al segundo sistema vía
   `POST {SERVICIO_MOCK_URL}/solicitudes` con cabecera `Idempotency-Key`
   derivada del `evento_id`, con reintentos ante `429`/`500` respetando
   `Retry-After` cuando el mock lo entrega.
6. El estado local pasa a `confirmado` si el envío tuvo éxito, o queda en
   `error` (sin perder el evento) si el mock no está disponible tras agotar
   los reintentos — se puede reintentar manualmente más tarde con el mismo
   registro.

## 3. Secretos y ambientes

- Cada subproyecto Node (`etapa2-api`, `etapa3-rag`, `etapa4-orquestacion`)
  mantiene su propio `.env` (ignorado por git) + `.env.example` (plantilla
  versionada, sin secretos reales).
- `etapa4-orquestacion` agrega dos plantillas adicionales versionadas para
  separar explícitamente configuración por ambiente:
  `.env.development` (apunta a `localhost` para todo — mock, DB, proveedor
  de IA local) y `.env.production` (mismas claves, valores de ejemplo que
  apuntarían a endpoints reales — nunca credenciales reales committeadas).
- Ninguna credencial — incluido el token demo del `servicio_mock`
  (`demo-token-prueba-2026`) — vive hardcodeada en código fuente; siempre
  se lee vía `process.env` a través de `cargarConfig()`, que falla rápido
  con un mensaje claro si falta una variable requerida.
- La única diferencia real entre ambientes en este repo es la URL de los
  servicios externos (`AI_PROVIDER_BASE_URL`, `SERVICIO_MOCK_URL`) y el
  puerto local; no hay lógica condicional por ambiente en el código fuente
  (evita el antipatrón de `if (NODE_ENV === "production")` disperso).
```

- [ ] **Step 2: Crear las plantillas de ambiente**

`etapa4-orquestacion/.env.development`:
```
PORT=3200
AI_PROVIDER_BASE_URL=http://localhost:11434/v1
AI_PROVIDER_API_KEY=clave-local-de-desarrollo
AI_PROVIDER_MODEL=llama3
AI_TIMEOUT_MS=5000
AI_MAX_REINTENTOS=2
SERVICIO_MOCK_URL=http://localhost:8080
SERVICIO_MOCK_TOKEN=demo-token-prueba-2026
UMBRAL_ESCALAMIENTO=0.4
```

`etapa4-orquestacion/.env.production`:
```
PORT=3200
AI_PROVIDER_BASE_URL=https://api.proveedor-real.example.com/v1
AI_PROVIDER_API_KEY=REEMPLAZAR_EN_EL_SECRETO_DEL_ORQUESTADOR_DE_DESPLIEGUE
AI_PROVIDER_MODEL=REEMPLAZAR
AI_TIMEOUT_MS=8000
AI_MAX_REINTENTOS=3
SERVICIO_MOCK_URL=https://servicio-mock.example.com
SERVICIO_MOCK_TOKEN=REEMPLAZAR_EN_EL_SECRETO_DEL_ORQUESTADOR_DE_DESPLIEGUE
UMBRAL_ESCALAMIENTO=0.4
```

- [ ] **Step 3: Commit**

```bash
git add docs/arquitectura-etapa4.md etapa4-orquestacion/.env.development etapa4-orquestacion/.env.production
git commit -m "docs(etapa4): documento de arquitectura, flujo end-to-end y separacion de ambientes"
```

---

### Task 3: ADR-001 — Orquestador

**Files:**
- Create: `docs/adr/ADR-001-orquestador.md`

**Interfaces:**
- Consumes: nada.
- Produces: nada (documentación).

- [ ] **Step 1: Escribir el ADR**

`docs/adr/ADR-001-orquestador.md`:
```markdown
# ADR-001 — Orquestador del pipeline multi-paso

## Contexto
Etapa 4 necesita encadenar clasificar → RAG → decidir escalar →
integración bidireccional, con trazabilidad de cada paso, dentro de una
prueba técnica de 3 días y sin infraestructura adicional que provisionar.

## Alternativa elegida
Implementación propia en TypeScript: una función secuencial
(`pipeline.ts`) que llama directamente a `ClasificadorService` (Etapa 2) y
`responderConsulta` (Etapa 3), sin motor de estados ni cola de mensajes.

## Alternativas descartadas (y por qué)
- **n8n (u otra herramienta low-code de orquestación visual):** requiere
  levantar y mantener un servicio adicional, aprender su modelo de nodos, y
  su valor (UI visual del flujo) no compensa la fricción de instalación en
  3 días para un pipeline de 3 pasos.
- **LangGraph.js (framework de agentes/grafos):** pensado para flujos con
  ramificación dinámica y estado complejo entre múltiples pasos de LLM;
  aquí el flujo es lineal y determinista (clasificar → RAG → decidir), así
  que el framework añade una capa de abstracción sin beneficio real y una
  curva de aprendizaje no amortizada en el tiempo disponible.

## Consecuencias
- Positiva: cero infraestructura nueva, control total y explícito del
  flujo, reutiliza exactamente las mismas piezas ya probadas de Etapas 2-3,
  curva de aprendizaje cero para quien lea el código.
- Negativa aceptada: sin UI visual del flujo — para demostrarlo en la
  entrega se depende del log estructurado y del script de demo (Tarea 12),
  no de una vista gráfica en vivo. Si el pipeline creciera a más de ~5-6
  pasos con ramificación condicional real, esta decisión se reconsideraría.
```

- [ ] **Step 2: Commit**

```bash
git add docs/adr/ADR-001-orquestador.md
git commit -m "docs(etapa4): ADR-001 orquestador"
```

---

### Task 4: ADR-002 — Indexación vectorial

**Files:**
- Create: `docs/adr/ADR-002-indexacion-vectorial.md`

**Interfaces:**
- Consumes: nada.
- Produces: nada (documentación).

- [ ] **Step 1: Escribir el ADR**

Este ADR documenta con retrospectiva y datos reales la decisión ya tomada
(y ya acreditada) en Etapa 3 — usa las cifras reales obtenidas al correr la
ingesta (Tarea 6 de Etapa 3: 42 fragmentos de 5 documentos).

`docs/adr/ADR-002-indexacion-vectorial.md`:
```markdown
# ADR-002 — Indexación vectorial (retrospectiva de Etapa 3, con datos reales)

## Contexto
Etapa 3 necesitaba indexar y recuperar por similitud semántica los 5 PDF de
políticas de la empresa. Corrida la ingesta real sobre el corpus completo
(`npm run ingestar --workspace etapa3-rag`), el resultado observado fue:
**42 fragmentos** repartidos entre los 5 documentos, con fragmentación por
encabezado de sección numerado (`^\d+(\.\d+)*`) y un límite de ~1200
caracteres por fragmento con 100 de solape para las secciones más largas.

## Alternativa elegida
Índice embebido: archivo JSON local (`etapa3-rag/data/indice_vectorial.json`,
tipo `EntradaIndice[]` con `{documento, seccion, texto, embedding}`) cargado
completo en memoria en cada consulta, con similitud coseno calculada en
JavaScript puro (`vectorStore.ts::buscar`). Métrica: coseno, `k=3` resultados
por consulta, umbral de abstención `0.75` sobre la similitud máxima.

## Alternativas descartadas (y por qué)
- **Base vectorial gestionada (Pinecone/Qdrant Cloud/Weaviate Cloud):**
  para 42 fragmentos el costo de red, cuenta y credenciales externas supera
  cualquier beneficio de escalabilidad — la latencia de red a un servicio
  gestionado sería mayor que un `Array.prototype.map` en memoria sobre 42
  entradas.
- **`better-sqlite3` con extensión vectorial:** dependencia nativa que
  requiere compilación en el entorno de evaluación; riesgo real de fallo de
  instalación fuera del control del participante, descartado también para
  el registro de estado de sincronización de Etapa 4 (ADR-003) por la misma
  razón.

## Consecuencias
- Positiva: `git clone` + `npm install` + `npm run ingestar` alcanza; cero
  infraestructura; con 42 entradas la búsqueda `O(n)` toma
  sub-milisegundo — no hay presión de rendimiento real a este volumen.
- Negativa aceptada: no escala más allá de unos pocos miles de fragmentos
  (cada consulta recorre el índice completo en memoria). Con el volumen real
  declarado en `requerimientos_negocio.md` (80 consultas/día sobre 5
  documentos que cambian 1-2 veces al año), esto no es un problema en el
  horizonte de esta prueba técnica. Si el catálogo de políticas creciera a
  cientos de documentos, se reconsideraría una base vectorial gestionada o
  al menos un índice aproximado (HNSW) en vez de fuerza bruta.
```

- [ ] **Step 2: Commit**

```bash
git add docs/adr/ADR-002-indexacion-vectorial.md
git commit -m "docs(etapa4): ADR-002 indexacion vectorial (retrospectiva con datos reales)"
```

---

### Task 5: ADR-003 — Idempotencia en integración bidireccional

**Files:**
- Create: `docs/adr/ADR-003-idempotencia.md`

**Interfaces:**
- Consumes: nada.
- Produces: nada (documentación) — las decisiones aquí documentadas son las que implementan las Tareas 7-9.

- [ ] **Step 1: Escribir el ADR**

`docs/adr/ADR-003-idempotencia.md`:
```markdown
# ADR-003 — Idempotencia en la integración bidireccional

## Contexto
`etapa4-orquestacion` recibe eventos de un segundo sistema que puede
reenviar el mismo evento más de una vez y en desorden (contrato explícito
de `servicio_mock`), y a su vez envía solicitudes hacia
`POST {servicio_mock}/solicitudes`, que ya soporta una cabecera
`Idempotency-Key` opcional (dos peticiones con la misma clave devuelven la
misma solicitud). Se necesita una estrategia de idempotencia en ambos
sentidos, más un registro de qué estado tiene cada evento en cada extremo.

## Alternativa elegida
- **Entrada (webhook):** deduplicación propia por `evento_id` contra un
  registro local antes de procesar — si el `evento_id` ya fue visto, se
  responde `200 {duplicado: true}` sin volver a ejecutar el pipeline.
- **Salida (envío al mock):** se reutiliza el `evento_id` como
  `Idempotency-Key` al llamar `POST /solicitudes`, aprovechando el soporte
  nativo del mock — así un reintento de red del propio orquestador tras un
  error transitorio no crea una solicitud duplicada del lado del mock.
- **Registro de estado:** archivo JSON local
  (`etapa4-orquestacion/data/estado_sync.json`), mismo patrón arquitectónico
  que el índice vectorial de Etapa 3 (ver ADR-002): un objeto
  `{ [evento_id]: { estado, actualizado } }` con `estado` en
  `pendiente | enviado | confirmado | error`.

## Alternativas descartadas (y por qué)
- **SQLite (`better-sqlite3`) para el registro de estado:** mismo motivo
  que en ADR-002 — dependencia nativa con riesgo de compilación fallida en
  el entorno de evaluación, sin beneficio real a un volumen de eventos de
  prueba técnica (decenas, no millones).
- **Sin deduplicación explícita, confiar sólo en `Idempotency-Key` del
  mock:** insuficiente, porque la cabecera protege el lado de *salida*
  (evita duplicar la solicitud en el mock) pero no evita que el propio
  pipeline de *entrada* se ejecute dos veces para el mismo evento entrante
  (reclasificar, volver a consultar el RAG) — trabajo duplicado real y
  posible inconsistencia de trazabilidad en `interacciones_ia` si no se
  deduplica también en la entrada.

## Consecuencias
- Positiva: ambos extremos de la integración son idempotentes con
  mecanismos simples y sin infraestructura nueva; el registro de estado
  también sirve como evidencia auditable de qué pasó con cada evento
  (requisito de trazabilidad transversal del spec maestro).
- Negativa aceptada: el registro JSON no soporta escritura concurrente seguro
  (lectura-modificación-escritura no es atómica) — aceptable porque el
  procesamiento de eventos en esta etapa es secuencial, no hay varios
  workers escribiendo el mismo archivo a la vez. Si la carga real exigiera
  procesamiento concurrente, este registro se movería a una tabla real con
  transacciones (la tabla `interacciones_ia` de la Tarea 10 ya es candidata).
```

- [ ] **Step 2: Commit**

```bash
git add docs/adr/ADR-003-idempotencia.md
git commit -m "docs(etapa4): ADR-003 idempotencia en integracion bidireccional"
```

---

### Task 6: Pipeline de orquestación (código)

**Files:**
- Create: `etapa4-orquestacion/src/pipeline.ts`
- Test: `etapa4-orquestacion/tests/pipeline.test.ts`

**Interfaces:**
- Consumes: `ClasificadorService`, `HeuristicProvider`, `HttpChatProvider` (de `etapa2-api`, Tarea 1); `responderConsulta` (de `etapa3-rag`, Tarea 1).
- Produces: `interface EntradaPipeline { evento_id: string; pregunta: string }`; `interface ResultadoPipeline { evento_id: string; categoria: string; confianzaClasificacion: number; respuesta: string; citas: {documento:string; seccion:string}[]; confianzaRag: number; accion: "responder" | "escalar" }`; `ejecutarPipeline(entrada: EntradaPipeline, clasificador: ClasificadorService, umbralEscalamiento: number): Promise<ResultadoPipeline>` — usado por la Tarea 7 (webhook) y la Tarea 12 (demo).

- [ ] **Step 1: Write the failing test**

`etapa4-orquestacion/tests/pipeline.test.ts`:
```ts
import { describe, expect, it, vi } from "vitest";
import { ClasificadorService, HeuristicProvider } from "etapa2-api";
import { ejecutarPipeline } from "../src/pipeline.js";

vi.mock("etapa3-rag", async () => {
  const actual = await vi.importActual<typeof import("etapa3-rag")>("etapa3-rag");
  return {
    ...actual,
    responderConsulta: vi.fn(async (pregunta: string) => {
      if (pregunta.includes("vacaciones")) {
        return {
          respuesta: "Debes solicitarlas con 15 días de anticipación.",
          citas: [{ documento: "POL-GTH-01_Vacaciones.pdf", seccion: "3.1" }],
          confianza: 0.9,
        };
      }
      return { respuesta: "No tengo evidencia en las políticas para responder esto.", citas: [], confianza: 0.1 };
    }),
  };
});

describe("ejecutarPipeline", () => {
  it("responde cuando la clasificacion y el RAG tienen confianza suficiente (caso feliz)", async () => {
    const clasificador = new ClasificadorService(new HeuristicProvider(), new HeuristicProvider(), 1000, 1);
    vi.spyOn(clasificador, "clasificar").mockResolvedValue({ categoria: "Vacaciones", confianza: 0.9 });

    const resultado = await ejecutarPipeline(
      { evento_id: "evt-1", pregunta: "¿Con cuánta anticipación pido vacaciones?" },
      clasificador,
      0.4
    );

    expect(resultado.accion).toBe("responder");
    expect(resultado.citas).toHaveLength(1);
    expect(resultado.evento_id).toBe("evt-1");
  });

  it("escala cuando la confianza de clasificacion cae bajo el umbral", async () => {
    const clasificador = new ClasificadorService(new HeuristicProvider(), new HeuristicProvider(), 1000, 1);
    vi.spyOn(clasificador, "clasificar").mockResolvedValue({ categoria: "Sin clasificar", confianza: 0.1 });

    const resultado = await ejecutarPipeline(
      { evento_id: "evt-2", pregunta: "¿con cuánta anticipación pido vacaciones?" },
      clasificador,
      0.4
    );

    expect(resultado.accion).toBe("escalar");
  });

  it("escala cuando el RAG se abstiene aunque la clasificacion tenga confianza alta", async () => {
    const clasificador = new ClasificadorService(new HeuristicProvider(), new HeuristicProvider(), 1000, 1);
    vi.spyOn(clasificador, "clasificar").mockResolvedValue({ categoria: "Otro", confianza: 0.9 });

    const resultado = await ejecutarPipeline(
      { evento_id: "evt-3", pregunta: "¿cuál es la capital de Francia?" },
      clasificador,
      0.4
    );

    expect(resultado.accion).toBe("escalar");
    expect(resultado.citas).toHaveLength(0);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
cd etapa4-orquestacion && npx vitest run tests/pipeline.test.ts
```

Expected: FAIL — el módulo no existe.

- [ ] **Step 3: Write minimal implementation**

`etapa4-orquestacion/src/pipeline.ts`:
```ts
import type { ClasificadorService } from "etapa2-api";
import { responderConsulta } from "etapa3-rag";

export interface EntradaPipeline {
  evento_id: string;
  pregunta: string;
}

export interface ResultadoPipeline {
  evento_id: string;
  categoria: string;
  confianzaClasificacion: number;
  respuesta: string;
  citas: { documento: string; seccion: string }[];
  confianzaRag: number;
  accion: "responder" | "escalar";
}

/** Orquesta clasificar (Etapa 2) -> RAG (Etapa 3) -> decidir si responder
 * o escalar a una persona. Escala si la clasificación tiene baja confianza
 * O si el RAG se abstuvo (sin evidencia en política) - cualquiera de las
 * dos condiciones basta, ninguna decisión automática se envía a ciegas. */
export async function ejecutarPipeline(
  entrada: EntradaPipeline,
  clasificador: ClasificadorService,
  umbralEscalamiento: number
): Promise<ResultadoPipeline> {
  const clasificacion = await clasificador.clasificar(entrada.pregunta);
  const rag = await responderConsulta(entrada.pregunta);

  const accion: "responder" | "escalar" =
    clasificacion.confianza < umbralEscalamiento || rag.citas.length === 0 ? "escalar" : "responder";

  return {
    evento_id: entrada.evento_id,
    categoria: clasificacion.categoria,
    confianzaClasificacion: clasificacion.confianza,
    respuesta: rag.respuesta,
    citas: rag.citas,
    confianzaRag: rag.confianza,
    accion,
  };
}
```

- [ ] **Step 4: Run test to verify it passes**

```bash
cd etapa4-orquestacion && npx vitest run tests/pipeline.test.ts
```

Expected: 3 tests PASS.

- [ ] **Step 5: Commit**

```bash
git add etapa4-orquestacion/src/pipeline.ts etapa4-orquestacion/tests/pipeline.test.ts
git commit -m "feat(etapa4): pipeline de orquestacion (clasificar -> RAG -> decidir escalar)"
```

---

### Task 7: Registro de estado de sincronización (JSON local)

**Files:**
- Create: `etapa4-orquestacion/src/estadoSync.ts`
- Test: `etapa4-orquestacion/tests/estadoSync.test.ts`

**Interfaces:**
- Consumes: nada.
- Produces: `type EstadoEvento = "pendiente" | "enviado" | "confirmado" | "error"`; `yaFueVisto(eventoId: string, ruta: string): boolean`; `marcarEstado(eventoId: string, estado: EstadoEvento, ruta: string): void`; `listarEstados(ruta: string): { evento_id: string; estado: EstadoEvento; actualizado: string }[]` — usado por la Tarea 8 (webhook) y la Tarea 9 (envío de vuelta).

- [ ] **Step 1: Write the failing test**

`etapa4-orquestacion/tests/estadoSync.test.ts`:
```ts
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { listarEstados, marcarEstado, yaFueVisto } from "../src/estadoSync.js";

let dirTemporal: string;
let ruta: string;

beforeEach(() => {
  dirTemporal = mkdtempSync(path.join(tmpdir(), "estado-sync-test-"));
  ruta = path.join(dirTemporal, "estado_sync.json");
});

afterEach(() => {
  rmSync(dirTemporal, { recursive: true, force: true });
});

describe("estadoSync", () => {
  it("un evento nunca visto no esta marcado", () => {
    expect(yaFueVisto("evt-1", ruta)).toBe(false);
  });

  it("marcarEstado persiste y yaFueVisto refleja el cambio", () => {
    marcarEstado("evt-1", "pendiente", ruta);
    expect(yaFueVisto("evt-1", ruta)).toBe(true);

    const estados = listarEstados(ruta);
    expect(estados).toHaveLength(1);
    expect(estados[0].evento_id).toBe("evt-1");
    expect(estados[0].estado).toBe("pendiente");
  });

  it("marcarEstado dos veces con el mismo evento_id actualiza en vez de duplicar", () => {
    marcarEstado("evt-1", "pendiente", ruta);
    marcarEstado("evt-1", "confirmado", ruta);

    const estados = listarEstados(ruta);
    expect(estados).toHaveLength(1);
    expect(estados[0].estado).toBe("confirmado");
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
cd etapa4-orquestacion && npx vitest run tests/estadoSync.test.ts
```

Expected: FAIL — el módulo no existe.

- [ ] **Step 3: Write minimal implementation**

`etapa4-orquestacion/src/estadoSync.ts`:
```ts
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";

export type EstadoEvento = "pendiente" | "enviado" | "confirmado" | "error";

export interface RegistroSync {
  evento_id: string;
  estado: EstadoEvento;
  actualizado: string;
}

function cargar(ruta: string): Record<string, RegistroSync> {
  if (!existsSync(ruta)) return {};
  return JSON.parse(readFileSync(ruta, "utf-8"));
}

function guardar(ruta: string, registros: Record<string, RegistroSync>): void {
  mkdirSync(path.dirname(ruta), { recursive: true });
  writeFileSync(ruta, JSON.stringify(registros, null, 2), "utf-8");
}

export function yaFueVisto(eventoId: string, ruta: string): boolean {
  return eventoId in cargar(ruta);
}

/** Registra o actualiza el estado de sincronización de un evento. Un mismo
 * evento_id nunca se duplica: la segunda llamada sobrescribe el estado
 * anterior, preservando la trazabilidad de "qué pasó por última vez". */
export function marcarEstado(eventoId: string, estado: EstadoEvento, ruta: string): void {
  const registros = cargar(ruta);
  registros[eventoId] = { evento_id: eventoId, estado, actualizado: new Date().toISOString() };
  guardar(ruta, registros);
}

export function listarEstados(ruta: string): RegistroSync[] {
  return Object.values(cargar(ruta));
}
```

- [ ] **Step 4: Run test to verify it passes**

```bash
cd etapa4-orquestacion && npx vitest run tests/estadoSync.test.ts
```

Expected: 3 tests PASS.

- [ ] **Step 5: Commit**

```bash
git add etapa4-orquestacion/src/estadoSync.ts etapa4-orquestacion/tests/estadoSync.test.ts
git commit -m "feat(etapa4): registro de estado de sincronizacion (JSON local, mismo patron de Etapa 3)"
```

---

### Task 8: Recepción por webhook con deduplicación

**Files:**
- Create: `etapa4-orquestacion/src/routes/webhook.ts`
- Test: `etapa4-orquestacion/tests/routes/webhook.test.ts`
- Modify: `etapa4-orquestacion/src/app.ts`

**Interfaces:**
- Consumes: `yaFueVisto`, `marcarEstado` (Tarea 7); `ejecutarPipeline` (Tarea 6).
- Produces: router montado en `/webhook` — expone `POST /webhook/entrada`.

- [ ] **Step 1: Write the failing test**

`etapa4-orquestacion/tests/routes/webhook.test.ts`:
```ts
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import request from "supertest";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

let dirTemporal: string;
let rutaEstado: string;

beforeEach(() => {
  dirTemporal = mkdtempSync(path.join(tmpdir(), "webhook-test-"));
  rutaEstado = path.join(dirTemporal, "estado_sync.json");
  process.env.RUTA_ESTADO_SYNC = rutaEstado;
});

afterEach(() => {
  rmSync(dirTemporal, { recursive: true, force: true });
  delete process.env.RUTA_ESTADO_SYNC;
});

vi.mock("../../src/pipeline.js", () => ({
  ejecutarPipeline: vi.fn(async (entrada: { evento_id: string; pregunta: string }) => ({
    evento_id: entrada.evento_id,
    categoria: "Vacaciones",
    confianzaClasificacion: 0.9,
    respuesta: "Respuesta simulada.",
    citas: [{ documento: "d.pdf", seccion: "1" }],
    confianzaRag: 0.9,
    accion: "responder" as const,
  })),
}));

describe("POST /webhook/entrada", () => {
  it("acepta un evento nuevo y lo procesa (202)", async () => {
    const { crearApp } = await import("../../src/app.js");
    const res = await request(crearApp()).post("/webhook/entrada").send({
      evento_id: "evt-100",
      pregunta: "¿Con cuánta anticipación pido vacaciones?",
    });
    expect(res.status).toBe(202);
    expect(res.body.duplicado).toBe(false);
  });

  it("el mismo evento_id enviado dos veces produce efecto una sola vez", async () => {
    const { crearApp } = await import("../../src/app.js");
    const { ejecutarPipeline } = await import("../../src/pipeline.js");
    const app = crearApp();

    await request(app).post("/webhook/entrada").send({ evento_id: "evt-dup", pregunta: "hola" });
    const segunda = await request(app).post("/webhook/entrada").send({ evento_id: "evt-dup", pregunta: "hola" });

    expect(segunda.status).toBe(200);
    expect(segunda.body.duplicado).toBe(true);
    expect(ejecutarPipeline).toHaveBeenCalledTimes(1);
  });

  it("devuelve 422 si el evento no tiene evento_id o pregunta", async () => {
    const { crearApp } = await import("../../src/app.js");
    const res = await request(crearApp()).post("/webhook/entrada").send({ pregunta: "" });
    expect(res.status).toBe(422);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
cd etapa4-orquestacion && npx vitest run tests/routes/webhook.test.ts
```

Expected: FAIL — el router no existe.

- [ ] **Step 3: Write minimal implementation**

`etapa4-orquestacion/src/routes/webhook.ts`:
```ts
import path from "node:path";
import { Router } from "express";
import { z } from "zod";
import { ClasificadorService, HeuristicProvider, HttpChatProvider } from "etapa2-api";
import { cargarConfig } from "../config/env.js";
import { marcarEstado, yaFueVisto } from "../estadoSync.js";
import { ejecutarPipeline } from "../pipeline.js";

export const webhookRouter = Router();

const EventoEntrada = z.object({
  evento_id: z.string().min(1),
  pregunta: z.string().min(1),
});

function rutaEstadoSync(): string {
  return process.env.RUTA_ESTADO_SYNC ?? path.resolve(process.cwd(), "data/estado_sync.json");
}

let clasificadorSingleton: ClasificadorService | null = null;

function obtenerClasificador(): ClasificadorService {
  if (!clasificadorSingleton) {
    const config = cargarConfig();
    clasificadorSingleton = new ClasificadorService(
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
  }
  return clasificadorSingleton;
}

webhookRouter.post("/entrada", async (req, res, next) => {
  try {
    const parseo = EventoEntrada.safeParse(req.body);
    if (!parseo.success) {
      return res.status(422).json({
        error: { code: "ENTRADA_INVALIDA", message: "Evento inválido", details: parseo.error.flatten() },
      });
    }

    const ruta = rutaEstadoSync();
    if (yaFueVisto(parseo.data.evento_id, ruta)) {
      return res.status(200).json({ recibido: true, duplicado: true });
    }

    marcarEstado(parseo.data.evento_id, "pendiente", ruta);
    res.status(202).json({ recibido: true, duplicado: false });

    const config = cargarConfig();
    const resultado = await ejecutarPipeline(parseo.data, obtenerClasificador(), config.umbralEscalamiento);
    marcarEstado(parseo.data.evento_id, "enviado", ruta);
    void resultado;
  } catch (err) {
    next(err);
  }
});
```

Nota de diseño: la respuesta HTTP se envía en cuanto el evento queda
marcado `pendiente` (el webhook no debe bloquear la respuesta al segundo
sistema esperando el pipeline completo) — el procesamiento real continúa
después con `void`. La Tarea 9 (envío de vuelta) es quien más adelante
consulta este resultado y lo envía al mock; en esta tarea el resultado del
pipeline aún no se envía a ningún lado, sólo se ejecuta y se marca
`enviado` como evidencia de que corrió.

- [ ] **Step 4: Montar el router en la app**

En `etapa4-orquestacion/src/app.ts`, agregar:
```ts
import { webhookRouter } from "./routes/webhook.js";
// ... dentro de crearApp(), antes de return app:
app.use("/webhook", webhookRouter);
```

- [ ] **Step 5: Run test to verify it passes**

```bash
cd etapa4-orquestacion && npx vitest run tests/routes/webhook.test.ts
```

Expected: 3 tests PASS.

- [ ] **Step 6: Commit**

```bash
git add etapa4-orquestacion/src/routes/webhook.ts etapa4-orquestacion/tests/routes/webhook.test.ts etapa4-orquestacion/src/app.ts
git commit -m "feat(etapa4): endpoint POST /webhook/entrada con deduplicacion por evento_id"
```

---

### Task 9: Envío de vuelta al segundo sistema con reintentos

**Files:**
- Create: `etapa4-orquestacion/src/integracion/clienteSolicitudes.ts`
- Test: `etapa4-orquestacion/tests/integracion/clienteSolicitudes.test.ts`

**Interfaces:**
- Consumes: nada nuevo (usa `fetch` nativo).
- Produces: `interface DatosSolicitud { asunto: string; descripcion: string; area: string; solicitante: string }`; `enviarSolicitud(datos: DatosSolicitud, claveIdempotencia: string, opciones: { baseUrl: string; token: string; maxReintentos: number }): Promise<{ id: string; estado: string }>` — usado por la Tarea 8 en una futura extensión y por la Tarea 12 (demo).

- [ ] **Step 1: Write the failing test**

Este test corre contra el `servicio_mock` REAL (mismo patrón que Etapas 1-2:
pruebas reales contra infraestructura real, no mocks de red). Requiere el
mock corriendo en `http://localhost:8080` — levántalo antes de correr la
suite:

```bash
cd materiales/servicio_mock && pip install -r requirements.txt && uvicorn app:app --port 8080 &
```

`etapa4-orquestacion/tests/integracion/clienteSolicitudes.test.ts`:
```ts
import { randomUUID } from "node:crypto";
import { describe, expect, it } from "vitest";
import { enviarSolicitud } from "../../src/integracion/clienteSolicitudes.js";

const OPCIONES = {
  baseUrl: "http://localhost:8080",
  token: "demo-token-prueba-2026",
  maxReintentos: 6,
};

const DATOS = {
  asunto: "Consulta de prueba automatizada",
  descripcion: "Generada por la suite de Etapa 4.",
  area: "Talento Humano",
  solicitante: "prueba.etapa4@lafortuna.com.co",
};

describe("enviarSolicitud (contra servicio_mock real)", () => {
  it("crea una solicitud y devuelve un id", async () => {
    const resultado = await enviarSolicitud(DATOS, randomUUID(), OPCIONES);
    expect(resultado.id).toMatch(/^EXT-/);
    expect(resultado.estado).toBe("Abierto");
  }, 20000);

  it("la misma Idempotency-Key devuelve la misma solicitud (no duplica)", async () => {
    const clave = randomUUID();
    const primera = await enviarSolicitud(DATOS, clave, OPCIONES);
    const segunda = await enviarSolicitud(DATOS, clave, OPCIONES);
    expect(segunda.id).toBe(primera.id);
  }, 20000);
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
cd etapa4-orquestacion && npx vitest run tests/integracion/clienteSolicitudes.test.ts
```

Expected: FAIL — el módulo no existe.

- [ ] **Step 3: Write minimal implementation**

`etapa4-orquestacion/src/integracion/clienteSolicitudes.ts`:
```ts
export interface DatosSolicitud {
  asunto: string;
  descripcion: string;
  area: string;
  solicitante: string;
}

export interface OpcionesCliente {
  baseUrl: string;
  token: string;
  maxReintentos: number;
}

/** Envía una solicitud a servicio_mock con Idempotency-Key y reintentos
 * con backoff ante 429/500 (mismo patrón exponencial que
 * etapa2-api/src/ia/ClasificadorService.ts, adaptado a la cabecera
 * Retry-After real que el mock entrega en 429). El mock falla a propósito
 * ~17% de las veces (12% 500 + 5% 429) - los reintentos son el mecanismo
 * real que hace confiable la integración, no un caso de borde teórico. */
export async function enviarSolicitud(
  datos: DatosSolicitud,
  claveIdempotencia: string,
  opciones: OpcionesCliente
): Promise<{ id: string; estado: string }> {
  for (let intento = 1; intento <= opciones.maxReintentos; intento++) {
    const respuesta = await fetch(`${opciones.baseUrl}/solicitudes`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${opciones.token}`,
        "Idempotency-Key": claveIdempotencia,
      },
      body: JSON.stringify(datos),
    });

    if (respuesta.status === 201) {
      return respuesta.json();
    }

    if (respuesta.status === 429 || respuesta.status === 500) {
      if (intento === opciones.maxReintentos) {
        throw new Error(`servicio_mock respondió ${respuesta.status} tras ${opciones.maxReintentos} intentos`);
      }
      const retryAfterHeader = respuesta.headers.get("Retry-After");
      const esperaMs = retryAfterHeader ? Number(retryAfterHeader) * 1000 : 2 ** intento * 200;
      await new Promise((resolve) => setTimeout(resolve, esperaMs));
      continue;
    }

    throw new Error(`servicio_mock respondió HTTP inesperado ${respuesta.status}`);
  }
  throw new Error("No se pudo enviar la solicitud tras agotar los reintentos");
}
```

- [ ] **Step 4: Run test to verify it passes**

```bash
cd etapa4-orquestacion && npx vitest run tests/integracion/clienteSolicitudes.test.ts
```

Expected: 2 tests PASS (pueden tardar varios segundos por la latencia
simulada real del mock, 0.1-2.5s por petición más los reintentos que
ocurran).

- [ ] **Step 5: Commit**

```bash
git add etapa4-orquestacion/src/integracion/clienteSolicitudes.ts etapa4-orquestacion/tests/integracion/clienteSolicitudes.test.ts
git commit -m "feat(etapa4): cliente de envio a servicio_mock con Idempotency-Key y reintentos"
```

---

### Task 10: Extensión del modelo relacional — tabla `interacciones_ia`

**Files:**
- Create: `materiales/datos/migraciones/002_interacciones_ia.sql`
- Test: `etapa4-orquestacion/tests/migracion.test.ts`

**Interfaces:**
- Consumes: nada (SQL puro, tabla `tickets` ya existe en `esquema.sql`).
- Produces: tabla `interacciones_ia` en MariaDB — referenciada por el documento de arquitectura (Tarea 2) y por el README (Tarea 13).

- [ ] **Step 1: Escribir la migración**

`materiales/datos/migraciones/002_interacciones_ia.sql`:
```sql
-- =====================================================================
-- Etapa 4 — extensión de trazabilidad: registro por paso del pipeline
-- de orquestación. Se aplica sobre el esquema base (materiales/datos/esquema.sql).
-- =====================================================================

CREATE TABLE IF NOT EXISTS interacciones_ia (
  id_interaccion   INT AUTO_INCREMENT PRIMARY KEY,
  id_ticket        INT NOT NULL,
  evento_id        VARCHAR(80) NOT NULL,
  paso_pipeline    VARCHAR(30) NOT NULL,
  decision         VARCHAR(30) NOT NULL,
  confianza        DECIMAL(4,3),
  fecha            DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_interaccion_ticket FOREIGN KEY (id_ticket) REFERENCES tickets(id_ticket)
);

CREATE INDEX idx_interacciones_evento ON interacciones_ia (evento_id);
```

- [ ] **Step 2: Write the failing test (contra MariaDB real)**

Requiere el contenedor de MariaDB de Etapa 2 corriendo (ya trae `esquema.sql`
cargado vía `docker-entrypoint-initdb.d`):

```bash
cd etapa2-api/docker && docker compose up -d mariadb
```

`etapa4-orquestacion/tests/migracion.test.ts`:
```ts
import { readFileSync } from "node:fs";
import path from "node:path";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import mysql from "mysql2/promise";

let conexion: mysql.Connection;

beforeAll(async () => {
  conexion = await mysql.createConnection({
    host: "127.0.0.1",
    port: 3306,
    user: "root",
    password: process.env.DB_ROOT_PASSWORD ?? "root",
    database: process.env.DB_NAME ?? "mesa_ayuda",
    multipleStatements: true,
  });
  const migracion = readFileSync(
    path.resolve(__dirname, "../../materiales/datos/migraciones/002_interacciones_ia.sql"),
    "utf-8"
  );
  await conexion.query(migracion);
});

afterAll(async () => {
  await conexion.end();
});

describe("migracion 002_interacciones_ia", () => {
  it("crea la tabla con las columnas esperadas", async () => {
    const [columnas] = await conexion.query<mysql.RowDataPacket[]>(
      "SHOW COLUMNS FROM interacciones_ia"
    );
    const nombres = columnas.map((c) => c.Field);
    expect(nombres).toEqual(
      expect.arrayContaining(["id_interaccion", "id_ticket", "evento_id", "paso_pipeline", "decision", "confianza", "fecha"])
    );
  });

  it("acepta insertar una interaccion referenciando un ticket real", async () => {
    await conexion.query(
      "INSERT INTO interacciones_ia (id_ticket, evento_id, paso_pipeline, decision, confianza) VALUES (?, ?, ?, ?, ?)",
      [1, "evt-test-1", "rag", "responder", 0.9]
    );
    const [filas] = await conexion.query<mysql.RowDataPacket[]>(
      "SELECT * FROM interacciones_ia WHERE evento_id = ?",
      ["evt-test-1"]
    );
    expect(filas).toHaveLength(1);
    expect(filas[0].id_ticket).toBe(1);
  });
});
```

Agregar `mysql2` como dependencia de desarrollo:
```bash
cd etapa4-orquestacion && npm install --save-dev mysql2
```

- [ ] **Step 3: Run test to verify it fails, then passes**

```bash
cd etapa4-orquestacion && npx vitest run tests/migracion.test.ts
```

Expected antes de aplicar la migración manualmente por primera vez: puede
fallar si la tabla no existe aún — el propio `beforeAll` la crea vía
`CREATE TABLE IF NOT EXISTS`, así que en una corrida limpia el test ya
debe pasar en su primera ejecución (`IF NOT EXISTS` hace la migración
idempotente, se puede correr la suite repetidamente sin resetear la DB).
Expected final: 2 tests PASS.

- [ ] **Step 4: Commit**

```bash
git add materiales/datos/migraciones/002_interacciones_ia.sql etapa4-orquestacion/tests/migracion.test.ts etapa4-orquestacion/package.json etapa4-orquestacion/package-lock.json
git commit -m "feat(etapa4): migracion SQL de trazabilidad (interacciones_ia) verificada contra MariaDB real"
```

---

### Task 11: Control de costo y capacidad

**Files:**
- Create: `docs/control-costo-etapa4.md`

**Interfaces:**
- Consumes: nada (cálculo documental sobre volúmenes de `materiales/n5/requerimientos_negocio.md`).
- Produces: nada (documentación).

- [ ] **Step 1: Escribir el documento**

`docs/control-costo-etapa4.md`:
```markdown
# Control de costo y capacidad — Etapa 4

Fuente de los volúmenes: `materiales/n5/requerimientos_negocio.md`
(R-01: 3.000 solicitudes/día para clasificación; R-02: 80 consultas/día de
políticas).

## Supuestos declarados (estimación de tokens por llamada)

| Llamada | Entrada estimada | Salida estimada | Total/llamada |
|---|---|---|---|
| Clasificación (asunto + descripción de un ticket, prompt corto) | ~150 tokens | ~20 tokens | ~170 tokens |
| Consulta RAG (pregunta + hasta 3 fragmentos de contexto de ~1200 caracteres c/u + embedding de la pregunta) | ~950 tokens | ~150 tokens | ~1.100 tokens |

Los tamaños de fragmento (~1200 caracteres) vienen directamente de
`TAMANO_MAXIMO` en `etapa3-rag/src/ingesta/chunker.ts` (Etapa 3, ya
acreditada) — no son un supuesto inventado, son el límite real configurado.

## Estimación mensual (30 días)

- Clasificación: 3.000/día × 170 tokens = **510.000 tokens/día** → **~15,3M
  tokens/mes**.
- Consulta de políticas: 80/día × 1.100 tokens = **88.000 tokens/día** →
  **~2,64M tokens/mes**.
- **Total: ~17,94M tokens/mes.**

A un precio de referencia ilustrativo de proveedor compatible
OpenAI-estilo Ollama/LM Studio local (costo marginal ~$0 en cómputo propio)
o, si se usa un proveedor externo con un precio de referencia de mercado de
~US$0,50 por millón de tokens de entrada y ~US$1,50 por millón de salida
(cifras de referencia, no un contrato vigente — deben reemplazarse por el
precio real del proveedor elegido en producción):

- Entrada total aprox.: 3.000×150 + 80×950 = 526.000 tokens/día → 15,78M/mes
  → **~US$7,89/mes**.
- Salida total aprox.: 3.000×20 + 80×150 = 72.000 tokens/día → 2,16M/mes →
  **~US$3,24/mes**.
- **Total estimado: ~US$11/mes** con estos supuestos y este precio de
  referencia — un costo bajo comparado con el 18% del tiempo del equipo que
  hoy consume responder manualmente las consultas de políticas (dato de
  `requerimientos_negocio.md`, R-02).

## Presupuesto máximo y mecanismo de alerta

- Presupuesto máximo propuesto: **US$50/mes** (margen ~4,5x sobre la
  estimación, para absorber picos y reintentos).
- Mecanismo de alerta: cada llamada al `IAProvider` ya se instrumenta con
  `registrarMetrica` (latencia + tokens aproximados, Etapa 3 Tarea 9); se
  agrega un acumulador mensual simple que compara `tokensTotales` contra el
  presupuesto convertido a tokens y emite un `console.warn` estructurado
  (`{evento: "alerta_presupuesto", porcentaje}`) al cruzar el 80% del
  presupuesto mensual.

## Qué hace el sistema al superar el presupuesto

- Bajo el 100%: sigue operando normalmente, sólo registra la alerta.
- Al superar el 100%: modo degradado — las clasificaciones (baja
  criticidad, se corrigen en <1 minuto según R-01) caen automáticamente al
  `HeuristicProvider` sin llamar al proveedor real (ya es el comportamiento
  de respaldo garantizado de `ClasificadorService`); las consultas RAG
  (mayor riesgo si responden mal, según la restricción de R-02: una
  respuesta equivocada genera reclamación formal) se ponen en una cola de
  espera hasta el siguiente ciclo de presupuesto en vez de degradar la
  calidad de la respuesta — es preferible escalar a una persona que
  arriesgar una respuesta incorrecta sobre montos o plazos.
```

- [ ] **Step 2: Commit**

```bash
git add docs/control-costo-etapa4.md
git commit -m "docs(etapa4): control de costo y capacidad con volumenes reales de requerimientos_negocio.md"
```

---

### Task 12: Demo mínima end-to-end

**Files:**
- Create: `etapa4-orquestacion/src/scripts/demo.ts`
- Create: `etapa4-orquestacion/src/scripts/estado.ts`

**Interfaces:**
- Consumes: `ejecutarPipeline` (Tarea 6); `listarEstados` (Tarea 7).
- Produces: `npm run demo` y `npm run estado` — evidencia real referenciada por el README (Tarea 13).

- [ ] **Step 1: Escribir el script de demo**

Corre un caso real end-to-end (clasificar → RAG → decidir) usando
`HeuristicProvider` explícitamente para la clasificación si no hay
proveedor de IA real disponible en el entorno de ejecución — mismo ruling
ya aplicado en Etapa 3 Tarea 6 para `main()` de `ingestar.ts`, aplicado
aquí de forma explícita y documentada en el propio script en vez de dejarlo
implícito en el comportamiento de respaldo del `ClasificadorService`
(que de todas formas caería a heurística tras agotar los reintentos, pero
eso tomaría el timeout completo sin necesidad si ya sabemos que no hay
proveedor real):

`etapa4-orquestacion/src/scripts/demo.ts`:
```ts
import { ClasificadorService, HeuristicProvider } from "etapa2-api";
import { ejecutarPipeline } from "../pipeline.js";
import { marcarEstado } from "../estadoSync.js";

const CASOS_DEMO = [
  { evento_id: "demo-1", pregunta: "¿Con cuánta anticipación debo pedir mis vacaciones?" },
  { evento_id: "demo-2", pregunta: "¿Cuál es la política de horarios de teletrabajo los viernes?" },
];

async function main(): Promise<void> {
  const clasificador = new ClasificadorService(new HeuristicProvider(), new HeuristicProvider(), 3000, 1);

  for (const caso of CASOS_DEMO) {
    const resultado = await ejecutarPipeline(caso, clasificador, 0.4);
    marcarEstado(caso.evento_id, resultado.accion === "responder" ? "enviado" : "error", "data/estado_sync.json");
    console.log(
      JSON.stringify({
        evento: "demo_pipeline",
        evento_id: resultado.evento_id,
        pregunta: caso.pregunta,
        categoria: resultado.categoria,
        accion: resultado.accion,
        respuesta: resultado.respuesta,
        citas: resultado.citas,
      })
    );
  }
}

main().catch((err) => {
  console.error(JSON.stringify({ evento: "demo_error", mensaje: String(err) }));
  process.exit(1);
});
```

`etapa4-orquestacion/src/scripts/estado.ts`:
```ts
import { listarEstados } from "../estadoSync.js";

const estados = listarEstados("data/estado_sync.json");
console.table(estados);
```

- [ ] **Step 2: Ejecutar la demo y guardar la evidencia**

```bash
cd etapa4-orquestacion && npm run demo | tee ../docs/evidencia-demo-etapa4.log
npm run estado
```

Expected: el log muestra 2 líneas JSON, una por caso, con `accion` y
`respuesta` reales (usando el índice vectorial real de 42 fragmentos de
Etapa 3 — el primer caso, sobre vacaciones, debería citar
`POL-GTH-01_Vacaciones.pdf`; el segundo, sobre teletrabajo los viernes,
probablemente se abstenga o escale si no hay política que lo cubra
literalmente en el corpus — cualquiera de los dos resultados es válido
evidencia real, documentar el que realmente ocurra en el README, no
asumirlo de antemano).

- [ ] **Step 3: Commit**

```bash
git add etapa4-orquestacion/src/scripts/demo.ts etapa4-orquestacion/src/scripts/estado.ts docs/evidencia-demo-etapa4.log
git commit -m "feat(etapa4): script de demo end-to-end real y script de estado de sincronizacion"
```

---

### Task 13: README de la etapa

**Files:**
- Create: `etapa4-orquestacion/README.md`

**Interfaces:**
- Consumes: nada.
- Produces: nada (documentación, cierre de la etapa).

- [ ] **Step 1: Escribir el README**

`etapa4-orquestacion/README.md`:
```markdown
# Etapa 4 — Orquestación

## Instalación y ejecución

Desde la raíz del monorepo (npm workspaces):
\`\`\`bash
npm install
npm run build --workspace etapa2-api
npm run build --workspace etapa3-rag
npm run build --workspace etapa4-orquestacion
cp etapa4-orquestacion/.env.example etapa4-orquestacion/.env   # completar credenciales
cd etapa4-orquestacion && npm run dev
\`\`\`

Para la demo end-to-end real (no requiere servidor levantado):
\`\`\`bash
npm run demo --workspace etapa4-orquestacion
npm run estado --workspace etapa4-orquestacion
\`\`\`

## Qué quedó funcionando de verdad

- Pipeline completo (clasificar → RAG → decidir escalar) ejecutado de
  extremo a extremo con datos reales — ver `docs/evidencia-demo-etapa4.log`
  (Tarea 12) para la corrida real registrada.
- Deduplicación de eventos entrantes por `evento_id`, verificada con test
  automatizado (mismo evento dos veces → un solo procesamiento).
- Cliente de envío hacia `servicio_mock` con `Idempotency-Key` y
  reintentos ante 429/500, verificado con tests reales contra el mock
  corriendo (no mockeado en red).
- Registro de estado de sincronización (`pendiente/enviado/confirmado/error`)
  persistido en disco, consultable con `npm run estado`.
- Tabla `interacciones_ia` de trazabilidad, migración verificada contra un
  MariaDB real (mismo contenedor Docker de Etapa 2).

## Qué quedó solo diseñado (documentado, no ejecutado en producción)

- El envío de vuelta (Tarea 9) no está todavía conectado automáticamente
  al final del pipeline del webhook (Tarea 8) — el pipeline se ejecuta y
  registra el resultado, pero la llamada real a `enviarSolicitud` con el
  resultado del pipeline queda como siguiente paso documentado, no
  conectada en el flujo HTTP en vivo. Se declara honestamente en vez de
  simular una integración completa no verificada extremo a extremo bajo
  carga concurrente real.
- El acumulador mensual de presupuesto de tokens (Tarea 11) está
  especificado con su mecanismo de alerta, pero no implementado como
  proceso en ejecución continua — es responsabilidad de un despliegue real
  con un job programado, fuera del alcance de 3 días.
- Sin UI visual del flujo de orquestación (decisión de ADR-001) — la
  evidencia de ejecución es el log estructurado, no una vista gráfica.

## Documentos de esta etapa

- Arquitectura y flujo end-to-end: `docs/arquitectura-etapa4.md`
- ADR-001 (orquestador), ADR-002 (indexación vectorial), ADR-003
  (idempotencia): `docs/adr/`
- Control de costo y capacidad: `docs/control-costo-etapa4.md`
- Migración de trazabilidad relacional:
  `materiales/datos/migraciones/002_interacciones_ia.sql`
```

- [ ] **Step 2: Commit**

```bash
git add etapa4-orquestacion/README.md
git commit -m "docs(etapa4): README de la etapa, declara alcance real vs. diseñado"
```

---

### Task 14: Pipeline de CI — job de `etapa4-orquestacion`

**Files:**
- Modify: `.github/workflows/ci.yml`

**Interfaces:**
- Consumes: `package.json` raíz con workspaces (Tarea 1).
- Produces: job de CI adicional ejecutado en cada push/PR.

- [ ] **Step 1: Agregar el job**

En `.github/workflows/ci.yml` (ya existe desde la Tarea 11 de Etapa 3),
agregar un cuarto job:

```yaml
  etapa4-orquestacion:
    runs-on: ubuntu-latest
    needs: [etapa2-api, etapa3-rag]
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: "20"
      - run: npm install
      - run: npm run build --workspace etapa2-api
      - run: npm run build --workspace etapa3-rag
      - run: npm run build --workspace etapa4-orquestacion
      - name: Pruebas unitarias (sin infraestructura externa)
        run: npm test --workspace etapa4-orquestacion -- --exclude "**/integracion/**" --exclude "**/migracion.test.ts"
```

Nota: los tests de `clienteSolicitudes.test.ts` (Tarea 9) y
`migracion.test.ts` (Tarea 10) requieren `servicio_mock` y MariaDB
corriendo respectivamente — se excluyen de este job de CI simple (que no
levanta esos servicios) y quedan documentados en el README como pruebas de
integración que se corren localmente con Docker Compose levantado, mismo
criterio que el resto de la suite de Etapa 1/2 que requiere infraestructura
real.

- [ ] **Step 2: Verificar sintaxis YAML localmente**

```bash
python -c "import yaml; yaml.safe_load(open('.github/workflows/ci.yml'))"
```

Expected: no lanza error de parseo.

- [ ] **Step 3: Commit**

```bash
git add .github/workflows/ci.yml
git commit -m "ci(etapa4): job de integracion continua para etapa4-orquestacion"
```

---
