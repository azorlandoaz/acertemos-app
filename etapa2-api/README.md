# Etapa 2 — Autonomía e integración

API REST de Mesa de Ayuda: crear, consultar y listar solicitudes, con
clasificación automática por IA (desacoplada del proveedor) y
autorización por rol.

## Instalación

```bash
cd etapa2-api
npm install
cp .env.example .env
```

## Ejecución

```bash
npm run dev        # desarrollo
npm test           # suite de pruebas
```

Documentación interactiva: http://localhost:3000/docs
Roles y contratos: [`docs/roles-y-contratos.md`](docs/roles-y-contratos.md)

## Qué resuelve y para quién

El área de Aplicaciones recibe solicitudes en texto libre; esta API les
da estructura (crear/consultar/listar), las clasifica automáticamente
por categoría y prioridad, y expone quién puede hacer qué mediante
roles — para que Talento Humano y las áreas de negocio puedan
integrarse sin depender de la mesa de ayuda manual.

## Prompt de clasificación (v1)

Few-shot con 4 ejemplos reales del histórico, exige salida JSON estricta
para evitar post-procesamiento frágil de texto libre. Ver
`src/ia/prompts.ts`.

## Qué se supuso

- Persistencia en memoria para esta etapa (ver Decisión D1 del plan de
  implementación); no sobrevive un reinicio del proceso.
- Catálogo de categorías inferido del histórico de tickets (no hay un
  catálogo oficial de 12 categorías en los materiales entregados);
  ajustar si difiere del catálogo real de servicios.
- Autorización simplificada por header `X-Role`, sin autenticación
  completa (ver `docs/roles-y-contratos.md`).

## Qué quedó fuera

- Pantalla Angular (opcional con puntaje, no incluida en este plan).
