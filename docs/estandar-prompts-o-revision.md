# Estándar de revisión de código generado por IA — Mesa de Ayuda Inteligente

Guía breve para el equipo, basada en lo encontrado durante esta prueba
(ver `docs/seguridad/informe-etapa3.md`).

## Qué se puede generar sin revisión adicional
- Andamiaje de proyecto (package.json, tsconfig, configuración de test).
- Tests que siguen un patrón ya establecido en el archivo (mismo estilo
  de aserciones, mismos mocks).
- Documentación (README, comentarios de una línea sobre causa raíz).

## Qué se revisa siempre, sin excepción
- **Límites en cualquier entrada externa** (longitud de strings, tamaño
  de archivos): el código generado tiende a validar el tipo pero no el
  tamaño. Ver Hallazgo 1 del informe de seguridad.
- **Escritura a disco**: verificar que el directorio destino se crea si
  no existe (`mkdirSync(..., { recursive: true })`), no asumir que ya
  está ahí. Ver Hallazgo 2.
- **Llamadas a servicios externos** (proveedor de IA, `servicio_mock`):
  confirmar que tienen timeout y manejo de error explícito, no solo el
  camino feliz.
- **Cualquier concatenación de texto en una consulta SQL o en un comando
  de shell**: nunca se acepta sin parametrizar (ver hallazgos de
  `pr_para_revision.diff`, Etapa 5).

## Qué nunca se acepta sin prueba
- Un fix de bug sin la prueba que falla antes y pasa después (punto
  crítico #3 del Anexo A).
- Un endpoint nuevo sin al menos un test de su caso de error (4xx/5xx),
  no solo del caso feliz.
- Una corrección de seguridad sin el hallazgo documentado (severidad,
  evidencia, corrección) — "lo arreglé" no es evidencia.
