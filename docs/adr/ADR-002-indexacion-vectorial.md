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
completo en memoria una sola vez y cacheado (patrón de singleton perezoso, no
se relee el archivo en cada consulta), con similitud coseno calculada en
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
