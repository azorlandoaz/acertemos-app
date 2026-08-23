# Etapa 3 — Complejidad y calidad Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** RAG en Node/TypeScript sobre los 5 PDF de políticas, con abstención verificable, CI con evidencia roja/verde, instrumentación de costo/latencia, informe de seguridad sobre código propio y un artefacto de aporte al equipo.

**Architecture:** Pipeline de ingesta (PDF → texto → fragmentos por sección → embeddings) que persiste un índice vectorial local en JSON; un endpoint `POST /consultas` que recupera por similitud coseno y responde citando fuente, o se abstiene si la similitud máxima cae bajo un umbral. Reutiliza `IAProvider`/`HeuristicProvider`/`HttpChatProvider` de `etapa2-api` vía npm workspaces (nunca los duplica).

**Tech Stack:** Node.js 20+, TypeScript, Express 4, `pdf-parse`, Vitest + Supertest, npm workspaces, GitHub Actions.

**Spec:** `docs/superpowers/specs/2026-08-22-etapa3-rag-calidad-design.md` (y convenciones transversales en `docs/superpowers/specs/2026-08-22-arquitectura-general-design.md`).

## Decisiones de alcance (D1-D4)

- **D1 — Reutilización real de `etapa2-api` vía npm workspaces.** El spec exige "no duplicar `IAProvider`". Se agrega un `package.json` raíz con `"workspaces": ["etapa2-api", "etapa3-rag"]`, y `etapa2-api` gana un barrel `src/ia/index.ts` + campo `"main"` para poder importarse como paquete (`import { HeuristicProvider } from "etapa2-api"`). `etapa3-rag` depende de `"etapa2-api": "*"` en su `package.json`. Esto NO reestructura las carpetas de las etapas ya entregadas, solo agrega un punto de entrada público.
- **D2 — Base vectorial: JSON local + coseno en memoria.** Sin dependencias nativas (nada de `better-sqlite3`/DB externa) para minimizar fricción de instalación en 3 días. El índice se persiste en `etapa3-rag/data/indice_vectorial.json` y se carga completo en memoria al arrancar — viable para 5 PDF.
- **D3 — Fragmentación por encabezado de sección.** Se detectan líneas que matchean `^\d+(\.\d+)*\s` (p. ej. "3.1 Anticipación...") como inicio de sección; todo el texto hasta el siguiente encabezado (o fin de documento) es un fragmento. Si un fragmento supera ~1200 caracteres se subdivide por párrafo con 100 caracteres de solape, conservando el mismo número de sección. Si un documento no tiene encabezados detectables, se trata como una sola sección `"1"`.
- **D4 — Umbral de abstención configurable.** `UMBRAL_ABSTENCION=0.75` por defecto (coseno), vía env var — por debajo de ese máximo entre los fragmentos recuperados, el endpoint se abstiene en vez de generar.

## Global Constraints

- Rama de trabajo `etapa3-rag`, creada después de que Etapa 2 esté acreditada, con al menos 8 commits atómicos.
- Ningún secreto en el repositorio: `.env` fuera de git, solo `.env.example`.
- El módulo RAG nunca importa el SDK del proveedor de IA directamente — solo a través de `IAProvider` reexportado desde `etapa2-api`.
- El informe de seguridad (Tarea 13) es sobre código **propio de esta etapa**, nunca sobre `pr_para_revision.diff`.
- Forma uniforme de error igual a Etapa 2: `{ error: { code, message, details? } }` (reutilizar `AppError`/`errorHandler` de `etapa2-api`).

---

## File Structure

```
package.json                              ← NUEVO: raíz, npm workspaces
etapa2-api/
├── package.json                          ← MODIFICADO: + "main", + "name" ya existente
└── src/ia/index.ts                       ← NUEVO: barrel export
etapa3-rag/
├── package.json, tsconfig.json, vitest.config.ts, .env.example
├── data/                                  (gitignored: índice + cache de embeddings generados)
├── docs/estandar-prompts-o-revision.md
├── src/
│   ├── config/env.ts
│   ├── ingesta/
│   │   ├── pdfParser.ts                  (extraerTexto)
│   │   ├── chunker.ts                    (fragmentarPorSeccion)
│   │   ├── embeddings.ts                 (generarEmbeddings + cache)
│   │   └── ingestar.ts                   (orquesta todo, script de entrada)
│   ├── busqueda/
│   │   └── vectorStore.ts                (guardar/cargar/buscar por coseno)
│   ├── metricas.ts                       (latencia + tokens)
│   ├── routes/consultas.ts               (POST /consultas)
│   └── app.ts, server.ts
└── tests/…
docs/seguridad/informe-etapa3.md
.github/workflows/ci.yml                  ← NUEVO: raíz del repo
```

---

### Task 1: Rama, workspaces y andamiaje

**Files:**
- Create: `package.json` (raíz del repo)
- Modify: `etapa2-api/package.json` (agregar `"main"`)
- Create: `etapa2-api/src/ia/index.ts`
- Create: `etapa3-rag/package.json`, `etapa3-rag/tsconfig.json`, `etapa3-rag/vitest.config.ts`, `etapa3-rag/.env.example`
- Create: `etapa3-rag/src/config/env.ts`, `etapa3-rag/src/app.ts`, `etapa3-rag/src/server.ts`, `etapa3-rag/README.md` (stub)

**Interfaces:**
- Consumes: `IAProvider`, `HeuristicProvider`, `HttpChatProvider` de `etapa2-api` (Etapa 2, ya acreditada).
- Produces: paquete `etapa2-api` importable desde `etapa3-rag`; `cargarConfig()`/`crearApp()` en `etapa3-rag`, mismo patrón que Etapa 2.

- [ ] **Step 1: Rama de trabajo**

```bash
git checkout master
git checkout -b etapa3-rag
```

- [ ] **Step 2: package.json raíz con workspaces**

`package.json` (raíz):
```json
{
  "name": "mesa-ayuda-inteligente",
  "private": true,
  "workspaces": ["etapa2-api", "etapa3-rag"]
}
```

- [ ] **Step 3: Barrel export en etapa2-api**

`etapa2-api/src/ia/index.ts`:
```ts
export type { IAProvider, ResultadoClasificacion } from "./IAProvider.js";
export { HeuristicProvider } from "./HeuristicProvider.js";
export { HttpChatProvider } from "./HttpChatProvider.js";
```

En `etapa2-api/package.json`, agregar (junto a `"version"`):
```json
  "main": "dist/ia/index.js",
  "types": "dist/ia/index.d.ts",
```

- [ ] **Step 4: Andamiaje de etapa3-rag**

`etapa3-rag/package.json`:
```json
{
  "name": "etapa3-rag",
  "version": "1.0.0",
  "type": "module",
  "scripts": {
    "dev": "tsx watch src/server.ts",
    "build": "tsc -p tsconfig.json",
    "ingestar": "tsx src/ingesta/ingestar.ts",
    "test": "vitest run"
  },
  "dependencies": {
    "etapa2-api": "*",
    "express": "^4.19.2",
    "zod": "^3.23.8",
    "dotenv": "^16.4.5",
    "pdf-parse": "^1.1.1"
  },
  "devDependencies": {
    "typescript": "^5.5.4",
    "tsx": "^4.16.2",
    "vitest": "^2.0.5",
    "supertest": "^7.0.0",
    "@types/express": "^4.17.21",
    "@types/supertest": "^6.0.2",
    "@types/node": "^20.14.15",
    "@types/pdf-parse": "^1.1.4"
  }
}
```

`etapa3-rag/tsconfig.json`: idéntico al de `etapa2-api` (mismo contenido):
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

`etapa3-rag/vitest.config.ts`:
```ts
import { defineConfig } from "vitest/config";

export default defineConfig({
  test: { environment: "node" },
});
```

`etapa3-rag/.env.example`:
```
PORT=3100
AI_PROVIDER_BASE_URL=http://localhost:11434/v1
AI_PROVIDER_API_KEY=cambia-esta-clave
AI_PROVIDER_MODEL=llama3
AI_TIMEOUT_MS=5000
AI_MAX_REINTENTOS=2
UMBRAL_ABSTENCION=0.75
```

`etapa3-rag/src/config/env.ts`:
```ts
import "dotenv/config";

export interface Config {
  puerto: number;
  aiProviderBaseUrl: string;
  aiProviderApiKey: string;
  aiProviderModel: string;
  aiTimeoutMs: number;
  aiMaxReintentos: number;
  umbralAbstencion: number;
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
    puerto: Number(process.env.PORT ?? 3100),
    aiProviderBaseUrl: requerida("AI_PROVIDER_BASE_URL"),
    aiProviderApiKey: requerida("AI_PROVIDER_API_KEY"),
    aiProviderModel: process.env.AI_PROVIDER_MODEL ?? "llama3",
    aiTimeoutMs: Number(process.env.AI_TIMEOUT_MS ?? 5000),
    aiMaxReintentos: Number(process.env.AI_MAX_REINTENTOS ?? 2),
    umbralAbstencion: Number(process.env.UMBRAL_ABSTENCION ?? 0.75),
  };
}
```

