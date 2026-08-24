# Control de costo y capacidad — Etapa 4

Fuente de los volúmenes: `materiales/n5/requerimientos_negocio.md`
(R-01: 3.000 solicitudes/día para clasificación; R-02: 80 consultas/día de
políticas).

## Supuestos declarados (estimación de tokens por llamada)

| Llamada | Entrada estimada | Salida estimada | Total/llamada |
|---|---|---|---|
| Clasificación (asunto + descripción de un ticket, prompt corto) | ~150 tokens | ~20 tokens | ~170 tokens |
| Consulta RAG (pregunta + hasta 3 fragmentos de contexto de ~1200 caracteres c/u + embedding de la pregunta) | ~950 tokens | ~150 tokens | ~1.100 tokens |

Los tamaños de fragmento (~1200 caracteres) vienen directamente de
`TAMANO_MAXIMO` en `etapa3-rag/src/ingesta/chunker.ts` (Etapa 3, ya
acreditada) — no son un supuesto inventado, son el límite real configurado.

## Estimación mensual (30 días)

- Clasificación: 3.000/día × 170 tokens = **510.000 tokens/día** → **~15,3M
  tokens/mes**.
- Consulta de políticas: 80/día × 1.100 tokens = **88.000 tokens/día** →
  **~2,64M tokens/mes**.
- **Total: ~17,94M tokens/mes.**

A un precio de referencia ilustrativo de proveedor compatible
OpenAI-estilo Ollama/LM Studio local (costo marginal ~$0 en cómputo propio)
o, si se usa un proveedor externo con un precio de referencia de mercado de
~US$0,50 por millón de tokens de entrada y ~US$1,50 por millón de salida
(cifras de referencia, no un contrato vigente — deben reemplazarse por el
precio real del proveedor elegido en producción):

- Entrada total aprox.: 3.000×150 + 80×950 = 526.000 tokens/día → 15,78M/mes
  → **~US$7,89/mes**.
- Salida total aprox.: 3.000×20 + 80×150 = 72.000 tokens/día → 2,16M/mes →
  **~US$3,24/mes**.
- **Total estimado: ~US$11/mes** con estos supuestos y este precio de
  referencia — un costo bajo comparado con el 18% del tiempo del equipo que
  hoy consume responder manualmente las consultas de políticas (dato de
  `requerimientos_negocio.md`, R-02).

## Presupuesto máximo y mecanismo de alerta

- Presupuesto máximo propuesto: **US$50/mes** (margen ~4,5x sobre la
  estimación, para absorber picos y reintentos).
- Mecanismo de alerta: cada llamada al `IAProvider` ya se instrumenta con
  `registrarMetrica` (latencia + tokens aproximados, Etapa 3 Tarea 9); se
  agrega un acumulador mensual simple que compara `tokensTotales` contra el
  presupuesto convertido a tokens y emite un `console.warn` estructurado
  (`{evento: "alerta_presupuesto", porcentaje}`) al cruzar el 80% del
  presupuesto mensual.

## Qué hace el sistema al superar el presupuesto

- Bajo el 100%: sigue operando normalmente, sólo registra la alerta.
- Al superar el 100%: modo degradado — las clasificaciones (baja
  criticidad, se corrigen en <1 minuto según R-01) caen automáticamente al
  `HeuristicProvider` sin llamar al proveedor real (ya es el comportamiento
  de respaldo garantizado de `ClasificadorService`); las consultas RAG
  (mayor riesgo si responden mal, según la restricción de R-02: una
  respuesta equivocada genera reclamación formal) se ponen en una cola de
  espera hasta el siguiente ciclo de presupuesto en vez de degradar la
  calidad de la respuesta — es preferible escalar a una persona que
  arriesgar una respuesta incorrecta sobre montos o plazos.
