# Etapa 5 — Estrategia técnica y evaluación (Ingeniero IA Middle II)

Fecha: 2026-08-22 · Depende de: Etapa 4 acreditada · Última etapa.
Convenciones transversales: ver [spec maestro](2026-08-22-arquitectura-general-design.md).
Carpeta: `etapa5-estrategia/`.

## 1. Objetivo

**Alcance real declarado por el Anexo A para la versión de 3 días**: el
documento de decisión, las métricas previas y el conjunto de referencia son
obligatorios. El modelo de ML clásico puede entregarse como notebook con
línea base y matriz de confusión, sin integrarlo a la solución.

## 2. Rúbrica de la etapa

criterio IA frente a automatización tradicional · definición previa de
métricas · suite de evaluación automatizada · modelo de ML clásico ·
comparación de enfoques · revisión de código como referente · estándar
propuesto · visión de negocio y riesgos. 8 criterios × 0-4 = 100 pts,
mínimo 60.

## 3. Análisis ya realizado de los 3 requerimientos (`n5/requerimientos_negocio.md`)

| Req. | Resumen | Señales clave | Decisión orientativa |
|---|---|---|---|
| **R-01** Clasificación de solicitudes entrantes | 3.000/día, 12 categorías **estables hace 3 años**, corrección de error < 1 min, sin efecto en el usuario final, corre en **lote cada hora**. | Alto volumen, problema estable, bajo riesgo por error, sin urgencia de latencia. Existe histórico ya etiquetado (Etapa 1). | **Automatización tradicional / ML clásico** (no LLM): un clasificador entrenado sobre el histórico es más barato, más rápido en lote y más fácil de auditar que un LLM para 12 categorías fijas. Este es el requerimiento que satisface el **punto crítico #10** (uno de los tres no debe resolverse con IA generativa). |
| **R-02** Consulta de políticas en lenguaje natural | ~80/día, preguntas en texto libre y variable, políticas cambian 1-2 veces al año, **una respuesta equivocada genera reclamación formal**. | Variabilidad alta de lenguaje, bajo volumen, alto costo de error puntual pero manejable con citación de fuente y abstención. | **IA (RAG)** — ya construido en Etapa 3. La abstención ante falta de evidencia mitiga el riesgo de reclamación. |
| **R-03** Recordatorio de tickets sin gestión | Regla fija (3 días → recordatorio, 5 días → escalamiento), texto de mensaje siempre igual, ejecución diaria 8:00 a. m., **no puede duplicar si corre dos veces**. | Cero ambigüedad de lenguaje, es un problema de scheduling + idempotencia, no de interpretación. | **Automatización tradicional pura, sin IA**: cron/scheduler + verificación de idempotencia (p. ej. marca de "ya notificado" por ticket y nivel). Usar IA aquí sería sobre-ingeniería y añadiría riesgo sin beneficio — señal explícita de criterio técnico. |

Nota: la evaluación no exige coincidir con esta lectura; exige el
**razonamiento** (criterios de volumen, estabilidad, costo, latencia,
tolerancia al error, mantenimiento) y reconocer bajo qué condición la
decisión cambiaría (p. ej. R-01 pasaría a candidato de IA si el catálogo de
categorías empezara a cambiar con frecuencia).

## 4. Derivación de tareas

