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
