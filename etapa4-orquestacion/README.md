# Etapa 4 — Orquestación

## Instalación y ejecución

Desde la raíz del monorepo (npm workspaces):
```bash
npm install
npm run build --workspace etapa2-api
npm run build --workspace etapa3-rag
npm run build --workspace etapa4-orquestacion
cp etapa4-orquestacion/.env.example etapa4-orquestacion/.env   # completar credenciales si hay proveedor real
cd etapa4-orquestacion && npm run dev
```

Para la demo end-to-end real no hace falta ningún paso manual adicional:
`responderConsulta()` (Etapa 3) resuelve el índice vectorial de forma
relativa a la ubicación de su propio módulo, no al directorio de trabajo
del proceso que lo importa — ver el comentario en
`etapa3-rag/src/servicioConsultas.ts::rutaIndice()` y en
`etapa4-orquestacion/src/scripts/demo.ts` para el detalle técnico
completo. Basta con generar el índice una vez y tener el `.env`:
```bash
npm run ingestar --workspace etapa3-rag   # genera etapa3-rag/data/indice_vectorial.json (una sola vez)
cp etapa4-orquestacion/.env.example etapa4-orquestacion/.env   # cargarConfig() exige estas variables, aunque HeuristicProvider no las use
cd etapa4-orquestacion
npm run demo
npm run estado
```

## Qué quedó funcionando de verdad

- Pipeline completo (clasificar → RAG → decidir escalar) ejecutado de
  extremo a extremo con datos reales, sin ningún paso manual — ver
  `docs/evidencia-demo-etapa4.log` para la corrida real registrada tras
  el fix del índice vectorial (ver Fix 4 de la revisión final de rama).
  Resultado real de esa corrida:
  - `demo-1` ("¿Con cuánta anticipación debo pedir mis vacaciones?"):
    categoría `Vacaciones`, acción `responder`, cita
    `POL-TIC-03_Gestion_de_Accesos.pdf` sección 4.
  - `demo-2` ("¿Cuál es la política de horarios de teletrabajo los
    viernes?"): categoría `Sin clasificar`, acción `escalar`, cita
    `POL-TIC-03_Gestion_de_Accesos.pdf` sección 1.
  - El mecanismo funciona correctamente (ambos casos produjeron una
    decisión y quedaron trazados como `enviado` en `estado_sync.json`,
    ver `npm run estado`), pero la calidad semántica de la citación RAG
    hereda la limitación ya documentada en `etapa3-rag/README.md`: sin
    proveedor de IA real en este entorno, el caso de vacaciones citó el
    documento equivocado en vez del correcto (`POL-GTH-01_Vacaciones.pdf`)
    — `HeuristicProvider` no discrimina semánticamente de forma
    confiable, aunque el mecanismo de citación en sí esté bien
    implementado.
  - **Honestidad adicional:** en ambos casos, el campo `respuesta` de la
    corrida real es literalmente
    `"El servicio de generación de respuestas no está disponible en este
    momento."` — el mensaje de respaldo fijo de
    `HeuristicProvider.generarRespuesta`, no una respuesta generada de
    verdad. En este entorno de evaluación no hay proveedor de IA real
    disponible (mismo motivo documentado en `etapa3-rag/README.md`), así
    que el texto de `respuesta` no debe leerse como evidencia de
    generación de lenguaje natural — sí lo son la clasificación, la
    decisión de escalamiento y la citación de documento/sección, que
    dependen de la heurística y del índice vectorial, no del proveedor de
    generación de texto.
- Deduplicación de eventos entrantes por `evento_id`, verificada con test
  automatizado (mismo evento dos veces → un solo procesamiento). Un
  evento cuyo pipeline falla se marca `error` (no se queda `pendiente`
  para siempre) y puede reprocesarse si se reenvía el mismo `evento_id`.
- Cliente de envío hacia `servicio_mock` con `Idempotency-Key` y
  reintentos ante 429/500 y ante fallo de red (ECONNREFUSED, servicio no
  disponible), verificado con tests reales contra el mock corriendo (no
  mockeado en red).
- Registro de estado de sincronización (`pendiente/enviado/confirmado/error`)
  persistido en disco, consultable con `npm run estado`.
- Tabla `interacciones_ia` de trazabilidad, migración verificada contra un
  MariaDB real (mismo contenedor Docker de Etapa 2).
- Forma de error uniforme también para rutas no encontradas (404) y
  errores no capturados dentro de los handlers (`errorHandler`
  reutilizado de Etapa 2), registro estructurado por request
  (`requestLogger`) y `GET /metricas` (reutilizando `resumenMetricas` de
  Etapa 3) — cierra la brecha de observabilidad transversal que tenían
  Etapa 2 y Etapa 3 y que a esta etapa le faltaba.

## Qué quedó solo diseñado (documentado, no ejecutado en producción)

- El envío de vuelta (Tarea 9) no está todavía conectado automáticamente
  al final del pipeline del webhook (Tarea 8) — el pipeline se ejecuta y
  registra el resultado, pero la llamada real a `enviarSolicitud` con el
  resultado del pipeline queda como siguiente paso documentado, no
  conectada en el flujo HTTP en vivo. Se declara honestamente en vez de
  simular una integración completa no verificada extremo a extremo bajo
  carga concurrente real.
- El acumulador mensual de presupuesto de tokens (Tarea 11) está
  especificado con su mecanismo de alerta, pero no implementado como
  proceso en ejecución continua — es responsabilidad de un despliegue real
  con un job programado, fuera del alcance de 3 días.
- Sin UI visual del flujo de orquestación (decisión de ADR-001) — la
  evidencia de ejecución es el log estructurado, no una vista gráfica.

## Documentos de esta etapa

- Arquitectura y flujo end-to-end: `docs/arquitectura-etapa4.md`
- ADR-001 (orquestador), ADR-002 (indexación vectorial), ADR-003
  (idempotencia): `docs/adr/`
- Control de costo y capacidad: `docs/control-costo-etapa4.md`
- Migración de trazabilidad relacional:
  `materiales/datos/migraciones/002_interacciones_ia.sql`
