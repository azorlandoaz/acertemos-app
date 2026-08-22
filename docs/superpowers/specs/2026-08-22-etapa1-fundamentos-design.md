# Etapa 1 — Fundamentos (Desarrollador IA Junior I)

Fecha: 2026-08-22 · Depende de: nada (primera etapa) · Bloquea: todas las demás.
Convenciones transversales: ver [spec maestro](2026-08-22-arquitectura-general-design.md).
Carpeta: `etapa1-fundamentos/`.

## 1. Objetivo

Producir un script Python que limpie el histórico de tickets, un cliente
robusto del `servicio_mock`, una base de datos dockerizada a partir de
`esquema.sql` con pruebas que verifiquen que el script realmente crea el
esquema esperado, tres consultas SQL de análisis, y la disciplina de
Git/pruebas/documentación que sostiene el resto de la prueba. Es la única
etapa que **no puede fallar el mínimo** sin invalidar todo lo demás (regla 3
del Anexo A).

## 2. Rúbrica de la etapa

cumplimiento funcional · corrección y manejo de errores · legibilidad y
estructura · uso de Git · consumo de API REST · SQL · pruebas unitarias ·
documentación mínima. 8 criterios × 0-4 = 100 pts, mínimo 60.

## 3. Insumos concretos (ya verificados en `materiales/`)

- `datos/tickets_historicos.csv`: columnas
  `id,fecha_creacion,fecha_cierre,area,categoria,prioridad,canal,solicitante,
  asunto,descripcion,estado,reaperturas`.
  - **3 formatos de fecha reales**: `2025-03-08` (ISO), `03/06/2025`
    (DD/MM/AAAA), `30-Jun-2025` / `20-Ene-2026` (DD-Mes-AAAA con mes en
    español abreviado).
  - **`categoria`** inconsistente: `VACACIONES` / `Vacaciones` /
    `Hardware` / `HARDWARE` / `compras` / `Sin clasificar`.
  - **`prioridad`** con escalas mezcladas: `alta`, `1-Alta`, `Alta`, `ALTA`,
    `2-Media`, `baja`.
  - **`estado`** con casing mezclado: `REABIERTO`, `abierto`, `Cerrado`,
    `CERRADO`, `Escalado`, `en proceso`.
  - Campos vacíos observados: `fecha_cierre` (tickets abiertos),
    `descripcion`, `reaperturas`.
  - Duplicados: no verificados fila a fila aquí: el script debe detectarlos
    (mismo `id` o mismo contenido) y reportarlos, no asumir que no existen.
- `datos/esquema.sql`: tablas `areas, usuarios, tickets, adjuntos,
  historial_estado`, con FKs, **sin índices a propósito** (el enunciado
  invita a proponerlos si se justifican — nota para el README, no
  obligatorio). El propio archivo indica que está "verificado en
  MySQL/MariaDB" — se dockeriza con la imagen oficial `mariadb`, montando
  `esquema.sql` en `/docker-entrypoint-initdb.d/` para que la imagen lo
  ejecute automáticamente al crear el volumen por primera vez. Esa
  ejecución automática **es** la comprobación de que el script funciona:
  si tiene un error de sintaxis, el contenedor nunca llega a `healthy`.
- `servicio_mock/`: FastAPI en `localhost:8080`. Requiere
  `Authorization: Bearer <token>` (vía env, nunca hardcodeado). Endpoints
  relevantes: `GET /solicitudes`, `POST /solicitudes` (soporta header
  `Idempotency-Key`), `GET /health`. Falla con `500` (12%) y `429` con
  header `Retry-After` (5%), latencia 0.1-2.5 s.

## 4. Derivación de tareas

