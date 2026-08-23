# Etapa 2 — Autonomía e integración

En construcción. Ver `docs/superpowers/specs/2026-08-22-etapa2-autonomia-integracion-design.md`.

## Instalación

```bash
cp etapa2-api/.env.example etapa2-api/.env
```

## Prompt de clasificación (v1)

Few-shot con 4 ejemplos reales del histórico, exige salida JSON estricta
para evitar post-procesamiento frágil de texto libre. Ver
`src/ia/prompts.ts`.
