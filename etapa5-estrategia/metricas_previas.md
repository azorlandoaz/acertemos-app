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
