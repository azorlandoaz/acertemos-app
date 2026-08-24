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