| # | Tarea | Detalle | Criterio(s) | Evidencia |
|---|---|---|---|---|
| 1 | Rama de trabajo | Crear rama `etapa1-fundamentos` desde `master`. | uso de Git | rama visible en el repo |
| 2 | Andamiaje del subproyecto | `etapa1-fundamentos/{src,tests}`, `requirements.txt` (pandas o csv estándar, pytest, requests), `README.md` inicial. | legibilidad y estructura | commit de estructura |
| 3 | Parser de fechas | Función `normalizar_fecha(valor) -> date \| None` que cubra los 3 formatos reales, incluyendo meses en español abreviados; `None` explícito ante formato no reconocido (no excepción no controlada). | corrección y manejo de errores | test unitario con los 3 formatos + 1 caso inválido |
| 4 | Normalización de categorías/prioridad/estado | Tabla de mapeo a valores canónicos (p. ej. `title case` + diccionario de sinónimos para prioridad `alta/Alta/1-Alta/ALTA → Alta`). Documentar el criterio de mapeo en el README. | cumplimiento funcional | test con variantes reales del CSV |
| 5 | Deduplicación | Definir y documentar la clave de duplicado (mismo `id`, o mismo `id`+`fecha_creacion` si `id` se repite con datos distintos); reportar cuántas filas se eliminaron. | corrección y manejo de errores | test con filas duplicadas sintéticas |
| 6 | Validación de registros | Fila inválida = fecha no parseable, `area` vacía, o `id` vacío; separar en un reporte de descartes en vez de silenciarlas. | corrección y manejo de errores | test con fila corrupta / archivo vacío (caso de borde) |
| 7 | Script principal | `limpiar_tickets.py`: orquesta 3-6, produce `tickets_limpios.csv` + `resumen_por_area_prioridad.json` (conteo por área y por prioridad). | cumplimiento funcional | ejecución de punta a punta contra el CSV real |
| 8 | Cliente del `servicio_mock` | `cliente_mock.py`: `GET /solicitudes` y `POST /solicitudes`, timeout configurable, reintento en `429` respetando `Retry-After`, backoff exponencial en `500` (máx. N intentos), mensaje de error comprensible si se agotan los reintentos. | consumo de API REST | test con servidor mock real corriendo, y test con mocks de `requests` para 429/500 |
| 9 | Dockerización de la base de datos | `docker/docker-compose.yml` con servicio `mariadb`, `.env.example` con credenciales de ejemplo, volumen montando `esquema.sql` en `/docker-entrypoint-initdb.d/`, `healthcheck` vía `mysqladmin ping`. | (transversal, soporta SQL y corrección) | `docker compose up -d` deja el servicio en estado `healthy` |
| 10 | Helper de conexión + verificación de esquema | `src/db.py` con `obtener_conexion()` (reintento mientras el contenedor arranca). Pruebas que verifiquen: (a) el servicio de base de datos responde (`SELECT 1`), (b) existen las 5 tablas esperadas, (c) cada tabla tiene exactamente las columnas de `esquema.sql`, (d) los tipos de al menos una columna clave por tabla coinciden (`INT`→`int`, `VARCHAR`→`varchar`, `TEXT`→`text`, `DATETIME`→`datetime`, `CHAR`→`char`). | corrección y manejo de errores · SQL | `pytest` contra la base de datos dockerizada, verde |
| 11 | Consultas SQL de análisis | 3 archivos `.sql` en `sql/`: agregación por área, join de 3 tablas, tickets reabiertos; con test que ejecuta cada uno contra la base dockerizada y verifica que corre sin error y devuelve las columnas esperadas. | SQL | `pytest` que ejecuta las 3 consultas contra la base de datos real |
| 12 | Pruebas unitarias | Mínimo 3 funciones cubiertas (parser de fechas, normalización, dedupe o validación), con al menos un caso de borde por función (fecha vacía, archivo vacío, fila sin `area`) — además de las pruebas de esquema y SQL de las tareas 10-11. | pruebas unitarias | `pytest` verde en CI local |
| 13 | README de la etapa | Cómo instalar, cómo levantar la base de datos con Docker, cómo ejecutar, qué hace, qué se supuso (p. ej. regla de deduplicación elegida), qué quedó fuera si aplica. | documentación mínima | archivo `etapa1-fundamentos/README.md` |
| 14 | Commits atómicos | Al menos 8 commits distribuidos por tarea (no uno por archivo suelto ni uno gigante al final). | uso de Git | `git log` de la rama |

## 5. Errores y casos de borde explícitos a manejar

- Archivo CSV vacío o solo con encabezado.
- Fila con `fecha_creacion` en un cuarto formato no contemplado → se
  descarta con motivo, no crashea el script.
- `fecha_cierre` vacía en ticket abierto → válido, no es error.
- `servicio_mock` caído (connection refused) además de 429/500 → mensaje
  distinto y claro para cada caso.
- Contenedor de base de datos aún no listo (arranque lento) → el helper de
  conexión reintenta con espera, no falla al primer intento.
- `esquema.sql` con un error de sintaxis → el contenedor nunca llega a
  `healthy`; se documenta cómo diagnosticarlo (`docker compose logs`).

## 6. Definición de "hecho" (Definition of Done)

- `python -m pytest` verde localmente.
- `python -m src.limpiar_tickets materiales/datos/tickets_historicos.csv`
  corre sin excepciones y produce ambos archivos de salida.
- `docker compose up -d` (en `etapa1-fundamentos/docker/`) deja el servicio
  de base de datos en estado `healthy`, cargando `esquema.sql`
  automáticamente.
- Las pruebas de esquema confirman que existen las 5 tablas con sus
  columnas y tipos correctos, y que el servicio de base de datos responde.
- Las 3 consultas SQL de análisis corren contra la base de datos dockerizada
  sin error y devuelven las columnas esperadas.
- README completo según sección 4, tarea 13 (incluye instrucciones de
  Docker).
- ≥8 commits atómicos en `etapa1-fundamentos`.
