# Mesa de Ayuda Inteligente — Prueba técnica de nivelación IA

**LA FORTUNA S.A. · Gestión del Talento Humano — Gestión TIC**
Anexo A, código PC-GTH-68-AN1-A.

> Estado: en construcción. Este README se actualizará en cada etapa entregada
> para indicar hasta dónde se llegó y dónde está cada entregable, tal como
> exige el numeral 8 del Anexo A.

## Nivel objetivo declarado

_Pendiente de declarar en el formulario de inicio._

## Etapas y estado

| Etapa | Nivel | Estado |
|---|---|---|
| 1 — Fundamentos | Desarrollador IA Junior I | Completa — ver `etapa1-fundamentos/` |
| 2 — Autonomía e integración | Desarrollador IA Junior II | Completa — ver `etapa2-api/` |
| 3 — Complejidad y calidad | Desarrollador IA Junior III | Completa — ver `etapa3-rag/` |
| 4 — Arquitectura y orquestación | Ingeniero IA Middle I | Completa — ver `etapa4-orquestacion/` |
| 5 — Estrategia técnica y evaluación | Ingeniero IA Middle II | Completa — ver `etapa5-estrategia/` |

## Documentación

Specs de diseño y planes de implementación en `docs/superpowers/specs/`.
Materiales de entrada originales (datos, políticas, servicio simulado) en `materiales/`.

## Declaración de uso de asistentes de IA

Herramienta: **Claude Code** (CLI agéntico de Anthropic), con el plugin
**Superpowers** como metodología de trabajo (`brainstorming` → spec → plan →
`subagent-driven-development` → revisión final de rama, repetido para cada
etapa y para el cliente Angular fuera de alcance). Modelos Claude usados,
por rol:

- **Claude Sonnet 5** — coordinador de la sesión de principio a fin, y la
  mayoría de los subagentes implementadores/revisores de tareas de
  integración y juicio (API REST, módulo de IA, RAG, orquestación, suite de
  evaluación, cliente Angular).
- **Claude Haiku 4.5** — subagentes de tareas mecánicas: transcripción de
  documentación cuyo contenido exacto ya venía especificado en el plan, y
  revisión de esas mismas tareas solo-documentales.
- **Claude Opus 5** — exclusivamente para la revisión final de cada rama
  completa (la de mayor riesgo: mira el diff acumulado de todas las tareas
  de la etapa contra el diseño, no una tarea aislada).

No se usaron otros asistentes de IA (ni Copilot, ni ChatGPT, ni modelos
locales) en ningún punto del reto práctico.

| Pregunta | Respuesta |
|---|---|
| **¿Qué herramientas usaste y para qué?** | Claude Code con la metodología Superpowers descrita arriba, para las cinco etapas completas: diseño (specs), planificación (planes de implementación con TDD paso a paso), ejecución (subagentes frescos por tarea, sin memoria del resto del proyecto) y revisión (un subagente distinto al que implementó, contra el diff real, nunca contra el reporte del implementador sin comprobar). Yo aprobé cada spec antes de pasar al plan, cada plan antes de ejecutarlo, y cada decisión de cierre de rama (merge/push). |
| **¿Qué generaste y conservaste tal cual?** | El andamiaje de cada subproyecto (`package.json`, `tsconfig`, configuración de Vitest/pytest, estructura generada por `ng new`/`ng add`), y todo el código cuyo plan ya traía el contenido exacto y que la revisión independiente confirmó fiel sin desviaciones — la mayoría de los archivos de las 5 etapas. |
| **¿Qué generaste, tuviste que corregir y por qué?** | Ejemplos reales, con causa raíz, encontrados por las revisiones de este mismo repositorio: en Etapa 3, los espacios de embedding de ingesta y consulta eran incompatibles (usaban proveedores distintos) — se corrigió para que ambos usen el mismo proveedor. En Etapa 5, `metricas_previas.md` asumía a priori que la abstención sería fácil de acertar (≥80%); la medición real contra el proveedor heurístico dio 0%, por un sesgo geométrico del embedding de 2 dimensiones — se corrigió el umbral con la evidencia documentada, no se maquilló el número. En el cliente Angular, un mapeo de errores del servidor a un formulario llamaba `setErrors()` sin `markAsTouched()`, dejando el mensaje de error invisible para el usuario en un campo nunca enfocado — encontrado en revisión de tarea, corregido en una línea. La revisión final de cada rama encontró, en promedio, 3–7 hallazgos "Important" invisibles a nivel de tarea individual (p. ej. en Etapa 4: contrato de error inconsistente, eventos de webhook que quedaban atascados sin poder reprocesarse, reintentos que no cubrían fallos de red) — todos corregidos antes de cerrar la rama. |
| **¿Qué decidiste escribir a mano y por qué?** | Las decisiones que un revisor automático no puede tomar por sí solo: aceptar la medición real de Etapa 5 en vez de ajustar el umbral para que "se viera bien"; que `CHANGELOG.md` se consolida en un único commit al cierre de cada rama, nunca por tarea; que el cliente Angular (una adición fuera del alcance calificado) se mantiene en su propia rama sin tocar la API de Etapa 2 ya acreditada; y, en cada etapa, la aprobación explícita del diseño antes de implementar y de la estrategia de cierre (merge o Pull Request) de cada rama. |
| **¿Cómo verificaste lo generado?** | Cada tarea siguió TDD real (prueba que falla → implementación → prueba que pasa), hecha por un subagente y revisada de forma independiente por otro que verificó contra el diff real. Al cerrar cada rama, una revisión de arquitectura completa (Claude Opus 5) miró el acumulado de todas las tareas contra el diseño original. Además, evidencia real de ejecución, no simulada: pruebas contra infraestructura real (MariaDB, `servicio_mock`) en las Etapas 1–4; la corrida real del *gate* de evaluación de Etapa 5 contra el conjunto de referencia de 62 casos, con evidencia de que el *gate* falla intencionalmente ante una regresión (`docs/evidencia-gate-etapa5.log`); y, en el cliente Angular, verificación end-to-end con `curl` contra los dos servidores reales corriendo (backend + proxy de desarrollo), no solo pruebas unitarias. |