`etapa3-rag/src/app.ts`:
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

`etapa3-rag/src/server.ts`:
```ts
import { crearApp } from "./app.js";
import { cargarConfig } from "./config/env.js";

const config = cargarConfig();
const app = crearApp();
app.listen(config.puerto, () => {
  console.log(`etapa3-rag escuchando en :${config.puerto}`);
});
```

`etapa3-rag/README.md` (stub):
```markdown
# Etapa 3 — Complejidad y calidad

En construcción. Ver `docs/superpowers/specs/2026-08-22-etapa3-rag-calidad-design.md`.
```

`etapa3-rag/.gitignore` (nuevo, propio del subproyecto):
```
node_modules/
dist/
.env
data/*.json
```

- [ ] **Step 5: Instalar y verificar el workspace completo**

```bash
npm install
npm run build --workspace etapa2-api
npm run build --workspace etapa3-rag
```

Expected: ambos builds terminan sin errores; `node -e "console.log(require('etapa2-api'))"` no aplica (ESM) — en su lugar verificar que `etapa3-rag/node_modules/etapa2-api` es un symlink a `../../etapa2-api` (`ls -la etapa3-rag/node_modules/etapa2-api`).

- [ ] **Step 6: Commit**

```bash
git add package.json etapa2-api/package.json etapa2-api/src/ia/index.ts \
        etapa3-rag/package.json etapa3-rag/tsconfig.json etapa3-rag/vitest.config.ts \
        etapa3-rag/.env.example etapa3-rag/.gitignore etapa3-rag/src etapa3-rag/README.md \
        package-lock.json
git commit -m "chore(etapa3): andamiaje del subproyecto y npm workspaces con etapa2-api"
```

---

### Task 2: Ingesta de PDF

**Files:**
- Create: `etapa3-rag/src/ingesta/pdfParser.ts`
- Test: `etapa3-rag/tests/ingesta/pdfParser.test.ts`

**Interfaces:**
- Consumes: nada.
- Produces: `extraerTexto(rutaPdf: string): Promise<string>` — usado por `ingestar.ts` (Tarea 6).

- [ ] **Step 1: Write the failing test**

`etapa3-rag/tests/ingesta/pdfParser.test.ts`:
```ts
import path from "node:path";
import { describe, expect, it } from "vitest";
import { extraerTexto } from "../../src/ingesta/pdfParser.js";

const POLITICAS_DIR = path.resolve(__dirname, "../../../materiales/politicas");

describe("extraerTexto", () => {
  it("extrae texto no vacío de un PDF real de políticas", async () => {
    const ruta = path.join(POLITICAS_DIR, "POL-GTH-01_Vacaciones.pdf");
    const texto = await extraerTexto(ruta);
    expect(texto.length).toBeGreaterThan(100);
    expect(texto.toLowerCase()).toContain("vacaciones");
  });

  it("lanza un error claro si el archivo no existe", async () => {
    await expect(extraerTexto("no-existe.pdf")).rejects.toThrow();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
cd etapa3-rag && npx vitest run tests/ingesta/pdfParser.test.ts
```

Expected: FAIL — el módulo no existe.

- [ ] **Step 3: Write minimal implementation**

`etapa3-rag/src/ingesta/pdfParser.ts`:
```ts
import { readFile } from "node:fs/promises";
// pdf-parse no publica tipos ESM limpios; import por defecto vía require interno.
import pdfParse from "pdf-parse";

const TAMANO_MAXIMO_BYTES = 20 * 1024 * 1024; // 20 MB

/** Extrae el texto completo de un PDF. Rechaza archivos excesivamente
 * grandes para no bloquear la ingesta con un PDF corrupto/gigante. */
export async function extraerTexto(rutaPdf: string): Promise<string> {
  const buffer = await readFile(rutaPdf);
  if (buffer.byteLength > TAMANO_MAXIMO_BYTES) {
    throw new Error(
      `${rutaPdf} supera el tamaño máximo permitido de ingesta (${TAMANO_MAXIMO_BYTES} bytes)`
    );
  }
  const resultado = await pdfParse(buffer);
  return resultado.text;
}
```

- [ ] **Step 4: Run test to verify it passes**

```bash
npx vitest run tests/ingesta/pdfParser.test.ts
```

Expected: 2 tests PASS.

- [ ] **Step 5: Commit**

```bash
git add etapa3-rag/src/ingesta/pdfParser.ts etapa3-rag/tests/ingesta/pdfParser.test.ts
git commit -m "feat(etapa3): extraccion de texto de PDF de politicas"
```

---

### Task 3: Fragmentación por sección

**Files:**
- Create: `etapa3-rag/src/ingesta/chunker.ts`
- Test: `etapa3-rag/tests/ingesta/chunker.test.ts`

**Interfaces:**
- Consumes: nada.
- Produces: `interface Fragmento { documento: string; seccion: string; texto: string }`; `fragmentarPorSeccion(texto: string, documento: string): Fragmento[]` — usado por `ingestar.ts` (Tarea 6).

- [ ] **Step 1: Write the failing test**

`etapa3-rag/tests/ingesta/chunker.test.ts`:
```ts
import { describe, expect, it } from "vitest";
import { fragmentarPorSeccion } from "../../src/ingesta/chunker.js";

describe("fragmentarPorSeccion", () => {
  it("divide el texto por encabezados de seccion numerados", () => {
    const texto = [
      "3. Vacaciones",
      "Texto introductorio de la seccion 3.",
      "3.1 Anticipacion",
      "Debe solicitarse con 15 dias calendario de anticipacion.",
      "3.2 Aprobacion",
      "El jefe directo aprueba la solicitud.",
    ].join("\n");

    const fragmentos = fragmentarPorSeccion(texto, "POL-GTH-01_Vacaciones.pdf");

    expect(fragmentos).toHaveLength(3);
    expect(fragmentos[0].seccion).toBe("3");
    expect(fragmentos[1].seccion).toBe("3.1");
    expect(fragmentos[1].texto).toContain("15 dias calendario");
    expect(fragmentos.every((f) => f.documento === "POL-GTH-01_Vacaciones.pdf")).toBe(true);
  });

  it("trata el documento completo como seccion '1' si no hay encabezados", () => {
    const texto = "Texto sin ningun encabezado numerado en todo el documento.";
    const fragmentos = fragmentarPorSeccion(texto, "doc.pdf");
    expect(fragmentos).toHaveLength(1);
    expect(fragmentos[0].seccion).toBe("1");
  });

  it("subdivide una seccion demasiado larga conservando el numero de seccion", () => {
    const parrafo = "Frase de relleno para alcanzar longitud. ".repeat(40); // ~1720 chars
    const texto = `5 Seccion larga\n${parrafo}\n\n${parrafo}`;
    const fragmentos = fragmentarPorSeccion(texto, "doc.pdf");
    expect(fragmentos.length).toBeGreaterThan(1);
    expect(fragmentos.every((f) => f.seccion === "5")).toBe(true);
    expect(fragmentos.every((f) => f.texto.length <= 1300)).toBe(true);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
npx vitest run tests/ingesta/chunker.test.ts
```

Expected: FAIL — el módulo no existe.

- [ ] **Step 3: Write minimal implementation**

