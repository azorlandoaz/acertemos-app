# Estándar de ingeniería propuesto — código generado con asistencia de IA

Basado en los hallazgos reales de este repositorio:
`docs/seguridad/revision-pr.md` (código legacy, 5 hallazgos) y
`docs/seguridad/informe-etapa3.md` (código propio de este repo generado con
IA, 3 hallazgos de disponibilidad/costo). El patrón compartido entre ambos:
código correcto para el caso feliz, sin las validaciones de borde que un
revisor humano pide — con o sin IA de por medio, ese es el riesgo real a
prevenir.

## Qué se permite generar con IA sin revisión adicional

- Código de andamiaje repetitivo con un patrón ya establecido en el repo
  (otro endpoint siguiendo la misma forma que uno ya revisado, otro test
  con la misma estructura que uno ya aprobado).
- Documentación descriptiva (comentarios de una línea, README) sobre código
  ya revisado — nunca sobre código todavía sin revisar, para no
  "legitimar" un defecto con una descripción convincente.
- Boilerplate de configuración (tsconfig, package.json) que sigue un
  template ya usado en el mismo monorepo.

## Qué se revisa siempre (sin excepción, aunque "se vea bien")

- **Secretos**: cualquier string que parezca una API key, token o
  contraseña — grep de patrones comunes (`sk-`, `Bearer `, `AKIA`, etc.)
  antes de aprobar cualquier PR con código nuevo. Ver Hallazgo 1 de
  `docs/seguridad/revision-pr.md`.
- **Construcción de SQL**: cualquier `execute()`/`query()` — si hay
  concatenación o `%`-formatting de un valor externo dentro del string SQL,
  se rechaza sin excepción, sin importar si el valor "parece" seguro. Ver
  Hallazgo 2 de `docs/seguridad/revision-pr.md`. Regla operacional: un
  `grep -n '" +\|%s"\|f"SELECT\|f"UPDATE'` sobre el diff de cualquier PR que
  toque acceso a datos, antes de aprobar.
- **Manejo de errores en llamadas a servicios externos** (incluido
  cualquier proveedor de IA): timeout explícito, manejo de excepciones de
  red/formato, y la llamada aislada detrás de una interfaz propia (patrón
  `IAProvider` de este repo) — nunca el SDK/HTTP del proveedor invocado
  directamente en la lógica de negocio. Ver Hallazgo 3 de
  `docs/seguridad/revision-pr.md` y Hallazgo 1 de
  `docs/seguridad/informe-etapa3.md`.
- **Cualquier salida de un LLM usada como dato** (para un `UPDATE`, para
  una decisión de negocio, para una ruta de archivo): tratarla como entrada
  no confiable — validar formato/tipo antes de usarla, nunca concatenarla
  directamente en SQL, comandos de shell, o rutas de archivo.
- **Casos borde numéricos/de tamaño**: división por cero, colecciones
  vacías, archivos/entradas sin límite superior de tamaño. Ver Hallazgo 4 de
  `docs/seguridad/revision-pr.md` y Hallazgos 1 y 3 de
  `docs/seguridad/informe-etapa3.md` — ningún de estos es exclusivo de
  código generado por IA, pero la asistencia de IA tiende a optimizar por
  el caso feliz salvo que se le pida explícitamente cubrir el borde.

## Qué nunca se acepta sin prueba

- **Cualquier corrección de defecto**: se entrega con la prueba que falla
  antes y pasa después, más una línea de causa raíz (regla ya vigente en
  este repo, spec maestro §4.3) — sin excepción para código generado con
  IA; de hecho con mayor razón, porque el autor humano no escribió la
  lógica línea por línea y necesita la prueba como evidencia de que
  entiende lo que se corrigió.
- **Cualquier ruta de manejo de errores** (timeout, reintento, fallback):
  la prueba debe forzar esa ruta (mock de fallo, timeout real corto en
  test) — "se ve razonable leyendo el código" no es evidencia.
- **Cualquier construcción de consulta a base de datos con parámetros
  variables**: la prueba debe incluir al menos un valor con comillas o
  caracteres especiales, para confirmar que la parametrización realmente
  se usa y no es cosmética.

## Resumen ejecutivo

La asistencia de IA no cambia el estándar de revisión — lo que cambia es la
velocidad a la que aparece código sin las validaciones de borde que nadie
pidió explícitamente. Las tres categorías de arriba (secretos, SQL,
llamadas externas) son exactamente donde los dos ejercicios de revisión de
este repositorio (`revision-pr.md`, `informe-etapa3.md`) encontraron
problemas reales — no son hipotéticas.
