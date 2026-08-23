# Etapa 1 — Fundamentos

Script de limpieza del histórico de tickets, cliente del `servicio_mock`,
base de datos dockerizada y 3 consultas SQL de análisis.

## Instalación

```bash
cd etapa1-fundamentos
python -m venv .venv
# Windows: .venv\Scripts\activate    |    Linux/Mac: source .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env
```

## Base de datos (Docker)

```bash
cd docker
cp .env.example .env   # usa las mismas claves que etapa1-fundamentos/.env
docker compose up -d
docker compose ps      # debe mostrar "healthy"
```

El contenedor carga automáticamente `materiales/datos/esquema.sql` la
primera vez que se crea el volumen. Si el script SQL tuviera un error de
sintaxis, la inicialización fallaría y el contenedor nunca llegaría a
`healthy` — así se comprueba que el script funciona. Las pruebas de
`tests/test_esquema_bd.py` y `tests/test_sql_consultas.py` verifican,
además, que las 5 tablas existen con sus columnas y tipos correctos, y que
el servicio de base de datos responde.

## Ejecución

```bash
# Limpieza del histórico
python -m src.limpiar_tickets ../materiales/datos/tickets_historicos.csv

# Servicio mock (en otra terminal, desde materiales/servicio_mock/)
uvicorn app:app --reload --port 8080

# Pruebas (requiere Docker corriendo para test_esquema_bd.py y test_sql_consultas.py)
pytest -v
```

`conftest.py` carga `.env` automáticamente antes de correr las pruebas (vía `python-dotenv`).

## Qué hace

- Normaliza fechas (3 formatos reales del CSV, incluidos meses en
  español), categoría/prioridad/estado (mayúsculas y escalas mezcladas),
  elimina duplicados por `id`, descarta filas inválidas con motivo, y
  genera `tickets_limpios.csv` + `resumen_por_area_prioridad.json`.
- Cliente del `servicio_mock` con reintentos ante `429`/`500` y mensaje de
  error comprensible si el servicio no responde.
- Base de datos MariaDB dockerizada a partir de `esquema.sql`, con
  pruebas automatizadas que verifican que las 5 tablas y sus columnas
  existen tal como las define el esquema, y que el servicio responde.
- 3 consultas SQL de análisis (`sql/`): tickets por área, tickets con
  área+solicitante+adjuntos, tickets reabiertos.

## Qué se supuso

- La deduplicación usa `id` como clave única del ticket.
- Un registro es inválido si le falta `id`, `area`, o si `fecha_creacion`
  no coincide con ninguno de los 3 formatos conocidos.
- Los tests de esquema y de las consultas SQL requieren que el contenedor
  Docker esté corriendo; no están pensados para correr sin él.
- La base de datos se conecta con un usuario de aplicación
  (`mesa_ayuda_app`), no con `root`, siguiendo buena práctica de
  privilegio mínimo.
- La consulta de tickets reabiertos usa `tickets.reaperturas` (el contador
  autoritativo del esquema) en vez de derivar el conteo de `historial_estado`,
  que en este dataset solo registra un ciclo de vida fijo de 3 filas por ticket
  y no un historial completo de reaperturas.

## Qué quedó fuera

- No se valida `fecha_cierre` como obligatoria (los tickets abiertos
  legítimamente no la tienen).
- No se crean índices adicionales sobre `esquema.sql` (el enunciado lo
  deja como propuesta opcional, no obligatoria).