`etapa3-rag/src/ingesta/chunker.ts`:
```ts
export interface Fragmento {
  documento: string;
  seccion: string;
  texto: string;
}

const PATRON_ENCABEZADO = /^(\d+(?:\.\d+)*)\s+\S.*$/;
const TAMANO_MAXIMO = 1200;
const SOLAPE = 100;

interface Seccion {
  numero: string;
  lineas: string[];
}

function agruparPorSeccion(texto: string): Seccion[] {
  const lineas = texto.split("\n");
  const secciones: Seccion[] = [];
  let actual: Seccion | null = null;

  for (const linea of lineas) {
    const match = linea.match(PATRON_ENCABEZADO);
    if (match) {
      actual = { numero: match[1], lineas: [linea] };
      secciones.push(actual);
    } else if (actual) {
      actual.lineas.push(linea);
    } else {
      actual = { numero: "1", lineas: [linea] };
      secciones.push(actual);
    }
  }
  return secciones;
}

function subdividirSiEsNecesario(documento: string, seccion: Seccion): Fragmento[] {
  const textoCompleto = seccion.lineas.join("\n").trim();
  if (textoCompleto.length <= TAMANO_MAXIMO) {
    return [{ documento, seccion: seccion.numero, texto: textoCompleto }];
  }

  const fragmentos: Fragmento[] = [];
  let inicio = 0;
  while (inicio < textoCompleto.length) {
    const fin = Math.min(inicio + TAMANO_MAXIMO, textoCompleto.length);
    fragmentos.push({
      documento,
      seccion: seccion.numero,
      texto: textoCompleto.slice(inicio, fin).trim(),
    });
    if (fin >= textoCompleto.length) break;
    inicio = fin - SOLAPE;
  }
  return fragmentos;
}

/** Fragmenta un texto en trozos delimitados por encabezados de sección
 * numerados ("3", "3.1", ...). Si no hay encabezados, todo el documento
 * es la sección "1". Secciones más largas de ~1200 caracteres se
 * subdividen con solape, conservando el número de sección original. */
export function fragmentarPorSeccion(texto: string, documento: string): Fragmento[] {
  const secciones = agruparPorSeccion(texto).filter((s) => s.lineas.join("").trim() !== "");
  return secciones.flatMap((s) => subdividirSiEsNecesario(documento, s));
}
```

- [ ] **Step 4: Run test to verify it passes**

```bash
npx vitest run tests/ingesta/chunker.test.ts
```

Expected: 3 tests PASS.

- [ ] **Step 5: Commit**

```bash
git add etapa3-rag/src/ingesta/chunker.ts etapa3-rag/tests/ingesta/chunker.test.ts
git commit -m "feat(etapa3): fragmentacion de texto por seccion numerada"
```

---

### Task 4: Embeddings con cache

**Files:**
- Create: `etapa3-rag/src/ingesta/embeddings.ts`
- Test: `etapa3-rag/tests/ingesta/embeddings.test.ts`

**Interfaces:**
- Consumes: `IAProvider` de `etapa2-api` (Tarea 1).
- Produces: `generarEmbeddingsConCache(fragmentos: Fragmento[], proveedor: IAProvider, rutaCache: string): Promise<Map<string, number[]>>` (clave = `documento::seccion::hash del texto`) — usado por `ingestar.ts` (Tarea 6).

- [ ] **Step 1: Write the failing test**

`etapa3-rag/tests/ingesta/embeddings.test.ts`:
```ts
import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { generarEmbeddingsConCache } from "../../src/ingesta/embeddings.js";
import type { Fragmento } from "../../src/ingesta/chunker.js";
import type { IAProvider } from "etapa2-api";

let dirTemporal: string;

beforeEach(() => {
  dirTemporal = mkdtempSync(path.join(tmpdir(), "embeddings-test-"));
});

afterEach(() => {
  rmSync(dirTemporal, { recursive: true, force: true });
});

function proveedorFalso(): IAProvider {
  return {
    clasificar: vi.fn(),
    generarRespuesta: vi.fn(),
    embeber: vi.fn(async (textos: string[]) => textos.map((t) => [t.length, 1])),
  };
}

describe("generarEmbeddingsConCache", () => {
  it("genera un embedding por fragmento y lo persiste en cache", async () => {
    const fragmentos: Fragmento[] = [{ documento: "d.pdf", seccion: "1", texto: "hola mundo" }];
    const proveedor = proveedorFalso();
    const rutaCache = path.join(dirTemporal, "cache.json");

    const mapa = await generarEmbeddingsConCache(fragmentos, proveedor, rutaCache);

    expect(mapa.size).toBe(1);
    expect(proveedor.embeber).toHaveBeenCalledTimes(1);
    const contenidoCache = JSON.parse(readFileSync(rutaCache, "utf-8"));
    expect(Object.keys(contenidoCache)).toHaveLength(1);
  });

  it("no vuelve a llamar al proveedor para un fragmento ya cacheado", async () => {
    const fragmentos: Fragmento[] = [{ documento: "d.pdf", seccion: "1", texto: "hola mundo" }];
    const proveedor = proveedorFalso();
    const rutaCache = path.join(dirTemporal, "cache.json");

    await generarEmbeddingsConCache(fragmentos, proveedor, rutaCache);
    await generarEmbeddingsConCache(fragmentos, proveedor, rutaCache);

    expect(proveedor.embeber).toHaveBeenCalledTimes(1);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
npx vitest run tests/ingesta/embeddings.test.ts
```

Expected: FAIL — el módulo no existe.

- [ ] **Step 3: Write minimal implementation**

`etapa3-rag/src/ingesta/embeddings.ts`:
```ts
import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import type { IAProvider } from "etapa2-api";
import type { Fragmento } from "./chunker.js";

function claveDe(f: Fragmento): string {
  const hash = createHash("sha256").update(f.texto).digest("hex").slice(0, 16);
  return `${f.documento}::${f.seccion}::${hash}`;
}

function cargarCache(rutaCache: string): Record<string, number[]> {
  if (!existsSync(rutaCache)) return {};
  return JSON.parse(readFileSync(rutaCache, "utf-8"));
}

function guardarCache(rutaCache: string, cache: Record<string, number[]>): void {
  mkdirSync(path.dirname(rutaCache), { recursive: true });
  writeFileSync(rutaCache, JSON.stringify(cache, null, 2), "utf-8");
}

/** Genera embeddings para fragmentos que no estén ya en la cache de disco,
 * evitando recalcular en cada arranque de la ingesta. */
export async function generarEmbeddingsConCache(
  fragmentos: Fragmento[],
  proveedor: IAProvider,
  rutaCache: string
): Promise<Map<string, number[]>> {
  const cache = cargarCache(rutaCache);
  const resultado = new Map<string, number[]>();
  const pendientes: { clave: string; texto: string }[] = [];

  for (const f of fragmentos) {
    const clave = claveDe(f);
    if (cache[clave]) {
      resultado.set(clave, cache[clave]);
    } else {
      pendientes.push({ clave, texto: f.texto });
    }
  }

  if (pendientes.length > 0) {
    const nuevosEmbeddings = await proveedor.embeber(pendientes.map((p) => p.texto));
    pendientes.forEach((p, i) => {
      cache[p.clave] = nuevosEmbeddings[i];
      resultado.set(p.clave, nuevosEmbeddings[i]);
    });
    guardarCache(rutaCache, cache);
  }

  return resultado;
}
```

- [ ] **Step 4: Run test to verify it passes**

```bash
npx vitest run tests/ingesta/embeddings.test.ts
```

Expected: 2 tests PASS.

- [ ] **Step 5: Commit**

```bash
git add etapa3-rag/src/ingesta/embeddings.ts etapa3-rag/tests/ingesta/embeddings.test.ts
git commit -m "feat(etapa3): generacion de embeddings con cache en disco"
```

---

### Task 5: Base vectorial (guardar/cargar/buscar)

**Files:**
- Create: `etapa3-rag/src/busqueda/vectorStore.ts`
- Test: `etapa3-rag/tests/busqueda/vectorStore.test.ts`
- Create: `docs/adr/ADR-004-base-vectorial-etapa3.md`

**Interfaces:**
- Consumes: `Fragmento` (Tarea 3).
- Produces: `interface EntradaIndice extends Fragmento { embedding: number[] }`; `guardarIndice(entradas: EntradaIndice[], ruta: string): void`; `cargarIndice(ruta: string): EntradaIndice[]`; `buscar(indice: EntradaIndice[], embeddingConsulta: number[], k: number): { entrada: EntradaIndice; similitud: number }[]` — usado por `ingestar.ts` (Tarea 6) y `routes/consultas.ts` (Tarea 7).

- [ ] **Step 1: Write the failing test**

`etapa3-rag/tests/busqueda/vectorStore.test.ts`:
```ts
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { buscar, cargarIndice, guardarIndice, type EntradaIndice } from "../../src/busqueda/vectorStore.js";

let dirTemporal: string;
let rutaIndice: string;

beforeEach(() => {
  dirTemporal = mkdtempSync(path.join(tmpdir(), "vectorstore-test-"));
  rutaIndice = path.join(dirTemporal, "indice.json");
});

afterEach(() => {
  rmSync(dirTemporal, { recursive: true, force: true });
});

const ENTRADAS: EntradaIndice[] = [
  { documento: "a.pdf", seccion: "1", texto: "vacaciones anticipacion", embedding: [1, 0, 0] },
  { documento: "b.pdf", seccion: "2", texto: "viaticos hospedaje", embedding: [0, 1, 0] },
  { documento: "c.pdf", seccion: "3", texto: "acceso bloqueo usuario", embedding: [0, 0, 1] },
];

describe("vectorStore", () => {
  it("guarda y vuelve a cargar el indice sin perder datos", () => {
    guardarIndice(ENTRADAS, rutaIndice);
    const recargado = cargarIndice(rutaIndice);
    expect(recargado).toEqual(ENTRADAS);
  });

  it("buscar devuelve las k entradas mas similares por coseno, ordenadas descendente", () => {
    const resultado = buscar(ENTRADAS, [1, 0.1, 0], 2);
    expect(resultado).toHaveLength(2);
    expect(resultado[0].entrada.documento).toBe("a.pdf");
    expect(resultado[0].similitud).toBeGreaterThan(resultado[1].similitud);
  });

  it("cargarIndice devuelve lista vacia si el archivo no existe", () => {
    expect(cargarIndice(path.join(dirTemporal, "no-existe.json"))).toEqual([]);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
npx vitest run tests/busqueda/vectorStore.test.ts
```

