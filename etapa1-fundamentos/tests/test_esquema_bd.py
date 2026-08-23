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
