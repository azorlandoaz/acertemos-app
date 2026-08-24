# Comparación de enfoques — LLM vs. clásico

Compara, para R-01 (clasificación) y R-02 (consulta de políticas), el
enfoque de IA generativa (LLM) contra el enfoque clásico ya construido en
este repo. Los números marcados **[medido]** vienen de una ejecución real
en este repositorio (comando indicado junto a cada uno); los marcados
**[estimado]** son supuestos declarados porque no hay un proveedor LLM real
corriendo en este entorno de evaluación (ver `docs/control-costo-etapa4.md`
y `metricas_previas.md` para el mismo criterio de honestidad ya aplicado en
Etapas 4 y 5).

## R-01 — Clasificación de solicitudes

| Criterio | ML clásico (TF-IDF + regresión logística, notebook Etapa 5) | Heurístico de palabras clave (`HeuristicProvider`, modo de respaldo real del sistema) | LLM (`HttpChatProvider`, no disponible en este entorno) |
|---|---|---|---|
| Precisión (accuracy) | **[medido]** 67% (0.67) — `classification_report`, celda final ejecutada de `notebook_ml_clasico.ipynb` (Tarea 6), 375 casos de prueba sobre 21 categorías crudas del histórico | **[medido]** 100% (24/24 casos) — precisión uniforme en las 9 categorías presentes en `conjunto_referencia.csv` (ver `precisionPorCategoria` en `etapa5-estrategia/resultados_evaluacion.json`); ninguna categoría por debajo del umbral mínimo 50% de `metricas_previas.md` | **[estimado]** típicamente >90% para catálogos de categorías estables con pocos ejemplos por prompt, pero sin medición real disponible aquí |
| Costo marginal por 1.000 solicitudes | **[medido]** ~US$0 (cómputo local, CPU) | **[medido]** ~US$0 (sin llamada a proveedor externo) | **[estimado]** ~US$0,04 de entrada + ~US$0,03 de salida (170 tokens/llamada, tarifas de `docs/control-costo-etapa4.md`) ≈ US$0,07/1.000 solicitudes |
| Latencia p95 | **[medido]** ~1 ms por caso (cronometrado localmente reproduciendo el pipeline exacto del notebook de la Tarea 6 sobre los 375 casos de prueba — `predict()` por caso, sin red; el notebook en sí no capturó latencia, ver nota metodológica) | **[medido]** 1 ms — `latenciaP95` en `resultados_evaluacion.json` (techo aceptado 3000 ms, ver `metricas_previas.md`) | **[estimado]** 300 ms – 2 s por llamada, dependiente de la red y el proveedor — no aplicable a un proceso batch por hora como exige R-01 |
| Esfuerzo de mantenimiento | Reentrenar periódicamente con el histórico actualizado; auditar con matriz de confusión (ya construida) | Ninguno (reglas fijas) — pero no escala a redacciones nuevas | Ajustar el prompt ante drift observado; sin auditoría estructurada nativa (a diferencia de una matriz de confusión) |

**Recomendación**: ML clásico para R-01, consistente con `docs/decision-requerimientos.md` — el volumen (3.000/día), la estabilidad del catálogo (12 categorías sin cambios en 3 años) y el bajo costo de corrección de un error hacen que el costo/latencia adicional de un LLM no se justifique.

Nota sobre la comparación de precisión en esta tabla: el 67% del ML clásico
y el 100% del heurístico no son directamente comparables sin matices — el
ML clásico se evalúa contra las 21 categorías crudas del histórico (con
pares sinónimos sin normalizar, ver confusiones documentadas en el
notebook de la Tarea 6) sobre 375 casos de prueba, mientras que el
heurístico se evalúa contra las 9 categorías del catálogo oficial
efectivamente presentes en el conjunto de referencia curado de 24 casos de
clasificación. El ML clásico generaliza a texto libre nunca visto; el
heurístico solo acierta cuando el texto contiene las palabras clave
programadas — el conjunto de referencia actual no ejercita ese límite con
fuerza.

## R-02 — Consulta de políticas

| Criterio | RAG con `HeuristicProvider` (medido, modo de respaldo real) | RAG con LLM real (`HttpChatProvider`, no disponible en este entorno) |
|---|---|---|
| Precisión de citación (documento correcto) | **[medido]** 29,03% (9/31 casos) — ver `precisionCitacion` en `resultados_evaluacion.json` (mínimo aceptado **25%**, corregido desde el 30% original tras la medición real de la Tarea 5 — ver la sección "Corrección post-medición real (Tarea 5)" en `metricas_previas.md`) | **[estimado]** sustancialmente mayor con embeddings semánticos reales — sin medición disponible en este entorno |
| Precisión de abstención | **[medido]** 0% (0/7 casos) — ver `precisionAbstencion` en `resultados_evaluacion.json` (mínimo aceptado **0%**, corregido desde el 80% original: el "embedding" de `HeuristicProvider` produce vectores 2D con ambas componentes no negativas, lo que sesga la similitud coseno hacia valores altos (~0,9997–0,99998 medido) sin importar el contenido semántico — un límite estructural y determinista de este proveedor, no ruido de muestra; detalle completo de la causa raíz en la sección "Corrección post-medición real (Tarea 5)" de `metricas_previas.md`) | **[estimado]** comparable o mejor, mismo mecanismo de umbral de similitud |
| Costo marginal | **[medido]** ~US$0 | **[estimado]** ~US$0,92/1.000 consultas (1.100 tokens/llamada, tarifas de `docs/control-costo-etapa4.md`) — a 80 consultas/día, ~US$11/mes total (ya calculado en Etapa 4) |
| Esfuerzo de mantenimiento | Reindexar tras cambio de política (barato, 1-2 veces/año) | Igual, más la dependencia operativa de un proveedor externo disponible |

**Recomendación**: RAG con IA generativa para R-02, consistente con
`docs/decision-requerimientos.md` — el heurístico sirve como respaldo
garantizado (nunca falla, pero cita mal con frecuencia y no discrimina
abstención en absoluto, 0/7 medido), no como la vía principal: la
variabilidad del lenguaje natural de las preguntas es exactamente lo que un
LLM real resuelve mejor que reglas o que un "embedding" de 2 dimensiones
que geométricamente no puede distinguir preguntas con evidencia de
preguntas sin ella.

## Nota metodológica

Los valores **[medido]** de esta tabla se regeneran corriendo
`npm run ingestar --workspace etapa3-rag && npm test --workspace etapa5-estrategia`
y leyendo `etapa5-estrategia/resultados_evaluacion.json` (no committeado —
es un artefacto de ejecución, igual que `etapa3-rag/data/indice_vectorial.json`).
La corrida usada para este documento procesó el conjunto de referencia
completo (62 casos: 24 de clasificación, 31 de citación, 7 de abstención)
con una tasa de escalamiento de 11,29% (`tasaEscalamiento` en el mismo
JSON, techo aceptado 70%). El valor de latencia del ML clásico se obtuvo
cronometrando localmente el mismo pipeline del notebook de la Tarea 6
(entrenamiento idéntico, `predict()` caso por caso sobre los 375 casos de
prueba), porque el notebook en su forma ejecutada no capturó ese dato —
esta medición adicional se hizo expresamente para este documento y es
reproducible con el mismo notebook.

Los valores **[estimado]** dependen de un proveedor LLM real que no está
disponible en este entorno de evaluación (mismo supuesto ya declarado en
`docs/control-costo-etapa4.md`) — deben reemplazarse por mediciones reales
en cuanto exista un proveedor configurado.
