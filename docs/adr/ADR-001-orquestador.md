# ADR-001 — Orquestador del pipeline multi-paso

## Contexto
Etapa 4 necesita encadenar clasificar → RAG → decidir escalar →
integración bidireccional, con trazabilidad de cada paso, dentro de una
prueba técnica de 3 días y sin infraestructura adicional que provisionar.

## Alternativa elegida
Implementación propia en TypeScript: una función secuencial
(`pipeline.ts`) que llama directamente a `ClasificadorService` (Etapa 2) y
`responderConsulta` (Etapa 3), sin motor de estados ni cola de mensajes.

## Alternativas descartadas (y por qué)
- **n8n (u otra herramienta low-code de orquestación visual):** requiere
  levantar y mantener un servicio adicional, aprender su modelo de nodos, y
  su valor (UI visual del flujo) no compensa la fricción de instalación en
  3 días para un pipeline de 3 pasos.
- **LangGraph.js (framework de agentes/grafos):** pensado para flujos con
  ramificación dinámica y estado complejo entre múltiples pasos de LLM;
  aquí el flujo es lineal y determinista (clasificar → RAG → decidir), así
  que el framework añade una capa de abstracción sin beneficio real y una
  curva de aprendizaje no amortizada en el tiempo disponible.

## Consecuencias
- Positiva: cero infraestructura nueva, control total y explícito del
  flujo, reutiliza exactamente las mismas piezas ya probadas de Etapas 2-3,
  curva de aprendizaje cero para quien lea el código.
- Negativa aceptada: sin UI visual del flujo — para demostrarlo en la
  entrega se depende del log estructurado y del script de demo (Tarea 12),
  no de una vista gráfica en vivo. Si el pipeline creciera a más de ~5-6
  pasos con ramificación condicional real, esta decisión se reconsideraría.
