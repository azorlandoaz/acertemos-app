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
npm run build --workspace etapa2-api
npm run build --workspace etapa3-rag
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