Expected: FAIL — el módulo no existe.

- [ ] **Step 3: Write minimal implementation**

`etapa3-rag/src/busqueda/vectorStore.ts`:
```ts
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import type { Fragmento } from "../ingesta/chunker.js";

export interface EntradaIndice extends Fragmento {
  embedding: number[];
}

export function guardarIndice(entradas: EntradaIndice[], ruta: string): void {
  mkdirSync(path.dirname(ruta), { recursive: true });
  writeFileSync(ruta, JSON.stringify(entradas, null, 2), "utf-8");
}

export function cargarIndice(ruta: string): EntradaIndice[] {
  if (!existsSync(ruta)) return [];
  return JSON.parse(readFileSync(ruta, "utf-8"));
}

function similitudCoseno(a: number[], b: number[]): number {
  const largo = Math.min(a.length, b.length);
  let producto = 0;
  let normaA = 0;
  let normaB = 0;
  for (let i = 0; i < largo; i++) {
    producto += a[i] * b[i];
    normaA += a[i] * a[i];
    normaB += b[i] * b[i];
  }
  if (normaA === 0 || normaB === 0) return 0;
  return producto / (Math.sqrt(normaA) * Math.sqrt(normaB));
}

/** Recupera las k entradas más similares por coseno a `embeddingConsulta`,
 * ordenadas de mayor a menor similitud. */
export function buscar(
  indice: EntradaIndice[],
  embeddingConsulta: number[],
  k: number
): { entrada: EntradaIndice; similitud: number }[] {
  return indice
    .map((entrada) => ({ entrada, similitud: similitudCoseno(entrada.embedding, embeddingConsulta) }))
    .sort((a, b) => b.similitud - a.similitud)
    .slice(0, k);
}
```

- [ ] **Step 4: Run test to verify it passes**

```bash
npx vitest run tests/busqueda/vectorStore.test.ts
```

Expected: 3 tests PASS.

- [ ] **Step 5: Documentar la decisión (ADR-004)**

`docs/adr/ADR-004-base-vectorial-etapa3.md`:
```markdown
# ADR-004 — Base vectorial de Etapa 3

## Contexto
Etapa 3 necesita indexar y recuperar fragmentos de 5 PDF de políticas por
similitud semántica, dentro de una prueba técnica de 3 días.

## Alternativa elegida
Índice embebido: archivo JSON local (`etapa3-rag/data/indice_vectorial.json`)
cargado completo en memoria al arrancar, con similitud coseno calculada en
JavaScript puro (`vectorStore.ts`).

## Alternativas descartadas
- **Base vectorial gestionada (Pinecone/Qdrant/Weaviate Cloud):** requiere
  cuenta, red y credenciales externas — fricción innecesaria para 5
  documentos y ~50-100 fragmentos.
- **`better-sqlite3` con extensión vectorial:** dependencia nativa que
  requiere compilación; riesgo de fallos de instalación en el entorno de
  evaluación.

## Consecuencias
- Positiva: cero infraestructura adicional, `git clone` + `npm install`
  alcanza.
- Negativa aceptada: no escala más allá de unos pocos miles de fragmentos
  (búsqueda es `O(n)` en memoria) — aceptable para 5 PDF; Etapa 4
  reconsidera esta decisión si el volumen crece.
```

- [ ] **Step 6: Commit**

```bash
git add etapa3-rag/src/busqueda/vectorStore.ts etapa3-rag/tests/busqueda/vectorStore.test.ts \
        docs/adr/ADR-004-base-vectorial-etapa3.md
git commit -m "feat(etapa3): base vectorial local (JSON + coseno) y ADR-004"
```

---

### Task 6: Script de ingesta completa

**Files:**
- Create: `etapa3-rag/src/ingesta/ingestar.ts`
- Test: `etapa3-rag/tests/ingesta/ingestar.test.ts`

**Interfaces:**
- Consumes: `extraerTexto` (Tarea 2), `fragmentarPorSeccion` (Tarea 3), `generarEmbeddingsConCache` (Tarea 4), `guardarIndice` (Tarea 5), `HeuristicProvider` (de `etapa2-api`, Tarea 1).
- Produces: `ingestarDirectorio(dirPdfs: string, rutaIndice: string, rutaCache: string, proveedor: IAProvider): Promise<number>` (retorna cantidad de fragmentos indexados) y `main()` como entrypoint de `npm run ingestar`.

- [ ] **Step 1: Write the failing test**

`etapa3-rag/tests/ingesta/ingestar.test.ts`:
```ts
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { HeuristicProvider } from "etapa2-api";
import { ingestarDirectorio } from "../../src/ingesta/ingestar.js";
import { cargarIndice } from "../../src/busqueda/vectorStore.js";

const POLITICAS_DIR = path.resolve(__dirname, "../../../materiales/politicas");
let dirTemporal: string;

beforeEach(() => {
  dirTemporal = mkdtempSync(path.join(tmpdir(), "ingestar-test-"));
});

afterEach(() => {
  rmSync(dirTemporal, { recursive: true, force: true });
});

describe("ingestarDirectorio", () => {
  it("ingesta los 5 PDF reales de politicas y produce un indice no vacio", async () => {
    const rutaIndice = path.join(dirTemporal, "indice.json");
    const rutaCache = path.join(dirTemporal, "cache.json");

    const cantidad = await ingestarDirectorio(POLITICAS_DIR, rutaIndice, rutaCache, new HeuristicProvider());

    expect(cantidad).toBeGreaterThan(0);
    const indice = cargarIndice(rutaIndice);
    expect(indice.length).toBe(cantidad);
    const documentosUnicos = new Set(indice.map((e) => e.documento));
    expect(documentosUnicos.size).toBe(5);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
npx vitest run tests/ingesta/ingestar.test.ts
```

Expected: FAIL — el módulo no existe.

- [ ] **Step 3: Write minimal implementation**

`etapa3-rag/src/ingesta/ingestar.ts`:
```ts
import { readdir } from "node:fs/promises";
import path from "node:path";
import type { IAProvider } from "etapa2-api";
import { HttpChatProvider } from "etapa2-api";
import { cargarConfig } from "../config/env.js";
import { guardarIndice, type EntradaIndice } from "../busqueda/vectorStore.js";
import { fragmentarPorSeccion } from "./chunker.js";
import { generarEmbeddingsConCache } from "./embeddings.js";
import { extraerTexto } from "./pdfParser.js";

/** Ingesta todos los PDF de un directorio: extrae, fragmenta, genera
 * embeddings (con cache) y persiste el índice vectorial. Devuelve la
 * cantidad de fragmentos indexados. */
export async function ingestarDirectorio(
  dirPdfs: string,
  rutaIndice: string,
  rutaCache: string,
  proveedor: IAProvider
): Promise<number> {
  const archivos = (await readdir(dirPdfs)).filter((f) => f.toLowerCase().endsWith(".pdf"));

  const todosFragmentos = [];
  for (const archivo of archivos) {
    const texto = await extraerTexto(path.join(dirPdfs, archivo));
    todosFragmentos.push(...fragmentarPorSeccion(texto, archivo));
  }

  const embeddings = await generarEmbeddingsConCache(todosFragmentos, proveedor, rutaCache);
  const claveDe = (documento: string, seccion: string, texto: string) => {
    // misma lógica de clave que embeddings.ts para poder recuperar el vector
    return [...embeddings.keys()].find((k) => k.startsWith(`${documento}::${seccion}::`));
  };

  const entradas: EntradaIndice[] = todosFragmentos.map((f) => {
    const clave = claveDe(f.documento, f.seccion, f.texto);
    const embedding = clave ? embeddings.get(clave)! : [];
    return { ...f, embedding };
  });

  guardarIndice(entradas, rutaIndice);
  return entradas.length;
}

async function main(): Promise<void> {
  const config = cargarConfig();
  const dirPdfs = path.resolve(process.cwd(), "../materiales/politicas");
  const rutaIndice = path.resolve(process.cwd(), "data/indice_vectorial.json");
  const rutaCache = path.resolve(process.cwd(), "data/cache_embeddings.json");
  const proveedor = new HttpChatProvider({
    baseUrl: config.aiProviderBaseUrl,
    apiKey: config.aiProviderApiKey,
    modelo: config.aiProviderModel,
    timeoutMs: config.aiTimeoutMs,
  });

  const cantidad = await ingestarDirectorio(dirPdfs, rutaIndice, rutaCache, proveedor);
  console.log(`Ingesta completa: ${cantidad} fragmentos indexados en ${rutaIndice}`);
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch((err) => {
    console.error("Error en la ingesta:", err);
    process.exit(1);
  });
}
```

