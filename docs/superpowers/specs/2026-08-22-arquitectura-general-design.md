# Arquitectura general — Mesa de Ayuda Inteligente

**Prueba técnica de nivelación IA · LA FORTUNA S.A. · Anexo A, PC-GTH-68-AN1-A**
Fecha: 2026-08-22 · Estado: aprobado para pasar a planes de implementación.

Este documento es el spec maestro. Fija las decisiones que aplican a las
cinco etapas (estructura de repo, convenciones, flujo de datos, secuencia de
trabajo) para que cada spec de etapa no tenga que repetirlas. Cada etapa
tiene su propio documento de spec, listado en la sección 8.

## 1. Propósito y alcance

Construir, por etapas acumulativas, una solución que reciba solicitudes en
texto libre (correo/formulario), las clasifique, las responda con base en
las políticas vigentes (RAG) y escale a una persona lo que no pueda
resolver. Cada etapa corresponde a un nivel de la familia de cargos IA y se
acredita solo si se acreditaron las anteriores (mínimo 60/100 puntos, ver
sección 2). Alcance declarado: **las 5 etapas**, con el mismo nivel de
detalle de spec — la profundidad de implementación real se decide en la
ejecución día a día, priorizando dejar sólidas las etapas tempranas antes de
avanzar (regla 3 y 5 del Anexo A).

## 2. Mapeo de rúbrica

| Etapa | Cargo | Criterios evaluados (0-4 c/u → 100 pts) |
|---|---|---|
| 1 — Fundamentos | Desarrollador IA Junior I | cumplimiento funcional · corrección y manejo de errores · legibilidad y estructura · uso de Git · consumo de API REST · SQL · pruebas unitarias · documentación mínima |
| 2 — Autonomía e integración | Desarrollador IA Junior II | diseño de la API · desacoplamiento del módulo de IA · robustez ante fallos · prompting y context engineering · diagnóstico y corrección de defectos · calidad de las pruebas · configuración, registro y secretos · documentación |
| 3 — Complejidad y calidad | Desarrollador IA Junior III | ingesta y fragmentación · embeddings y recuperación · fidelidad de la respuesta · integración continua · seguridad del código generado · observabilidad · modularidad y reutilización · aporte al equipo |
| 4 — Arquitectura y orquestación | Ingeniero IA Middle I | claridad de la arquitectura · calidad de los ADR · orquestación · integración bidireccional · diseño de datos relacional y vectorial · secretos y ambientes · costo y capacidad · escalabilidad y mantenibilidad |
| 5 — Estrategia técnica y evaluación | Ingeniero IA Middle II | criterio IA frente a automatización tradicional · definición previa de métricas · suite de evaluación automatizada · modelo de ML clásico · comparación de enfoques · revisión de código como referente · estándar propuesto · visión de negocio y riesgos |

Regla dura: **una etapa no se califica si la anterior no alcanzó 60/100.**
No conviene saltar adelante en la implementación real, aunque los 5 specs
existan desde ya.

## 3. Estructura del repositorio

```
/
├── README.md                       ← estado global, hasta qué etapa se llegó
├── CHANGELOG.md
├── declaracion_uso_ia.md           ← numeral 6 del Anexo A
├── docs/
│   ├── superpowers/specs/          ← este documento + 5 specs de etapa
│   ├── adr/                        ← ADR-001..003 (Etapa 4)
│   ├── seguridad/                  ← informe de seguridad (Etapa 3) y revisión del diff (Etapa 5)
│   └── video/                      ← guion o enlace del video de recorrido
├── materiales/                     ← ya existe; fuente de verdad de datos/políticas, no se modifica
├── etapa1-fundamentos/             ← Python: script de limpieza, SQL, cliente del mock, tests
├── etapa2-api/                     ← Node/TS: API REST, módulo IA desacoplado; legacy/ en Python (fix in situ)
├── etapa3-rag/                     ← Node/TS: ingesta, embeddings, endpoint RAG
├── etapa4-orquestacion/            ← Node/TS: pipeline multi-paso, integración bidireccional, demo parcial
├── etapa5-estrategia/              ← doc. de decisión, notebook Python (ML clásico), suite de evaluación
└── .github/workflows/ci.yml
```

