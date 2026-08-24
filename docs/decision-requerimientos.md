# Documento de decisión — R-01, R-02, R-03

Fuente de los requerimientos: `materiales/n5/requerimientos_negocio.md`.
Los criterios usados en cada decisión son: volumen, estabilidad del
problema, costo, latencia, tolerancia al error y esfuerzo de mantenimiento
— el mismo marco que pide el Anexo A, aplicado aquí con razonamiento propio
(no es una copia de la lectura orientativa del spec de la etapa).

## R-01 — Clasificación de solicitudes entrantes

**Alternativa elegida:** automatización tradicional / ML clásico (modelo
supervisado sobre el histórico ya etiquetado, ver
`etapa5-estrategia/notebook_ml_clasico.ipynb`). **No** IA generativa.

**Razonamiento:**
- *Volumen*: 3.000 solicitudes/día es suficiente para entrenar y mantener un
  clasificador supervisado, y suficiente para que el costo por llamada a un
  LLM (aunque pequeño individualmente) se acumule de forma innecesaria.
- *Estabilidad*: 12 categorías sin cambios en 3 años es exactamente el caso
  donde un modelo entrenado una vez (y reentrenado ocasionalmente) no pierde
  vigencia — no hay "concept drift" que justifique la flexibilidad de un
  LLM.
- *Costo*: un modelo TF-IDF + regresión logística corre en CPU local sin
  costo marginal por llamada; un LLM cuesta por token en cada una de las
  3.000 llamadas diarias (ver `docs/control-costo-etapa4.md`, ~15,3M
  tokens/mes solo para clasificación si se hiciera con LLM).
- *Latencia*: el proceso corre en lote cada hora, sin restricción de
  respuesta inmediata — un LLM no aporta ninguna ventaja de latencia aquí
  que el modelo clásico no tenga ya.
- *Tolerancia al error*: la corrección toma <1 minuto y no afecta al usuario
  final — el costo de un error de clasificación es bajo, lo que hace
  innecesario pagar la mayor precisión (y mayor costo/latencia) de un LLM.
- *Mantenimiento*: un modelo de 12 clases fijas es más fácil de auditar
  (matriz de confusión, métricas por clase) que un prompt cuyo
  comportamiento puede cambiar con actualizaciones del proveedor.

Este es el requerimiento que satisface el **punto crítico #10** del Anexo A
(uno de los tres requerimientos no debe resolverse con IA generativa).

**Alternativas descartadas:**
- *Clasificación con LLM por llamada*: descartada por costo recurrente
  innecesario y por introducir una dependencia externa (disponibilidad,
  latencia de red) en un proceso batch que no la necesita.
- *Mantener 100% manual*: descartada — ya existe histórico etiquetado
  suficiente para entrenar un modelo supervisado; seguir clasificando a mano
  3.000 solicitudes/día no aprovecha ese activo.

**Costo estimado:** cómputo local (CPU), sin costo por llamada — el único
costo real es el reentrenamiento periódico (horas de una persona,
esporádico, no por solicitud).

**Riesgo:** un modelo mal calibrado podría degradar silenciosamente sin que
nadie lo note si no hay monitoreo — mitigado por la suite de evaluación de
esta misma etapa, que puede reutilizarse como gate de reentrenamiento.

**Condición de cambio:** si el catálogo de categorías empezara a cambiar con
frecuencia (nuevas categorías, fusión/división de categorías existentes),
el costo de reentrenar y validar un modelo supervisado en cada cambio podría
superar al de ajustar un prompt — ahí un LLM (o un enfoque híbrido con
few-shot) empezaría a ser competitivo.

## R-02 — Consulta de políticas internas en lenguaje natural

**Alternativa elegida:** IA (RAG) — ya construido en Etapa 3 y reutilizado
sin cambios en esta etapa.

**Razonamiento:**
- *Volumen*: 80 consultas/día es bajo — el costo por llamada a un LLM es
  irrelevante en esta escala (~US$3,24/mes de salida según
  `docs/control-costo-etapa4.md`).
- *Estabilidad*: las políticas cambian 1-2 veces al año, pero las PREGUNTAS
  llegan en lenguaje libre y variable — esto es exactamente lo que un
  clasificador de reglas fijas no puede cubrir (no hay un catálogo finito de
  formas de preguntar "¿cuánto me pagan de viáticos?").
- *Costo*: bajo en esta escala, ya cuantificado en Etapa 4.
- *Latencia*: no hay restricción de tiempo real estricta, pero sí de
  disponibilidad razonable para no bloquear al colaborador que pregunta.
- *Tolerancia al error*: una respuesta equivocada sobre montos o plazos
  genera reclamación formal — el riesgo se mitiga con **citación de fuente
  obligatoria y abstención explícita** cuando no hay evidencia (ya
  implementado en `responderConsulta`), no evitando la IA sino
  restringiendo lo que puede hacer sin evidencia.