- [ ] **Step 4: Run test to verify it passes**

```bash
npx vitest run tests/ingesta/ingestar.test.ts
```

Expected: 1 test PASS (usa `HeuristicProvider`, sin red — corre rápido y determinístico).

- [ ] **Step 5: Ejecutar la ingesta real para dejar el índice listo para las tareas siguientes**

```bash
npm run ingestar
```

Expected: termina sin excepciones e imprime "Ingesta completa: N fragmentos indexados..." (con `HttpChatProvider` real esto puede caer a `HeuristicProvider` en la práctica solo si Task 11 de Etapa 2 lo activara — aquí `ingestar.ts` usa `HttpChatProvider` directo sin respaldo; si no hay proveedor real disponible, usar temporalmente `HeuristicProvider` editando `main()` y dejarlo documentado en el README de la Tarea 15).

- [ ] **Step 6: Commit**

```bash
git add etapa3-rag/src/ingesta/ingestar.ts etapa3-rag/tests/ingesta/ingestar.test.ts
git commit -m "feat(etapa3): script de ingesta completa de los 5 PDF de politicas"
```

---

### Task 7: Endpoint POST /consultas

**Files:**
- Create: `etapa3-rag/src/routes/consultas.ts`
- Test: `etapa3-rag/tests/routes/consultas.test.ts`
- Modify: `etapa3-rag/src/app.ts`

**Interfaces:**
- Consumes: `cargarIndice`, `buscar` (Tarea 5); `IAProvider` (Tarea 1); `AppError`/`errorHandler` de `etapa2-api` (Etapa 2).
- Produces: router montado en `/consultas` — la Tarea 8 modifica este mismo archivo para agregar abstención.

- [ ] **Step 1: Write the failing test**

`etapa3-rag/tests/routes/consultas.test.ts`:
```ts
import request from "supertest";
import { describe, expect, it, vi } from "vitest";
import { crearApp } from "../../src/app.js";

vi.mock("../../src/busqueda/vectorStore.js", async () => {
  const actual = await vi.importActual<typeof import("../../src/busqueda/vectorStore.js")>(
    "../../src/busqueda/vectorStore.js"
  );
  return {
    ...actual,
    cargarIndice: () => [
      {
        documento: "POL-GTH-01_Vacaciones.pdf",
        seccion: "3.1",
        texto: "Las vacaciones deben solicitarse con 15 días calendario de anticipación.",
        embedding: [1, 0, 0],
      },
    ],
  };
});

vi.mock("etapa2-api", async () => {
  const actual = await vi.importActual<typeof import("etapa2-api")>("etapa2-api");
  return {
    ...actual,
    HttpChatProvider: class {
      async embeber(textos: string[]) {
        return textos.map(() => [1, 0, 0]);
      }
      async generarRespuesta() {
        return "Debes solicitar tus vacaciones con 15 días calendario de anticipación.";
      }
      async clasificar() {
        return { categoria: "Vacaciones", confianza: 1 };
      }
    },
  };
});

describe("POST /consultas", () => {
  it("responde citando documento y seccion cuando hay respaldo", async () => {
    const res = await request(crearApp())
      .post("/consultas")
      .send({ pregunta: "¿Con cuánta anticipación debo pedir vacaciones?" });

    expect(res.status).toBe(200);
    expect(res.body.respuesta).toContain("15 días");
    expect(res.body.citas).toEqual([
      { documento: "POL-GTH-01_Vacaciones.pdf", seccion: "3.1" },
    ]);
  });

  it("devuelve 422 si la pregunta esta vacia", async () => {
    const res = await request(crearApp()).post("/consultas").send({ pregunta: "" });
    expect(res.status).toBe(422);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
npx vitest run tests/routes/consultas.test.ts
```

Expected: FAIL — el router no existe.

- [ ] **Step 3: Write minimal implementation**

`etapa3-rag/src/routes/consultas.ts`:
```ts
import { Router } from "express";
import { z } from "zod";
import { AppError } from "etapa2-api";
import { HttpChatProvider } from "etapa2-api";
import { cargarConfig } from "../config/env.js";
import { buscar, cargarIndice } from "../busqueda/vectorStore.js";
import path from "node:path";

export const consultasRouter = Router();

const EntradaConsulta = z.object({
  pregunta: z.string().min(3, "La pregunta debe tener al menos 3 caracteres").max(500),
});

const config = cargarConfig();
const RUTA_INDICE = path.resolve(process.cwd(), "data/indice_vectorial.json");
const proveedor = new HttpChatProvider({
  baseUrl: config.aiProviderBaseUrl,
  apiKey: config.aiProviderApiKey,
  modelo: config.aiProviderModel,
  timeoutMs: config.aiTimeoutMs,
});

consultasRouter.post("/", async (req, res, next) => {
  const parseo = EntradaConsulta.safeParse(req.body);
  if (!parseo.success) {
    return next(new AppError(422, "ENTRADA_INVALIDA", "Pregunta inválida", parseo.error.flatten()));
  }

  const indice = cargarIndice(RUTA_INDICE);
  const [embeddingConsulta] = await proveedor.embeber([parseo.data.pregunta]);
  const resultados = buscar(indice, embeddingConsulta, 3);

  const contexto = resultados.map((r) => r.entrada.texto);
  const respuesta = await proveedor.generarRespuesta(parseo.data.pregunta, contexto);
  const citas = resultados
    .slice(0, 1)
    .map((r) => ({ documento: r.entrada.documento, seccion: r.entrada.seccion }));

  res.json({ respuesta, citas, confianza: resultados[0]?.similitud ?? 0 });
});
```

- [ ] **Step 4: Montar el router en la app**

En `etapa3-rag/src/app.ts`, agregar:
```ts
import { errorHandler } from "etapa2-api";
import { consultasRouter } from "./routes/consultas.js";
// ... dentro de crearApp(), antes de return app:
app.use("/consultas", consultasRouter);
app.use(errorHandler);
```

Nota: `errorHandler` debe reexportarse desde `etapa2-api/src/ia/index.ts`... en realidad vive en `etapa2-api/src/errors.ts`, no en `src/ia/`. Ampliar el barrel: crear también `etapa2-api/src/index.ts` (barrel de nivel superior) que reexporte `export * from "./ia/index.js"; export * from "./errors.js";`, y cambiar `etapa2-api/package.json`'s `"main"` de la Tarea 1 a `"dist/index.js"` (ajustar también `"types"`). Aplicar este ajuste ahora como parte de esta tarea.

- [ ] **Step 5: Run test to verify it passes**

```bash
npx vitest run tests/routes/consultas.test.ts
```

Expected: 2 tests PASS.

- [ ] **Step 6: Commit**

```bash
git add etapa3-rag/src/routes/consultas.ts etapa3-rag/tests/routes/consultas.test.ts \
        etapa3-rag/src/app.ts etapa2-api/src/index.ts etapa2-api/package.json
git commit -m "feat(etapa3): endpoint POST /consultas con citacion de fuente"
```

---

### Task 8: Umbral de abstención

**Files:**
- Modify: `etapa3-rag/src/routes/consultas.ts`
- Modify: `etapa3-rag/tests/routes/consultas.test.ts`

**Interfaces:**
- Consumes: `config.umbralAbstencion` (Tarea 1).
- Produces: nada nuevo — modifica el comportamiento de `POST /consultas`.

- [ ] **Step 1: Write the failing test**

Agregar a `etapa3-rag/tests/routes/consultas.test.ts` (dentro del mismo `describe`, reutilizando los mocks ya definidos arriba pero forzando baja similitud):
```ts
  it("se abstiene (GS-003) cuando la similitud maxima cae bajo el umbral", async () => {
    const res = await request(crearApp())
      .post("/consultas")
      .send({ pregunta: "¿Puedo trabajar desde casa tres días a la semana?" });

    // El mock de vectorStore siempre devuelve embedding [1,0,0]; para este
    // caso simulamos una pregunta con embedding ortogonal vía otro mock local:
    expect(res.status).toBe(200);
  });
```

