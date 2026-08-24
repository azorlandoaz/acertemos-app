# Etapa 5 — Estrategia técnica y evaluación — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Producir el documento de decisión IA-vs-tradicional para R-01/R-02/R-03, la definición previa de métricas (commiteada antes que cualquier código de evaluación), un conjunto de referencia ≥50 casos, una suite de evaluación automatizada que reutiliza `ClasificadorService`/`responderConsulta` ya acreditados y falla el pipeline de CI si la calidad cae bajo el umbral, un notebook de ML clásico (línea base + matriz de confusión, sin integrarlo a la solución), la comparación LLM-vs-clásico con datos reales medidos, la revisión escrita de `pr_para_revision.diff`, un estándar de ingeniería propuesto y el README de cierre.

**Architecture:** Nuevo subproyecto `etapa5-estrategia/` (Node/TS, miembro del npm workspace raíz) que importa `etapa2-api` y `etapa3-rag` como paquetes ya acreditados — ningún código de clasificación ni de RAG se reimplementa ni se modifica. La suite de evaluación es un test de Vitest que carga `conjunto_referencia.csv`, ejecuta cada caso contra `ClasificadorService`/`responderConsulta` reales (con `HeuristicProvider`, el único proveedor disponible en este entorno — mismo patrón que la demo de Etapa 4), agrega precisión/latencia/tasa de escalamiento, y usa `expect(...).toBeGreaterThanOrEqual/toBeLessThanOrEqual` contra umbrales transcritos de `metricas_previas.md` — si algo baja del umbral, el test falla y por lo tanto el job de CI falla (ningún runner ni gate custom, Vitest ya hace de gate). El modelo de ML clásico vive aparte como notebook Python (TF-IDF + regresión logística sobre el histórico limpio de Etapa 1, reutilizando `src.limpiar_tickets` de `etapa1-fundamentos` en vez de reimplementar la limpieza) y no se integra al pipeline TypeScript — el Anexo A permite esto explícitamente para la versión de 3 días. El resto de entregables (decisión, comparación, revisión del diff, estándar, README) son documentos Markdown.

**Tech Stack:** TypeScript (Node 20, ESM, `NodeNext`) + Vitest para la suite de evaluación (mismo patrón que Etapas 2-4, sin Express/Zod/Supertest — este subproyecto no expone HTTP). Python 3.9+ + pandas + scikit-learn + matplotlib + Jupyter/nbformat para el notebook (mismo patrón de venv por subproyecto que Etapa 1).

**Spec:** `docs/superpowers/specs/2026-08-22-etapa5-estrategia-evaluacion-design.md` (y el spec maestro `docs/superpowers/specs/2026-08-22-arquitectura-general-design.md`, secciones 4 y 5, para las convenciones transversales).

## Global Constraints

