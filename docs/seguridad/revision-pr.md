# Revisión de código — `pr_para_revision.diff`

Alcance: `app/reportes.py`, función `generar_resumen_mensual` (archivo
nuevo, 118 líneas, ver `materiales/revision/pr_para_revision.diff`). Esta
revisión es un ejercicio de referente de código (Anexo A, rúbrica de
Etapa 5) — no cubre `etapa3-rag/` ni el resto del código propio de este
repo (ver `docs/seguridad/informe-etapa3.md` para eso).

## Hallazgo 1 — Secreto hardcodeado (Crítico)

**Línea:** `app/reportes.py:5`
```python
OPENAI_API_KEY = "sk-proj-7Kd92LmQx4TvR8nZaWp1YbHc3EjF6UgS0AiDoNe5"
```

**Riesgo:** la clave del proveedor de IA queda expuesta en el historial de
git de forma permanente, visible para cualquiera con acceso al repositorio
(incluyendo forks y clones ya hechos) — un secreto commiteado no se
"arregla" solo quitándolo en un commit posterior, la clave sigue en el
historial.

**Corrección:**
1. Revocar/rotar la clave expuesta en el proveedor inmediatamente (no
   depende de este PR).
2. Leerla de variable de entorno: `OPENAI_API_KEY = os.environ["OPENAI_API_KEY"]`
   (fail-fast si falta, mismo patrón que `cargarConfig()` en
   `etapa2-api`/`etapa3-rag`/`etapa4-orquestacion` de este repo).
3. Purgar el secreto del historial de git (`git filter-repo` o
   equivalente) si el repo ya fue compartido con la clave real.

## Hallazgo 2 — Inyección SQL, múltiple (Crítico)

**Líneas:** `app/reportes.py:22-25` (query principal), `:28` (`area_filtro`),
`:30-32` (subconsulta `usuario_solicitante`), `:52` (`areas`), `:57`
(`adjuntos`), `:60-61` (`historial_estado`), `:86-87` (`UPDATE categoria_ia`).

```python
query = "SELECT id_ticket, codigo, id_area, categoria, prioridad, estado, " \
        "fecha_creacion, fecha_cierre, asunto, descripcion FROM tickets " \
        "WHERE fecha_creacion > '" + str(fecha_inicio) + "' " \
        "AND fecha_creacion < '" + str(fecha_fin) + "'"
...
cursor.execute("SELECT nombre, sede FROM areas WHERE id_area = %s" % row[2])
...
cursor.execute("UPDATE tickets SET categoria = '" + categoria_ia +
               "' WHERE id_ticket = " + str(row[0]))
```

**Riesgo:** siete puntos de concatenación/interpolación directa de strings
en SQL en la misma función. El más grave es la línea 86-87: `categoria_ia`
viene de la respuesta de un LLM (`respuesta.json()["choices"][0]["message"]["content"]`,
línea 82) — **texto no confiable** que se concatena sin sanitizar en un
`UPDATE`. Un LLM que devuelva una comilla simple, o un prompt-injection en
el asunto/descripción del ticket que induzca al modelo a devolver
fragmento SQL, puede romper o manipular la sentencia (este es el punto
crítico #4 del Anexo A citado directamente: nunca confiar en texto de un
LLM sin aislarlo tras una interfaz desacoplada y sin tratarlo como dato,
nunca como código).

**Corrección:** consultas parametrizadas en las 7 ubicaciones, por ejemplo:
```python
cursor.execute(
    "SELECT id_ticket, codigo, id_area, categoria, prioridad, estado, "
    "fecha_creacion, fecha_cierre, asunto, descripcion FROM tickets "
    "WHERE fecha_creacion > %s AND fecha_creacion < %s",
    (fecha_inicio, fecha_fin),
)
...
cursor.execute("UPDATE tickets SET categoria = %s WHERE id_ticket = %s", (categoria_ia, row[0]))
```
`area_filtro` y la subconsulta de `usuario_solicitante` se agregan como
condiciones `AND` adicionales con sus propios parámetros, nunca
concatenando el valor al string de la query.

