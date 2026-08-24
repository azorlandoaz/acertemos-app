# Correo de entrega — Anexo A (PC-GTH-68-AN1-A)

Borrador listo para copiar y enviar al canal habilitado por LA FORTUNA S.A.
para la prueba técnica de nivelación. Los campos entre `[corchetes]` hay
que completarlos antes de enviarlo — no son datos que este repositorio
pueda saber por sí solo.

---

**Para:** `[correo del canal habilitado / evaluador]`
**De:** `[tu correo]`
**Asunto:** Entrega prueba técnica de nivelación IA — PC-GTH-68-AN1-A — `[Tu nombre completo]`

Hola,

Adjunto la entrega de la prueba técnica de nivelación de la familia de
cargos IA (Anexo A, código PC-GTH-68-AN1-A).

**Nivel objetivo declarado:** `[el nivel que declaraste en el formulario de inicio]`

**Repositorio:** `[enlace al repositorio]`
(rama `master`, con las 5 etapas y todos los entregables ya fusionados)

## Resumen de lo entregado

Completé y acredité las cinco etapas del reto práctico:

| Etapa | Nivel | Carpeta |
|---|---|---|
| 1 — Fundamentos | Desarrollador IA Junior I | `etapa1-fundamentos/` |
| 2 — Autonomía e integración | Desarrollador IA Junior II | `etapa2-api/` |
| 3 — Complejidad y calidad | Desarrollador IA Junior III | `etapa3-rag/` |
| 4 — Arquitectura y orquestación | Ingeniero IA Middle I | `etapa4-orquestacion/` |
| 5 — Estrategia técnica y evaluación | Ingeniero IA Middle II | `etapa5-estrategia/` |

Para las Etapas 4 y 5 seguí el alcance que el propio Anexo A permite para
la versión de tres días: el énfasis está en el documento de diseño y las
decisiones, con una demostración parcial del flujo, no un sistema
productivo completo.

Además, fuera del alcance calificado, construí un cliente Angular que
consume la API real de la Etapa 2 (`etapa2-frontend/` en el historial de
`git`) — lo aclaro para que no se confunda con un entregable de la
rúbrica.

## Dónde está cada entregable del numeral 8

- **README raíz**: `README.md` — hasta qué etapa se llegó y dónde está cada
  entregable.
- **Documentos**: carpeta `/docs` (specs, ADR de la Etapa 4, informes de
  seguridad, documento de decisión y comparación de enfoques de la
  Etapa 5, estándar de ingeniería propuesto).
- **Video de recorrido** (máx. 5 min): `[enlace al video una vez grabado]`
  — el guion de apoyo que usé está en `docs/video/guion-recorrido.md`.
- **Revisión escrita de `pr_para_revision.diff`**: `docs/seguridad/revision-pr.md`.
- **Declaración de uso de asistentes de IA**: sección homónima en
  `README.md` (numeral 6).
- **Autoevaluación de competencias (formato PC-GTH-68)**: `[adjunta aparte / enlace al formulario]`.

## Qué quedó fuera, con honestidad

No tuve un proveedor de IA real disponible en este entorno de evaluación,
así que todo el sistema corre en modo heurístico de respaldo
(`HeuristicProvider`) — está documentado y, en la Etapa 5, medido: la
precisión de citación del RAG con ese heurístico es del 29 % y la de
abstención del 0 %, muy por debajo de lo que un embedding semántico real
daría. El resto de límites conocidos están declarados en el README de cada
etapa y en `docs/`.

Quedo atento a cualquier duda antes de la sustentación.

Saludos,
`[Tu nombre]`
