# Etapa 3 — Complejidad y calidad (Desarrollador IA Junior III)

Fecha: 2026-08-22 · Depende de: Etapa 2 acreditada · Bloquea: Etapas 4-5.
Convenciones transversales: ver [spec maestro](2026-08-22-arquitectura-general-design.md).
Carpeta: `etapa3-rag/`.

## 1. Objetivo

RAG sobre los 5 PDF de políticas con comportamiento de abstención
verificable, pipeline de CI, informe de seguridad sobre código propio,
instrumentación de costo/latencia, y un artefacto de aporte al equipo.

## 2. Rúbrica de la etapa

ingesta y fragmentación · embeddings y recuperación · fidelidad de la
respuesta · integración continua · seguridad del código generado ·
observabilidad · modularidad y reutilización · aporte al equipo.
8 criterios × 0-4 = 100 pts, mínimo 60.

## 3. Insumos concretos

- `materiales/politicas/`: 5 PDF con secciones numeradas (`POL-GTH-01
  Vacaciones`, `POL-TIC-02 Activos`, `POL-TIC-03 Accesos`, `POL-ADM-04
  Viáticos`, `POL-TIC-05 Incidentes`). El corpus **no cubre todos los
  temas a propósito** — el sistema debe reconocerlo.
- `materiales/n5/plantilla_conjunto_referencia.csv`: ya trae el caso
  `GS-003` (*"¿Puedo trabajar desde casa tres días a la semana?"* →
  `SIN EVIDENCIA EN LOS DOCUMENTOS`) como caso de abstención de referencia
  directa. Reutilizar este caso como prueba mínima obligatoria (no hace
  falta esperar a Etapa 5 para usarlo).
- **Aclaración importante de alcance**: el informe de seguridad de esta
  etapa es sobre **código propio generado con IA durante la prueba**
  (p. ej. algo en el módulo de ingesta o en el cliente del `IAProvider`),
  **no** sobre `pr_para_revision.diff` — ese archivo es el insumo de la
  revisión escrita de Etapa 5 y de la sustentación. No mezclar los dos
  entregables.

## 4. Derivación de tareas

| # | Tarea | Detalle | Criterio(s) | Evidencia |
|---|---|---|---|---|
| 1 | Rama de trabajo | `etapa3-rag` desde `master`. | — | rama visible |
| 2 | Ingesta de PDF | Extracción de texto por documento conservando la estructura de secciones numeradas (`pdf-parse` o equivalente). | ingesta y fragmentación | test con al menos 1 PDF real de `materiales/politicas/` |
| 3 | Fragmentación | Chunking por sección (no por tamaño fijo ciego), tamaño objetivo y solape documentados y justificados. | ingesta y fragmentación | tabla de fragmentos generados por documento en el README |
| 4 | Embeddings | Reutilizar `IAProvider.embeber()` de Etapa 2; cachear embeddings para no recalcular en cada arranque. | embeddings y recuperación | test de generación de embeddings con mock del proveedor |
| 5 | Base vectorial | Decisión formal (ADR breve o sección de decisión en el README): almacenamiento embebido local (p. ej. índice en SQLite/archivo con similitud coseno en memoria) vs. servicio externo; justificar por simplicidad de despliegue en 3 días. | embeddings y recuperación | archivo de decisión + código |
| 6 | Endpoint de consulta | `POST /consultas`: recibe pregunta, recupera top-k fragmentos, genera respuesta citando **documento y sección de origen**. | fidelidad de la respuesta | test `supertest` con pregunta que sí tiene respaldo (p. ej. anticipación de vacaciones) |
| 7 | Umbral de abstención | Si la similitud máxima recuperada < umbral configurado, responder que no hay evidencia en las políticas en vez de generar con el LLM. | fidelidad de la respuesta | test con el caso `GS-003` (teletrabajo) — debe abstenerse |
| 8 | Pipeline de CI | `ci.yml`: lint + `vitest` en cada push. | integración continua | ejecución exitosa visible en Actions |
| 9 | Evidencia de corrida fallida | Commit intermedio con un test roto a propósito (documentado como tal en el mensaje de commit), seguido de un commit que lo corrige. | integración continua | 2 corridas de Actions enlazadas en el README de la etapa |
| 10 | Informe de seguridad | 1 página, ≥3 hallazgos **sobre código propio generado con IA en esta prueba**, cada uno con severidad, evidencia (fragmento de código) y corrección ya aplicada. | seguridad del código generado | `docs/seguridad/informe-etapa3.md` |
| 11 | Instrumentación | Middleware que registra latencia por request y tokens consumidos por llamada al `IAProvider`; script o endpoint que agrega el resumen (p. ej. p50/p95 de latencia, tokens totales). | observabilidad | ejemplo de resumen agregado en el README |
| 12 | Modularidad | El módulo RAG no duplica la interfaz `IAProvider` ni el cliente HTTP de Etapa 2 — se importa/reutiliza. | modularidad y reutilización | revisión de imports cruzados entre `etapa2-api` y `etapa3-rag` (o extracción a un paquete compartido si aplica) |
| 13 | Artefacto para el equipo | Guía breve (1 página) de estándar de prompts **o** de revisión de código generado por IA, redactada para que otro desarrollador del equipo la use. | aporte al equipo | `docs/estandar-prompts-o-revision.md` |
| 14 | README de la etapa | Instalación, ejecución, qué hace, qué se supuso, qué quedó fuera. | (transversal) | `etapa3-rag/README.md` |

## 5. Errores y casos de borde explícitos

- Pregunta totalmente fuera de dominio (p. ej. "¿cuál es la capital de
  Francia?") → debe abstenerse igual que con `GS-003`, no solo con
  preguntas "casi correctas".
- PDF vacío o corrupto en la carpeta de ingesta → error controlado, no
  crashea el pipeline de ingesta completo.
- Proveedor de embeddings caído durante la ingesta → reintento/backoff
  igual que en Etapa 2, no reingestar todo desde cero si ya se procesó
  parcialmente (idempotencia de la ingesta, deseable no obligatorio).

## 6. Definición de "hecho"

- `POST /consultas` responde correctamente al menos a 3 preguntas con
  respaldo real en el corpus (usar `GS-001`, `GS-002` de la plantilla como
  base) citando documento+sección.
- `GS-003` produce abstención explícita, verificado con test automatizado.
- CI muestra al menos una corrida verde y una roja en el historial.
- Informe de seguridad y artefacto de equipo entregados como archivos
  Markdown en `docs/`.