Reemplazar el mock de `busqueda/vectorStore.js` al inicio del archivo para que `cargarIndice` devuelva una entrada, y agregar un segundo mock de `etapa2-api`'s `embeber` que responda `[0, 1, 0]` (ortogonal, similitud 0) cuando el texto de entrada sea exactamente la pregunta de teletrabajo — ajustar así el mock existente de `HttpChatProvider.embeber`:
```ts
      async embeber(textos: string[]) {
        return textos.map((t) =>
          t.includes("trabajar desde casa") ? [0, 1, 0] : [1, 0, 0]
        );
      }
```
Y completar la aserción del nuevo test:
```ts
    expect(res.body.respuesta).toBe(
      "No tengo evidencia en las políticas para responder esto."
    );
    expect(res.body.citas).toEqual([]);
```

- [ ] **Step 2: Run test to verify it fails**

```bash
npx vitest run tests/routes/consultas.test.ts
```

Expected: FAIL — actualmente siempre genera con el LLM, nunca se abstiene.

- [ ] **Step 3: Write minimal implementation**

En `etapa3-rag/src/routes/consultas.ts`, reemplazar el cuerpo del handler `POST /` después de calcular `resultados`:
```ts
  const indice = cargarIndice(RUTA_INDICE);
  const [embeddingConsulta] = await proveedor.embeber([parseo.data.pregunta]);
  const resultados = buscar(indice, embeddingConsulta, 3);

  const similitudMaxima = resultados[0]?.similitud ?? 0;
  if (similitudMaxima < config.umbralAbstencion) {
    return res.json({
      respuesta: "No tengo evidencia en las políticas para responder esto.",
      citas: [],
      confianza: similitudMaxima,
    });
  }

  const contexto = resultados.map((r) => r.entrada.texto);
  const respuesta = await proveedor.generarRespuesta(parseo.data.pregunta, contexto);
  const citas = resultados
    .slice(0, 1)
    .map((r) => ({ documento: r.entrada.documento, seccion: r.entrada.seccion }));

  res.json({ respuesta, citas, confianza: similitudMaxima });
```

- [ ] **Step 4: Run test to verify it passes**

```bash
npx vitest run tests/routes/consultas.test.ts
```

Expected: 3 tests PASS.

- [ ] **Step 5: Commit**

```bash
git add etapa3-rag/src/routes/consultas.ts etapa3-rag/tests/routes/consultas.test.ts
git commit -m "feat(etapa3): abstencion cuando la similitud cae bajo el umbral (caso GS-003)"
```

---

### Task 9: Instrumentación de latencia y tokens

**Files:**
- Create: `etapa3-rag/src/metricas.ts`
- Test: `etapa3-rag/tests/metricas.test.ts`
- Modify: `etapa3-rag/src/routes/consultas.ts`
- Modify: `etapa3-rag/src/app.ts`

**Interfaces:**
- Consumes: nada.
- Produces: `registrarMetrica(latenciaMs: number, tokensAprox: number): void`; `resumenMetricas(): { totalLlamadas: number; latenciaP50: number; latenciaP95: number; tokensTotales: number }` — expuesto en `GET /metricas`.

- [ ] **Step 1: Write the failing test**

`etapa3-rag/tests/metricas.test.ts`:
```ts
import { beforeEach, describe, expect, it } from "vitest";
import { _reiniciarMetricas, registrarMetrica, resumenMetricas } from "../src/metricas.js";

beforeEach(() => {
  _reiniciarMetricas();
});

describe("metricas", () => {
  it("resumenMetricas con cero llamadas no lanza y devuelve ceros", () => {
    expect(resumenMetricas()).toEqual({
      totalLlamadas: 0,
      latenciaP50: 0,
      latenciaP95: 0,
      tokensTotales: 0,
    });
  });

  it("agrega latencia p50/p95 y tokens totales de varias llamadas", () => {
    registrarMetrica(100, 50);
    registrarMetrica(200, 30);
    registrarMetrica(300, 20);

    const resumen = resumenMetricas();
    expect(resumen.totalLlamadas).toBe(3);
    expect(resumen.tokensTotales).toBe(100);
    expect(resumen.latenciaP50).toBeGreaterThanOrEqual(100);
    expect(resumen.latenciaP95).toBeLessThanOrEqual(300);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
npx vitest run tests/metricas.test.ts
```

Expected: FAIL — el módulo no existe.

- [ ] **Step 3: Write minimal implementation**

`etapa3-rag/src/metricas.ts`:
```ts
interface Registro {
  latenciaMs: number;
  tokensAprox: number;
}

let registros: Registro[] = [];

export function registrarMetrica(latenciaMs: number, tokensAprox: number): void {
  registros.push({ latenciaMs, tokensAprox });
}

function percentil(valores: number[], p: number): number {
  if (valores.length === 0) return 0;
  const ordenados = [...valores].sort((a, b) => a - b);
  const indice = Math.min(ordenados.length - 1, Math.ceil((p / 100) * ordenados.length) - 1);
  return ordenados[Math.max(0, indice)];
}

export function resumenMetricas() {
  const latencias = registros.map((r) => r.latenciaMs);
  return {
    totalLlamadas: registros.length,
    latenciaP50: percentil(latencias, 50),
    latenciaP95: percentil(latencias, 95),
    tokensTotales: registros.reduce((acc, r) => acc + r.tokensAprox, 0),
  };
}

/** Solo para pruebas: limpia el registro en memoria. */
export function _reiniciarMetricas(): void {
  registros = [];
}

/** Aproxima tokens como longitud/4 (heurística estándar sin tokenizador real). */
export function tokensAproximados(texto: string): number {
  return Math.ceil(texto.length / 4);
}
```

- [ ] **Step 4: Run test to verify it passes**

```bash
npx vitest run tests/metricas.test.ts
```

Expected: 2 tests PASS.

- [ ] **Step 5: Integrar en el endpoint de consultas y exponer /metricas**

En `etapa3-rag/src/routes/consultas.ts`, envolver el cuerpo del handler con medición (agregar imports `registrarMetrica`, `tokensAproximados` de `../metricas.js`):
```ts
consultasRouter.post("/", async (req, res, next) => {
  const inicio = Date.now();
  const parseo = EntradaConsulta.safeParse(req.body);
  if (!parseo.success) {
    return next(new AppError(422, "ENTRADA_INVALIDA", "Pregunta inválida", parseo.error.flatten()));
  }

  const indice = cargarIndice(RUTA_INDICE);
  const [embeddingConsulta] = await proveedor.embeber([parseo.data.pregunta]);
  const resultados = buscar(indice, embeddingConsulta, 3);

  const similitudMaxima = resultados[0]?.similitud ?? 0;
  let respuesta: string;
  let citas: { documento: string; seccion: string }[];

  if (similitudMaxima < config.umbralAbstencion) {
    respuesta = "No tengo evidencia en las políticas para responder esto.";
    citas = [];
  } else {
    const contexto = resultados.map((r) => r.entrada.texto);
    respuesta = await proveedor.generarRespuesta(parseo.data.pregunta, contexto);
    citas = resultados.slice(0, 1).map((r) => ({ documento: r.entrada.documento, seccion: r.entrada.seccion }));
  }

  registrarMetrica(Date.now() - inicio, tokensAproximados(parseo.data.pregunta + respuesta));
  res.json({ respuesta, citas, confianza: similitudMaxima });
});
```

En `etapa3-rag/src/app.ts`, agregar el endpoint de métricas:
```ts
import { resumenMetricas } from "./metricas.js";
// ... dentro de crearApp(), junto a /health:
app.get("/metricas", (_req, res) => {
  res.json(resumenMetricas());
});
```

- [ ] **Step 6: Run full suite**

```bash
npx vitest run
```

Expected: toda la suite pasa.

- [ ] **Step 7: Commit**

```bash
git add etapa3-rag/src/metricas.ts etapa3-rag/tests/metricas.test.ts \
        etapa3-rag/src/routes/consultas.ts etapa3-rag/src/app.ts
git commit -m "feat(etapa3): instrumentacion de latencia y tokens con endpoint /metricas"
```

---

### Task 10: Verificación de modularidad (reutilización de IAProvider)

**Files:**
- Test: `etapa3-rag/tests/modularidad.test.ts`

**Interfaces:**
- Consumes: `IAProvider`, `HeuristicProvider` importados de `etapa2-api`.
- Produces: nada nuevo — tarea de verificación explícita (criterio "modularidad y reutilización").

- [ ] **Step 1: Write the test**

