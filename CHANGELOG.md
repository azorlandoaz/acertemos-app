# Changelog

Formato basado en [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).

## [Unreleased]

### Added

- Estructura inicial del repositorio para la prueba técnica de nivelación IA (Anexo A, PC-GTH-68-AN1-A): README raíz, `.gitignore` y este changelog.
- Spec de arquitectura general (`docs/superpowers/specs/2026-08-22-arquitectura-general-design.md`): estructura de repositorio, convenciones transversales (proveedor de IA abstraído, secretos, testing, observabilidad, Git, CI) y secuencia de trabajo para las 5 etapas.
- Spec por etapa con derivación de tareas, criterios de rúbrica y definición de "hecho" para Etapa 1 (Fundamentos), Etapa 2 (Autonomía e integración, incluye diagnóstico de los 3 defectos de `legacy_module.py`), Etapa 3 (RAG y calidad), Etapa 4 (Arquitectura y orquestación) y Etapa 5 (Estrategia técnica y evaluación, incluye análisis de los 3 requerimientos de negocio y hallazgos de `pr_para_revision.diff`).