## Hallazgo 3 — Sin manejo de errores en la llamada al proveedor de IA (Alto)

**Líneas:** `app/reportes.py:79-84`
```python
respuesta = requests.post(
    MODEL_URL,
    headers={"Authorization": "Bearer " + OPENAI_API_KEY},
    json={"model": "gpt-4", "messages": [{"role": "user", "content": prompt}]},
)
categoria_ia = respuesta.json()["choices"][0]["message"]["content"]
```

**Riesgo:** sin `timeout`, una llamada colgada bloquea el proceso
indefinidamente (afecta a un endpoint que además está dentro de una
transacción de base de datos abierta con `conn.begin()`, línea 20 —
bloqueando también los locks de esa transacción). Sin `try/except`, un
error de red o un `50x` del proveedor tumba toda la generación del reporte
mensual, no solo la clasificación de un ticket. El acceso directo a
`respuesta.json()["choices"][0]["message"]["content"]` asume una forma de
respuesta fija — cualquier cambio de formato del proveedor (o una
respuesta de error con otro shape) lanza una excepción no controlada.

**Corrección:** timeout explícito, manejo de errores HTTP/formato, y
aislar la llamada tras una interfaz desacoplada del proveedor concreto
(mismo patrón `IAProvider` de `etapa2-api/src/ia/IAProvider.ts` de este
repo — el legacy viola el punto crítico #4 del Anexo A directamente al
llamar al SDK/HTTP del proveedor en línea, sin abstracción):
```python
try:
    respuesta = requests.post(MODEL_URL, headers=headers, json=payload, timeout=10)
    respuesta.raise_for_status()
    categoria_ia = respuesta.json()["choices"][0]["message"]["content"]
except (requests.RequestException, KeyError, IndexError) as exc:
    categoria_ia = "Sin clasificar"
    logger.warning("Fallo la clasificacion IA del ticket %s: %s", row[0], exc)
```

## Hallazgo 4 — División por cero (Medio)

**Línea:** `app/reportes.py:94`
```python
promedio = suma_dias / contador_dias
```

**Riesgo:** si ningún ticket del periodo consultado tiene `fecha_cierre`
(`contador_dias == 0`, todos abiertos o reabiertos), esta línea lanza
`ZeroDivisionError` y tumba toda la generación del reporte mensual — un mes
sin cierres es un caso de negocio válido (área nueva, mes de alta demanda
sin cierres aún), no un caso excepcional que deba fallar.

**Corrección:**
```python
promedio = suma_dias / contador_dias if contador_dias > 0 else None
```
Documentar en el contrato del endpoint que `promedio_dias_atencion: null`
significa "sin tickets cerrados en el periodo", no un error.

## Hallazgo 5 — Inconsistencia de estilo (Menor)

**Líneas:** `app/reportes.py:9` (parámetro `incluirCerrados` en camelCase,
el resto del código en snake_case), `:89` (`if incluirCerrados == False`
en vez de `if not incluirCerrados`).

**Riesgo:** ninguno funcional — es una señal de calidad/consistencia, y en
este caso específico también una señal de que el código fue escrito
rápido (probablemente con asistencia de IA sin una convención de estilo
aplicada) sin una pasada de revisión.

**Corrección:**
```python
def generar_resumen_mensual(anio, mes, area_filtro=None, incluir_cerrados=True,
                             formato="json", usuario_solicitante=None):
...
if not incluir_cerrados and ticket["estado"] == "Cerrado":
    continue
```

## Resumen

De los 5 hallazgos, los 2 críticos (secreto hardcodeado, inyección SQL) y
el de severidad Alta (manejo de errores del proveedor de IA) comparten un
patrón: código que asume el caso feliz y trata la salida de un LLM como si
fuera confiable — exactamente lo que el punto crítico #4 del Anexo A pide
evitar. Estos tres hallazgos alimentan directamente
`docs/estandar-ingenieria-ia.md` (Tarea 9) como ejemplos concretos de "qué
se revisa siempre" y "qué nunca se acepta sin prueba".
