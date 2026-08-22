# Etapa 2 — Autonomía e integración (Desarrollador IA Junior II)

Fecha: 2026-08-22 · Depende de: Etapa 1 acreditada (≥60/100) · Bloquea: Etapas 3-5.
Convenciones transversales: ver [spec maestro](2026-08-22-arquitectura-general-design.md).
Carpeta: `etapa2-api/` (Node/TS) + `etapa2-api/legacy/` (Python, fix in situ).

## 1. Objetivo

API REST propia, módulo de clasificación por IA desacoplado del proveedor, y
corrección auditable de los tres defectos de `legacy_module.py`.

## 2. Rúbrica de la etapa

diseño de la API · desacoplamiento del módulo de IA · robustez ante fallos ·
prompting y context engineering · diagnóstico y corrección de defectos ·
calidad de las pruebas · configuración, registro y secretos · documentación.
8 criterios × 0-4 = 100 pts, mínimo 60.

## 3. Diagnóstico ya realizado sobre `legacy_module.py`

El archivo describe 3 síntomas (S1-S3) sin explicar la causa. Causa raíz
identificada por lectura del código y contraste con el CSV real:

| Síntoma | Función | Causa raíz | Fix |
|---|---|---|---|
| S1 — "el informe siempre pierde algunos tickets" | `filtrar_por_periodo` | Usa comparadores **estrictos** `fc > inicio and fc < fin`: excluye los tickets creados exactamente el primer o el último día del periodo. | Cambiar a `fc >= inicio and fc <= fin`. |
| S2 — "las cifras del segundo resumen en adelante salen infladas" | `resumir_por_area(tickets, acumulador={})` | **Argumento por defecto mutable**: el diccionario `{}` se crea una sola vez y se reutiliza entre llamadas sucesivas dentro del mismo proceso. | `acumulador=None` + `if acumulador is None: acumulador = {}` dentro de la función. |
| S3 — "el indicador de reaperturas da por debajo de lo que ve la mesa" | `contar_reaperturas` | Compara `t.get("estado") == "reabierto"` en minúscula exacta, pero el dato real trae `"REABIERTO"` (verificado en `tickets_historicos.csv`, fila `TK-00183`). | Normalizar con `.strip().lower()` antes de comparar. |

Por cada uno: prueba que falla antes del fix y pasa después (usar
`legacy/tests/test_legacy_module.py`, sin modificar la firma pública de las
funciones — el enunciado pide corregir, no reescribir el módulo completo).

## 4. Derivación de tareas

| # | Tarea | Detalle | Criterio(s) | Evidencia |
|---|---|---|---|---|
| 1 | Rama de trabajo | `etapa2-api` desde `master` (después de mergear/tagear Etapa 1). | — | rama visible |
| 2 | Fix S1 + prueba | Test que falla con ticket creado el día `inicio` exacto, pasa tras el fix. | diagnóstico y corrección de defectos | `pytest` + comentario de 1 línea con la causa raíz |
| 3 | Fix S2 + prueba | Test: dos llamadas sucesivas a `resumir_por_area` con listas distintas no deben compartir conteos. | idem | idem |
| 4 | Fix S3 + prueba | Test: ticket con `estado="REABIERTO"` (mayúsculas) debe contarse. | idem | idem |
| 5 | Andamiaje API | `etapa2-api/src/{routes,services,ia,config}`, Express + TypeScript, Zod para validación. | diseño de la API | commit de estructura |
| 6 | Recurso crear solicitud | `POST /solicitudes`: valida entrada (Zod), `201` + cuerpo creado, `400/422` en entrada inválida. | diseño de la API | test `supertest` |
| 7 | Recurso consultar estado | `GET /solicitudes/:id`: `200` si existe, `404` uniforme si no. | diseño de la API | idem |
| 8 | Recurso listar con filtros | `GET /solicitudes?area=&estado=&categoria=`: paginación simple, `200` con lista (vacía si no hay resultados, no error). | diseño de la API | idem |
| 9 | Forma uniforme de error | Middleware de error: `{ error: { code, message, details? } }` para toda excepción no capturada y para errores de validación. | diseño de la API | test que verifica el shape en un 400 y en un 404 |
| 10 | Interfaz `IAProvider` | Definir la interfaz (ver spec maestro §4.1) en `src/ia/IAProvider.ts`; ningún otro módulo importa el SDK del proveedor directamente. | desacoplamiento del módulo de IA | revisión de imports (ningún `import` del SDK fuera de `src/ia/`) |
| 11 | Implementación real + heurística de respaldo | Adapter concreto (proveedor a decidir) + fallback por palabras clave; timeout configurable, reintento con backoff, modo degradado activado tras agotar reintentos. | robustez ante fallos · desacoplamiento del módulo de IA | test que fuerza fallo del proveedor (mock) y verifica que responde en modo degradado sin excepción |
| 12 | Prompt de clasificación | Prompt versionado (archivo o constante), con ejemplos few-shot de las categorías reales del histórico; documentar el razonamiento del prompt en el README técnico. | prompting y context engineering | ejemplo de prompt + salida en el README |
| 13 | Configuración y secretos | `.env.example`, validación de variables al arranque, ningún secreto en código (incluye el token del `servicio_mock`). | configuración, registro y secretos | revisión manual + `git log -p` sin secretos |
| 14 | Registro estructurado | Logger JSON con `requestId`, un log por request (método, ruta, status, duración). | configuración, registro y secretos | ejemplo de log en el README |
| 15 | Documentación técnica y funcional | Contrato de la API (OpenAPI o tabla de endpoints) + qué resuelve y para quién (1 párrafo). | documentación | `etapa2-api/README.md` + `openapi.yaml` |
| 16 | (Opcional, con puntaje) Pantalla Angular | Listado con filtros consumiendo la API propia. Solo si el tiempo alcanza tras cerrar 1-15. | — (puntaje adicional) | captura + código en `etapa2-api/frontend/` |

## 5. Errores y casos de borde explícitos

- Cuerpo de `POST /solicitudes` sin campos requeridos → `422` con detalle
  de qué campo falta.
- Proveedor de IA responde con timeout → modo degradado, nunca un `500`
  genérico hacia el cliente de la API.
- `GET /solicitudes/:id` con id inexistente → `404` con el shape uniforme,
  no un stack trace.

## 6. Definición de "hecho"

- `npm test` verde (Node) y `python -m pytest` verde (fix del legacy).
- Los 3 síntomas del legacy tienen prueba roja→verde documentada.
- Ningún `grep` de posibles secretos (`sk-`, `Bearer `, contraseñas
  literales) en el código versionado.
- README técnico + funcional completos.
- Rama con historial de commits atómicos por tarea.