Cada carpeta de etapa contiene su propio `README.md` (instalación, ejecución,
qué hace, qué se supuso, qué quedó fuera — exigido por el Anexo en cada
etapa).

## 4. Convenciones transversales

### 4.1 Proveedor de IA abstraído

Interfaz `IAProvider` (TypeScript, definida en `etapa2-api/src/ia/`, reexportada
para Etapas 3 y 4):

```ts
interface IAProvider {
  clasificar(texto: string): Promise<{ categoria: string; confianza: number }>;
  generarRespuesta(prompt: string, contexto: string[]): Promise<string>;
  embeber(textos: string[]): Promise<number[][]>;
}
```

- La lógica de negocio depende solo de esta interfaz, nunca del SDK del
  proveedor concreto (punto crítico #4).
- Implementación real + implementación heurística de respaldo (modo
  degradado: reglas por palabras clave para clasificar, mensaje fijo de
  "no disponible" para generación) activada cuando el proveedor falla tras
  reintentos con backoff exponencial y un timeout configurable.
- El proveedor concreto (Anthropic/OpenAI/local) se decide al implementar
  Etapa 2 y se declara en `.env` — no bloquea el spec.

### 4.2 Secretos y configuración

- `.env` + `.env.example` por cada subproyecto Node; `.env` está en
  `.gitignore` desde el commit inicial.
- Validación de variables requeridas al arranque (falla rápido con mensaje
  claro si falta una).
- Ningún secreto — ni el token demo del `servicio_mock`
  (`demo-token-prueba-2026`) — queda hardcodeado en código fuente; siempre
  vía variable de entorno, aunque sea un token de prueba.

### 4.3 Testing

- Python (Etapa 1, fix del legacy en Etapa 2, notebook de Etapa 5):
  `pytest`, con casos de borde explícitos.
- Node/TS (Etapas 2-4): `vitest` + `supertest` para los endpoints HTTP.
- Regla transversal del Anexo (punto crítico #3): cada corrección de defecto
  se entrega con la prueba que falla antes y pasa después, más una línea de
  causa raíz.

### 4.4 Observabilidad

- Logging estructurado en JSON (`pino` en Node, `logging`/`structlog` en
  Python) con `requestId` de correlación.
- Middleware/decorador que registra latencia y tokens consumidos en cada
  llamada al `IAProvider`, con un resumen agregado expuesto (script o
  endpoint `/metricas`) desde Etapa 3 en adelante.

### 4.5 Git y trazabilidad

- Una rama de trabajo por etapa (`etapa1-fundamentos`, `etapa2-api`, …),
  distinta de `master`.
- Commits atómicos y frecuentes (mínimo 8 en Etapa 1; se mantiene la misma
  disciplina en el resto) — nunca un commit único de entrega (punto crítico
  #12).
- La definición de métricas de Etapa 5 (sección 3 de su spec) se commitea
  **antes** de cualquier commit de implementación del clasificador o del
  RAG, para que quede evidenciado en el historial (punto crítico #11).

### 4.6 Integración continua

- Un solo `ci.yml` con jobs separados por subproyecto (Python: lint +
  pytest; Node: lint + typecheck + vitest), disparado en cada push/PR.
- Etapa 3 exige mostrar una ejecución exitosa y una fallida: se logra con un
  commit intermedio que introduce un test que falla a propósito (documentado
  como tal) seguido del commit que lo corrige; ambas corridas quedan en el
  historial de Actions y se referencian en `docs/seguridad/` o en el README
  de Etapa 3 con capturas.

## 5. Flujo end-to-end del sistema

```mermaid
flowchart LR
    A[Solicitud\ncorreo / formulario] --> B[Etapa 1\nLimpieza histórico\n+ SQL de apoyo]
    A --> C[Etapa 2\nAPI REST]
    C --> D[Módulo IA\nclasificar categoría/prioridad]
    D -->|confianza alta| E[Etapa 3\nRAG sobre políticas]
    E -->|evidencia encontrada| F[Respuesta con cita\ndocumento + sección]
    E -->|sin evidencia| G[Abstención:\n"no tengo evidencia"]
    D -->|confianza baja| H[Escalar a persona]
    F --> I[Etapa 4\nOrquestación]
    G --> I
    H --> I
    I --> J[Integración bidireccional\nsegundo sistema simulado]
    I --> K[(Registro y trazabilidad\nesquema.sql extendido)]
```

Etapa 1 y sus tres SQL alimentan el conocimiento del histórico que se
reutiliza como conjunto de referencia en Etapa 5. Etapa 4 es la orquestación
completa del camino D→E/F/G→I; en la versión de 3 días esta etapa se
demuestra parcialmente y se sustenta con el documento de arquitectura.

## 6. Secuencia de trabajo (3 días, 10-12 h de esfuerzo)

| Día | Foco | Nota de trazabilidad |
|---|---|---|
| 1 | Etapa 1 completa. Arranque de Etapa 2 (esqueleto de API + interfaz `IAProvider`). | Commit temprano de `etapa5-estrategia/metricas_previas.md` y del conjunto de referencia ampliado (≥50 casos), aunque su implementación llegue el día 3 — es lo que exige el punto crítico #11. |
| 2 | Cierre de Etapa 2 (fixes del legacy, módulo IA, docs). Etapa 3 completa (RAG, CI, informe de seguridad, instrumentación). | Commit intermedio con test fallido a propósito + commit de arreglo, para la evidencia de CI de Etapa 3. |
| 3 | Etapa 4 (documento de arquitectura + ADRs + demo parcial). Etapa 5 (documento de decisión, notebook ML, suite de evaluación, revisión del diff). Video de recorrido, declaración de uso de IA, README final. | Cierre y entrega antes de las 6:00 p. m. |

Si un día se atrasa, se prioriza cerrar la etapa en curso al mínimo de 60/100
antes de abrir la siguiente (regla 3 del Anexo A) — no extender esfuerzo en
una etapa más allá del punto de rendimiento decreciente (regla 5).

## 7. Entregables finales (numeral 8 del Anexo A)

- [ ] Repositorio con historial real (este repo).
- [ ] README raíz actualizado con hasta qué etapa se llegó.
- [ ] Documentos en `/docs` (PDF o Markdown).
- [ ] Video de recorrido (máx. 5 min).
- [ ] Revisión escrita de `pr_para_revision.diff` (Etapa 5).
- [ ] `declaracion_uso_ia.md`.
- [ ] Autoevaluación de competencias (formato PC-GTH-68, fuera del repo de código).

## 8. Specs de etapa

| Spec | Cubre |
|---|---|
| [`2026-08-22-etapa1-fundamentos-design.md`](2026-08-22-etapa1-fundamentos-design.md) | Script de limpieza, cliente del `servicio_mock`, 3 SQL, tests, README |
| [`2026-08-22-etapa2-autonomia-integracion-design.md`](2026-08-22-etapa2-autonomia-integracion-design.md) | API REST, módulo IA desacoplado, corrección de `legacy_module.py` |
| [`2026-08-22-etapa3-rag-calidad-design.md`](2026-08-22-etapa3-rag-calidad-design.md) | RAG, abstención, CI, seguridad, observabilidad |
| [`2026-08-22-etapa4-arquitectura-orquestacion-design.md`](2026-08-22-etapa4-arquitectura-orquestacion-design.md) | Documento de arquitectura, ADRs, orquestación, integración bidireccional |
| [`2026-08-22-etapa5-estrategia-evaluacion-design.md`](2026-08-22-etapa5-estrategia-evaluacion-design.md) | Decisión IA vs tradicional, métricas previas, ML clásico, revisión del diff |

## 9. Siguiente paso

Cada spec de etapa pasa individualmente por `writing-plans` para generar su
plan de implementación, y luego se ejecuta con
`subagent-driven-development`, en el orden de la sección 6 — nunca en
paralelo entre etapas, porque cada una depende de que la anterior haya
acreditado el mínimo.