- *Mantenimiento*: reindexar tras un cambio de política (1-2 veces/año) es
  barato comparado con mantener reglas manuales para lenguaje natural
  variable.

**Alternativas descartadas:**
- *Automatización tradicional (árbol de reglas/palabras clave)*: descartada
  — el volumen de formas de preguntar lo mismo en lenguaje natural hace que
  mantener reglas sea más costoso y frágil que un RAG con abstención.
  `HeuristicProvider` (el fallback heurístico del sistema) es en la práctica
  una demostración de esta alternativa descartada: sus resultados reales
  (ver `metricas_previas.md`, precisión de citación objetivo de solo 30%)
  confirman por qué no es la opción principal para R-02.
- *Persona humana sin apoyo de IA*: es el estado actual (18% del tiempo del
  equipo, dato de `requerimientos_negocio.md`) — descartada como destino
  final porque no escala y es el costo que la solución busca reducir, pero
  sigue siendo la vía de escalamiento cuando el RAG se abstiene.

**Costo estimado:** ~US$11/mes con un proveedor externo de referencia
(`docs/control-costo-etapa4.md`), frente al 18% del tiempo del equipo que
hoy consume responder manualmente.

**Riesgo:** una cita incorrecta (documento equivocado) es peor que una
abstención — mitigado por el umbral de abstención configurable
(`UMBRAL_ABSTENCION`) y por la suite de evaluación de esta etapa, que mide
la precisión de citación y de abstención por separado.

**Condición de cambio:** si el volumen creciera órdenes de magnitud (miles
de consultas/día) o si el catálogo de políticas se volviera tan grande que
la recuperación por similitud dejara de ser precisa, valdría la pena evaluar
un índice más sofisticado (embeddings reales de un proveedor, ver nota en
`etapa3-rag/src/servicioConsultas.ts`) antes que cambiar de enfoque.

## R-03 — Recordatorio de tickets sin gestión

**Alternativa elegida:** automatización tradicional pura, sin IA — cron/
scheduler + verificación de idempotencia (marca de "ya notificado" por
ticket y nivel, mismo patrón ya usado en `etapa4-orquestacion/src/estadoSync.ts`
para deduplicar eventos de webhook).

**Razonamiento:**
- *Volumen y estabilidad*: regla fija (3 días → recordatorio, 5 días →
  escalamiento), sin variación de lenguaje ni de criterio — cero ambigüedad
  que requiera interpretación.
- *Costo*: una tarea programada diaria que consulta la base de datos por
  fecha de último cambio de estado no tiene costo de inferencia — usar un
  LLM aquí sería pagar por algo que una condición `dias_sin_cambio >= 3` ya
  resuelve exactamente igual.
- *Latencia*: ejecución diaria a las 8:00 a.m., sin restricción de tiempo
  real — no hay ninguna ventaja de un LLM que compense su costo y su
  latencia adicional.
- *Tolerancia al error*: el texto del mensaje es siempre el mismo — no hay
  nada que "generar", solo plantillas con `codigo_ticket` y `responsable`.
- *Mantenimiento*: una condición de fecha + una marca de idempotencia es
  trivial de auditar y probar; un LLM aquí sería una fuente de fallos no
  deterministas (verbosidad variable, posible alucinación de datos) sin
  ningún beneficio a cambio.

Este es el **segundo requerimiento del punto crítico #10** que debe
resolverse sin IA generativa (además de R-01) — la señal de "sobre-
ingeniería" es clara: introducir IA aquí no resolvería mejor el problema, y
sí introduciría riesgo (falta de determinismo) donde hoy no existe.

**Alternativas descartadas:**
- *IA generativa para redactar el recordatorio*: descartada — el mensaje es
  literalmente el mismo texto con dos variables sustituidas; no hay nada que
  redactar.
- *Revisión manual diaria*: descartada — es exactamente el trabajo repetitivo
  que un cron reemplaza sin ambigüedad ni riesgo.

**Costo estimado:** despreciable — una consulta SQL diaria + envío de
notificación, sin llamadas a ningún proveedor de IA.

**Riesgo:** duplicar recordatorios si el proceso corre dos veces el mismo
día — mitigado con una marca de idempotencia por `(ticket_id, nivel)`, el
mismo patrón de deduplicación ya implementado y probado en
`etapa4-orquestacion/src/estadoSync.ts` (Etapa 4, Tarea 7).

**Condición de cambio:** si el mensaje dejara de ser un texto fijo (p. ej.
se pidiera personalizar el tono según el historial del responsable, o
resumir el contexto del ticket), ahí empezaría a haber algo que redactar —
y recién ahí un LLM tendría un rol, no antes.