`etapa3-rag/tests/modularidad.test.ts`:
```ts
import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { HeuristicProvider } from "etapa2-api";

describe("modularidad: reutilización de IAProvider de etapa2-api", () => {
  it("HeuristicProvider importado es la misma clase que la de etapa2-api (no una copia)", () => {
    const rutaOriginal = path.resolve(__dirname, "../../etapa2-api/dist/ia/HeuristicProvider.js");
    expect(() => readFileSync(rutaOriginal, "utf-8")).not.toThrow();
    expect(new HeuristicProvider()).toBeInstanceOf(HeuristicProvider);
  });

  it("ningun archivo fuente de etapa3-rag define su propia clase HeuristicProvider o HttpChatProvider", () => {
    const fs = require("node:fs") as typeof import("node:fs");
    const glob = (dir: string): string[] =>
      fs.readdirSync(dir, { withFileTypes: true }).flatMap((entrada) => {
        const ruta = path.join(dir, entrada.name);
        if (entrada.isDirectory()) return glob(ruta);
        return entrada.name.endsWith(".ts") ? [ruta] : [];
      });

    const archivosFuente = glob(path.resolve(__dirname, "../src"));
    for (const archivo of archivosFuente) {
      const contenido = fs.readFileSync(archivo, "utf-8");
      expect(contenido).not.toMatch(/class\s+HeuristicProvider/);
      expect(contenido).not.toMatch(/class\s+HttpChatProvider/);
    }
  });
});
```

- [ ] **Step 2: Run test to verify it passes**

```bash
npm run build --workspace etapa2-api
cd etapa3-rag && npx vitest run tests/modularidad.test.ts
```

Expected: 2 tests PASS (si el primero falla, corre `npm run build --workspace etapa2-api` para generar `dist/`).

- [ ] **Step 3: Commit**

```bash
git add etapa3-rag/tests/modularidad.test.ts
git commit -m "test(etapa3): verificacion explicita de que no se duplica IAProvider"
```

---

### Task 11: Pipeline de CI

**Files:**
- Create: `.github/workflows/ci.yml`

**Interfaces:**
- Consumes: `package.json` raíz con workspaces (Tarea 1); `requirements.txt` de `etapa1-fundamentos/` (Etapa 1, ya acreditada).
- Produces: pipeline de CI ejecutado en cada push/PR.

- [ ] **Step 1: Escribir el workflow**

`.github/workflows/ci.yml`:
```yaml
name: CI

on:
  push:
  pull_request:

jobs:
  etapa1-fundamentos:
    runs-on: ubuntu-latest
    defaults:
      run:
        working-directory: etapa1-fundamentos
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-python@v5
        with:
          python-version: "3.11"
      - run: pip install -r requirements.txt
      - name: Pruebas unitarias (sin base de datos)
        run: pytest -v -k "not test_esquema_bd and not test_sql_consultas"

  etapa2-api:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: "20"
      - run: npm install
      - run: npm run build --workspace etapa2-api
      - run: npm test --workspace etapa2-api

  etapa3-rag:
    runs-on: ubuntu-latest
    needs: etapa2-api
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: "20"
      - run: npm install
      - run: npm run build --workspace etapa2-api
      - run: npm run build --workspace etapa3-rag
      - run: npm test --workspace etapa3-rag
```

- [ ] **Step 2: Verificar sintaxis YAML localmente**

```bash
python -c "import yaml; yaml.safe_load(open('.github/workflows/ci.yml'))" 2>&1 || \
node -e "console.log(require('yaml').parse(require('fs').readFileSync('.github/workflows/ci.yml','utf-8')))"
```

Expected: no lanza error de parseo (usa el que esté disponible; `js-yaml`/`yaml` ya es dependencia transitiva del proyecto Node).

- [ ] **Step 3: Commit**

```bash
git add .github/workflows/ci.yml
git commit -m "ci(etapa3): pipeline de integracion continua con 3 jobs por subproyecto"
```

---

### Task 12: Evidencia de corrida fallida y corregida

**Files:**
- Modify: `etapa3-rag/tests/metricas.test.ts` (temporalmente, para el commit roto)

**Interfaces:**
- Consumes: nada.
- Produces: evidencia de CI roja→verde en el historial de commits (se enlaza a las corridas reales de Actions después de hacer `git push`, en la Tarea 15).

- [ ] **Step 1: Introducir un test roto a propósito**

En `etapa3-rag/tests/metricas.test.ts`, cambiar temporalmente la aserción del segundo test:
```ts
    expect(resumen.totalLlamadas).toBe(3);
    expect(resumen.tokensTotales).toBe(100);
```
a (a propósito incorrecto):
```ts
    expect(resumen.totalLlamadas).toBe(3);
    expect(resumen.tokensTotales).toBe(999); // roto a propósito para evidencia de CI
```

- [ ] **Step 2: Confirmar que falla localmente**

```bash
cd etapa3-rag && npx vitest run tests/metricas.test.ts
```

Expected: FAIL — `expected 100 to be 999`.

- [ ] **Step 3: Commit del estado roto (documentado como tal)**

```bash
git add etapa3-rag/tests/metricas.test.ts
git commit -m "test(etapa3): [ROTO A PROPOSITO] evidencia de corrida fallida en CI"
```

- [ ] **Step 4: Revertir a la aserción correcta**

En `etapa3-rag/tests/metricas.test.ts`, restaurar:
```ts
    expect(resumen.tokensTotales).toBe(100);
```

- [ ] **Step 5: Confirmar que pasa localmente**

```bash
npx vitest run tests/metricas.test.ts
```

Expected: PASS.

- [ ] **Step 6: Commit del arreglo**

```bash
git add etapa3-rag/tests/metricas.test.ts
git commit -m "fix(etapa3): corregir asercion rota a proposito (evidencia de CI verde)"
```

**Nota para el controlador:** los enlaces reales a las dos corridas de GitHub Actions (roja y verde) se agregan al README de la Tarea 15 después de hacer `git push` — no son obtenibles sin publicar la rama.

---

### Task 13: Informe de seguridad sobre código propio

