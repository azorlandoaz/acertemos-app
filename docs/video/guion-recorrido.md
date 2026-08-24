# Guion — video de recorrido (máx. 5 min)

Guion de apoyo para la grabación de pantalla exigida en el numeral 8 del
Anexo A (PC-GTH-68-AN1-A). Estructura sugerida por el propio Anexo A: qué
construiste (1 min) · hasta qué etapa llegaste y qué quedó fuera (1 min) ·
las dos decisiones de las que te sientes más seguro y por qué (2 min) · lo
que harías distinto con más tiempo (1 min). Está escrito en primera
persona, listo para leer, pero conviene decirlo con tus palabras en la
grabación real — lo que se evalúa es que puedas responder por ello en vivo,
no que lo leas igual.

Antes de grabar: ten abierto el repo (idealmente el árbol de carpetas y
`README.md` raíz), y si quieres, la app corriendo (`etapa4-orquestacion`
o el cliente Angular) para mostrar algo en pantalla mientras hablas.

---

## 1. Qué construiste (≈1 min)

"Construí Mesa de Ayuda Inteligente: un sistema que recibe solicitudes en
texto libre — por correo o formulario —, las clasifica automáticamente,
responde con base en las políticas internas vigentes citando la fuente, y
escala a una persona lo que no puede resolver con confianza suficiente.

Lo hice por etapas, cada una correspondiente a un nivel de la familia de
cargos IA:

- **Etapa 1 — Fundamentos**: limpieza del histórico de 2.000 tickets con
  ruido real (fechas en tres formatos, categorías inconsistentes,
  duplicados), un cliente resiliente del servicio simulado, y tres
  consultas SQL de análisis sobre una base MariaDB dockerizada.
- **Etapa 2 — Autonomía e integración**: la API REST propia (crear,
  consultar, listar solicitudes), con un módulo de clasificación por IA
  completamente desacoplado detrás de una interfaz `IAProvider` — nunca la
  lógica de negocio llama directamente al proveedor —, con reintentos,
  tiempo de espera y un modo degradado garantizado. También corregí los
  tres defectos del módulo legado, cada uno con su prueba roja-verde y su
  causa raíz documentada.
- **Etapa 3 — Complejidad y calidad**: la solución RAG sobre los cinco PDF
  de políticas — ingesta, fragmentación por sección, embeddings, base
  vectorial local — con citación de documento y sección, y abstención
  explícita cuando no hay evidencia en vez de inventar una respuesta.
- **Etapa 4 — Arquitectura y orquestación**: el documento de arquitectura
  con tres ADR, un pipeline propio que encadena clasificar → consultar el
  RAG → decidir escalar, e integración bidireccional con el segundo
  sistema simulado con idempotencia y reintentos con retroceso.
- **Etapa 5 — Estrategia técnica y evaluación**: el documento de decisión
  IA-vs-automatización-tradicional para tres requerimientos reales, una
  suite de evaluación automatizada que corre en CI y falla si la calidad
  cae bajo el umbral, un modelo de machine learning clásico como línea
  base, y la revisión escrita del diff que se me entregó.

Además construí, ya fuera del alcance calificado, un cliente Angular que
consume la API real de la Etapa 2, para tener una interfaz de verdad en
vez de solo Swagger o `curl`."

## 2. Hasta qué etapa llegaste y qué quedó fuera (≈1 min)

"Completé y acredité las cinco etapas — con el alcance que el propio
Anexo A permite para las etapas 4 y 5 en la versión de tres días: ahí se
evalúa principalmente el documento de diseño y las decisiones, no un
sistema productivo funcionando de punta a punta, y así lo entregué:
documento de arquitectura y ADR reales, con una demostración parcial del
flujo, no una orquestación productiva completa.

Lo que quedé debiendo, de forma honesta y documentada en el repo:

- **No hay un proveedor de IA real corriendo.** Todo el sistema opera en
  modo heurístico de respaldo — `HeuristicProvider`, clasificación por
  palabras clave y un embedding de solo dos dimensiones —, porque no tuve
  un proveedor real disponible en este entorno. Lo documenté en cada etapa
  donde importaba, y en la Etapa 5 hasta lo medí: la precisión de citación
  del RAG con ese heurístico es de apenas 29 %, y la precisión de
  abstención — que yo mismo había asumido que sería fácil de acertar — dio
  0 % medido, por un sesgo geométrico propio de ese embedding tan simple.
  Corregí el umbral documentado con esa evidencia real en vez de dejarlo
  como si fuera un dato bueno.
- **La indexación vectorial no usa embeddings semánticos reales**, por la
  misma razón — es la limitación que explica la precisión de citación tan
  baja.
- **La orquestación de la Etapa 4 es una demo parcial**, no un sistema en
  producción — dos casos reales ejecutados y registrados, no una carga
  real."

## 3. Las dos decisiones de las que te sientes más seguro (≈2 min)

"La primera: en la Etapa 5, decidí **no usar IA generativa** para dos de
los tres requerimientos que se me entregaron — la clasificación de
solicitudes (R-01) y los recordatorios de tickets sin gestión (R-03). Con
3.000 solicitudes diarias, un catálogo de 12 categorías que no cambia hace
tres años, y un error que se corrige en menos de un minuto sin afectar al
usuario final, un modelo clásico entrenado sobre el histórico es más
barato, más rápido en lote y mucho más auditable — con matriz de confusión,
no con un prompt que puede cambiar de comportamiento con cada actualización
del proveedor. Y para los recordatorios, el problema es puro *scheduling*
e idempotencia, cero ambigüedad de lenguaje: meterle un LLM ahí sería
sobre-ingeniería que solo agrega riesgo. Reconocer cuándo la IA es la peor
opción era uno de los puntos críticos explícitos de esta prueba, y creo que
esa es la evidencia más clara de que lo entendí.

La segunda: el patrón de desacoplamiento del proveedor de IA que usé desde
la Etapa 2. Toda la lógica de negocio depende solo de la interfaz
`IAProvider` — nunca del SDK de un proveedor concreto —, y el
`ClasificadorService` envuelve eso con tiempo de espera, reintentos y un
proveedor de respaldo garantizado: nunca le devuelvo un error 500 al
usuario final por una falla del proveedor de IA, siempre degrada con
criterio. Esa misma pieza fue la que me permitió, en la Etapa 5, medir
honestamente qué tan bien o mal funciona el modo heurístico en vez de
asumirlo — y corregir la métrica con evidencia real en lugar de maquillar
el número para que se viera bien."

## 4. Lo que harías distinto con más tiempo (≈1 min)

"Lo primero, sin duda: conseguir un proveedor de IA real desde el primer
día, para medir con embeddings semánticos de verdad en vez de la
heurística de respaldo — es la limitación más repetida de todo el
proyecto, y con un proveedor real la precisión de citación del RAG
probablemente sube mucho.

También dejaría el cliente Angular con los filtros del listado reflejados
en la URL y con reintento automático ante errores de red — los documenté
como deuda conocida en vez de improvisarlos sin probarlos al final del
proyecto, pero con más tiempo los haría bien.

Y unificaría el pipeline de integración continua: hoy corre un job por
subproyecto (Python en la Etapa 1, Node en las Etapas 2 a 5), y con más
tiempo lo consolidaría en un solo pipeline con una vista única de
resultados, en vez de cinco jobs independientes."