| # | Tarea | Detalle | Criterio(s) | Evidencia |
|---|---|---|---|---|
| 1 | Rama de trabajo | `etapa5-estrategia` desde `master`. | — | rama visible |
| 2 | **Commit temprano de métricas previas** | Antes de tocar código de clasificador/RAG de evaluación: commitear `metricas_previas.md` con precisión objetivo por categoría, latencia p95 aceptable, tasa máxima de escalamiento. | definición previa de métricas | commit fechado **antes** que el commit de la suite de evaluación (punto crítico #11) |
| 3 | Ampliar el conjunto de referencia | `plantilla_conjunto_referencia.csv` trae 4 casos de ejemplo (incluido `GS-003`, ya usado en Etapa 3); completar hasta **≥50 casos** etiquetados a mano, mezclando preguntas de política (con `documento_fuente`/`seccion_fuente`) y casos de clasificación (con categoría esperada), usando el histórico de Etapa 1 y las políticas como fuente. | definición previa de métricas | `etapa5-estrategia/conjunto_referencia.csv` con ≥50 filas |
| 4 | Documento de decisión R-01/R-02/R-03 | Para cada uno: alternativa elegida, alternativas descartadas, costo estimado, riesgo, condición de cambio (usar el análisis de la sección 3 como base, no copiarlo literal). | criterio IA frente a automatización tradicional | `docs/decision-requerimientos.md` |
| 5 | Suite de evaluación automatizada | Corre contra el `conjunto_referencia.csv`, reporta precisión por categoría / latencia / tasa de escalamiento, **falla el pipeline si el resultado cae bajo el umbral** de `metricas_previas.md`. | suite de evaluación automatizada | job de CI que ejecuta esta suite |
| 6 | Notebook de ML clásico | Sobre `tickets_historicos.csv` limpio (salida de Etapa 1): partición train/test, línea base (p. ej. TF-IDF + regresión logística o Naive Bayes sobre `asunto`+`descripcion` → `categoria`), matriz de confusión, lectura en términos de negocio (qué categorías se confunden y qué implica operativamente para R-01). | modelo de ML clásico | `etapa5-estrategia/notebook_ml_clasico.ipynb` |
| 7 | Comparación LLM vs. clásico | Costo por mil solicitudes, latencia, precisión, esfuerzo de mantenimiento — usando datos reales medidos en Etapas 2-3 (instrumentación) y el notebook de la tarea 6, no cifras inventadas. Recomendación final por caso de uso. | comparación de enfoques | `docs/comparacion-enfoques.md` |
| 8 | Revisión escrita de `pr_para_revision.diff` | Hallazgos ya identificados (ver sección 5) con severidad, línea, y recomendación de corrección. | revisión de código como referente | `docs/seguridad/revision-pr.md` |
| 9 | Estándar de ingeniería propuesto | Qué se permite generar con IA sin revisión adicional, qué se revisa siempre (secretos, SQL, manejo de errores), qué nunca se acepta sin prueba — puede apoyarse en los hallazgos reales de la tarea 8. | estándar propuesto | `docs/estandar-ingenieria-ia.md` |
| 10 | README de la etapa | Qué se implementó de verdad (suite de evaluación, notebook) vs. qué quedó solo como documento de decisión. | visión de negocio y riesgos (transversal) | `etapa5-estrategia/README.md` |

## 5. Hallazgos ya identificados en `pr_para_revision.diff` (para la tarea 8)

`app/reportes.py`, función `generar_resumen_mensual`:

1. **Secreto hardcodeado (crítico)**: `OPENAI_API_KEY = "sk-proj-..."`
   literal en el código versionado. Corrección: variable de entorno +
   revocar/rotar la clave expuesta.
2. **Inyección SQL (crítico, múltiple)**: la consulta principal concatena
   `fecha_inicio`, `fecha_fin`, `area_filtro` y una subconsulta con
   `usuario_solicitante` directamente en el string SQL; además las
   consultas de `areas`, `adjuntos` e `historial_estado` usan `%` de Python
   sobre el SQL en vez de parámetros. El caso más grave: el `UPDATE` que
   escribe `categoria_ia` (**texto devuelto por el LLM, no confiable**)
   concatenado sin sanitizar — un LLM podría producir una comilla o
   fragmento SQL que rompa o manipule la sentencia. Corrección: consultas
   parametrizadas (`cursor.execute(query, params)`) en las 5 ubicaciones.
3. **Sin manejo de errores en la llamada al proveedor de IA**: `requests.post`
   sin `timeout`, sin `try/except`, y accede a
   `respuesta.json()["choices"][0]["message"]["content"]` asumiendo que la
   respuesta siempre tiene esa forma. Corrección: timeout, manejo de
   errores HTTP/formato, y aislar la llamada tras una interfaz desacoplada
   (mismo patrón de `IAProvider` de Etapa 2 — el legacy viola el punto
   crítico #4 directamente).
4. **División por cero**: `promedio = suma_dias / contador_dias` si
   ningún ticket del periodo tiene `fecha_cierre` (`contador_dias == 0`).
   Corrección: verificar antes de dividir, devolver `None`/`0` con
   significado documentado.
5. (Menor) Inconsistencia de estilo: `incluirCerrados` en camelCase mezclado
   con el resto del código en snake_case, y comparación `== False` en vez de
   `not incluirCerrados`.

## 6. Definición de "hecho"

- `metricas_previas.md` commiteado con fecha anterior a la suite de
  evaluación (verificable en `git log`).
- `conjunto_referencia.csv` con ≥50 filas completas.
- Suite de evaluación falla intencionalmente si se baja el umbral a
  propósito en una prueba manual (evidencia de que el gate funciona).
- Notebook ejecuta de punta a punta sin errores y muestra la matriz de
  confusión.
- Revisión del diff cubre los 5 hallazgos de la sección 5 con su corrección
  propuesta (o aplicada, si hay tiempo).
