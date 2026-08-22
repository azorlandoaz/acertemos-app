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
