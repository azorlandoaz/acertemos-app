# Etapa 3 — Complejidad y calidad

RAG sobre las 5 políticas internas: ingesta, fragmentación por sección,
embeddings con cache, búsqueda por similitud coseno, y un endpoint que
cita su fuente o se abstiene si no hay evidencia.

## Instalación

```bash
npm install               # desde la raíz del repo (workspaces)
cp etapa3-rag/.env.example etapa3-rag/.env
```

## Ejecución

```bash
npm run build --workspace etapa2-api   # etapa3-rag depende de su dist/
npm run ingestar --workspace etapa3-rag
npm run dev --workspace etapa3-rag
npm test --workspace etapa3-rag
```

Endpoints: `GET /health`, `POST /consultas` (`{ "pregunta": "..." }`),
`GET /metricas` (resumen agregado de latencia/tokens).

## Fragmentos generados por documento

Salida real de `npm run ingestar --workspace etapa3-rag` sobre los 5 PDF de `materiales/politicas/`:

| Documento | Fragmentos |
|---|---|
| POL-ADM-04_Viaticos.pdf | 8 |
| POL-GTH-01_Vacaciones.pdf | 9 |
| POL-TIC-02_Activos_Tecnologicos.pdf | 8 |
| POL-TIC-03_Gestion_de_Accesos.pdf | 8 |
| POL-TIC-05_Gestion_de_Incidentes.pdf | 9 |
| **Total** | **42** |

## Qué se supuso

- Base vectorial embebida (JSON + coseno en memoria) — ver
  `docs/adr/ADR-004-base-vectorial-etapa3.md`.
- Umbral de abstención 0.75 (coseno), configurable vía
  `UMBRAL_ABSTENCION`.
- Tokens aproximados como `longitud / 4` (sin tokenizador real).

## Limitación real verificada: calidad de recuperación semántica

En este entorno de evaluación no hay un proveedor de IA real disponible
(no hay `.env` con credenciales de un LLM real corriendo en
`AI_PROVIDER_BASE_URL`). Tanto la ingesta (`ingestar.ts::main`) como la
consulta (`consultas.ts::obtenerProveedor`) usan por eso el mismo
`HeuristicProvider` de `etapa2-api` para generar embeddings — esto
resuelve el bug de incompatibilidad de espacios de embedding (revisión
final de rama), pero **no** resuelve la calidad de la recuperación:
`HeuristicProvider.embeber()` genera vectores de sólo 2 dimensiones
(`[longitud % 97, suma de códigos de carácter % 97]`), explícitamente
documentados en su propio código como "no aptos para recuperación
semántica real". Verificado empíricamente: incluso con espacios de
embedding consistentes, la similitud coseno entre casi cualquier par de
fragmentos queda pegada entre 0.99 y 1.0, por lo que el umbral de
abstención (0.75) no discrimina de forma confiable con este proveedor —
algunas preguntas con respaldo real citan la sección equivocada, y
preguntas sin respaldo en el corpus (incluida `GS-003`, el caso de
abstención de referencia del spec) no siempre se abstienen.

El mecanismo en sí (fragmentación, cache de embeddings, base vectorial,
endpoint con citación y abstención, instrumentación) está correctamente
implementado y probado — lo que falla es la calidad semántica del
proveedor heurístico usado por necesidad de entorno, no la arquitectura.
Para demostrar recuperación semántica real: configurar
`AI_PROVIDER_BASE_URL`/`AI_PROVIDER_API_KEY` con un proveedor real
(Ollama local, OpenAI-compatible, etc.), cambiar `HeuristicProvider` por
`HttpChatProvider` en `ingestar.ts::main()` y en
`consultas.ts::obtenerProveedor()`, y correr
`npm run ingestar --workspace etapa3-rag` de nuevo para reconstruir el
índice con el nuevo espacio de embeddings.

## Qué quedó fuera

- Reintento/backoff en la llamada de embeddings durante la ingesta
  (mencionado como deseable en el spec, no implementado — la ingesta
  corre una sola vez de forma manual, no en producción continua).
