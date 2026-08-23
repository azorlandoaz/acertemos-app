# Changelog

Formato basado en [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).

## [Unreleased]

### Added

- Estructura inicial del repositorio para la prueba técnica de nivelación IA (Anexo A, PC-GTH-68-AN1-A): README raíz, `.gitignore` y este changelog.
- Spec de arquitectura general (`docs/superpowers/specs/2026-08-22-arquitectura-general-design.md`): estructura de repositorio, convenciones transversales (proveedor de IA abstraído, secretos, testing, observabilidad, Git, CI) y secuencia de trabajo para las 5 etapas.
- Spec por etapa con derivación de tareas, criterios de rúbrica y definición de "hecho" para Etapa 1 (Fundamentos), Etapa 2 (Autonomía e integración, incluye diagnóstico de los 3 defectos de `legacy_module.py`), Etapa 3 (RAG y calidad), Etapa 4 (Arquitectura y orquestación) y Etapa 5 (Estrategia técnica y evaluación, incluye análisis de los 3 requerimientos de negocio y hallazgos de `pr_para_revision.diff`).
- Plan de implementación de la Etapa 1 (`docs/superpowers/plans/2026-08-22-etapa1-fundamentos-plan.md`), con 11 tareas TDD paso a paso.
- Plan de implementación de la Etapa 2 (`docs/superpowers/plans/2026-08-22-etapa2-autonomia-integracion-plan.md`), con 17 tareas TDD: API Express/TypeScript, fixes del legacy, clasificador de IA desacoplado (heurística + adapter HTTP genérico), roles y contratos, Swagger UI y dockerización de los 3 servicios.
- Plan de implementación de la Etapa 3 (`docs/superpowers/plans/2026-08-22-etapa3-rag-calidad-plan.md`), con 15 tareas TDD: ingesta y fragmentación de PDF, embeddings con cache, base vectorial local (JSON + coseno, ADR-004), endpoint `POST /consultas` con citación y abstención, instrumentación, pipeline de CI, informe de seguridad y guía para el equipo. Introduce npm workspaces para reutilizar `IAProvider` de `etapa2-api` sin duplicarlo.

### Changed

- Spec de Etapa 1 ampliado con dockerización de la base de datos (MariaDB vía Docker Compose montando `esquema.sql`) y pruebas automatizadas que verifican tablas, columnas y disponibilidad del servicio.
- Spec de Etapa 2 ampliado con dockerización de los 3 servicios (API, MariaDB, `servicio_mock`), documentación servida como Swagger UI interactivo en `/docs`, y un nuevo archivo `docs/roles-y-contratos.md` con matriz de roles/permisos y contrato por endpoint, respaldado por un middleware de autorización ligero por header `X-Role`.
