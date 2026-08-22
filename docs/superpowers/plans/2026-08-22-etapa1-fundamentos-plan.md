# Etapa 1 — Fundamentos Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Script Python que limpia el histórico de tickets, cliente robusto del `servicio_mock`, base de datos MariaDB dockerizada a partir de `esquema.sql` con pruebas que verifican tablas/columnas/servicio, y 3 consultas SQL de análisis.

**Architecture:** Subproyecto Python puro (`etapa1-fundamentos/`) con módulos pequeños de una responsabilidad cada uno (`fechas.py`, `normalizacion.py`, `limpieza.py`, `cliente_mock.py`, `db.py`) orquestados por un script de entrada (`limpiar_tickets.py`). La base de datos corre en un contenedor Docker (MariaDB oficial) que auto-ejecuta `esquema.sql` al inicializarse; los scripts Python se conectan a ella vía `PyMySQL` con reintento.

**Tech Stack:** Python 3.11+, `pytest`, `requests`, `PyMySQL`, `python-dotenv`, Docker + Docker Compose, imagen `mariadb:11.4`.

**Spec:** `docs/superpowers/specs/2026-08-22-etapa1-fundamentos-design.md` (y convenciones transversales en `docs/superpowers/specs/2026-08-22-arquitectura-general-design.md`).

## Global Constraints