- Interfaz `IAProvider` es la única forma de tocar el modelo de IA (spec maestro §4.1) — la suite de evaluación construye `HeuristicProvider` exactamente como ya lo hace `etapa4-orquestacion/src/scripts/demo.ts` (`new ClasificadorService(new HeuristicProvider(), new HeuristicProvider(), 3000, 1)`); nunca un SDK concreto directamente.
- **Ningún código de `etapa2-api` ni `etapa3-rag` se modifica en este plan** — ambos ya están acreditados; Etapa 5 solo los consume vía sus barrels ya existentes (`ClasificadorService`, `HeuristicProvider` de `etapa2-api`; `responderConsulta`, `registrarMetrica`, `resumenMetricas`, `tokensAproximados` de `etapa3-rag` — ya reexportados, no hace falta tocar ningún `index.ts`).
- **Orden de commits crítico (punto crítico #11 del Anexo A)**: el commit de `metricas_previas.md` (Tarea 1) debe existir en `git log` con fecha/orden ANTERIOR al commit que crea `etapa5-estrategia/src/evaluador.ts` (Tarea 5). Ninguna tarea posterior a la 1 puede reescribir ese commit.
- `responderConsulta` (Etapa 3) exige que exista `etapa3-rag/data/indice_vectorial.json` — generarlo con `npm run ingestar --workspace etapa3-rag` antes de correr cualquier test que lo use (mismo requisito ya documentado en `etapa4-orquestacion/src/scripts/demo.ts`). El archivo está en `.gitignore` — no se commitea, se regenera.
- `responderConsulta` también dispara transitivamente `cargarConfig()` de `etapa3-rag` (exige `AI_PROVIDER_BASE_URL`/`AI_PROVIDER_API_KEY` aunque `HeuristicProvider` no los use) — usar el patrón hermético ya establecido: `beforeAll` + `process.env.X ??= "valor"` (nunca `=`, nunca `vitest.config.ts`'s `test.env`), con imports ESTÁTICOS al inicio del archivo de test (no imports dinámicos dentro de `it()` — ese patrón retrasa el side-effect de `dotenv/config` y ya causó una regresión real en la Tarea 8 de Etapa 4).
- Patrón de singleton perezoso para cualquier config nueva: `let x: T | null = null; function obtener() { if (!x) {...} return x; }` — nunca `cargarConfig()` a nivel de módulo.
- Commits atómicos y frecuentes — nunca un solo commit de entrega (spec maestro §4.5).
- **Prohibido tocar `CHANGELOG.md` en tareas individuales** — se consolida en un único commit al finalizar la rama (convención ya usada en Etapas 2-4).
- Ningún número en `docs/comparacion-enfoques.md`, `etapa5-estrategia/README.md` o la celda de negocio del notebook puede inventarse — todo dato de precisión/latencia/costo debe venir de una ejecución real (la suite de evaluación, `resumenMetricas()`, el notebook ejecutado, o `docs/control-costo-etapa4.md` ya commiteado en Etapa 4) o declararse explícitamente como estimación/supuesto (mismo estándar de honestidad que `docs/control-costo-etapa4.md` y `docs/evidencia-demo-etapa4.log`).
- Esta etapa se evalúa principalmente sobre los documentos y el criterio de decisión, no sobre un sistema productivo (Anexo A, alcance de 3 días) — la suite de evaluación y el notebook deben ser reales y ejecutables, pero ningún task debe inflarse más allá de lo mínimo necesario para eso.

---

### Task 1: Rama y `metricas_previas.md` (commit temprano, punto crítico #11)

**Files:**
- Create: `etapa5-estrategia/metricas_previas.md`

**Interfaces:**
- Consumes: nada (documentación).
- Produces: los umbrales numéricos que la Tarea 5 transcribe literalmente a `etapa5-estrategia/src/umbrales.ts`. Cualquier cambio de umbral en el futuro debe empezar aquí, no en el código.

- [ ] **Step 1: Crear la rama de trabajo**

Esta rama continúa desde la punta de `etapa4-orquestacion` (no desde `master`): en este repo cada etapa vive en su propio PR abierto y `master` todavía no tiene mergeado el código de Etapas 2-4 del que Etapa 5 depende (`ClasificadorService`, `responderConsulta`) — el mismo criterio ya aplicado al crear la rama `etapa4-orquestacion` desde `etapa3-rag`. Si ya estás en un worktree/rama distinto, créala desde ahí:

```bash
git worktree add ../etapa5-estrategia -b etapa5-estrategia
cd ../etapa5-estrategia
```

(O usa la herramienta nativa de worktrees de tu entorno si está disponible, apuntando a la punta actual de `etapa4-orquestacion`.)

- [ ] **Step 2: Escribir `metricas_previas.md`**

`etapa5-estrategia/metricas_previas.md`:
```markdown
# Métricas previas — Etapa 5

**Commiteado antes que cualquier código de la suite de evaluación (punto
crítico #11 del Anexo A) — verificable en `git log` comparando la fecha de
este commit contra el commit que crea `etapa5-estrategia/src/evaluador.ts`.**

## Contexto

El proveedor de IA real (`HttpChatProvider`) no está disponible en este
entorno de evaluación (no hay endpoint LLM corriendo, igual que en Etapas 3
y 4). Todo el sistema opera en modo degradado con `HeuristicProvider`
(clasificación por palabras clave fijas, "embeddings" deterministas de 2
dimensiones sin significado semántico, sin generación real de texto — ver
`etapa2-api/src/ia/HeuristicProvider.ts`). Los umbrales de abajo miden ESTE
modo heurístico, no un LLM real: son deliberadamente modestos porque subirlos
sin evidencia sería medir contra un sistema que no es el que corre hoy.

## Precisión objetivo por categoría (clasificación de solicitudes, R-01)

**≥ 50%** de aciertos en cada categoría del conjunto de referencia que tenga
al menos 3 casos. `HeuristicProvider.clasificar` empareja por palabras clave
fijas — es determinista pero no generaliza a redacciones que no contengan
esas palabras exactas, por eso el umbral no es más alto.

## Precisión objetivo en consultas de política (R-02)

- **Citación (documento correcto)**: ≥ 30%. El "embedding" heurístico
  (`[longitud % 97, suma de códigos de carácter % 97]`) no captura
  significado semántico real — limitación ya documentada en la revisión
  final de Etapa 3 y confirmada en la demo de Etapa 4 (una pregunta sobre
  vacaciones citó por error `POL-TIC-03_Gestion_de_Accesos.pdf`, ver
  `docs/evidencia-demo-etapa4.log`). Un umbral alto aquí sería deshonesto
  sobre lo que el modo heurístico puede hacer.
- **Abstención (detectar correctamente que no hay evidencia)**: ≥ 80%. Es
  una decisión binaria (similitud bajo el umbral configurado) más fácil de
  acertar que elegir el documento correcto entre 5, y es la que más importa
  para el riesgo declarado en R-02 (una respuesta incorrecta sobre montos o
  plazos genera reclamación formal — abstenerse es más seguro que citar mal).

## Latencia p95 aceptable

**≤ 3000 ms** por caso evaluado (clasificación o consulta, medido de punta a
punta dentro del proceso). Se hereda el mismo `timeoutMs` ya usado en
`ClasificadorService` en la demo de Etapa 4
(`etapa4-orquestacion/src/scripts/demo.ts`). Ningún proveedor real hace una
llamada de red en este entorno, así que en la práctica se mide muy por
debajo de este techo — el número es el contrato con un proveedor real
futuro, no lo que hoy se observa.

## Tasa máxima de escalamiento

**≤ 70%** del conjunto de referencia. El conjunto de referencia mezcla
deliberadamente casos ambiguos y de abstención (imitando tickets reales
"Sin clasificar" y preguntas sin política aplicable) — un techo más bajo
penalizaría al sistema por escalar correctamente casos que SÍ deben
escalarse. Es un techo de alerta ("algo empeoró"), no un objetivo a
minimizar a toda costa: en R-02 en particular, escalar es más seguro que
responder mal.

## Condición de revisión de estos umbrales

- Si se reemplaza `HeuristicProvider` por un proveedor de IA real
  (`HttpChatProvider`): se espera que la precisión de citación suba
  sustancialmente y el umbral debería subir **con evidencia real de esa
  corrida**, no antes.
- Si el conjunto de referencia (`conjunto_referencia.csv`) crece más allá de
  50 casos y cambia la composición por categoría, recalcular contra el
  nuevo tamaño de muestra.
```

- [ ] **Step 3: Commit**

```bash
git add etapa5-estrategia/metricas_previas.md
git commit -m "docs(etapa5): metricas previas de evaluacion, commiteadas antes de la suite (punto critico 11)"
```

Verificar el orden queda registrado:
```bash
git log --oneline -- etapa5-estrategia/metricas_previas.md
```
Expected: un único commit, el que acabas de crear. Este será el commit más antiguo relacionado con evaluación en toda la rama — ninguna tarea posterior debe tener fecha anterior a este commit.

---

### Task 2: Ampliar el conjunto de referencia a ≥50 casos

**Files:**
- Create: `etapa5-estrategia/conjunto_referencia.csv` (parte de `materiales/n5/plantilla_conjunto_referencia.csv`, ya tiene 4 filas)

**Interfaces:**
- Consumes: `materiales/n5/plantilla_conjunto_referencia.csv` (formato de columnas), `materiales/datos/tickets_historicos.csv` (fuente de casos de clasificación), `etapa3-rag/data/indice_vectorial.json` (fuente de casos de consulta de política, generar con `npm run ingestar --workspace etapa3-rag` si no existe — cada entrada trae `documento`, `seccion`, `texto`), `materiales/politicas/*.pdf` (para verificar el contenido citado si hace falta más contexto que el fragmento indexado).
- Produces: `etapa5-estrategia/conjunto_referencia.csv` con columnas `id_caso,pregunta_o_texto,respuesta_o_categoria_esperada,documento_fuente,seccion_fuente,observacion` — consumido por la Tarea 4 (parser) y la Tarea 5 (suite).

**Formato de fila por tipo de caso** (la Tarea 4 detecta el tipo así — mantener esta regla en todas las filas nuevas):
- **Caso de clasificación**: `documento_fuente` y `seccion_fuente` vacíos; `respuesta_o_categoria_esperada` es la categoría esperada (p. ej. `Hardware`).
- **Caso de consulta de política con evidencia**: `documento_fuente`/`seccion_fuente` llenos con el nombre exacto del PDF y la sección; `respuesta_o_categoria_esperada` es la respuesta esperada en texto libre.
- **Caso de abstención**: `respuesta_o_categoria_esperada` es literalmente el string `SIN EVIDENCIA EN LOS DOCUMENTOS` (mismo valor que ya usa `GS-003` en la plantilla); `documento_fuente`/`seccion_fuente` vacíos.

- [ ] **Step 1: Copiar la plantilla como punto de partida**

```bash
cp materiales/n5/plantilla_conjunto_referencia.csv etapa5-estrategia/conjunto_referencia.csv
```

Conserva las 4 filas `GS-001`..`GS-004` tal como están (ya son casos válidos y `GS-003` ya es el caso de abstención de referencia usado en la suite de Etapa 3). Reemplaza la fila `GS-005` (que hoy solo dice "Complete hasta al menos 50 casos") y sigue agregando filas `GS-005`, `GS-006`, ... hasta llegar a al menos 50 filas de datos (sin contar el encabezado).

- [ ] **Step 2: Agregar ≥23 casos de clasificación reales**

Fuente: `materiales/datos/tickets_historicos.csv` (2000 filas reales, columnas `id,fecha_creacion,fecha_cierre,area,categoria,prioridad,canal,solicitante,asunto,descripcion,estado,reaperturas`).

Metodología:
- Elige al menos 15 tickets cuyo `asunto`/`descripcion` contenga alguna de las palabras clave que `HeuristicProvider` reconoce (`etapa2-api/src/ia/HeuristicProvider.ts`: Vacaciones, Hardware, Software, "Gestión de accesos", Viáticos, Conectividad, Compras, Incidentes) — para tener señal real medible por categoría. Usa `asunto + " " + descripcion` como `pregunta_o_texto` (columna reutilizada también para texto de clasificación, no solo preguntas) y la categoría de `HeuristicProvider` que le corresponde como `respuesta_o_categoria_esperada` (no la `categoria` cruda del CSV, que no está estandarizada — ver `id_caso` con `observacion: "categoria cruda: <valor original>"` si quieres dejar trazabilidad).
- Agrega al menos 5 tickets con texto ambiguo o de una categoría fuera del vocabulario de `HeuristicProvider` (p. ej. `NOMINA`, `CAPACITACION`, `OTROS` del histórico), con `respuesta_o_categoria_esperada` = `Sin clasificar` — son los casos negativos honestos que documentan el límite real del heurístico.
- Deduplica por `id_caso` (usa el `id` del ticket como sufijo, p. ej. `GS-010-TK-00183`, para trazabilidad hacia el histórico).

- [ ] **Step 3: Agregar ≥23 casos de consulta de política reales**

Fuente: `etapa3-rag/data/indice_vectorial.json` (generar primero si no existe: `npm run ingestar --workspace etapa3-rag`, requiere `AI_PROVIDER_BASE_URL`/`AI_PROVIDER_API_KEY` en el entorno aunque no se usen — copia `etapa3-rag/.env.example` a `etapa3-rag/.env` si hace falta). Cada entrada del índice tiene `{ documento, seccion, texto, embedding }` — son los fragmentos reales de los 5 PDF de `materiales/politicas/`.

Metodología:
- Escribe al menos 18 preguntas en lenguaje natural cuya respuesta esté en algún fragmento del índice, usando el `documento` y `seccion` reales de ese fragmento como `documento_fuente`/`seccion_fuente`, y una síntesis del `texto` del fragmento como `respuesta_o_categoria_esperada`. Cubre los 5 documentos (`POL-ADM-04_Viaticos.pdf`, `POL-GTH-01_Vacaciones.pdf`, `POL-TIC-02_Activos_Tecnologicos.pdf`, `POL-TIC-03_Gestion_de_Accesos.pdf`, `POL-TIC-05_Gestion_de_Incidentes.pdf`) con al menos 2 preguntas cada uno.
- Agrega al menos 5 casos de abstención adicionales (además de `GS-003`): preguntas sobre temas plausibles pero que NO están cubiertos por ninguna política real (verifica que ningún fragmento del índice los mencione), con `respuesta_o_categoria_esperada` = `SIN EVIDENCIA EN LOS DOCUMENTOS`.

- [ ] **Step 4: Verificación manual de conteo y formato**

```bash
awk -F',' 'END{print NR-1}' etapa5-estrategia/conjunto_referencia.csv
```
Expected: ≥ 50.

```bash
grep -c "Complete hasta" etapa5-estrategia/conjunto_referencia.csv
```
Expected: 0 (ninguna fila placeholder de la plantilla original quedó sin completar).

- [ ] **Step 5: Commit**

```bash
git add etapa5-estrategia/conjunto_referencia.csv
git commit -m "data(etapa5): ampliar conjunto de referencia a >=50 casos etiquetados"
```

---

### Task 3: Documento de decisión R-01/R-02/R-03

**Files:**
- Create: `docs/decision-requerimientos.md`

**Interfaces:**
- Consumes: `materiales/n5/requerimientos_negocio.md`.
- Produces: nada (documentación) — referenciado por `docs/comparacion-enfoques.md` (Tarea 7) y `etapa5-estrategia/README.md` (Tarea 10).

- [ ] **Step 1: Escribir el documento de decisión**

`docs/decision-requerimientos.md`:
```markdown
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
```

- [ ] **Step 2: Commit**

```bash
git add docs/decision-requerimientos.md
git commit -m "docs(etapa5): documento de decision IA vs automatizacion tradicional para R-01/R-02/R-03"
```

---

### Task 4: Scaffolding de `etapa5-estrategia` (Node/TS) + parser del conjunto de referencia

**Files:**
- Modify: `package.json` (raíz — agregar `etapa5-estrategia` a `workspaces`)
- Create: `etapa5-estrategia/package.json`
- Create: `etapa5-estrategia/tsconfig.json`
- Create: `etapa5-estrategia/vitest.config.ts`
- Create: `etapa5-estrategia/.gitignore`
- Create: `etapa5-estrategia/src/conjuntoReferencia.ts`
- Test: `etapa5-estrategia/tests/conjuntoReferencia.test.ts`

**Interfaces:**
- Consumes: `etapa5-estrategia/conjunto_referencia.csv` (Tarea 2, ya committeado con ≥50 filas).
- Produces: `parsearCSV(contenido: string): string[][]`, `interface CasoReferencia { idCaso, preguntaOTexto, respuestaOCategoriaEsperada, documentoFuente, seccionFuente, observacion }`, `tipoDeCaso(caso: CasoReferencia): "clasificacion" | "consulta_politica"`, `validarCaso(caso: CasoReferencia): string[]`, `cargarConjuntoReferencia(ruta: string): CasoReferencia[]` — todo usado por la Tarea 5.

- [ ] **Step 1: Agregar el workspace a la raíz**

En `package.json` (raíz):
```json
{
  "name": "mesa-ayuda-inteligente",
  "private": true,
  "workspaces": ["etapa2-api", "etapa3-rag", "etapa4-orquestacion", "etapa5-estrategia"]
}
```

- [ ] **Step 2: Scaffolding del paquete**

`etapa5-estrategia/package.json`:
```json
{
  "name": "etapa5-estrategia",
  "version": "1.0.0",
  "type": "module",
  "scripts": {
    "build": "tsc -p tsconfig.json",
    "test": "vitest run"
  },
  "dependencies": {
    "etapa2-api": "*",
    "etapa3-rag": "*"
  },
  "devDependencies": {
    "@types/node": "^20.14.15",
    "typescript": "^5.5.4",
    "vitest": "^2.0.5"
  }
}
```

`etapa5-estrategia/tsconfig.json` (idéntico al patrón de `etapa4-orquestacion`):
```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "NodeNext",
    "moduleResolution": "NodeNext",
    "outDir": "dist",
    "rootDir": "src",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "resolveJsonModule": true
  },
  "include": ["src"]
}
```

`etapa5-estrategia/vitest.config.ts`:
```ts
import { defineConfig } from "vitest/config";

export default defineConfig({
  test: { environment: "node", testTimeout: 30000 },
});
```

`etapa5-estrategia/.gitignore`:
```
node_modules/
dist/
resultados_evaluacion.json
```

```bash
npm install
```

- [ ] **Step 3: Write the failing tests for el parser de CSV**

`etapa5-estrategia/tests/conjuntoReferencia.test.ts`:
```ts
import { describe, expect, it } from "vitest";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  cargarConjuntoReferencia,
  parsearCSV,
  tipoDeCaso,
  validarCaso,
  type CasoReferencia,
} from "../src/conjuntoReferencia.js";

describe("parsearCSV", () => {
  it("separa filas y columnas simples por coma y salto de línea", () => {
    const resultado = parsearCSV("a,b,c\n1,2,3\n");
    expect(resultado).toEqual([
      ["a", "b", "c"],
      ["1", "2", "3"],
    ]);
  });

  it("respeta comas dentro de campos entre comillas dobles", () => {
    const resultado = parsearCSV('id,texto\nGS-001,"Hola, mundo"\n');
    expect(resultado).toEqual([
      ["id", "texto"],
      ["GS-001", "Hola, mundo"],
    ]);
  });

  it("interpreta comillas dobles escapadas ('\"\"') como una comilla literal", () => {
    const resultado = parsearCSV('id,texto\nGS-001,"El dijo ""hola"""\n');
    expect(resultado).toEqual([
      ["id", "texto"],
      ["GS-001", 'El dijo "hola"'],
    ]);
  });
});

describe("tipoDeCaso", () => {
  const base: CasoReferencia = {
    idCaso: "X",
    preguntaOTexto: "texto",
    respuestaOCategoriaEsperada: "Hardware",
    documentoFuente: "",
    seccionFuente: "",
    observacion: "",
  };

  it("es 'clasificacion' cuando no hay documento_fuente y la respuesta no es el sentinel de abstencion", () => {
    expect(tipoDeCaso(base)).toBe("clasificacion");
  });

  it("es 'consulta_politica' cuando hay documento_fuente", () => {
    expect(tipoDeCaso({ ...base, documentoFuente: "POL-GTH-01_Vacaciones.pdf", seccionFuente: "3.1" })).toBe(
      "consulta_politica"
    );
  });

  it("es 'consulta_politica' para el sentinel de abstencion aunque documento_fuente este vacio", () => {
    expect(tipoDeCaso({ ...base, respuestaOCategoriaEsperada: "SIN EVIDENCIA EN LOS DOCUMENTOS" })).toBe(
      "consulta_politica"
    );
  });
});

describe("validarCaso", () => {
  it("no reporta errores para un caso de clasificacion completo", () => {
    expect(
      validarCaso({
        idCaso: "X",
        preguntaOTexto: "texto",
        respuestaOCategoriaEsperada: "Hardware",
        documentoFuente: "",
        seccionFuente: "",
        observacion: "",
      })
    ).toEqual([]);
  });

  it("reporta error si falta documento_fuente en un caso de politica sin abstencion", () => {
    const errores = validarCaso({
      idCaso: "X",
      preguntaOTexto: "texto",
      respuestaOCategoriaEsperada: "15 dias",
      documentoFuente: "",
      seccionFuente: "",
      observacion: "",
    });
    expect(errores.length).toBeGreaterThan(0);
  });
});

describe("cargarConjuntoReferencia (integracion con el archivo real committeado)", () => {
  it("carga al menos 50 casos validos desde etapa5-estrategia/conjunto_referencia.csv", () => {
    const aqui = path.dirname(fileURLToPath(import.meta.url));
    const ruta = path.resolve(aqui, "../conjunto_referencia.csv");
    const casos = cargarConjuntoReferencia(ruta);

    expect(casos.length).toBeGreaterThanOrEqual(50);

    const todosLosErrores = casos.flatMap((c) => validarCaso(c));
    expect(todosLosErrores, `errores de validacion: ${todosLosErrores.join("; ")}`).toEqual([]);
  });
});
```

- [ ] **Step 4: Run tests to verify they fail**

```bash
npx vitest run
```
Expected: FAIL — `../src/conjuntoReferencia.js` no existe todavía.

- [ ] **Step 5: Implementar `conjuntoReferencia.ts`**

`etapa5-estrategia/src/conjuntoReferencia.ts`:
```ts
import { readFileSync } from "node:fs";

export interface CasoReferencia {
  idCaso: string;
  preguntaOTexto: string;
  respuestaOCategoriaEsperada: string;
  documentoFuente: string;
  seccionFuente: string;
  observacion: string;
}

export type TipoCaso = "clasificacion" | "consulta_politica";

const SENTINEL_ABSTENCION = "SIN EVIDENCIA EN LOS DOCUMENTOS";

/** Parser CSV mínimo (RFC4180: comillas dobles, comas y saltos de línea
 * dentro de campos entre comillas, "" como comilla escapada) — no se usa
 * una dependencia externa porque el resto del monorepo tampoco tiene una
 * librería CSV compartida y el formato de este archivo es simple. */
export function parsearCSV(contenido: string): string[][] {
  const filas: string[][] = [];
  let fila: string[] = [];
  let campo = "";
  let entreComillas = false;
  const texto = contenido.replace(/\r\n/g, "\n");

  for (let i = 0; i < texto.length; i++) {
    const c = texto[i];
    if (entreComillas) {
      if (c === '"') {
        if (texto[i + 1] === '"') {
          campo += '"';
          i++;
        } else {
          entreComillas = false;
        }
      } else {
        campo += c;
      }
    } else if (c === '"') {
      entreComillas = true;
    } else if (c === ",") {
      fila.push(campo);
      campo = "";
    } else if (c === "\n") {
      fila.push(campo);
      filas.push(fila);
      fila = [];
      campo = "";
    } else {
      campo += c;
    }
  }
  if (campo !== "" || fila.length > 0) {
    fila.push(campo);
    filas.push(fila);
  }
  return filas;
}

/** Un caso de política (incluida abstención) se distingue de uno de
 * clasificación por tener documento_fuente lleno, O por usar el sentinel de
 * abstención en respuesta_o_categoria_esperada (caso GS-003 y análogos,
 * donde documento_fuente queda vacío a propósito). */
export function tipoDeCaso(caso: CasoReferencia): TipoCaso {
  if (caso.respuestaOCategoriaEsperada === SENTINEL_ABSTENCION || caso.documentoFuente !== "") {
    return "consulta_politica";
  }
  return "clasificacion";
}

export function validarCaso(caso: CasoReferencia): string[] {
  const errores: string[] = [];
  if (!caso.idCaso) errores.push("id_caso vacio");
  if (!caso.preguntaOTexto) errores.push(`${caso.idCaso}: pregunta_o_texto vacio`);
  if (!caso.respuestaOCategoriaEsperada) errores.push(`${caso.idCaso}: respuesta_o_categoria_esperada vacio`);

  const tipo = tipoDeCaso(caso);
  const esAbstencion = caso.respuestaOCategoriaEsperada === SENTINEL_ABSTENCION;
  if (tipo === "consulta_politica" && !esAbstencion) {
    if (!caso.documentoFuente) errores.push(`${caso.idCaso}: documento_fuente vacio en caso de politica sin abstencion`);
    if (!caso.seccionFuente) errores.push(`${caso.idCaso}: seccion_fuente vacio en caso de politica sin abstencion`);
  }
  return errores;
}

const COLUMNAS = [
  "id_caso",
  "pregunta_o_texto",
  "respuesta_o_categoria_esperada",
  "documento_fuente",
  "seccion_fuente",
  "observacion",
] as const;

export function cargarConjuntoReferencia(ruta: string): CasoReferencia[] {
  const contenido = readFileSync(ruta, "utf-8");
  const filas = parsearCSV(contenido).filter((f) => f.some((campo) => campo.trim() !== ""));
  const [encabezado, ...datos] = filas;

  COLUMNAS.forEach((columna, indice) => {
    if (encabezado[indice] !== columna) {
      throw new Error(`Encabezado inesperado en columna ${indice}: esperaba "${columna}", encontro "${encabezado[indice]}"`);
    }
  });

  return datos.map((fila) => ({
    idCaso: fila[0] ?? "",
    preguntaOTexto: fila[1] ?? "",
    respuestaOCategoriaEsperada: fila[2] ?? "",
    documentoFuente: fila[3] ?? "",
    seccionFuente: fila[4] ?? "",
    observacion: fila[5] ?? "",
  }));
}
```

- [ ] **Step 6: Run tests to verify they pass**

```bash
npx vitest run
```
Expected: todos los tests PASS, incluida la carga real de `conjunto_referencia.csv` con ≥50 casos válidos. Si el test de integración falla por errores de validación, vuelve a la Tarea 2 y corrige las filas que el mensaje de error señala — no relajes `validarCaso` para que pase.

- [ ] **Step 7: Typecheck**

```bash
npx tsc -p tsconfig.json --noEmit
```
Expected: sin errores.

- [ ] **Step 8: Commit**

```bash
git add package.json etapa5-estrategia/package.json etapa5-estrategia/tsconfig.json etapa5-estrategia/vitest.config.ts etapa5-estrategia/.gitignore etapa5-estrategia/src/conjuntoReferencia.ts etapa5-estrategia/tests/conjuntoReferencia.test.ts
git commit -m "feat(etapa5): scaffolding del paquete y parser/loader del conjunto de referencia"
```

---

### Task 5: Suite de evaluación automatizada (motor de métricas + gate)

**Files:**
- Create: `etapa5-estrategia/src/umbrales.ts`
- Create: `etapa5-estrategia/src/evaluador.ts`
- Test: `etapa5-estrategia/tests/evaluador.test.ts`
- Create: `docs/evidencia-gate-etapa5.log`

**Interfaces:**
- Consumes: `CasoReferencia`, `tipoDeCaso`, `cargarConjuntoReferencia` (Tarea 4); `ClasificadorService`, `HeuristicProvider` de `etapa2-api`; `responderConsulta` de `etapa3-rag`; umbrales de `metricas_previas.md` (Tarea 1, transcritos aquí).
- Produces: `evaluarCaso`, `evaluarConjunto`, `resumirEvaluacion`, `UMBRALES` — y como artefacto de ejecución (no commiteado), `etapa5-estrategia/resultados_evaluacion.json`, consumido por la Tarea 7 (comparación) leyendo su contenido tras correr la suite.

- [ ] **Step 1: Write the failing tests para `resumirEvaluacion` (unitarios, con fixtures sintéticos)**

`etapa5-estrategia/tests/evaluador.test.ts`:
```ts
import { beforeAll, describe, expect, it } from "vitest";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { existsSync, writeFileSync } from "node:fs";
import { cargarConjuntoReferencia, type CasoReferencia } from "../src/conjuntoReferencia.js";
import { evaluarConjunto, resumirEvaluacion, type ResultadoCaso } from "../src/evaluador.js";
import { UMBRALES } from "../src/umbrales.js";

beforeAll(() => {
  // etapa3-rag/src/config/env.ts exige estas variables aunque
  // HeuristicProvider no las use (falla rapido intencional, ver Etapa 3).
  // Se fijan valores dummy sin sobrescribir un .env real si existe.
  process.env.AI_PROVIDER_BASE_URL ??= "http://localhost:11434/v1";
  process.env.AI_PROVIDER_API_KEY ??= "test-key";
});

describe("resumirEvaluacion (con datos sinteticos)", () => {
  const casos: CasoReferencia[] = [
    { idCaso: "A", preguntaOTexto: "x", respuestaOCategoriaEsperada: "Hardware", documentoFuente: "", seccionFuente: "", observacion: "" },
    { idCaso: "B", preguntaOTexto: "y", respuestaOCategoriaEsperada: "Hardware", documentoFuente: "", seccionFuente: "", observacion: "" },
    { idCaso: "C", preguntaOTexto: "z", respuestaOCategoriaEsperada: "15 dias", documentoFuente: "POL-GTH-01_Vacaciones.pdf", seccionFuente: "3.1", observacion: "" },
    { idCaso: "D", preguntaOTexto: "w", respuestaOCategoriaEsperada: "SIN EVIDENCIA EN LOS DOCUMENTOS", documentoFuente: "", seccionFuente: "", observacion: "" },
  ];

  const resultados: ResultadoCaso[] = [
    { idCaso: "A", tipo: "clasificacion", acierto: true, latenciaMs: 10, escalado: false },
    { idCaso: "B", tipo: "clasificacion", acierto: false, latenciaMs: 20, escalado: true },
    { idCaso: "C", tipo: "consulta_politica", acierto: true, latenciaMs: 30, escalado: false },
    { idCaso: "D", tipo: "consulta_politica", acierto: true, latenciaMs: 40, escalado: true },
  ];

  it("agrupa precision de clasificacion por categoria esperada", () => {
    const resumen = resumirEvaluacion(resultados, casos);
    expect(resumen.precisionPorCategoria["Hardware"]).toEqual({ total: 2, aciertos: 1, precision: 0.5 });
  });

  it("separa precision de citacion (sin abstencion) de precision de abstencion", () => {
    const resumen = resumirEvaluacion(resultados, casos);
    expect(resumen.precisionCitacion).toEqual({ total: 1, aciertos: 1, precision: 1 });
    expect(resumen.precisionAbstencion).toEqual({ total: 1, aciertos: 1, precision: 1 });
  });

  it("calcula tasa de escalamiento sobre el total de casos", () => {
    const resumen = resumirEvaluacion(resultados, casos);
    expect(resumen.tasaEscalamiento).toBe(2 / 4);
  });

  it("calcula latencia p95 sobre todas las latencias registradas", () => {
    const resumen = resumirEvaluacion(resultados, casos);
    expect(resumen.latenciaP95).toBe(40);
  });
});

describe("suite de evaluacion contra conjunto_referencia.csv (gate real)", () => {
  it("cumple los umbrales minimos definidos en metricas_previas.md", async () => {
    const aqui = path.dirname(fileURLToPath(import.meta.url));
    const rutaIndice = path.resolve(aqui, "../../etapa3-rag/data/indice_vectorial.json");
    if (!existsSync(rutaIndice)) {
      throw new Error(
        "Falta etapa3-rag/data/indice_vectorial.json. Correr primero: npm run ingestar --workspace etapa3-rag"
      );
    }

    const casos = cargarConjuntoReferencia(path.resolve(aqui, "../conjunto_referencia.csv"));
    const resultados = await evaluarConjunto(casos, UMBRALES.umbralEscalamientoClasificacion);
    const resumen = resumirEvaluacion(resultados, casos);

    writeFileSync(path.resolve(aqui, "../resultados_evaluacion.json"), JSON.stringify(resumen, null, 2));

    for (const [categoria, datos] of Object.entries(resumen.precisionPorCategoria)) {
      if (datos.total >= 3) {
        expect(
          datos.precision,
          `precision en categoria "${categoria}" (${datos.aciertos}/${datos.total})`
        ).toBeGreaterThanOrEqual(UMBRALES.precisionMinimaPorCategoria);
      }
    }
    expect(resumen.precisionAbstencion.precision, "precision de abstencion").toBeGreaterThanOrEqual(
      UMBRALES.precisionMinimaAbstencion
    );
    expect(resumen.precisionCitacion.precision, "precision de citacion").toBeGreaterThanOrEqual(
      UMBRALES.precisionMinimaCitacion
    );
    expect(resumen.latenciaP95, "latencia p95").toBeLessThanOrEqual(UMBRALES.latenciaP95MaximaMs);
    expect(resumen.tasaEscalamiento, "tasa de escalamiento").toBeLessThanOrEqual(UMBRALES.tasaEscalamientoMaxima);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
npx vitest run
```
Expected: FAIL — `../src/evaluador.js` no existe y `../src/umbrales.js` no existe.

- [ ] **Step 3: Implementar `umbrales.ts`**

`etapa5-estrategia/src/umbrales.ts`:
```ts
/** Umbrales transcritos literalmente de metricas_previas.md (commiteado
 * antes que este archivo — ver git log, punto critico #11 del Anexo A).
 * Cualquier cambio de umbral empieza en ese documento, no aqui. */
export const UMBRALES = {
  precisionMinimaPorCategoria: 0.5,
  precisionMinimaCitacion: 0.3,
  precisionMinimaAbstencion: 0.8,
  latenciaP95MaximaMs: 3000,
  tasaEscalamientoMaxima: 0.7,
  umbralEscalamientoClasificacion: 0.4,
} as const;
```

- [ ] **Step 4: Implementar `evaluador.ts`**

`etapa5-estrategia/src/evaluador.ts`:
```ts
import { ClasificadorService, HeuristicProvider } from "etapa2-api";
import { responderConsulta } from "etapa3-rag";
import { tipoDeCaso, type CasoReferencia, type TipoCaso } from "./conjuntoReferencia.js";

export interface ResultadoCaso {
  idCaso: string;
  tipo: TipoCaso;
  acierto: boolean;
  latenciaMs: number;
  escalado: boolean;
}

const SENTINEL_ABSTENCION = "SIN EVIDENCIA EN LOS DOCUMENTOS";

export async function evaluarCaso(
  caso: CasoReferencia,
  clasificador: ClasificadorService,
  umbralEscalamiento: number
): Promise<ResultadoCaso> {
  const tipo = tipoDeCaso(caso);
  const inicio = Date.now();

  if (tipo === "clasificacion") {
    const resultado = await clasificador.clasificar(caso.preguntaOTexto);
    return {
      idCaso: caso.idCaso,
      tipo,
      acierto: resultado.categoria === caso.respuestaOCategoriaEsperada,
      latenciaMs: Date.now() - inicio,
      escalado: resultado.confianza < umbralEscalamiento,
    };
  }

  const resultado = await responderConsulta(caso.preguntaOTexto);
  const esperaAbstencion = caso.respuestaOCategoriaEsperada === SENTINEL_ABSTENCION;
  const acierto = esperaAbstencion
    ? resultado.citas.length === 0
    : resultado.citas[0]?.documento === caso.documentoFuente;

  return {
    idCaso: caso.idCaso,
    tipo,
    acierto,
    latenciaMs: Date.now() - inicio,
    escalado: resultado.citas.length === 0,
  };
}

/** Secuencial (no Promise.all): cada caso mide su propia latencia de punta
 * a punta como lo haria un proceso real que atiende un caso a la vez;
 * HeuristicProvider no tiene estado compartido, asi que la eleccion es de
 * claridad de medicion, no de correctitud. */
export async function evaluarConjunto(
  casos: CasoReferencia[],
  umbralEscalamiento: number
): Promise<ResultadoCaso[]> {
  const clasificador = new ClasificadorService(new HeuristicProvider(), new HeuristicProvider(), 3000, 1);
  const resultados: ResultadoCaso[] = [];
  for (const caso of casos) {
    resultados.push(await evaluarCaso(caso, clasificador, umbralEscalamiento));
  }
  return resultados;
}

export interface ResumenEvaluacion {
  precisionPorCategoria: Record<string, { total: number; aciertos: number; precision: number }>;
  precisionCitacion: { total: number; aciertos: number; precision: number };
  precisionAbstencion: { total: number; aciertos: number; precision: number };
  latenciaP95: number;
  tasaEscalamiento: number;
  totalCasos: number;
}

function percentil(valores: number[], p: number): number {
  if (valores.length === 0) return 0;
  const ordenados = [...valores].sort((a, b) => a - b);
  const indice = Math.min(ordenados.length - 1, Math.ceil((p / 100) * ordenados.length) - 1);
  return ordenados[Math.max(0, indice)];
}

export function resumirEvaluacion(resultados: ResultadoCaso[], casos: CasoReferencia[]): ResumenEvaluacion {
  const porId = new Map(casos.map((c) => [c.idCaso, c]));
  const precisionPorCategoria: ResumenEvaluacion["precisionPorCategoria"] = {};
  let citacionTotal = 0;
  let citacionAciertos = 0;
  let abstencionTotal = 0;
  let abstencionAciertos = 0;

  for (const r of resultados) {
    const caso = porId.get(r.idCaso);
    if (!caso) continue;

    if (r.tipo === "clasificacion") {
      const categoria = caso.respuestaOCategoriaEsperada;
      const entrada = precisionPorCategoria[categoria] ?? { total: 0, aciertos: 0, precision: 0 };
      entrada.total += 1;
      if (r.acierto) entrada.aciertos += 1;
      entrada.precision = entrada.aciertos / entrada.total;
      precisionPorCategoria[categoria] = entrada;
    } else {
      const esperaAbstencion = caso.respuestaOCategoriaEsperada === SENTINEL_ABSTENCION;
      if (esperaAbstencion) {
        abstencionTotal += 1;
        if (r.acierto) abstencionAciertos += 1;
      } else {
        citacionTotal += 1;
        if (r.acierto) citacionAciertos += 1;
      }
    }
  }

  const latencias = resultados.map((r) => r.latenciaMs);
  const escalados = resultados.filter((r) => r.escalado).length;

  return {
    precisionPorCategoria,
    precisionCitacion: {
      total: citacionTotal,
      aciertos: citacionAciertos,
      precision: citacionTotal === 0 ? 1 : citacionAciertos / citacionTotal,
    },
    precisionAbstencion: {
      total: abstencionTotal,
      aciertos: abstencionAciertos,
      precision: abstencionTotal === 0 ? 1 : abstencionAciertos / abstencionTotal,
    },
    latenciaP95: percentil(latencias, 95),
    tasaEscalamiento: resultados.length === 0 ? 0 : escalados / resultados.length,
    totalCasos: resultados.length,
  };
}
```

- [ ] **Step 5: Generar el índice vectorial real y correr la suite**

```bash
npm run ingestar --workspace etapa3-rag
npx vitest run
```
Expected: todos los tests PASS, incluido el test de gate real contra `conjunto_referencia.csv`. Si algún umbral falla, NO relajes el umbral en `umbrales.ts` sin antes actualizar `metricas_previas.md` con la misma justificación — o corrige la composición de `conjunto_referencia.csv` (Tarea 2) si el caso etiquetado está mal construido.

- [ ] **Step 6: Typecheck**

```bash
npx tsc -p tsconfig.json --noEmit
```

- [ ] **Step 7: Evidencia de que el gate realmente falla ante una regresión (Definición de hecho de la etapa)**

Edita temporalmente `etapa5-estrategia/src/umbrales.ts`, subiendo `precisionMinimaPorCategoria` a un valor inalcanzable:
```ts
  precisionMinimaPorCategoria: 0.99,
```

Corre la suite y guarda la salida completa (incluida la falla) en un archivo de evidencia:
```bash
npx vitest run 2>&1 | tee /tmp/gate-etapa5-fallo.txt
```
Expected: el test de gate FALLA, mostrando qué categoría(s) no alcanzan 0.99.

Revierte el cambio (vuelve `precisionMinimaPorCategoria` a `0.5`) y corre de nuevo para confirmar que vuelve a pasar:
```bash
npx vitest run 2>&1 | tee /tmp/gate-etapa5-exito.txt
```
Expected: PASS.

Crea `docs/evidencia-gate-etapa5.log` combinando ambas corridas con un encabezado explicando cada una:
```bash
{
  echo "=== Corrida 1: umbral precisionMinimaPorCategoria bajado a proposito a 0.99 (debe fallar) ==="
  cat /tmp/gate-etapa5-fallo.txt
  echo
  echo "=== Corrida 2: umbral restaurado a 0.5, valor real de metricas_previas.md (debe pasar) ==="
  cat /tmp/gate-etapa5-exito.txt
} > docs/evidencia-gate-etapa5.log
```

Verifica que `git diff etapa5-estrategia/src/umbrales.ts` no muestre cambios (el valor quedó restaurado) antes de continuar.

- [ ] **Step 8: Commit**

```bash
git add etapa5-estrategia/src/umbrales.ts etapa5-estrategia/src/evaluador.ts etapa5-estrategia/tests/evaluador.test.ts docs/evidencia-gate-etapa5.log
git commit -m "feat(etapa5): suite de evaluacion automatizada con gate de umbrales, evidencia de fallo intencional"
```

---

### Task 6: Notebook de ML clásico (línea base + matriz de confusión)

**Files:**
- Create: `etapa5-estrategia/requirements.txt`
- Create: `etapa5-estrategia/_build_notebook.py`
- Create: `etapa5-estrategia/notebook_ml_clasico.ipynb` (generado por el script anterior, luego editado con hallazgos reales)

**Interfaces:**
- Consumes: `src.limpiar_tickets.limpiar` de `etapa1-fundamentos` (reutilizado, no reimplementado), `materiales/datos/tickets_historicos.csv`.
- Produces: nada consumido por otra tarea de este plan — es el entregable de "modelo de ML clásico" del rubro de la etapa, referenciado por `docs/comparacion-enfoques.md` (Tarea 7) y `etapa5-estrategia/README.md` (Tarea 10).

- [ ] **Step 1: Crear el entorno Python del subproyecto**

`etapa5-estrategia/requirements.txt`:
```
pandas>=1.5,<3
scikit-learn>=1.3,<2
matplotlib>=3.7,<4
jupyter>=1.0,<2
nbformat>=5.9,<6
nbconvert>=7.0,<8
```

```bash
cd etapa5-estrategia
python -m venv .venv
# Windows: .venv\Scripts\activate    |    Linux/Mac: source .venv/bin/activate
pip install -r requirements.txt
```

- [ ] **Step 2: Escribir el script que construye el notebook**

`etapa5-estrategia/_build_notebook.py`:
```python
"""Construye notebook_ml_clasico.ipynb celda por celda. Se mantiene
committeado junto al .ipynb para que el notebook sea reproducible sin
depender de edicion manual del JSON crudo del formato .ipynb."""
import nbformat as nbf

nb = nbf.v4.new_notebook()
celdas = []

celdas.append(nbf.v4.new_markdown_cell(
"""# Modelo de ML clásico — R-01 Clasificación de solicitudes entrantes

Línea base con TF-IDF + Regresión Logística sobre el histórico de tickets
limpio (salida de Etapa 1, reutilizando `src.limpiar_tickets` en vez de
reimplementar la limpieza). Este notebook no se integra al pipeline
TypeScript — el Anexo A permite entregar el modelo de ML clásico como
notebook exploratorio para la versión de 3 días (ver
`docs/superpowers/specs/2026-08-22-etapa5-estrategia-evaluacion-design.md`,
sección 1). Comparación de costo/latencia/precisión contra el enfoque LLM
en `docs/comparacion-enfoques.md`."""
))

celdas.append(nbf.v4.new_code_cell(
"""import sys, pathlib
sys.path.insert(0, str(pathlib.Path("../etapa1-fundamentos").resolve()))
import csv
from src.limpiar_tickets import limpiar

with open("../materiales/datos/tickets_historicos.csv", encoding="utf-8") as fh:
    tickets_crudos = list(csv.DictReader(fh))

validos, descartados, duplicados = limpiar(tickets_crudos)
print(f"Validos: {len(validos)}  Descartados: {len(descartados)}  Duplicados eliminados: {duplicados}")"""
))

celdas.append(nbf.v4.new_code_cell(
"""import pandas as pd

df = pd.DataFrame(validos)
df["texto"] = df["asunto"].fillna("") + " " + df["descripcion"].fillna("")
conteo = df["categoria"].value_counts()
print(conteo)"""
))

celdas.append(nbf.v4.new_code_cell(
"""# Se excluyen categorias con menos de 5 casos: son demasiado pocas para
# entrenar/evaluar de forma confiable, y en produccion ese volumen bajo
# justificaria una regla manual antes que un modelo entrenado.
categorias_validas = conteo[conteo >= 5].index
df_filtrado = df[df["categoria"].isin(categorias_validas)].copy()
print(f"Categorias usadas: {len(categorias_validas)} de {len(conteo)} (excluidas por <5 casos: {len(conteo) - len(categorias_validas)})")
print(f"Filas para entrenar/evaluar: {len(df_filtrado)} de {len(df)}")"""
))

celdas.append(nbf.v4.new_code_cell(
"""from sklearn.model_selection import train_test_split

X_train, X_test, y_train, y_test = train_test_split(
    df_filtrado["texto"], df_filtrado["categoria"],
    test_size=0.2, random_state=42, stratify=df_filtrado["categoria"],
)
print(f"Entrenamiento: {len(X_train)}  Prueba: {len(X_test)}")"""
))

celdas.append(nbf.v4.new_code_cell(
"""from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.linear_model import LogisticRegression
from sklearn.pipeline import Pipeline

modelo = Pipeline([
    ("tfidf", TfidfVectorizer(max_features=2000, ngram_range=(1, 2))),
    ("clf", LogisticRegression(max_iter=1000)),
])
modelo.fit(X_train, y_train)
y_pred = modelo.predict(X_test)
print("Entrenamiento completo.")"""
))

celdas.append(nbf.v4.new_code_cell(
"""from sklearn.metrics import classification_report

print(classification_report(y_test, y_pred, zero_division=0))"""
))

celdas.append(nbf.v4.new_code_cell(
"""from sklearn.metrics import confusion_matrix, ConfusionMatrixDisplay
import matplotlib.pyplot as plt

etiquetas = sorted(df_filtrado["categoria"].unique())
matriz = confusion_matrix(y_test, y_pred, labels=etiquetas)
fig, ax = plt.subplots(figsize=(10, 10))
ConfusionMatrixDisplay(matriz, display_labels=etiquetas).plot(ax=ax, xticks_rotation=90, colorbar=False)
plt.tight_layout()
plt.savefig("matriz_confusion.png")
plt.show()"""
))

celdas.append(nbf.v4.new_code_cell(
"""pares = []
for i, cat_real in enumerate(etiquetas):
    for j, cat_predicha in enumerate(etiquetas):
        if i != j and matriz[i, j] > 0:
            pares.append((matriz[i, j], cat_real, cat_predicha))
pares.sort(reverse=True)

print("Top confusiones (categoria real -> categoria predicha : cantidad):")
for cantidad, real, predicha in pares[:8]:
    print(f"  {real} -> {predicha} : {cantidad}")"""
))

celdas.append(nbf.v4.new_markdown_cell(
"""## Lectura en términos de negocio

_(completar tras ejecutar la celda anterior con los pares reales impresos)_

- **Confusiones principales**: nombrar aquí los 2-3 pares reales de la celda
  de arriba (categoría real → categoría predicha, con la cantidad).
- **Implicación operativa para R-01**: dado que la corrección de un error de
  clasificación toma menos de un minuto y no afecta al usuario final (ver
  `materiales/n5/requerimientos_negocio.md`), ¿estas confusiones son un
  problema serio o tolerable con el flujo de corrección manual actual?
- **¿Sostiene la recomendación de `docs/decision-requerimientos.md` (R-01:
  automatización tradicional/ML clásico, no LLM)?** Justificar con la
  precisión global de `classification_report` de arriba, no solo con la
  intuición."""
))

nb["cells"] = celdas
with open("notebook_ml_clasico.ipynb", "w", encoding="utf-8") as fh:
    nbf.write(nb, fh)
print("notebook_ml_clasico.ipynb generado")
```

- [ ] **Step 3: Generar y ejecutar el notebook por primera vez**

```bash
cd etapa5-estrategia
python _build_notebook.py
jupyter nbconvert --to notebook --execute --inplace notebook_ml_clasico.ipynb
```
Expected: termina sin errores (código de salida 0); se genera `matriz_confusion.png` en `etapa5-estrategia/`.

- [ ] **Step 4: Leer los hallazgos reales y completar la celda de negocio**

Abre el notebook ejecutado (`jupyter notebook notebook_ml_clasico.ipynb` o inspecciona la salida de la celda "Top confusiones" directamente en el JSON del `.ipynb`, campo `outputs` de esa celda). Con los pares reales y la precisión real de `classification_report`, edita el texto de la última celda dentro de `_build_notebook.py` (el bloque `new_markdown_cell` de "Lectura en términos de negocio") reemplazando cada viñeta por el hallazgo real — no dejes las preguntas guía sin responder ni texto entre paréntesis tipo `_(completar...)_`.

- [ ] **Step 5: Regenerar y re-ejecutar con la celda de negocio ya completa**

```bash
python _build_notebook.py
jupyter nbconvert --to notebook --execute --inplace notebook_ml_clasico.ipynb
```
Expected: sin errores; `notebook_ml_clasico.ipynb` ahora tiene la celda de negocio con contenido real y todas las salidas (incluida la matriz de confusión) actualizadas.

- [ ] **Step 6: Commit**

```bash
git add etapa5-estrategia/requirements.txt etapa5-estrategia/_build_notebook.py etapa5-estrategia/notebook_ml_clasico.ipynb etapa5-estrategia/matriz_confusion.png
git commit -m "feat(etapa5): notebook de ML clasico (TF-IDF + regresion logistica) con matriz de confusion"
```

---

### Task 7: Comparación LLM vs. clásico

**Files:**
- Create: `docs/comparacion-enfoques.md`

**Interfaces:**
- Consumes: `etapa5-estrategia/resultados_evaluacion.json` (generado al correr la suite de la Tarea 5), salida de `classification_report` del notebook (Tarea 6), `docs/control-costo-etapa4.md` (ya committeado en Etapa 4), `docs/decision-requerimientos.md` (Tarea 3).
- Produces: nada (documentación) — referenciado por `etapa5-estrategia/README.md` (Tarea 10).

- [ ] **Step 1: Regenerar los datos reales antes de escribir el documento**

```bash
npm run ingestar --workspace etapa3-rag
npm test --workspace etapa5-estrategia
cat etapa5-estrategia/resultados_evaluacion.json
```

Anota los valores reales de `precisionPorCategoria`, `precisionCitacion`, `precisionAbstencion`, `latenciaP95` y `tasaEscalamiento` — estos son los números "clásico/heurístico" del documento. Anota también la precisión global (`accuracy`) que imprimió `classification_report` en la última ejecución del notebook de la Tarea 6 — es el número "ML clásico entrenado" (distinto del heurístico de palabras clave).

- [ ] **Step 2: Escribir el documento**

`docs/comparacion-enfoques.md`:
```markdown
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
| Precisión (accuracy) | **[medido]** <valor real de `classification_report`, celda final del notebook> | **[medido]** ver `precisionPorCategoria` en `etapa5-estrategia/resultados_evaluacion.json` (varía por categoría, umbral mínimo 50% por `metricas_previas.md`) | **[estimado]** típicamente >90% para catálogos de categorías estables con pocos ejemplos por prompt, pero sin medición real disponible aquí |
| Costo marginal por 1.000 solicitudes | **[medido]** ~US$0 (cómputo local, CPU) | **[medido]** ~US$0 (sin llamada a proveedor externo) | **[estimado]** ~US$0,04 de entrada + ~US$0,03 de salida (170 tokens/llamada, tarifas de `docs/control-costo-etapa4.md`) ≈ US$0,07/1.000 solicitudes |
| Latencia p95 | **[medido]** milisegundos por lote (inferencia local, sin red) | **[medido]** ver `latenciaP95` en `resultados_evaluacion.json` (techo aceptado 3000 ms, ver `metricas_previas.md`) | **[estimado]** 300 ms – 2 s por llamada, dependiente de la red y el proveedor — no aplicable a un proceso batch por hora como exige R-01 |
| Esfuerzo de mantenimiento | Reentrenar periódicamente con el histórico actualizado; auditar con matriz de confusión (ya construida) | Ninguno (reglas fijas) — pero no escala a redacciones nuevas | Ajustar el prompt ante drift observado; sin auditoría estructurada nativa (a diferencia de una matriz de confusión) |

**Recomendación**: ML clásico para R-01, consistente con `docs/decision-requerimientos.md` — el volumen (3.000/día), la estabilidad del catálogo (12 categorías sin cambios en 3 años) y el bajo costo de corrección de un error hacen que el costo/latencia adicional de un LLM no se justifique.

## R-02 — Consulta de políticas

| Criterio | RAG con `HeuristicProvider` (medido, modo de respaldo real) | RAG con LLM real (`HttpChatProvider`, no disponible en este entorno) |
|---|---|---|
| Precisión de citación (documento correcto) | **[medido]** ver `precisionCitacion` en `resultados_evaluacion.json` (mínimo aceptado 30% por `metricas_previas.md` — deliberadamente bajo, ver justificación ahí) | **[estimado]** sustancialmente mayor con embeddings semánticos reales — sin medición disponible en este entorno |
| Precisión de abstención | **[medido]** ver `precisionAbstencion` en `resultados_evaluacion.json` (mínimo aceptado 80%) | **[estimado]** comparable o mejor, mismo mecanismo de umbral de similitud |
| Costo marginal | **[medido]** ~US$0 | **[estimado]** ~US$0,92/1.000 consultas (1.100 tokens/llamada, tarifas de `docs/control-costo-etapa4.md`) — a 80 consultas/día, ~US$11/mes total (ya calculado en Etapa 4) |
| Esfuerzo de mantenimiento | Reindexar tras cambio de política (barato, 1-2 veces/año) | Igual, más la dependencia operativa de un proveedor externo disponible |

**Recomendación**: RAG con IA generativa para R-02, consistente con
`docs/decision-requerimientos.md` — el heurístico sirve como respaldo
garantizado (nunca falla, pero cita mal con frecuencia), no como la vía
principal: la variabilidad del lenguaje natural de las preguntas es
exactamente lo que un LLM real resuelve mejor que reglas o que un
"embedding" de 2 dimensiones.

## Nota metodológica

Los valores **[medido]** de esta tabla se regeneran corriendo
`npm run ingestar --workspace etapa3-rag && npm test --workspace etapa5-estrategia`
y leyendo `etapa5-estrategia/resultados_evaluacion.json` (no committeado —
es un artefacto de ejecución, igual que `etapa3-rag/data/indice_vectorial.json`).
Los valores **[estimado]** dependen de un proveedor LLM real que no está
disponible en este entorno de evaluación (mismo supuesto ya declarado en
`docs/control-costo-etapa4.md`) — deben reemplazarse por mediciones reales
en cuanto exista un proveedor configurado.
```

- [ ] **Step 3: Reemplazar los marcadores `[medido]`/`[estimado]` con los valores anotados en el Step 1**

Edita el archivo para que cada celda tenga el número real (o el estimado ya calculado arriba), sin dejar los símbolos `<...>` de marcador de posición en el archivo final.

- [ ] **Step 4: Commit**

```bash
git add docs/comparacion-enfoques.md
git commit -m "docs(etapa5): comparacion LLM vs clasico con datos reales medidos"
```

---

### Task 8: Revisión escrita de `pr_para_revision.diff`

**Files:**
- Create: `docs/seguridad/revision-pr.md`

**Interfaces:**
- Consumes: `materiales/revision/pr_para_revision.diff`.
- Produces: nada (documentación) — referenciado por `docs/estandar-ingenieria-ia.md` (Tarea 9).

- [ ] **Step 1: Escribir la revisión**

Los 5 hallazgos y sus líneas exactas ya fueron identificados leyendo `materiales/revision/pr_para_revision.diff` contra `app/reportes.py` (el archivo que el diff crea, función `generar_resumen_mensual`).

`docs/seguridad/revision-pr.md`:
```markdown
# Revisión de código — `pr_para_revision.diff`

Alcance: `app/reportes.py`, función `generar_resumen_mensual` (archivo
nuevo, 118 líneas, ver `materiales/revision/pr_para_revision.diff`). Esta
revisión es un ejercicio de referente de código (Anexo A, rúbrica de
Etapa 5) — no cubre `etapa3-rag/` ni el resto del código propio de este
repo (ver `docs/seguridad/informe-etapa3.md` para eso).

## Hallazgo 1 — Secreto hardcodeado (Crítico)

**Línea:** `app/reportes.py:5`
```python
OPENAI_API_KEY = "sk-proj-7Kd92LmQx4TvR8nZaWp1YbHc3EjF6UgS0AiDoNe5"
```

**Riesgo:** la clave del proveedor de IA queda expuesta en el historial de
git de forma permanente, visible para cualquiera con acceso al repositorio
(incluyendo forks y clones ya hechos) — un secreto commiteado no se
"arregla" solo quitándolo en un commit posterior, la clave sigue en el
historial.

**Corrección:**
1. Revocar/rotar la clave expuesta en el proveedor inmediatamente (no
   depende de este PR).
2. Leerla de variable de entorno: `OPENAI_API_KEY = os.environ["OPENAI_API_KEY"]`
   (fail-fast si falta, mismo patrón que `cargarConfig()` en
   `etapa2-api`/`etapa3-rag`/`etapa4-orquestacion` de este repo).
3. Purgar el secreto del historial de git (`git filter-repo` o
   equivalente) si el repo ya fue compartido con la clave real.

## Hallazgo 2 — Inyección SQL, múltiple (Crítico)

**Líneas:** `app/reportes.py:22-25` (query principal), `:28` (`area_filtro`),
`:30-32` (subconsulta `usuario_solicitante`), `:52` (`areas`), `:57`
(`adjuntos`), `:60-61` (`historial_estado`), `:86-87` (`UPDATE categoria_ia`).

```python
query = "SELECT id_ticket, codigo, id_area, categoria, prioridad, estado, " \
        "fecha_creacion, fecha_cierre, asunto, descripcion FROM tickets " \
        "WHERE fecha_creacion > '" + str(fecha_inicio) + "' " \
        "AND fecha_creacion < '" + str(fecha_fin) + "'"
...
cursor.execute("SELECT nombre, sede FROM areas WHERE id_area = %s" % row[2])
...
cursor.execute("UPDATE tickets SET categoria = '" + categoria_ia +
               "' WHERE id_ticket = " + str(row[0]))
```

**Riesgo:** siete puntos de concatenación/interpolación directa de strings
en SQL en la misma función. El más grave es la línea 86-87: `categoria_ia`
viene de la respuesta de un LLM (`respuesta.json()["choices"][0]["message"]["content"]`,
línea 82) — **texto no confiable** que se concatena sin sanitizar en un
`UPDATE`. Un LLM que devuelva una comilla simple, o un prompt-injection en
el asunto/descripción del ticket que induzca al modelo a devolver
fragmento SQL, puede romper o manipular la sentencia (este es el punto
crítico #4 del Anexo A citado directamente: nunca confiar en texto de un
LLM sin aislarlo tras una interfaz desacoplada y sin tratarlo como dato,
nunca como código).

**Corrección:** consultas parametrizadas en las 7 ubicaciones, por ejemplo:
```python
cursor.execute(
    "SELECT id_ticket, codigo, id_area, categoria, prioridad, estado, "
    "fecha_creacion, fecha_cierre, asunto, descripcion FROM tickets "
    "WHERE fecha_creacion > %s AND fecha_creacion < %s",
    (fecha_inicio, fecha_fin),
)
...
cursor.execute("UPDATE tickets SET categoria = %s WHERE id_ticket = %s", (categoria_ia, row[0]))
```
`area_filtro` y la subconsulta de `usuario_solicitante` se agregan como
condiciones `AND` adicionales con sus propios parámetros, nunca
concatenando el valor al string de la query.

## Hallazgo 3 — Sin manejo de errores en la llamada al proveedor de IA (Alto)

**Líneas:** `app/reportes.py:79-84`
```python
respuesta = requests.post(
    MODEL_URL,
    headers={"Authorization": "Bearer " + OPENAI_API_KEY},
    json={"model": "gpt-4", "messages": [{"role": "user", "content": prompt}]},
)
categoria_ia = respuesta.json()["choices"][0]["message"]["content"]
```

**Riesgo:** sin `timeout`, una llamada colgada bloquea el proceso
indefinidamente (afecta a un endpoint que además está dentro de una
transacción de base de datos abierta con `conn.begin()`, línea 20 —
bloqueando también los locks de esa transacción). Sin `try/except`, un
error de red o un `50x` del proveedor tumba toda la generación del reporte
mensual, no solo la clasificación de un ticket. El acceso directo a
`respuesta.json()["choices"][0]["message"]["content"]` asume una forma de
respuesta fija — cualquier cambio de formato del proveedor (o una
respuesta de error con otro shape) lanza una excepción no controlada.

**Corrección:** timeout explícito, manejo de errores HTTP/formato, y
aislar la llamada tras una interfaz desacoplada del proveedor concreto
(mismo patrón `IAProvider` de `etapa2-api/src/ia/IAProvider.ts` de este
repo — el legacy viola el punto crítico #4 del Anexo A directamente al
llamar al SDK/HTTP del proveedor en línea, sin abstracción):
```python
try:
    respuesta = requests.post(MODEL_URL, headers=headers, json=payload, timeout=10)
    respuesta.raise_for_status()
    categoria_ia = respuesta.json()["choices"][0]["message"]["content"]
except (requests.RequestException, KeyError, IndexError) as exc:
    categoria_ia = "Sin clasificar"
    logger.warning("Fallo la clasificacion IA del ticket %s: %s", row[0], exc)
```

## Hallazgo 4 — División por cero (Medio)

**Línea:** `app/reportes.py:94`
```python
promedio = suma_dias / contador_dias
```

**Riesgo:** si ningún ticket del periodo consultado tiene `fecha_cierre`
(`contador_dias == 0`, todos abiertos o reabiertos), esta línea lanza
`ZeroDivisionError` y tumba toda la generación del reporte mensual — un mes
sin cierres es un caso de negocio válido (área nueva, mes de alta demanda
sin cierres aún), no un caso excepcional que deba fallar.

**Corrección:**
```python
promedio = suma_dias / contador_dias if contador_dias > 0 else None
```
Documentar en el contrato del endpoint que `promedio_dias_atencion: null`
significa "sin tickets cerrados en el periodo", no un error.

## Hallazgo 5 — Inconsistencia de estilo (Menor)

**Líneas:** `app/reportes.py:9` (parámetro `incluirCerrados` en camelCase,
el resto del código en snake_case), `:89` (`if incluirCerrados == False`
en vez de `if not incluirCerrados`).

**Riesgo:** ninguno funcional — es una señal de calidad/consistencia, y en
este caso específico también una señal de que el código fue escrito
rápido (probablemente con asistencia de IA sin una convención de estilo
aplicada) sin una pasada de revisión.

**Corrección:**
```python
def generar_resumen_mensual(anio, mes, area_filtro=None, incluir_cerrados=True,
                             formato="json", usuario_solicitante=None):
...
if not incluir_cerrados and ticket["estado"] == "Cerrado":
    continue
```

## Resumen

De los 5 hallazgos, los 2 críticos (secreto hardcodeado, inyección SQL) y
el de severidad Alta (manejo de errores del proveedor de IA) comparten un
patrón: código que asume el caso feliz y trata la salida de un LLM como si
fuera confiable — exactamente lo que el punto crítico #4 del Anexo A pide
evitar. Estos tres hallazgos alimentan directamente
`docs/estandar-ingenieria-ia.md` (Tarea 9) como ejemplos concretos de "qué
se revisa siempre" y "qué nunca se acepta sin prueba".
```

- [ ] **Step 2: Commit**

```bash
git add docs/seguridad/revision-pr.md
git commit -m "docs(etapa5): revision escrita de pr_para_revision.diff (5 hallazgos con severidad y correccion)"
```

---

### Task 9: Estándar de ingeniería propuesto

**Files:**
- Create: `docs/estandar-ingenieria-ia.md`

**Interfaces:**
- Consumes: `docs/seguridad/revision-pr.md` (Tarea 8), `docs/seguridad/informe-etapa3.md` (Etapa 3, ya committeado), convenciones ya establecidas en este repo (`IAProvider`, patrón hermético de tests, singleton perezoso).
- Produces: nada (documentación) — referenciado por `etapa5-estrategia/README.md` (Tarea 10).

- [ ] **Step 1: Escribir el estándar**

`docs/estandar-ingenieria-ia.md`:
```markdown
# Estándar de ingeniería propuesto — código generado con asistencia de IA

Basado en los hallazgos reales de este repositorio:
`docs/seguridad/revision-pr.md` (código legacy, 5 hallazgos) y
`docs/seguridad/informe-etapa3.md` (código propio de este repo generado con
IA, 3 hallazgos de disponibilidad/costo). El patrón compartido entre ambos:
código correcto para el caso feliz, sin las validaciones de borde que un
revisor humano pide — con o sin IA de por medio, ese es el riesgo real a
prevenir.

## Qué se permite generar con IA sin revisión adicional

- Código de andamiaje repetitivo con un patrón ya establecido en el repo
  (otro endpoint siguiendo la misma forma que uno ya revisado, otro test
  con la misma estructura que uno ya aprobado).
- Documentación descriptiva (comentarios de una línea, README) sobre código
  ya revisado — nunca sobre código todavía sin revisar, para no
  "legitimar" un defecto con una descripción convincente.
- Boilerplate de configuración (tsconfig, package.json) que sigue un
  template ya usado en el mismo monorepo.

## Qué se revisa siempre (sin excepción, aunque "se vea bien")

- **Secretos**: cualquier string que parezca una API key, token o
  contraseña — grep de patrones comunes (`sk-`, `Bearer `, `AKIA`, etc.)
  antes de aprobar cualquier PR con código nuevo. Ver Hallazgo 1 de
  `docs/seguridad/revision-pr.md`.
- **Construcción de SQL**: cualquier `execute()`/`query()` — si hay
  concatenación o `%`-formatting de un valor externo dentro del string SQL,
  se rechaza sin excepción, sin importar si el valor "parece" seguro. Ver
  Hallazgo 2 de `docs/seguridad/revision-pr.md`. Regla operacional: un
  `grep -n '" +\|%s"\|f"SELECT\|f"UPDATE'` sobre el diff de cualquier PR que
  toque acceso a datos, antes de aprobar.
- **Manejo de errores en llamadas a servicios externos** (incluido
  cualquier proveedor de IA): timeout explícito, manejo de excepciones de
  red/formato, y la llamada aislada detrás de una interfaz propia (patrón
  `IAProvider` de este repo) — nunca el SDK/HTTP del proveedor invocado
  directamente en la lógica de negocio. Ver Hallazgo 3 de
  `docs/seguridad/revision-pr.md` y Hallazgo 1 de
  `docs/seguridad/informe-etapa3.md`.
- **Cualquier salida de un LLM usada como dato** (para un `UPDATE`, para
  una decisión de negocio, para una ruta de archivo): tratarla como entrada
  no confiable — validar formato/tipo antes de usarla, nunca concatenarla
  directamente en SQL, comandos de shell, o rutas de archivo.
- **Casos borde numéricos/de tamaño**: división por cero, colecciones
  vacías, archivos/entradas sin límite superior de tamaño. Ver Hallazgo 4 de
  `docs/seguridad/revision-pr.md` y Hallazgos 1 y 3 de
  `docs/seguridad/informe-etapa3.md` — ningún de estos es exclusivo de
  código generado por IA, pero la asistencia de IA tiende a optimizar por
  el caso feliz salvo que se le pida explícitamente cubrir el borde.

## Qué nunca se acepta sin prueba

- **Cualquier corrección de defecto**: se entrega con la prueba que falla
  antes y pasa después, más una línea de causa raíz (regla ya vigente en
  este repo, spec maestro §4.3) — sin excepción para código generado con
  IA; de hecho con mayor razón, porque el autor humano no escribió la
  lógica línea por línea y necesita la prueba como evidencia de que
  entiende lo que se corrigió.
- **Cualquier ruta de manejo de errores** (timeout, reintento, fallback):
  la prueba debe forzar esa ruta (mock de fallo, timeout real corto en
  test) — "se ve razonable leyendo el código" no es evidencia.
- **Cualquier construcción de consulta a base de datos con parámetros
  variables**: la prueba debe incluir al menos un valor con comillas o
  caracteres especiales, para confirmar que la parametrización realmente
  se usa y no es cosmética.

## Resumen ejecutivo

La asistencia de IA no cambia el estándar de revisión — lo que cambia es la
velocidad a la que aparece código sin las validaciones de borde que nadie
pidió explícitamente. Las tres categorías de arriba (secretos, SQL,
llamadas externas) son exactamente donde los dos ejercicios de revisión de
este repositorio (`revision-pr.md`, `informe-etapa3.md`) encontraron
problemas reales — no son hipotéticas.
```

- [ ] **Step 2: Commit**

```bash
git add docs/estandar-ingenieria-ia.md
git commit -m "docs(etapa5): estandar de ingenieria propuesto para codigo asistido por IA"
```

---

### Task 10: README de la etapa

**Files:**
- Create: `etapa5-estrategia/README.md`

**Interfaces:**
- Consumes: resultados reales de las Tareas 1-9 (commits ya hechos, `resultados_evaluacion.json` regenerado).
- Produces: nada — es el entregable final de la carpeta de la etapa.

- [ ] **Step 1: Regenerar los artefactos de ejecución antes de documentar los números**

```bash
npm run ingestar --workspace etapa3-rag
npm test --workspace etapa5-estrategia
cat etapa5-estrategia/resultados_evaluacion.json
```

- [ ] **Step 2: Escribir el README**

`etapa5-estrategia/README.md`:
```markdown
# Etapa 5 — Estrategia técnica y evaluación

Documento de decisión IA-vs-tradicional, definición previa de métricas,
suite de evaluación automatizada, notebook de ML clásico, comparación de
enfoques, revisión de código como referente, estándar de ingeniería
propuesto.

## Qué se implementó de verdad (código real, ejecutable)

- **Suite de evaluación automatizada** (`src/evaluador.ts` +
  `tests/evaluador.test.ts`): corre contra los ≥50 casos de
  `conjunto_referencia.csv`, reutilizando `ClasificadorService` y
  `responderConsulta` ya acreditados de Etapas 2 y 3 (sin reimplementarlos).
  Reporta precisión por categoría, precisión de citación/abstención,
  latencia p95 y tasa de escalamiento — y **falla la suite** (y por lo
  tanto el job de CI) si algún resultado cae bajo los umbrales de
  `metricas_previas.md`. Evidencia de que el gate funciona en
  `docs/evidencia-gate-etapa5.log`.
- **Notebook de ML clásico** (`notebook_ml_clasico.ipynb`): TF-IDF +
  regresión logística sobre el histórico limpio de Etapa 1 (reutiliza
  `src.limpiar_tickets`, no reimplementa la limpieza), con matriz de
  confusión y lectura de negocio basada en los resultados reales de esa
  corrida. No integrado al pipeline de producción — el Anexo A permite
  esto explícitamente para la versión de 3 días.

## Qué quedó solo como documento de decisión (sin código)

- `docs/decision-requerimientos.md`: R-01 → automatización tradicional/ML
  clásico; R-02 → IA (RAG, ya construido en Etapa 3); R-03 → automatización
  tradicional pura. Con alternativas descartadas, costo, riesgo y condición
  de cambio para cada uno.
- `docs/comparacion-enfoques.md`: LLM vs. clásico para R-01 y R-02, con
  datos medidos de este repo (no inventados) donde fue posible, y supuestos
  declarados donde no hay proveedor LLM real disponible en este entorno.
- `docs/seguridad/revision-pr.md`: revisión de `pr_para_revision.diff` —
  5 hallazgos (2 críticos: secreto hardcodeado, inyección SQL) con línea
  exacta y corrección propuesta.
- `docs/estandar-ingenieria-ia.md`: qué se permite generar con IA sin
  revisión adicional, qué se revisa siempre, qué nunca se acepta sin
  prueba — basado en los hallazgos reales de esta misma etapa.

## Instalación y ejecución

### Suite de evaluación (TypeScript)

```bash
npm install
npm run ingestar --workspace etapa3-rag   # genera el indice vectorial real, requerido por la suite
npm test --workspace etapa5-estrategia
cat etapa5-estrategia/resultados_evaluacion.json   # resultados de la ultima corrida
```

### Notebook de ML clásico (Python)

```bash
cd etapa5-estrategia
python -m venv .venv
# Windows: .venv\Scripts\activate    |    Linux/Mac: source .venv/bin/activate
pip install -r requirements.txt
jupyter nbconvert --to notebook --execute --inplace notebook_ml_clasico.ipynb
# o abrir interactivamente: jupyter notebook notebook_ml_clasico.ipynb
```

## Supuestos y límites declarados

- Todo el sistema opera con `HeuristicProvider` (no hay un proveedor LLM
  real corriendo en este entorno de evaluación) — los umbrales de
  `metricas_previas.md` miden ese modo heurístico, no un LLM real. Ver esa
  misma limitación ya documentada en Etapas 3 y 4.
- El notebook de ML clásico es exploratorio: no expone un endpoint, no se
  integra al pipeline de `etapa4-orquestacion` — el Anexo A permite esto
  explícitamente para la versión de 3 días de esta prueba técnica.
```

- [ ] **Step 3: Reemplazar cualquier número aún no confirmado**

Revisa que ningún valor del README quedó como marcador de posición: todo dato numérico citado (si lo hay, más allá de lo ya escrito arriba) debe salir de `etapa5-estrategia/resultados_evaluacion.json` regenerado en el Step 1.

- [ ] **Step 4: Commit**

```bash
git add etapa5-estrategia/README.md
git commit -m "docs(etapa5): README de la etapa"
```

---

### Task 11: Pipeline de CI — job de `etapa5-estrategia`

**Files:**
- Modify: `.github/workflows/ci.yml`

**Interfaces:**
- Consumes: `npm test --workspace etapa5-estrategia` (Tarea 5, ya el gate en sí mismo).
- Produces: evidencia en Actions de que la suite de evaluación corre en cada push/PR (Definición de hecho de la etapa, columna "Evidencia" de la Tarea 5 del spec).

- [ ] **Step 1: Agregar el job**

En `.github/workflows/ci.yml`, agregar al final del bloque `jobs:` (mismo patrón que el job `etapa4-orquestacion` ya existente):
```yaml
  etapa5-estrategia:
    runs-on: ubuntu-latest
    needs: [etapa2-api, etapa3-rag]
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: "20"
      - run: npm install
      - run: npm run build --workspace etapa2-api
      - run: npm run build --workspace etapa3-rag
      - run: npm run build --workspace etapa5-estrategia
      - name: Generar indice vectorial real (HeuristicProvider) para la suite de evaluacion
        run: npm run ingestar --workspace etapa3-rag
      - name: Suite de evaluacion (falla si la precision/latencia/escalamiento no cumplen metricas_previas.md)
        run: npm test --workspace etapa5-estrategia
```

No se agregan variables de entorno explícitas: igual que los jobs `etapa3-rag` y `etapa4-orquestacion` ya existentes, el `beforeAll` con `??=` de `tests/evaluador.test.ts` (Tarea 5) provee los valores dummy de `AI_PROVIDER_BASE_URL`/`AI_PROVIDER_API_KEY` que `etapa3-rag` exige — no hace falta duplicarlos en el workflow.

- [ ] **Step 2: Verificar el YAML es válido**

```bash
python -c "import yaml; yaml.safe_load(open('.github/workflows/ci.yml'))" 2>/dev/null || node -e "require('js-yaml') && console.log('ok')" 2>/dev/null || echo "revisar manualmente indentacion YAML"
```

Si ninguna herramienta de validación YAML está disponible, revisa manualmente que la indentación del nuevo job coincida exactamente con la de `etapa4-orquestacion` (2 espacios por nivel, mismo nivel que `runs-on`/`needs`/`steps`).

- [ ] **Step 3: Commit**

```bash
git add .github/workflows/ci.yml
git commit -m "ci(etapa5): job que corre la suite de evaluacion en cada push/PR"
```

- [ ] **Step 4: Push y verificar en Actions**

Este es el primer punto donde vale la pena empujar la rama para confirmar que el job corre en el entorno real de GitHub Actions (los runners de CI no tienen el mismo estado que este entorno de desarrollo):

```bash
git push -u origin etapa5-estrategia
```

Verificar en la pestaña Actions del repositorio que el job `etapa5-estrategia` aparece y termina en verde. Si falla por algo específico del runner (versión de Node, ausencia de algún paquete), diagnosticar contra el log de Actions antes de asumir que el código está mal — puede ser una diferencia de entorno, no un defecto de la suite.
