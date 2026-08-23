# ADR-003 — Idempotencia en la integración bidireccional

## Contexto
`etapa4-orquestacion` recibe eventos de un segundo sistema que puede
reenviar el mismo evento más de una vez y en desorden (contrato explícito
de `servicio_mock`), y a su vez envía solicitudes hacia
`POST {servicio_mock}/solicitudes`, que ya soporta una cabecera
`Idempotency-Key` opcional (dos peticiones con la misma clave devuelven la
misma solicitud). Se necesita una estrategia de idempotencia en ambos
sentidos, más un registro de qué estado tiene cada evento en cada extremo.

## Alternativa elegida
- **Entrada (webhook):** deduplicación propia por `evento_id` contra un
  registro local antes de procesar — si el `evento_id` ya fue visto, se
  responde `200 {duplicado: true}` sin volver a ejecutar el pipeline.
- **Salida (envío al mock):** se reutiliza el `evento_id` como
  `Idempotency-Key` al llamar `POST /solicitudes`, aprovechando el soporte
  nativo del mock — así un reintento de red del propio orquestador tras un
  error transitorio no crea una solicitud duplicada del lado del mock.
- **Registro de estado:** archivo JSON local
  (`etapa4-orquestacion/data/estado_sync.json`), mismo patrón arquitectónico
  que el índice vectorial de Etapa 3 (ver ADR-002): un objeto
  `{ [evento_id]: { estado, actualizado } }` con `estado` en
  `pendiente | enviado | confirmado | error`.

## Alternativas descartadas (y por qué)
- **SQLite (`better-sqlite3`) para el registro de estado:** mismo motivo
  que en ADR-002 — dependencia nativa con riesgo de compilación fallida en
  el entorno de evaluación, sin beneficio real a un volumen de eventos de
  prueba técnica (decenas, no millones).
- **Sin deduplicación explícita, confiar sólo en `Idempotency-Key` del
  mock:** insuficiente, porque la cabecera protege el lado de *salida*
  (evita duplicar la solicitud en el mock) pero no evita que el propio
  pipeline de *entrada* se ejecute dos veces para el mismo evento entrante
  (reclasificar, volver a consultar el RAG) — trabajo duplicado real y
  posible inconsistencia de trazabilidad en `interacciones_ia` si no se
  deduplica también en la entrada.

## Consecuencias
- Positiva: ambos extremos de la integración son idempotentes con
  mecanismos simples y sin infraestructura nueva; el registro de estado
  también sirve como evidencia auditable de qué pasó con cada evento
  (requisito de trazabilidad transversal del spec maestro).
- Negativa aceptada: el registro JSON no soporta escritura concurrente seguro
  (lectura-modificación-escritura no es atómica) — aceptable porque el
  procesamiento de eventos en esta etapa es secuencial, no hay varios
  workers escribiendo el mismo archivo a la vez. Si la carga real exigiera
  procesamiento concurrente, este registro se movería a una tabla real con
  transacciones (la tabla `interacciones_ia` de la Tarea 10 ya es candidata).