- Ingesta incremental idempotente (si se agrega un PDF nuevo, hoy se
  reingesta todo el directorio; la cache de embeddings sí evita
  recalcular los fragmentos ya vistos).
- Reintento/backoff/timeout en la llamada de embeddings del camino de
  consulta (`consultas.ts`) — `HttpChatProvider.embeber()` no tiene
  `AbortController`, y no hay fallback a `HeuristicProvider` si el
  proveedor configurado falla (a diferencia de `ClasificadorService` en
  Etapa 2). `aiMaxReintentos` está declarado en la configuración pero no
  se usa en este subproyecto.
- Manejo por archivo de PDF corrupto durante la ingesta —
  `ingestarDirectorio` no envuelve `extraerTexto` en `try/catch` por
  archivo; un PDF corrupto en el directorio aborta toda la ingesta en vez
  de saltarlo y continuar con el resto.
- Lint en el pipeline de CI (el spec lo pide) — no hay ESLint configurado
  en ningún workspace del monorepo todavía; `tsc` cubre el typecheck de
  `src/` pero `tests/` queda fuera de `tsconfig.json`'s `include`.
- Logging estructurado con `requestId` de correlación (sí presente en
  `etapa2-api`, no replicado aquí — `logger.ts` de Etapa 2 no está
  reexportado desde su barrel todavía).
- La métrica de tokens (`GET /metricas`) aproxima sólo pregunta+respuesta,
  sin contar el contexto recuperado (la mayor parte del costo real de un
  prompt RAG); el registro en memoria no tiene límite de tamaño ni
  ventana de tiempo.
- Citas siempre a nivel de sección de primer nivel — subsecciones como
  "3.1" no siempre se detectan de forma confiable en el texto extraído de
  los PDF reales.

## Evidencia de CI

Evidencia a nivel de historial de commits (spec, Tarea 9): commit
[`21f0521`](https://github.com/azorlandoaz/acertemos-app/commit/21f0521)
introduce a propósito una aserción rota en `tests/metricas.test.ts`
(`[ROTO A PROPOSITO]`, falla localmente), seguido del commit
[`830859f`](https://github.com/azorlandoaz/acertemos-app/commit/830859f)
que la corrige (pasa localmente) — diff neto vacío entre ambos, verificado
en la revisión de tarea correspondiente.

**Historial del bloqueo y su resolución (PR
[#3](https://github.com/azorlandoaz/acertemos-app/pull/3)):** al publicar
la rama, el job `etapa3-rag` (que depende de `needs: etapa2-api`) nunca
llegó a ejecutarse porque `etapa2-api` fallaba en Actions por 6 tests
preexistentes en `etapa2-api/tests/routes/solicitudes.test.ts` y
`tests/config/env.test.ts` — dependían de un `.env` ambiental para que
`cargarConfig()` no lanzara, inexistente en un checkout nuevo/CI. Se
corrigió en la rama `etapa2-api` (commit
[`cb4cf0a`](https://github.com/azorlandoaz/acertemos-app/commit/cb4cf0a),
tests herméticos con variables dummy en `beforeAll`) y se fusionó a
`etapa3-rag`. Al desbloquearse, apareció un segundo caso del mismo patrón
en `tests/routes/consultas.test.ts` (`cargarConfig()` seguía exigiendo
`AI_PROVIDER_BASE_URL`/`AI_PROVIDER_API_KEY` aunque el endpoint ya no los
usa con `HeuristicProvider` por defecto), corregido igual (commit
[`2bb40b2`](https://github.com/azorlandoaz/acertemos-app/commit/2bb40b2)).

- Corrida roja original (job `etapa2-api` bloqueando `etapa3-rag`): https://github.com/azorlandoaz/acertemos-app/actions/runs/32645315759
- **Corrida verde, los 3 jobs pasando** (`etapa1-fundamentos`,
  `etapa2-api`, `etapa3-rag`): https://github.com/azorlandoaz/acertemos-app/actions/runs/32646619594
