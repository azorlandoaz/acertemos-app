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

Para la demo end-to-end real, hace falta un paso manual adicional: el
índice vectorial de Etapa 3 se resuelve por `process.cwd()`, que al correr
el script desde `etapa4-orquestacion/` no coincide con `etapa3-rag/` —
ver el comentario en `etapa4-orquestacion/src/scripts/demo.ts` para el
detalle técnico completo.
```bash
npm run ingestar --workspace etapa3-rag   # genera etapa3-rag/data/indice_vectorial.json (una sola vez)
cp etapa3-rag/data/indice_vectorial.json etapa4-orquestacion/data/indice_vectorial.json
cp etapa4-orquestacion/.env.example etapa4-orquestacion/.env   # cargarConfig() exige estas variables, aunque HeuristicProvider no las use
cd etapa4-orquestacion
npm run demo
npm run estado
```

## Qué quedó funcionando de verdad

- Pipeline completo (clasificar → RAG → decidir escalar) ejecutado de
  extremo a extremo con datos reales — ver `docs/evidencia-demo-etapa4.log`
  para la corrida real registrada. El mecanismo funciona correctamente
  (ambos casos produjeron una decisión y quedaron trazados en
  `estado_sync.json`), pero la calidad semántica de la citación RAG
  hereda la limitación ya documentada en `etapa3-rag/README.md`: sin
  proveedor de IA real en este entorno, el caso de vacaciones citó
  `POL-TIC-03_Gestion_de_Accesos.pdf` en vez del documento correcto
  (`POL-GTH-01_Vacaciones.pdf`) — `HeuristicProvider` no discrimina
  semánticamente de forma confiable, aunque el mecanismo de citación en
  sí esté bien implementado.
- Deduplicación de eventos entrantes por `evento_id`, verificada con test
  automatizado (mismo evento dos veces → un solo procesamiento).
- Cliente de envío hacia `servicio_mock` con `Idempotency-Key` y
  reintentos ante 429/500, verificado con tests reales contra el mock
  corriendo (no mockeado en red).
- Registro de estado de sincronización (`pendiente/enviado/confirmado/error`)
  persistido en disco, consultable con `npm run estado`.
- Tabla `interacciones_ia` de trazabilidad, migración verificada contra un
  MariaDB real (mismo contenedor Docker de Etapa 2).

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