- Mínimo 60/100 para acreditar la etapa; es la primera etapa, bloquea todas las demás (Anexo A §5).
- Rama de trabajo `etapa1-fundamentos`, distinta de `master`.
- Al menos 8 commits atómicos distribuidos por tarea, no uno solo al final (punto crítico #12).
- Ningún secreto en el repositorio: `.env` siempre fuera de git, solo se versiona `.env.example` (punto crítico #5).
- Cada función con pruebas debe cubrir al menos un caso de borde (punto crítico #2).
- `materiales/datos/esquema.sql` no se modifica; se monta tal cual en el contenedor Docker.
- El token del `servicio_mock` y las credenciales de la base de datos se leen siempre de variables de entorno, nunca hardcodeadas.

---

## File Structure

```
etapa1-fundamentos/
├── requirements.txt
├── pytest.ini
├── .env.example
├── README.md
├── docker/
│   ├── docker-compose.yml
│   └── .env.example
├── src/
│   ├── __init__.py
│   ├── fechas.py            # normalizar_fecha
│   ├── normalizacion.py     # normalizar_categoria / _estado / _prioridad
│   ├── limpieza.py          # deduplicar, validar_registro(s), generar_resumen
│   ├── limpiar_tickets.py   # limpiar() + main() — script de entrada
│   ├── cliente_mock.py      # listar_solicitudes, crear_solicitud
│   └── db.py                # obtener_conexion
├── sql/
│   ├── 01_agregacion_por_area.sql
│   ├── 02_join_tres_tablas.sql
│   └── 03_tickets_reabiertos.sql
└── tests/
    ├── test_fechas.py
    ├── test_normalizacion.py
    ├── test_limpieza.py
    ├── test_limpiar_tickets.py
    ├── test_cliente_mock.py
    ├── test_esquema_bd.py       # requiere Docker corriendo
    └── test_sql_consultas.py    # requiere Docker corriendo
```

---

### Task 1: Rama y andamiaje del subproyecto

**Files:**
- Create: `etapa1-fundamentos/requirements.txt`
- Create: `etapa1-fundamentos/pytest.ini`
- Create: `etapa1-fundamentos/src/__init__.py`
- Create: `etapa1-fundamentos/.env.example`
- Create: `etapa1-fundamentos/README.md`

**Interfaces:**
- Consumes: nada (primera tarea).
- Produces: paquete Python importable `src` desde la raíz de `etapa1-fundamentos/`; dependencias instalables vía `pip install -r requirements.txt`.

- [ ] **Step 1: Crear la rama de trabajo**

```bash
git checkout master
git pull --ff-only 2>/dev/null || true
git checkout -b etapa1-fundamentos
```

- [ ] **Step 2: Crear la estructura de carpetas y archivos base**

`etapa1-fundamentos/requirements.txt`:
```
pytest>=8.0,<9
requests>=2.32,<3
PyMySQL>=1.1,<2
python-dotenv>=1.0,<2
```

`etapa1-fundamentos/pytest.ini`:
```ini
[pytest]
pythonpath = .
testpaths = tests
```

`etapa1-fundamentos/src/__init__.py`: (archivo vacío)

`etapa1-fundamentos/.env.example`:
```
DB_HOST=127.0.0.1
DB_PORT=3306
DB_USER=mesa_ayuda_app
DB_PASSWORD=cambia-esta-clave-app
DB_NAME=mesa_ayuda

SERVICIO_MOCK_URL=http://localhost:8080
SERVICIO_MOCK_TOKEN=demo-token-prueba-2026
SERVICIO_MOCK_TIMEOUT=5
```

`etapa1-fundamentos/README.md` (stub, se completa en la Tarea 11):
```markdown
# Etapa 1 — Fundamentos

En construcción. Ver `docs/superpowers/specs/2026-08-22-etapa1-fundamentos-design.md`.
```

- [ ] **Step 3: Instalar dependencias y verificar**

```bash
cd etapa1-fundamentos
python -m venv .venv
# Windows: .venv\Scripts\activate    |    Linux/Mac: source .venv/bin/activate
pip install -r requirements.txt
pytest --version
```

Expected: `pytest` imprime su versión sin error (aunque todavía no hay tests).

- [ ] **Step 4: Commit**

```bash
git add etapa1-fundamentos/requirements.txt etapa1-fundamentos/pytest.ini \
        etapa1-fundamentos/src/__init__.py etapa1-fundamentos/.env.example \
        etapa1-fundamentos/README.md
git commit -m "chore(etapa1): andamiaje del subproyecto Python"
```

---

### Task 2: Normalizador de fechas

**Files:**
- Create: `etapa1-fundamentos/src/fechas.py`
- Test: `etapa1-fundamentos/tests/test_fechas.py`

**Interfaces:**
- Consumes: nada.
- Produces: `normalizar_fecha(valor: str | None) -> date | None` — usada por `src/limpieza.py` (Tarea 5) y `src/limpiar_tickets.py` (Tarea 6).

- [ ] **Step 1: Write the failing test**

`etapa1-fundamentos/tests/test_fechas.py`:
```python
from datetime import date

from src.fechas import normalizar_fecha


def test_formato_iso():
    assert normalizar_fecha("2025-03-08") == date(2025, 3, 8)


def test_formato_dd_mm_aaaa():
    assert normalizar_fecha("03/06/2025") == date(2025, 6, 3)


def test_formato_dd_mes_es_aaaa():
    assert normalizar_fecha("30-Jun-2025") == date(2025, 6, 30)


def test_formato_dd_mes_es_minusculas():
    assert normalizar_fecha("20-Ene-2026") == date(2026, 1, 20)


def test_valor_vacio_devuelve_none():
    assert normalizar_fecha("") is None
    assert normalizar_fecha(None) is None


def test_formato_invalido_devuelve_none():
    assert normalizar_fecha("no es una fecha") is None
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pytest tests/test_fechas.py -v`
Expected: FAIL con `ModuleNotFoundError: No module named 'src.fechas'`.

- [ ] **Step 3: Write minimal implementation**

`etapa1-fundamentos/src/fechas.py`:
```python
"""Normalización de fechas del histórico de tickets."""
from __future__ import annotations

from datetime import date, datetime

_FORMATOS = ("%Y-%m-%d", "%d/%m/%Y", "%d-%b-%Y")

_MESES_ES = {
    "ene": "Jan", "feb": "Feb", "mar": "Mar", "abr": "Apr",
    "may": "May", "jun": "Jun", "jul": "Jul", "ago": "Aug",
    "sep": "Sep", "oct": "Oct", "nov": "Nov", "dic": "Dec",
}


def normalizar_fecha(valor: str | None) -> date | None:
    """Convierte una fecha en cualquiera de los 3 formatos del histórico.

    Formatos soportados: AAAA-MM-DD, DD/MM/AAAA, DD-Mes-AAAA (mes en
    español abreviado, ej. "30-Jun-2025"). Devuelve None si el valor está
    vacío o no coincide con ningún formato conocido.
    """
    if valor is None:
        return None
    texto = str(valor).strip()
    if not texto:
        return None

    partes = texto.split("-")
    if len(partes) == 3 and partes[1].lower() in _MESES_ES:
        texto = f"{partes[0]}-{_MESES_ES[partes[1].lower()]}-{partes[2]}"

    for formato in _FORMATOS:
        try:
            return datetime.strptime(texto, formato).date()
        except ValueError:
            continue
    return None
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pytest tests/test_fechas.py -v`
Expected: 6 tests PASS.

- [ ] **Step 5: Commit**

```bash
git add etapa1-fundamentos/src/fechas.py etapa1-fundamentos/tests/test_fechas.py
git commit -m "feat(etapa1): normalizador de fechas con 3 formatos reales del CSV"
```

---

### Task 3: Normalizador de categoría, prioridad y estado

**Files:**
- Create: `etapa1-fundamentos/src/normalizacion.py`
- Test: `etapa1-fundamentos/tests/test_normalizacion.py`

**Interfaces:**
- Consumes: nada.
- Produces: `normalizar_categoria(valor)`, `normalizar_estado(valor)`, `normalizar_prioridad(valor)` — todas `str | None -> str | None`. Usadas por `src/limpiar_tickets.py` (Tarea 6).

- [ ] **Step 1: Write the failing test**

`etapa1-fundamentos/tests/test_normalizacion.py`:
```python
from src.normalizacion import (
    normalizar_categoria,
    normalizar_estado,
    normalizar_prioridad,
)


def test_normalizar_categoria_variantes():
    assert normalizar_categoria("VACACIONES") == "Vacaciones"
    assert normalizar_categoria("Vacaciones") == "Vacaciones"
    assert normalizar_categoria("compras") == "Compras"
    assert normalizar_categoria("Gestión de accesos") == "Gestión de accesos"


def test_normalizar_estado_variantes():
    assert normalizar_estado("REABIERTO") == "Reabierto"
    assert normalizar_estado("abierto") == "Abierto"
    assert normalizar_estado("en proceso") == "En proceso"


def test_normalizar_prioridad_variantes():
    assert normalizar_prioridad("alta") == "Alta"
    assert normalizar_prioridad("1-Alta") == "Alta"
    assert normalizar_prioridad("ALTA") == "Alta"
    assert normalizar_prioridad("2-Media") == "Media"
    assert normalizar_prioridad("baja") == "Baja"


def test_valores_vacios_devuelven_none():
    assert normalizar_categoria("") is None
    assert normalizar_estado(None) is None
    assert normalizar_prioridad("") is None
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pytest tests/test_normalizacion.py -v`
Expected: FAIL con `ModuleNotFoundError: No module named 'src.normalizacion'`.

- [ ] **Step 3: Write minimal implementation**

`etapa1-fundamentos/src/normalizacion.py`:
```python
"""Normalización de categoría, prioridad y estado del histórico de tickets."""
from __future__ import annotations

import re

_PREFIJO_NUMERICO = re.compile(r"^\d+-")


def _normalizar_texto_simple(valor: str | None) -> str | None:
    if valor is None:
        return None
    texto = str(valor).strip()
    if not texto:
        return None
    return texto.lower().capitalize()


def normalizar_categoria(valor: str | None) -> str | None:
    """Normaliza la categoría a formato 'Primera letra mayúscula'."""
    return _normalizar_texto_simple(valor)


def normalizar_estado(valor: str | None) -> str | None:
    """Normaliza el estado a formato 'Primera letra mayúscula'."""
    return _normalizar_texto_simple(valor)


def normalizar_prioridad(valor: str | None) -> str | None:
    """Normaliza la prioridad, removiendo prefijos numéricos como '1-'."""
    if valor is None:
        return None
    texto = str(valor).strip()
    if not texto:
        return None
    texto = _PREFIJO_NUMERICO.sub("", texto)
    return texto.lower().capitalize()
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pytest tests/test_normalizacion.py -v`
Expected: 4 tests PASS.

- [ ] **Step 5: Commit**

```bash
git add etapa1-fundamentos/src/normalizacion.py etapa1-fundamentos/tests/test_normalizacion.py
git commit -m "feat(etapa1): normalizador de categoria, estado y prioridad"
```

---

### Task 4: Deduplicación de registros

**Files:**
- Create: `etapa1-fundamentos/src/limpieza.py`
- Test: `etapa1-fundamentos/tests/test_limpieza.py`

**Interfaces:**
- Consumes: nada.
- Produces: `deduplicar(tickets: list[dict]) -> tuple[list[dict], int]` — usada por `src/limpiar_tickets.py` (Tarea 6).

- [ ] **Step 1: Write the failing test**

`etapa1-fundamentos/tests/test_limpieza.py`:
```python
from src.limpieza import deduplicar


def test_deduplicar_elimina_repetidos():
    tickets = [{"id": "TK-1"}, {"id": "TK-2"}, {"id": "TK-1"}]
    unicos, eliminados = deduplicar(tickets)
    assert len(unicos) == 2
    assert eliminados == 1
    assert [t["id"] for t in unicos] == ["TK-1", "TK-2"]


def test_deduplicar_sin_duplicados():
    tickets = [{"id": "TK-1"}, {"id": "TK-2"}]
    unicos, eliminados = deduplicar(tickets)
    assert len(unicos) == 2
    assert eliminados == 0


def test_deduplicar_lista_vacia():
    unicos, eliminados = deduplicar([])
    assert unicos == []
    assert eliminados == 0
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pytest tests/test_limpieza.py -v`
Expected: FAIL con `ModuleNotFoundError: No module named 'src.limpieza'`.

- [ ] **Step 3: Write minimal implementation**

`etapa1-fundamentos/src/limpieza.py`:
```python
"""Deduplicación, validación y resumen del histórico de tickets."""
from __future__ import annotations


def deduplicar(tickets: list[dict]) -> tuple[list[dict], int]:
    """Elimina duplicados por 'id'. Devuelve (tickets_unicos, cantidad_eliminada)."""
    vistos: set[str] = set()
    unicos: list[dict] = []
    eliminados = 0
    for t in tickets:
        clave = t.get("id")
        if clave in vistos:
            eliminados += 1
            continue
        vistos.add(clave)
        unicos.append(t)
    return unicos, eliminados
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pytest tests/test_limpieza.py -v`
Expected: 3 tests PASS.

- [ ] **Step 5: Commit**

```bash
git add etapa1-fundamentos/src/limpieza.py etapa1-fundamentos/tests/test_limpieza.py
git commit -m "feat(etapa1): deduplicacion de tickets por id"
```

---

### Task 5: Validación de registros

**Files:**
- Modify: `etapa1-fundamentos/src/limpieza.py`
- Modify: `etapa1-fundamentos/tests/test_limpieza.py`

**Interfaces:**
- Consumes: `normalizar_fecha` de `src/fechas.py` (Tarea 2).
- Produces: `validar_registro(ticket: dict) -> str | None`, `validar_registros(tickets: list[dict]) -> tuple[list[dict], list[dict]]` (los descartados llevan la clave `_motivo_descarte`) — usadas por `src/limpiar_tickets.py` (Tarea 6).

- [ ] **Step 1: Write the failing test**

Agregar al final de `etapa1-fundamentos/tests/test_limpieza.py`:
```python
from src.limpieza import validar_registro, validar_registros


def test_validar_registro_valido():
    ticket = {"id": "TK-1", "area": "Compras", "fecha_creacion": "2025-01-01"}
    assert validar_registro(ticket) is None


def test_validar_registro_sin_area():
    ticket = {"id": "TK-1", "area": "", "fecha_creacion": "2025-01-01"}
    assert validar_registro(ticket) == "area vacía"


def test_validar_registro_sin_id():
    ticket = {"id": "", "area": "Compras", "fecha_creacion": "2025-01-01"}
    assert validar_registro(ticket) == "id vacío"


def test_validar_registro_fecha_invalida():
    ticket = {"id": "TK-1", "area": "Compras", "fecha_creacion": "fecha-mala"}
    assert validar_registro(ticket) == "fecha_creacion inválida"


def test_validar_registros_separa_validos_e_invalidos():
    tickets = [
        {"id": "TK-1", "area": "Compras", "fecha_creacion": "2025-01-01"},
        {"id": "TK-2", "area": "", "fecha_creacion": "2025-01-01"},
    ]
    validos, descartados = validar_registros(tickets)
    assert len(validos) == 1
    assert len(descartados) == 1
    assert descartados[0]["_motivo_descarte"] == "area vacía"


def test_validar_registros_archivo_vacio():
    validos, descartados = validar_registros([])
    assert validos == []
    assert descartados == []
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pytest tests/test_limpieza.py -v`
Expected: FAIL con `ImportError: cannot import name 'validar_registro' from 'src.limpieza'`.

- [ ] **Step 3: Write minimal implementation**

Agregar al inicio de `etapa1-fundamentos/src/limpieza.py` (tras el docstring del módulo) el import, y al final las dos funciones:

```python
"""Deduplicación, validación y resumen del histórico de tickets."""
from __future__ import annotations

from src.fechas import normalizar_fecha


def deduplicar(tickets: list[dict]) -> tuple[list[dict], int]:
    ...  # (sin cambios, ya existe de la Tarea 4)


def validar_registro(ticket: dict) -> str | None:
    """Devuelve None si el registro es válido, o el motivo de descarte."""
    if not (ticket.get("id") or "").strip():
        return "id vacío"
    if not (ticket.get("area") or "").strip():
        return "area vacía"
    if normalizar_fecha(ticket.get("fecha_creacion")) is None:
        return "fecha_creacion inválida"
    return None


def validar_registros(tickets: list[dict]) -> tuple[list[dict], list[dict]]:
    """Separa tickets válidos de inválidos. Cada inválido lleva '_motivo_descarte'."""
    validos: list[dict] = []
    descartados: list[dict] = []
    for t in tickets:
        motivo = validar_registro(t)
        if motivo is None:
            validos.append(t)
        else:
            descartado = dict(t)
            descartado["_motivo_descarte"] = motivo
            descartados.append(descartado)
    return validos, descartados
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pytest tests/test_limpieza.py -v`
Expected: 9 tests PASS (los 3 de la Tarea 4 + los 6 nuevos).

- [ ] **Step 5: Commit**

```bash
git add etapa1-fundamentos/src/limpieza.py etapa1-fundamentos/tests/test_limpieza.py
git commit -m "feat(etapa1): validacion de registros con motivo de descarte"
```

---

### Task 6: Resumen y script principal

**Files:**
- Modify: `etapa1-fundamentos/src/limpieza.py`
- Modify: `etapa1-fundamentos/tests/test_limpieza.py`
- Create: `etapa1-fundamentos/src/limpiar_tickets.py`
- Create: `etapa1-fundamentos/tests/test_limpiar_tickets.py`

**Interfaces:**
- Consumes: `normalizar_fecha` (Tarea 2); `normalizar_categoria`, `normalizar_prioridad`, `normalizar_estado` (Tarea 3); `deduplicar`, `validar_registros` (Tareas 4-5).
- Produces: `generar_resumen(tickets: list[dict]) -> dict`; `limpiar(tickets: list[dict]) -> tuple[list[dict], list[dict], int]`; `main(argv: list[str]) -> None`. Este es el script de entrada de la etapa, no lo consume ninguna tarea posterior.

- [ ] **Step 1: Write the failing tests**

Agregar al final de `etapa1-fundamentos/tests/test_limpieza.py`:
```python
from src.limpieza import generar_resumen


def test_generar_resumen_cuenta_por_area_y_prioridad():
    tickets = [
        {"area": "Compras", "prioridad": "Alta"},
        {"area": "Compras", "prioridad": "Baja"},
        {"area": "Calidad", "prioridad": "Alta"},
    ]
    resumen = generar_resumen(tickets)
    assert resumen["por_area"] == {"Compras": 2, "Calidad": 1}
    assert resumen["por_prioridad"] == {"Alta": 2, "Baja": 1}


def test_generar_resumen_lista_vacia():
    resumen = generar_resumen([])
    assert resumen == {"por_area": {}, "por_prioridad": {}}
```

`etapa1-fundamentos/tests/test_limpiar_tickets.py`:
```python
import csv
import json

from src.limpiar_tickets import limpiar, main


def test_limpiar_normaliza_deduplica_y_valida():
    tickets = [
        {"id": "TK-1", "area": "Vacaciones", "fecha_creacion": "2025-03-08",
         "fecha_cierre": "", "categoria": "VACACIONES", "prioridad": "1-Alta",
         "estado": "REABIERTO"},
        {"id": "TK-1", "area": "Vacaciones", "fecha_creacion": "2025-03-08",
         "fecha_cierre": "", "categoria": "Vacaciones", "prioridad": "Alta",
         "estado": "Reabierto"},
        {"id": "TK-2", "area": "", "fecha_creacion": "2025-01-01",
         "fecha_cierre": "", "categoria": "Hardware", "prioridad": "Baja",
         "estado": "Abierto"},
    ]
    validos, descartados, duplicados = limpiar(tickets)

    assert duplicados == 1
    assert len(validos) == 1
    assert validos[0]["id"] == "TK-1"
    assert validos[0]["categoria"] == "Vacaciones"
    assert validos[0]["prioridad"] == "Alta"
    assert validos[0]["estado"] == "Reabierto"
    assert len(descartados) == 1
    assert descartados[0]["_motivo_descarte"] == "area vacía"


def test_main_extremo_a_extremo(tmp_path):
    csv_entrada = tmp_path / "entrada.csv"
    csv_entrada.write_text(
        "id,fecha_creacion,fecha_cierre,area,categoria,prioridad,canal,"
        "solicitante,asunto,descripcion,estado,reaperturas\n"
        "TK-1,2025-03-08,,Compras,VACACIONES,1-Alta,correo,u1@x.com,Asunto,Desc,REABIERTO,1\n",
        encoding="utf-8",
    )
    csv_salida = tmp_path / "salida.csv"
    resumen_json = tmp_path / "resumen.json"

    main([str(csv_entrada), str(csv_salida), str(resumen_json)])

    assert csv_salida.exists()
    with csv_salida.open(encoding="utf-8") as fh:
        filas = list(csv.DictReader(fh))
    assert len(filas) == 1
    assert filas[0]["categoria"] == "Vacaciones"

    resumen = json.loads(resumen_json.read_text(encoding="utf-8"))
    assert resumen["total_validos"] == 1


def test_main_archivo_vacio(tmp_path):
    csv_entrada = tmp_path / "vacio.csv"
    csv_entrada.write_text(
        "id,fecha_creacion,fecha_cierre,area,categoria,prioridad,canal,"
        "solicitante,asunto,descripcion,estado,reaperturas\n",
        encoding="utf-8",
    )
    csv_salida = tmp_path / "salida.csv"
    resumen_json = tmp_path / "resumen.json"

    main([str(csv_entrada), str(csv_salida), str(resumen_json)])

    resumen = json.loads(resumen_json.read_text(encoding="utf-8"))
    assert resumen["total_validos"] == 0
    assert not csv_salida.exists()
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `pytest tests/test_limpieza.py tests/test_limpiar_tickets.py -v`
Expected: las de `generar_resumen` fallan con `ImportError`; las de `test_limpiar_tickets.py` fallan con `ModuleNotFoundError: No module named 'src.limpiar_tickets'`.

- [ ] **Step 3: Write minimal implementation**

Agregar al final de `etapa1-fundamentos/src/limpieza.py`:
```python
def generar_resumen(tickets: list[dict]) -> dict:
    """Cuenta tickets por área y por prioridad."""
    por_area: dict[str, int] = {}
    por_prioridad: dict[str, int] = {}
    for t in tickets:
        area = t.get("area") or "Sin área"
        prioridad = t.get("prioridad") or "Sin prioridad"
        por_area[area] = por_area.get(area, 0) + 1
        por_prioridad[prioridad] = por_prioridad.get(prioridad, 0) + 1
    return {"por_area": por_area, "por_prioridad": por_prioridad}
```

`etapa1-fundamentos/src/limpiar_tickets.py`:
```python
"""Script principal: limpia el histórico de tickets y genera un resumen.

Uso:
    python -m src.limpiar_tickets <csv_entrada> [csv_salida] [resumen_json]
"""
from __future__ import annotations

import csv
import json
import sys
from pathlib import Path

from src.fechas import normalizar_fecha
from src.limpieza import deduplicar, generar_resumen, validar_registros
from src.normalizacion import normalizar_categoria, normalizar_estado, normalizar_prioridad


def limpiar(tickets: list[dict]) -> tuple[list[dict], list[dict], int]:
    """Normaliza, deduplica y valida. Devuelve (validos, descartados, duplicados_eliminados)."""
    normalizados = []
    for t in tickets:
        nuevo = dict(t)
        nuevo["fecha_creacion"] = normalizar_fecha(t.get("fecha_creacion")) or t.get("fecha_creacion")
        nuevo["fecha_cierre"] = normalizar_fecha(t.get("fecha_cierre"))
        nuevo["categoria"] = normalizar_categoria(t.get("categoria"))
        nuevo["prioridad"] = normalizar_prioridad(t.get("prioridad"))
        nuevo["estado"] = normalizar_estado(t.get("estado"))
        normalizados.append(nuevo)

    unicos, duplicados_eliminados = deduplicar(normalizados)
    validos, descartados = validar_registros(unicos)
    return validos, descartados, duplicados_eliminados


def main(argv: list[str]) -> None:
    if len(argv) < 1:
        print("Uso: python -m src.limpiar_tickets <csv_entrada> [csv_salida] [resumen_json]")
        sys.exit(1)

    ruta_entrada = Path(argv[0])
    ruta_salida = Path(argv[1]) if len(argv) > 1 else ruta_entrada.parent / "tickets_limpios.csv"
    ruta_resumen = Path(argv[2]) if len(argv) > 2 else ruta_entrada.parent / "resumen_por_area_prioridad.json"

    with ruta_entrada.open(encoding="utf-8") as fh:
        tickets = list(csv.DictReader(fh))

    validos, descartados, duplicados = limpiar(tickets)

    if validos:
        campos = list(validos[0].keys())
        with ruta_salida.open("w", encoding="utf-8", newline="") as fh:
            writer = csv.DictWriter(fh, fieldnames=campos)
            writer.writeheader()
            writer.writerows(validos)

    resumen = generar_resumen(validos)
    resumen["total_validos"] = len(validos)
    resumen["total_descartados"] = len(descartados)
    resumen["total_duplicados_eliminados"] = duplicados
    with ruta_resumen.open("w", encoding="utf-8") as fh:
        json.dump(resumen, fh, ensure_ascii=False, indent=2, default=str)

    print(f"Válidos: {len(validos)}  Descartados: {len(descartados)}  Duplicados eliminados: {duplicados}")


if __name__ == "__main__":
    main(sys.argv[1:])
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `pytest tests/test_limpieza.py tests/test_limpiar_tickets.py -v`
Expected: todos PASS.

- [ ] **Step 5: Run against the real historical CSV**

Run: `python -m src.limpiar_tickets ../materiales/datos/tickets_historicos.csv`
Expected: termina sin excepción, imprime los conteos, y crea `../materiales/datos/tickets_limpios.csv` + `resumen_por_area_prioridad.json`.

- [ ] **Step 6: Commit**

```bash
git add etapa1-fundamentos/src/limpieza.py etapa1-fundamentos/src/limpiar_tickets.py \
        etapa1-fundamentos/tests/test_limpieza.py etapa1-fundamentos/tests/test_limpiar_tickets.py
git commit -m "feat(etapa1): script principal de limpieza con resumen por area y prioridad"
```

---

### Task 7: Cliente del `servicio_mock`

**Files:**
- Create: `etapa1-fundamentos/src/cliente_mock.py`
- Test: `etapa1-fundamentos/tests/test_cliente_mock.py`

**Interfaces:**
- Consumes: variables de entorno `SERVICIO_MOCK_URL`, `SERVICIO_MOCK_TOKEN`, `SERVICIO_MOCK_TIMEOUT` (Tarea 1).
- Produces: `listar_solicitudes(area=None, estado=None) -> list[dict]`, `crear_solicitud(datos: dict, clave_idempotencia: str | None = None) -> dict`, excepción `ServicioMockError`. No la consume ninguna tarea posterior de esta etapa.

- [ ] **Step 1: Write the failing test**

`etapa1-fundamentos/tests/test_cliente_mock.py`:
```python
from unittest.mock import Mock, patch

import pytest
import requests

from src.cliente_mock import ServicioMockError, crear_solicitud, listar_solicitudes


def _respuesta(status_code, json_data=None, headers=None):
    resp = Mock(spec=requests.Response)
    resp.status_code = status_code
    resp.headers = headers or {}
    resp.json.return_value = json_data if json_data is not None else {}
    resp.text = str(json_data)
    resp.raise_for_status = Mock()
    if status_code >= 400:
        resp.raise_for_status.side_effect = requests.exceptions.HTTPError(str(status_code))
    return resp


@patch("src.cliente_mock.requests.get")
def test_listar_solicitudes_devuelve_lista(mock_get):
    mock_get.return_value = _respuesta(200, json_data=[{"id": "EXT-1"}])
    resultado = listar_solicitudes(area="Compras")
    assert resultado == [{"id": "EXT-1"}]
    mock_get.assert_called_once()


@patch("src.cliente_mock.time.sleep", return_value=None)
@patch("src.cliente_mock.requests.get")
def test_listar_solicitudes_reintenta_ante_429(mock_get, _mock_sleep):
    mock_get.side_effect = [
        _respuesta(429, headers={"Retry-After": "1"}),
        _respuesta(200, json_data=[]),
    ]
    resultado = listar_solicitudes()
    assert resultado == []
    assert mock_get.call_count == 2


@patch("src.cliente_mock.time.sleep", return_value=None)
@patch("src.cliente_mock.requests.get")
def test_listar_solicitudes_falla_con_mensaje_claro_tras_agotar_reintentos(mock_get, _mock_sleep):
    mock_get.return_value = _respuesta(500)
    with pytest.raises(ServicioMockError, match="no respondió correctamente"):
        listar_solicitudes()


@patch("src.cliente_mock.time.sleep", return_value=None)
@patch("src.cliente_mock.requests.post")
def test_crear_solicitud_envia_idempotency_key(mock_post, _mock_sleep):
    mock_post.return_value = _respuesta(201, json_data={"id": "EXT-2"})
    resultado = crear_solicitud({"asunto": "x"}, clave_idempotencia="clave-1")
    assert resultado == {"id": "EXT-2"}
    _, kwargs = mock_post.call_args
    assert kwargs["headers"]["Idempotency-Key"] == "clave-1"
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pytest tests/test_cliente_mock.py -v`
Expected: FAIL con `ModuleNotFoundError: No module named 'src.cliente_mock'`.

- [ ] **Step 3: Write minimal implementation**

`etapa1-fundamentos/src/cliente_mock.py`:
```python
"""Cliente HTTP para el servicio_mock (API REST de terceros simulada)."""
from __future__ import annotations

import os
import time

import requests

BASE_URL = os.environ.get("SERVICIO_MOCK_URL", "http://localhost:8080")
TOKEN = os.environ.get("SERVICIO_MOCK_TOKEN", "")
TIMEOUT = float(os.environ.get("SERVICIO_MOCK_TIMEOUT", "5"))
MAX_REINTENTOS = 3


class ServicioMockError(Exception):
    """Se agotaron los reintentos contra el servicio_mock."""


def _cabeceras() -> dict:
    return {"Authorization": f"Bearer {TOKEN}"}


def _con_reintentos(fn_peticion):
    """Ejecuta fn_peticion() con reintentos ante 429/500."""
    ultimo_error = None
    for intento in range(1, MAX_REINTENTOS + 1):
        try:
            respuesta = fn_peticion()
        except requests.exceptions.RequestException as exc:
            ultimo_error = str(exc)
            time.sleep(2 ** intento * 0.1)
            continue

        if respuesta.status_code == 429:
            espera = float(respuesta.headers.get("Retry-After", 1))
            time.sleep(espera)
            continue
        if respuesta.status_code >= 500:
            ultimo_error = f"HTTP {respuesta.status_code}: {respuesta.text}"
            time.sleep(2 ** intento * 0.1)
            continue

        return respuesta

    raise ServicioMockError(
        f"El servicio_mock no respondió correctamente tras {MAX_REINTENTOS} "
        f"intentos. Último error: {ultimo_error}"
    )


def listar_solicitudes(area: str | None = None, estado: str | None = None) -> list[dict]:
    """GET /solicitudes con reintentos ante fallos transitorios."""
    parametros = {k: v for k, v in {"area": area, "estado": estado}.items() if v}

    def peticion():
        return requests.get(
            f"{BASE_URL}/solicitudes",
            params=parametros,
            headers=_cabeceras(),
            timeout=TIMEOUT,
        )

    respuesta = _con_reintentos(peticion)
    respuesta.raise_for_status()
    return respuesta.json()


def crear_solicitud(datos: dict, clave_idempotencia: str | None = None) -> dict:
    """POST /solicitudes con reintentos ante fallos transitorios."""
    cabeceras = _cabeceras()
    if clave_idempotencia:
        cabeceras["Idempotency-Key"] = clave_idempotencia

    def peticion():
        return requests.post(
            f"{BASE_URL}/solicitudes",
            json=datos,
            headers=cabeceras,
            timeout=TIMEOUT,
        )

    respuesta = _con_reintentos(peticion)
    respuesta.raise_for_status()
    return respuesta.json()
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pytest tests/test_cliente_mock.py -v`
Expected: 4 tests PASS.

- [ ] **Step 5 (manual, opcional): probar contra el servicio real**

```bash
cd materiales/servicio_mock
pip install -r requirements.txt
uvicorn app:app --reload --port 8080
```

En otra terminal, con `SERVICIO_MOCK_TOKEN=demo-token-prueba-2026` exportado:
```bash
python -c "from src.cliente_mock import listar_solicitudes; print(listar_solicitudes())"
```
Expected: imprime `[]` (o una lista de solicitudes si ya se crearon).

- [ ] **Step 6: Commit**

```bash
git add etapa1-fundamentos/src/cliente_mock.py etapa1-fundamentos/tests/test_cliente_mock.py
git commit -m "feat(etapa1): cliente del servicio_mock con reintentos y modo de error claro"
```

---

### Task 8: Dockerización de la base de datos

**Files:**
- Create: `etapa1-fundamentos/docker/docker-compose.yml`
- Create: `etapa1-fundamentos/docker/.env.example`

**Interfaces:**
- Consumes: `materiales/datos/esquema.sql` (ya existe, no se modifica).
- Produces: servicio MariaDB escuchando en `127.0.0.1:${DB_PORT}` con el esquema ya cargado — lo consume `src/db.py` (Tarea 9).

- [ ] **Step 1: Crear el archivo de variables de ejemplo**

`etapa1-fundamentos/docker/.env.example`:
```
DB_NAME=mesa_ayuda
DB_PORT=3306
MARIADB_ROOT_PASSWORD=cambia-esta-clave-root
MARIADB_USER=mesa_ayuda_app
MARIADB_PASSWORD=cambia-esta-clave-app
```

- [ ] **Step 2: Crear `docker-compose.yml`**

`etapa1-fundamentos/docker/docker-compose.yml`:
```yaml
services:
  mariadb:
    image: mariadb:11.4
    container_name: mesa_ayuda_db
    restart: unless-stopped
    env_file:
      - .env
    environment:
      MARIADB_DATABASE: ${DB_NAME:-mesa_ayuda}
    ports:
      - "${DB_PORT:-3306}:3306"
    volumes:
      - db_data:/var/lib/mysql
      - ../../materiales/datos/esquema.sql:/docker-entrypoint-initdb.d/01-esquema.sql:ro
    healthcheck:
      test: ["CMD-SHELL", "mysqladmin ping -h 127.0.0.1 -uroot -p$$MARIADB_ROOT_PASSWORD --silent"]
      interval: 5s
      timeout: 5s
      retries: 10
      start_period: 20s

volumes:
  db_data:
```

- [ ] **Step 3: Levantar el contenedor y verificar que el script SQL funcionó**

```bash
cd etapa1-fundamentos/docker
cp .env.example .env
docker compose up -d
docker compose ps
```

Expected: la columna `STATUS` de `mesa_ayuda_db` muestra `healthy` (puede tardar hasta `start_period` + unos segundos). Si en vez de eso el contenedor se reinicia en bucle o `docker compose logs mariadb` muestra un error de SQL, `esquema.sql` tiene un problema — corregirlo antes de continuar (no se debería necesitar corregir nada, ya que el archivo viene verificado, pero este paso es la comprobación real).

- [ ] **Step 4: Verificar manualmente que las tablas quedaron creadas**

```bash
docker compose exec mariadb mariadb -uroot -p"$MARIADB_ROOT_PASSWORD" -e "USE mesa_ayuda; SHOW TABLES;"
```

Expected: lista `adjuntos`, `areas`, `historial_estado`, `tickets`, `usuarios`.

- [ ] **Step 5: Commit**

```bash
git add etapa1-fundamentos/docker/docker-compose.yml etapa1-fundamentos/docker/.env.example
git commit -m "feat(etapa1): dockerizar la base de datos MariaDB con esquema.sql"
```

---

### Task 9: Helper de conexión y verificación automatizada del esquema

**Files:**
- Create: `etapa1-fundamentos/src/db.py`
- Test: `etapa1-fundamentos/tests/test_esquema_bd.py`

**Interfaces:**
- Consumes: servicio MariaDB de la Tarea 8; variables de entorno `DB_HOST`, `DB_PORT`, `DB_USER`, `DB_PASSWORD`, `DB_NAME` (Tarea 1).
- Produces: `obtener_conexion(reintentos=5, espera_segundos=2.0)`, constante `DB_NAME` — ambas reutilizables por `tests/test_sql_consultas.py` (Tarea 10) y por etapas posteriores (Etapa 4).

**Nota:** las pruebas de esta tarea requieren el contenedor de la Tarea 8 corriendo. Si no lo está: `cd etapa1-fundamentos/docker && docker compose up -d`.

- [ ] **Step 1: Write the failing tests**

`etapa1-fundamentos/tests/test_esquema_bd.py`:
```python
"""Requiere: docker compose up -d en etapa1-fundamentos/docker/."""
import pytest

from src.db import DB_NAME, obtener_conexion

TABLAS_ESPERADAS = {"areas", "usuarios", "tickets", "adjuntos", "historial_estado"}

COLUMNAS_ESPERADAS = {
    "areas": {"id_area", "nombre", "sede", "responsable"},
    "usuarios": {"id_usuario", "correo", "nombre", "id_area", "activo"},
    "tickets": {
        "id_ticket", "codigo", "id_usuario", "id_area", "categoria",
        "prioridad", "canal", "asunto", "descripcion", "estado",
        "fecha_creacion", "fecha_cierre", "reaperturas",
    },
    "adjuntos": {"id_adjunto", "id_ticket", "nombre_archivo", "tamano_kb"},
    "historial_estado": {
        "id_historial", "id_ticket", "estado_anterior", "estado_nuevo",
        "fecha_cambio", "usuario_cambio",
    },
}

TIPOS_ESPERADOS = {
    ("areas", "id_area"): "int",
    ("areas", "nombre"): "varchar",
    ("usuarios", "activo"): "char",
    ("tickets", "descripcion"): "text",
    ("tickets", "fecha_creacion"): "datetime",
    ("adjuntos", "tamano_kb"): "int",
    ("historial_estado", "fecha_cambio"): "datetime",
}


@pytest.fixture(scope="module")
def conexion():
    conn = obtener_conexion()
    yield conn
    conn.close()


def test_servicio_de_base_de_datos_responde(conexion):
    with conexion.cursor() as cursor:
        cursor.execute("SELECT 1 AS ok")
        assert cursor.fetchone()["ok"] == 1


def test_todas_las_tablas_existen(conexion):
    with conexion.cursor() as cursor:
        cursor.execute("SHOW TABLES")
        tablas = {list(fila.values())[0] for fila in cursor.fetchall()}
    assert TABLAS_ESPERADAS.issubset(tablas)


@pytest.mark.parametrize("tabla", sorted(TABLAS_ESPERADAS))
def test_columnas_de_cada_tabla(conexion, tabla):
    with conexion.cursor() as cursor:
        cursor.execute(
            "SELECT column_name FROM information_schema.columns "
            "WHERE table_schema = %s AND table_name = %s",
            (DB_NAME, tabla),
        )
        columnas = {fila["column_name"] for fila in cursor.fetchall()}
    assert columnas == COLUMNAS_ESPERADAS[tabla]


@pytest.mark.parametrize("tabla_columna", sorted(TIPOS_ESPERADOS))
def test_tipos_de_columnas_clave(conexion, tabla_columna):
    tabla, columna = tabla_columna
    with conexion.cursor() as cursor:
        cursor.execute(
            "SELECT data_type FROM information_schema.columns "
            "WHERE table_schema = %s AND table_name = %s AND column_name = %s",
            (DB_NAME, tabla, columna),
        )
        fila = cursor.fetchone()
    assert fila is not None, f"Columna {columna} no existe en {tabla}"
    assert fila["data_type"] == TIPOS_ESPERADOS[tabla_columna]
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `pytest tests/test_esquema_bd.py -v`
Expected: FAIL con `ModuleNotFoundError: No module named 'src.db'`.

- [ ] **Step 3: Write minimal implementation**

`etapa1-fundamentos/src/db.py`:
```python
"""Conexión a la base de datos dockerizada de Mesa de Ayuda."""
from __future__ import annotations

import os
import time

import pymysql
import pymysql.cursors

DB_HOST = os.environ.get("DB_HOST", "127.0.0.1")
DB_PORT = int(os.environ.get("DB_PORT", "3306"))
DB_USER = os.environ.get("DB_USER", "root")
DB_PASSWORD = os.environ.get("DB_PASSWORD", "")
DB_NAME = os.environ.get("DB_NAME", "mesa_ayuda")


def obtener_conexion(reintentos: int = 5, espera_segundos: float = 2.0):
    """Conecta a la base de datos, reintentando mientras el contenedor arranca."""
    ultimo_error = None
    for _ in range(1, reintentos + 1):
        try:
            return pymysql.connect(
                host=DB_HOST,
                port=DB_PORT,
                user=DB_USER,
                password=DB_PASSWORD,
                database=DB_NAME,
                cursorclass=pymysql.cursors.DictCursor,
                connect_timeout=5,
            )
        except pymysql.err.OperationalError as exc:
            ultimo_error = exc
            time.sleep(espera_segundos)
    raise ConnectionError(
        f"No fue posible conectar a la base de datos en {DB_HOST}:{DB_PORT} "
        f"tras {reintentos} intentos. ¿Está corriendo 'docker compose up -d' "
        f"en etapa1-fundamentos/docker? Último error: {ultimo_error}"
    )
```

- [ ] **Step 4: Levantar el contenedor si no está corriendo y exportar las variables**

```bash
cd etapa1-fundamentos/docker && docker compose up -d && cd ../..
cd etapa1-fundamentos
cp .env.example .env   # ajustar DB_PASSWORD para que coincida con docker/.env
export $(grep -v '^#' .env | xargs)   # Windows (Git Bash): mismo comando funciona
```

- [ ] **Step 5: Run tests to verify they pass**

Run: `pytest tests/test_esquema_bd.py -v`
Expected: todos PASS (1 + 1 + 5 parametrizados de columnas + 7 parametrizados de tipos).

- [ ] **Step 6: Commit**

```bash
git add etapa1-fundamentos/src/db.py etapa1-fundamentos/tests/test_esquema_bd.py
git commit -m "test(etapa1): verificar tablas, columnas y disponibilidad de la base de datos"
```

---

### Task 10: Consultas SQL de análisis

**Files:**
- Create: `etapa1-fundamentos/sql/01_agregacion_por_area.sql`
- Create: `etapa1-fundamentos/sql/02_join_tres_tablas.sql`
- Create: `etapa1-fundamentos/sql/03_tickets_reabiertos.sql`
- Test: `etapa1-fundamentos/tests/test_sql_consultas.py`

**Interfaces:**
- Consumes: `obtener_conexion` de `src/db.py` (Tarea 9); servicio MariaDB de la Tarea 8.
- Produces: 3 archivos `.sql` versionados — no los consume ninguna tarea posterior de esta etapa (Etapa 4 los extiende en su propio spec).

- [ ] **Step 1: Write the failing test**

`etapa1-fundamentos/tests/test_sql_consultas.py`:
```python
"""Requiere: docker compose up -d en etapa1-fundamentos/docker/."""
from pathlib import Path

import pytest

from src.db import obtener_conexion

DIRECTORIO_SQL = Path(__file__).resolve().parent.parent / "sql"


@pytest.fixture(scope="module")
def conexion():
    conn = obtener_conexion()
    yield conn
    conn.close()


@pytest.mark.parametrize(
    "archivo_sql,columnas_esperadas",
    [
        ("01_agregacion_por_area.sql", {"area", "cantidad_tickets"}),
        ("02_join_tres_tablas.sql", {"codigo", "area", "solicitante", "cantidad_adjuntos"}),
        ("03_tickets_reabiertos.sql", {"codigo", "estado", "veces_reabierto"}),
    ],
)
def test_consulta_sql_ejecuta_sin_error(conexion, archivo_sql, columnas_esperadas):
    consulta = (DIRECTORIO_SQL / archivo_sql).read_text(encoding="utf-8")
    with conexion.cursor() as cursor:
        cursor.execute(consulta)
        filas = cursor.fetchall()
    assert isinstance(filas, list)
    if filas:
        assert set(filas[0].keys()) == columnas_esperadas
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pytest tests/test_sql_consultas.py -v`
Expected: FAIL con `FileNotFoundError` (los `.sql` todavía no existen).

- [ ] **Step 3: Write the SQL files**

`etapa1-fundamentos/sql/01_agregacion_por_area.sql`:
```sql
-- Cantidad de tickets por área, ordenado de mayor a menor.
SELECT
    a.nombre AS area,
    COUNT(t.id_ticket) AS cantidad_tickets
FROM areas a
LEFT JOIN tickets t ON t.id_area = a.id_area
GROUP BY a.nombre
ORDER BY cantidad_tickets DESC;
```

`etapa1-fundamentos/sql/02_join_tres_tablas.sql`:
```sql
-- Tickets con su área, su solicitante y la cantidad de adjuntos que tienen.
SELECT
    t.codigo,
    a.nombre AS area,
    u.nombre AS solicitante,
    COUNT(adj.id_adjunto) AS cantidad_adjuntos
FROM tickets t
JOIN areas a ON a.id_area = t.id_area
JOIN usuarios u ON u.id_usuario = t.id_usuario
LEFT JOIN adjuntos adj ON adj.id_ticket = t.id_ticket
GROUP BY t.codigo, a.nombre, u.nombre
ORDER BY cantidad_adjuntos DESC;
```

`etapa1-fundamentos/sql/03_tickets_reabiertos.sql`:
```sql
-- Tickets que registran al menos una reapertura en su historial de estado.
SELECT DISTINCT
    t.codigo,
    t.estado,
    COUNT(h.id_historial) AS veces_reabierto
FROM tickets t
JOIN historial_estado h
    ON h.id_ticket = t.id_ticket
    AND h.estado_nuevo = 'Reabierto'
GROUP BY t.codigo, t.estado
ORDER BY veces_reabierto DESC;
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pytest tests/test_sql_consultas.py -v`
Expected: 3 tests PASS (las 3 consultas ejecutan sin error contra la base de datos dockerizada).

- [ ] **Step 5: Commit**

```bash
git add etapa1-fundamentos/sql etapa1-fundamentos/tests/test_sql_consultas.py
git commit -m "feat(etapa1): 3 consultas SQL de analisis con prueba de ejecucion"
```

---

### Task 11: README de la etapa y verificación final

**Files:**
- Modify: `etapa1-fundamentos/README.md`

**Interfaces:**
- Consumes: todo lo construido en las Tareas 1-10.
- Produces: entregable de documentación de la etapa (criterio "documentación mínima").

- [ ] **Step 1: Escribir el README completo**

`etapa1-fundamentos/README.md`:
```markdown
# Etapa 1 — Fundamentos

Script de limpieza del histórico de tickets, cliente del `servicio_mock`,
base de datos dockerizada y 3 consultas SQL de análisis.

## Instalación

\`\`\`bash
cd etapa1-fundamentos
python -m venv .venv
# Windows: .venv\Scripts\activate    |    Linux/Mac: source .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env
\`\`\`

## Base de datos (Docker)

\`\`\`bash
cd docker
cp .env.example .env   # usa las mismas claves que etapa1-fundamentos/.env
docker compose up -d
docker compose ps      # debe mostrar "healthy"
\`\`\`

El contenedor carga automáticamente `materiales/datos/esquema.sql` la
primera vez que se crea el volumen. Si el script SQL tuviera un error de
sintaxis, la inicialización fallaría y el contenedor nunca llegaría a
`healthy` — así se comprueba que el script funciona. Las pruebas de
`tests/test_esquema_bd.py` y `tests/test_sql_consultas.py` verifican,
además, que las 5 tablas existen con sus columnas y tipos correctos, y que
el servicio de base de datos responde.

## Ejecución

\`\`\`bash
# Limpieza del histórico
python -m src.limpiar_tickets ../materiales/datos/tickets_historicos.csv

# Servicio mock (en otra terminal, desde materiales/servicio_mock/)
uvicorn app:app --reload --port 8080

# Pruebas (requiere Docker corriendo para test_esquema_bd.py y test_sql_consultas.py)
pytest -v
\`\`\`

## Qué hace

- Normaliza fechas (3 formatos reales del CSV, incluidos meses en
  español), categoría/prioridad/estado (mayúsculas y escalas mezcladas),
  elimina duplicados por `id`, descarta filas inválidas con motivo, y
  genera `tickets_limpios.csv` + `resumen_por_area_prioridad.json`.
- Cliente del `servicio_mock` con reintentos ante `429`/`500` y mensaje de
  error comprensible si el servicio no responde.
- Base de datos MariaDB dockerizada a partir de `esquema.sql`, con
  pruebas automatizadas que verifican que las 5 tablas y sus columnas
  existen tal como las define el esquema, y que el servicio responde.
- 3 consultas SQL de análisis (`sql/`): tickets por área, tickets con
  área+solicitante+adjuntos, tickets reabiertos.

## Qué se supuso

- La deduplicación usa `id` como clave única del ticket.
- Un registro es inválido si le falta `id`, `area`, o si `fecha_creacion`
  no coincide con ninguno de los 3 formatos conocidos.
- Los tests de esquema y de las consultas SQL requieren que el contenedor
  Docker esté corriendo; no están pensados para correr sin él.
- La base de datos se conecta con un usuario de aplicación
  (`mesa_ayuda_app`), no con `root`, siguiendo buena práctica de
  privilegio mínimo.

## Qué quedó fuera

- No se valida `fecha_cierre` como obligatoria (los tickets abiertos
  legítimamente no la tienen).
- No se crean índices adicionales sobre `esquema.sql` (el enunciado lo
  deja como propuesta opcional, no obligatoria).
```

- [ ] **Step 2: Correr toda la suite de pruebas**

```bash
cd etapa1-fundamentos
docker compose -f docker/docker-compose.yml up -d
pytest -v
```

Expected: todas las pruebas de `tests/` PASS (fechas, normalización, limpieza, script principal, cliente mock, esquema de BD, consultas SQL).

- [ ] **Step 3: Verificar el mínimo de commits atómicos**

```bash
git log --oneline master..etapa1-fundamentos | wc -l
```

Expected: 8 o más. Si es menor, es una señal de que algún Step anterior se agrupó de más — dividir el último commit grande antes de cerrar la etapa no es necesario si ya se llegó al mínimo con los commits de las Tareas 1-10 (normalmente 10 commits, uno por tarea).

- [ ] **Step 4: Commit final**

```bash
git add etapa1-fundamentos/README.md
git commit -m "docs(etapa1): README con instalacion, ejecucion, supuestos y alcance"
```

---

## Self-Review (completado por el autor del plan)

1. **Cobertura del spec**: cada tarea de `docs/superpowers/specs/2026-08-22-etapa1-fundamentos-design.md` §4 tiene una tarea equivalente aquí (1→1, 2→1, 3→2, 4→3, 5→4, 6→5, 7→6, 8→7, 9→8, 10→9, 11→10, 12→ cubierto de forma distribuida en cada tarea + Task 11, 13→11, 14→ verificado en Task 11 Step 3). Sin huecos.
2. **Placeholders**: ninguno — todos los pasos tienen código completo o comandos exactos.
3. **Consistencia de tipos/nombres**: `normalizar_fecha`, `normalizar_categoria`, `normalizar_estado`, `normalizar_prioridad`, `deduplicar`, `validar_registro(s)`, `generar_resumen`, `limpiar`, `main`, `obtener_conexion`, `DB_NAME` se usan con la misma firma en todas las tareas que los consumen.

---

## Siguiente paso

Este plan cubre exclusivamente la Etapa 1. Al terminarlo (mínimo 60/100 según la rúbrica del spec), el siguiente plan a escribir es el de la Etapa 2, a partir de `docs/superpowers/specs/2026-08-22-etapa2-autonomia-integracion-design.md` — no antes, porque Etapa 2 depende de que Etapa 1 esté acreditada.
