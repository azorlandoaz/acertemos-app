# Etapa 4 — Arquitectura y orquestación (Ingeniero IA Middle I)

Fecha: 2026-08-22 · Depende de: Etapa 3 acreditada · Bloquea: Etapa 5.
Convenciones transversales: ver [spec maestro](2026-08-22-arquitectura-general-design.md).
Carpeta: `etapa4-orquestacion/` + `docs/adr/`.

## 1. Objetivo

**Alcance real declarado por el Anexo A para la versión de 3 días**: esta
etapa se evalúa principalmente sobre el documento de diseño y las
decisiones. No se exige orquestación completa funcionando — basta una
demostración mínima y parcial del flujo, con el diseño sustentado. Si queda
funcionando de verdad, se reconoce en el criterio de escalabilidad.

## 2. Rúbrica de la etapa

claridad de la arquitectura · calidad de los ADR · orquestación ·
integración bidireccional · diseño de datos relacional y vectorial ·
secretos y ambientes · costo y capacidad · escalabilidad y mantenibilidad.
8 criterios × 0-4 = 100 pts, mínimo 60.

## 3. Decisión de orquestador (ya tomada)

Implementación propia en TypeScript (pipeline secuencial simple, no un
framework de agentes ni n8n) — decisión del participante, coherente con el
stack Node/Express ya elegido en Etapas 2-3, sin infraestructura adicional
que instalar/mantener en 3 días. Se documenta como ADR-001 (sección 5).

## 4. Derivación de tareas

| # | Tarea | Detalle | Criterio(s) | Evidencia |
|---|---|---|---|---|
| 1 | Rama de trabajo | `etapa4-orquestacion` desde `master`. | — | rama visible |
| 2 | Diagrama de componentes | Mermaid (o equivalente) mostrando API, módulo IA, RAG, orquestador, segundo sistema, almacenamiento. | claridad de la arquitectura | `docs/arquitectura-etapa4.md` |
| 3 | Flujo de datos extremo a extremo | Narrativa + diagrama de secuencia: solicitud entra → clasificar → RAG → redactar → decidir escalar → integración con segundo sistema → trazabilidad. | claridad de la arquitectura | mismo documento |
| 4 | ADR-001 — Orquestador | Alternativa elegida (TS propio), descartadas (n8n, LangGraph.js), motivo (sin infraestructura extra, control total del flujo, curva de aprendizaje cero) y consecuencia negativa aceptada (sin UI visual de flujo, menos "vistoso" en demo). | calidad de los ADR | `docs/adr/ADR-001-orquestador.md` |
| 5 | ADR-002 — Indexación vectorial | Alternativa elegida en Etapa 3 (índice embebido local), descartadas (Pinecone/Qdrant gestionado), motivo, tamaño de fragmento, modelo de embeddings, métrica (coseno) — justificados con datos reales del corpus de políticas. | diseño de datos relacional y vectorial · calidad de los ADR | `docs/adr/ADR-002-indexacion-vectorial.md` |
| 6 | ADR-003 — Idempotencia en integración bidireccional | Alternativa elegida (clave de idempotencia propia + `Idempotency-Key` hacia el mock), descartadas, motivo. | integración bidireccional · calidad de los ADR | `docs/adr/ADR-003-idempotencia.md` |
| 7 | Pipeline de orquestación (código) | `etapa4-orquestacion/src/pipeline.ts`: clasificar (reutiliza Etapa 2) → RAG (reutiliza Etapa 3) → redactar → si `confianza < umbral`, marcar para escalar en vez de responder. | orquestación | test de integración con al menos 1 caso feliz y 1 caso de escalamiento |
| 8 | Recepción por webhook | Endpoint propio `POST /webhook/entrada` que puede recibir eventos duplicados o en desorden (igual que `servicio_mock` los envía) y los deduplica por `evento_id`. | integración bidireccional | test con el mismo evento enviado 2 veces → efecto una sola vez |
| 9 | Envío de vuelta | Cliente que llama `POST /solicitudes` del `servicio_mock` con `Idempotency-Key`, reintentos con backoff ante 429/500 (reutiliza el cliente de Etapa 1/2). | integración bidireccional | test contra el mock real |
| 10 | Estado coherente en ambos extremos | Tabla local (SQLite o extensión de `esquema.sql`) que registra el estado de sincronización por evento (`pendiente/enviado/confirmado/error`). | integración bidireccional · diseño de datos relacional y vectorial | script que imprime el estado tras una corrida de prueba |
| 11 | Extensión del modelo relacional | Tabla adicional de trazabilidad (p. ej. `interacciones_ia`: id_ticket, paso del pipeline, decisión, confianza, timestamp) sobre `esquema.sql`. | diseño de datos relacional y vectorial | script SQL de migración/extensión |
| 12 | Secretos y ambientes | `.env.development` / `.env.production` (ejemplo), separación explícita de configuración por ambiente, ninguna credencial en código (ya cubierto transversalmente, aquí se documenta la separación). | secretos y ambientes | sección del documento de arquitectura |
| 13 | Control de costo | Estimación mensual de tokens usando los volúmenes reales de `n5/requerimientos_negocio.md` (3.000 solicitudes/día para clasificación, 80 consultas/día de políticas), supuestos declarados (tokens promedio por llamada), presupuesto máximo, mecanismo de alerta (log de advertencia al cruzar el 80%), y qué hace el sistema al superarlo (modo degradado / cola de espera para lo no urgente). | costo y capacidad | `docs/control-costo-etapa4.md` |
| 14 | Demo mínima parcial | Levantar el pipeline con al menos un caso end-to-end real (clasificar → RAG → respuesta), aunque el escalamiento y la integración bidireccional queden como stub documentado. | orquestación · escalabilidad y mantenibilidad | grabación o log de una corrida real, referenciado en el README |
| 15 | README de la etapa | Qué quedó funcionando de verdad vs. qué quedó solo diseñado — declarar el límite explícitamente (regla 6 del Anexo A: reconocerlo suma). | (transversal) | `etapa4-orquestacion/README.md` |

## 5. Estructura sugerida de cada ADR

```
# ADR-00X — <decisión>
## Contexto
## Alternativa elegida
## Alternativas descartadas (y por qué)
## Consecuencias (incluida al menos una negativa aceptada)
```

## 6. Errores y casos de borde explícitos

- Evento de webhook duplicado → no debe generar una segunda solicitud en el
  `servicio_mock`.
- `servicio_mock` no disponible durante el envío de vuelta → el estado local
  queda en `pendiente/error`, no se pierde el evento.
- Confianza de clasificación justo en el umbral → comportamiento
  determinístico y documentado (p. ej. `>= umbral` escala, no es ambiguo).

## 7. Definición de "hecho"

- Documento de arquitectura + 3 ADR completos, sin placeholders.
- Al menos un recorrido end-to-end real ejecutado y registrado (no solo
  descrito).
- Extensión de datos y estimación de costo documentadas con números
  trazables a `requerimientos_negocio.md`.
- README de la etapa declara honestamente el alcance funcional real.
