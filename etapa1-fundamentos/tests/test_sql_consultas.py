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
    assert filas, f"{archivo_sql} no devolvió filas"
    assert set(filas[0].keys()) == columnas_esperadas