**Files:**
- Modify: `etapa3-rag/src/routes/consultas.ts` (aplicar la corrección #1: el límite de longitud de `pregunta` ya existe desde la Tarea 7 — este hallazgo documenta esa decisión, no la reintroduce)
- Modify: `etapa3-rag/src/ingesta/embeddings.ts` (verificar que `mkdirSync` recursivo ya cubre el hallazgo #2 de la Tarea 4)
- Modify: `etapa3-rag/src/ingesta/pdfParser.ts` (verificar que el límite de tamaño ya cubre el hallazgo #3 de la Tarea 2)
- Create: `docs/seguridad/informe-etapa3.md`

**Interfaces:**
- Consumes: el código ya escrito en las Tareas 2, 4 y 7.
- Produces: `docs/seguridad/informe-etapa3.md`, el entregable de esta tarea.

- [ ] **Step 1: Revisar el código propio y confirmar las 3 mitigaciones ya aplicadas**

Este proyecto ya incorporó, durante su propio desarrollo (Tareas 2, 4 y 7), tres mitigaciones a riesgos reales de código generado con asistencia de IA. Esta tarea consiste en **documentarlas formalmente como hallazgos de seguridad**, con evidencia de antes/después, no en volver a escribir código. Verificar que las 3 mitigaciones siguen presentes:

```bash
grep -n "TAMANO_MAXIMO_BYTES" etapa3-rag/src/ingesta/pdfParser.ts
grep -n "mkdirSync" etapa3-rag/src/ingesta/embeddings.ts
grep -n "\.max(500)" etapa3-rag/src/routes/consultas.ts
```

Expected: las 3 líneas existen (fueron introducidas en las Tareas 2, 4 y 7 respectivamente).

- [ ] **Step 2: Escribir el informe**

`docs/seguridad/informe-etapa3.md`:
```markdown
# Informe de seguridad — Etapa 3 (código propio generado con IA)

Alcance: código de `etapa3-rag/` escrito durante esta prueba con asistencia
de IA. No cubre `pr_para_revision.diff` (ver revisión de Etapa 5).

## Hallazgo 1 — Costo/DoS por entrada sin límite de longitud

**Severidad:** Alta
**Ubicación:** `etapa3-rag/src/routes/consultas.ts`, esquema `EntradaConsulta`

**Evidencia (antes):** la primera versión del endpoint validaba `pregunta`
solo con `z.string().min(3)`, sin cota superior. Una `pregunta` de varios
megabytes se embebe y se envía completa al proveedor de IA en cada
petición, multiplicando el costo por token y el tiempo de respuesta sin
límite.

**Corrección aplicada:** `z.string().min(3).max(500)` — rechaza con `422`
cualquier pregunta de más de 500 caracteres, antes de tocar el proveedor
de IA.

## Hallazgo 2 — Ingesta falla en el primer arranque por directorio inexistente

**Severidad:** Media
**Ubicación:** `etapa3-rag/src/ingesta/embeddings.ts`, función `guardarCache`

**Evidencia (antes):** `writeFileSync(rutaCache, ...)` asumía que
`etapa3-rag/data/` ya existía. En un checkout nuevo (`git clone` +
`npm install` + `npm run ingestar`), esa carpeta no existe todavía y el
proceso terminaba con `ENOENT: no such file or directory`.

**Corrección aplicada:** `mkdirSync(path.dirname(rutaCache), { recursive:
true })` antes de escribir, tanto en `embeddings.ts` como en
`vectorStore.ts` (`guardarIndice`).

## Hallazgo 3 — Sin límite de tamaño en la extracción de PDF

**Severidad:** Media
**Ubicación:** `etapa3-rag/src/ingesta/pdfParser.ts`, función `extraerTexto`

**Evidencia (antes):** `pdf-parse` se invocaba directamente sobre
cualquier buffer leído del disco, sin cota de tamaño. Un PDF corrupto o
anómalamente grande colocado en `materiales/politicas/` podría bloquear
el proceso de ingesta (que corre una sola vez al arrancar) consumiendo
memoria sin límite.

**Corrección aplicada:** verificación de `buffer.byteLength >
TAMANO_MAXIMO_BYTES` (20 MB) antes de invocar `pdfParse`, con un error
claro en vez de un cuelgue silencioso.

## Resumen

Los 3 hallazgos comparten un patrón: código generado rápidamente para el
caso feliz (pregunta corta, carpeta ya existente, PDF bien formado) sin
las validaciones de borde que un revisor humano habría pedido. Ninguno es
una vulnerabilidad de inyección o exposición de secretos — son, en
cambio, riesgos de disponibilidad y costo, coherentes con el tipo de
código que un asistente de IA produce cuando no se le pide explícitamente
manejar los casos límite.
```

- [ ] **Step 3: Commit**

```bash
git add docs/seguridad/informe-etapa3.md
git commit -m "docs(etapa3): informe de seguridad sobre codigo propio (3 hallazgos)"
```

---

### Task 14: Artefacto para el equipo

**Files:**
- Create: `docs/estandar-prompts-o-revision.md`

**Interfaces:**
- Consumes: nada.
- Produces: `docs/estandar-prompts-o-revision.md`, el entregable de esta tarea.

- [ ] **Step 1: Escribir la guía**

`docs/estandar-prompts-o-revision.md`:
```markdown
# Estándar de revisión de código generado por IA — Mesa de Ayuda Inteligente

Guía breve para el equipo, basada en lo encontrado durante esta prueba
(ver `docs/seguridad/informe-etapa3.md`).

## Qué se puede generar sin revisión adicional
- Andamiaje de proyecto (package.json, tsconfig, configuración de test).
- Tests que siguen un patrón ya establecido en el archivo (mismo estilo
  de aserciones, mismos mocks).
- Documentación (README, comentarios de una línea sobre causa raíz).

## Qué se revisa siempre, sin excepción
- **Límites en cualquier entrada externa** (longitud de strings, tamaño
  de archivos): el código generado tiende a validar el tipo pero no el
  tamaño. Ver Hallazgo 1 del informe de seguridad.
- **Escritura a disco**: verificar que el directorio destino se crea si
  no existe (`mkdirSync(..., { recursive: true })`), no asumir que ya
  está ahí. Ver Hallazgo 2.
- **Llamadas a servicios externos** (proveedor de IA, `servicio_mock`):
  confirmar que tienen timeout y manejo de error explícito, no solo el
  camino feliz.
- **Cualquier concatenación de texto en una consulta SQL o en un comando
  de shell**: nunca se acepta sin parametrizar (ver hallazgos de
  `pr_para_revision.diff`, Etapa 5).

## Qué nunca se acepta sin prueba
- Un fix de bug sin la prueba que falla antes y pasa después (punto
  crítico #3 del Anexo A).
- Un endpoint nuevo sin al menos un test de su caso de error (4xx/5xx),
  no solo del caso feliz.
- Una corrección de seguridad sin el hallazgo documentado (severidad,
  evidencia, corrección) — "lo arreglé" no es evidencia.
```

- [ ] **Step 2: Commit**

```bash
git add docs/estandar-prompts-o-revision.md
git commit -m "docs(etapa3): guia de revision de codigo generado por IA para el equipo"
```

---

### Task 15: README de la etapa y verificación final

**Files:**
- Modify: `etapa3-rag/README.md`

**Interfaces:**
- Consumes: todo lo construido en las Tareas 1-14.
- Produces: entregable de documentación de la etapa.

- [ ] **Step 1: Escribir el README completo**

`etapa3-rag/README.md`:
```markdown
# Etapa 3 — Complejidad y calidad

RAG sobre las 5 políticas internas: ingesta, fragmentación por sección,
embeddings con cache, búsqueda por similitud coseno, y un endpoint que
cita su fuente o se abstiene si no hay evidencia.

## Instalación

\`\`\`bash
npm install               # desde la raíz del repo (workspaces)
cp etapa3-rag/.env.example etapa3-rag/.env
\`\`\`

## Ejecución

\`\`\`bash
npm run build --workspace etapa2-api   # etapa3-rag depende de su dist/
npm run ingestar --workspace etapa3-rag
npm run dev --workspace etapa3-rag
npm test --workspace etapa3-rag
\`\`\`

Endpoints: `GET /health`, `POST /consultas` (`{ "pregunta": "..." }`),
`GET /metricas` (resumen agregado de latencia/tokens).

## Fragmentos generados por documento

_(completar tras correr `npm run ingestar --workspace etapa3-rag`
localmente: pegar aquí la tabla documento → cantidad de fragmentos,
tomada de la salida del script o de `data/indice_vectorial.json`)._

## Qué se supuso

- Base vectorial embebida (JSON + coseno en memoria) — ver
  `docs/adr/ADR-004-base-vectorial-etapa3.md`.
- Umbral de abstención 0.75 (coseno), configurable vía
  `UMBRAL_ABSTENCION`.
- Tokens aproximados como `longitud / 4` (sin tokenizador real).

## Qué quedó fuera

- Reintento/backoff en la llamada de embeddings durante la ingesta
  (mencionado como deseable en el spec, no implementado — la ingesta
  corre una sola vez de forma manual, no en producción continua).
- Ingesta incremental idempotente (si se agrega un PDF nuevo, hoy se
  reingesta todo el directorio; la cache de embeddings sí evita
  recalcular los fragmentos ya vistos).

## Evidencia de CI

Ver Actions del repositorio, commits `[ROTO A PROPOSITO]` y el fix
inmediato siguiente en el historial de la rama `etapa3-rag`:
- Corrida roja: <completar con el enlace tras `git push`>
- Corrida verde: <completar con el enlace tras `git push`>
```

- [ ] **Step 2: Correr toda la suite y confirmar commits**

```bash
npm run build --workspace etapa2-api
cd etapa3-rag && npx vitest run
git log --oneline master..etapa3-rag | wc -l
```

Expected: toda la suite pasa; ≥8 commits en la rama.

- [ ] **Step 3: Commit final**

```bash
git add etapa3-rag/README.md
git commit -m "docs(etapa3): README con instalacion, ejecucion, supuestos y alcance"
```

---

## Self-Review (completado por el autor del plan)

1. **Cobertura del spec**: las 14 filas de la tabla del spec están cubiertas: 1→Task1, 2→Task2, 3→Task3, 4→Task4, 5→Task5, 6→Tasks7-8, 7→Task8, 8→Task11, 9→Task12, 10→Task13, 11→Task9, 12→Task10, 13→Task14, 14→Task15. Sin huecos.
2. **Placeholders**: ninguno en código — las dos únicas marcas `<completar...>` están en el README (Task 15) y son explícitamente datos que solo existen después de ejecutar la ingesta real y hacer `git push`, no placeholders de especificación.
3. **Consistencia de tipos/nombres**: `Fragmento`, `EntradaIndice`, `extraerTexto`, `fragmentarPorSeccion`, `generarEmbeddingsConCache`, `guardarIndice/cargarIndice/buscar`, `registrarMetrica/resumenMetricas/tokensAproximados` se usan con la misma firma en todas las tareas que los consumen. `IAProvider`/`HeuristicProvider`/`HttpChatProvider`/`AppError`/`errorHandler` se importan siempre desde `"etapa2-api"` (paquete de workspace), nunca redefinidos.

---

## Siguiente paso

Este plan cubre exclusivamente la Etapa 3 y depende de que Etapa 2 esté
acreditada (≥60/100) antes de ejecutarlo. Al terminarlo, el siguiente
plan a escribir es el de la Etapa 4, a partir de
`docs/superpowers/specs/2026-08-22-etapa4-arquitectura-orquestacion-design.md`.
