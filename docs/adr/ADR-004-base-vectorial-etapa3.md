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
