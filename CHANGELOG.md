# Changelog

Formato basado en [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).

## [Unreleased]

### Added

- Estructura inicial del repositorio para la prueba técnica de nivelación IA (Anexo A, PC-GTH-68-AN1-A): README raíz, `.gitignore` y este changelog.
- Spec de arquitectura general (`docs/superpowers/specs/2026-08-22-arquitectura-general-design.md`): estructura de repositorio, convenciones transversales (proveedor de IA abstraído, secretos, testing, observabilidad, Git, CI) y secuencia de trabajo para las 5 etapas.
- Spec por etapa con derivación de tareas, criterios de rúbrica y definición de "hecho" para Etapa 1 (Fundamentos), Etapa 2 (Autonomía e integración, incluye diagnóstico de los 3 defectos de `legacy_module.py`), Etapa 3 (RAG y calidad), Etapa 4 (Arquitectura y orquestación) y Etapa 5 (Estrategia técnica y evaluación, incluye análisis de los 3 requerimientos de negocio y hallazgos de `pr_para_revision.diff`).
- Plan de implementación de la Etapa 1 (`docs/superpowers/plans/2026-08-22-etapa1-fundamentos-plan.md`), con 11 tareas TDD paso a paso.
- Helper de conexión a MariaDB (`etapa1-fundamentos/src/db.py`) con reintentos y manejo de errores, junto con suite completa de pruebas de esquema (`etapa1-fundamentos/tests/test_esquema_bd.py`) que verifican disponibilidad del servicio, existencia de tablas y tipos de datos.

### Changed

- Spec de Etapa 1 ampliado con dockerización de la base de datos (MariaDB vía Docker Compose montando `esquema.sql`) y pruebas automatizadas que verifican tablas, columnas y disponibilidad del servicio.
