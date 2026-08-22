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
            ultimo_error = (
                f"HTTP 429 (límite de tasa), "
                f"Retry-After={respuesta.headers.get('Retry-After', 1)}s"
            )
            espera = float(respuesta.headers.get("Retry-After", 1))
            time.sleep(espera)
            continue
        if respuesta.status_code >= 500:
            ultimo_error = f"HTTP {respuesta.status_code}: {respuesta.text}"
            time.sleep(2 ** intento * 0.1)
            continue

        # Non-retryable 4xx responses: raise immediately
        if respuesta.status_code >= 400:
            raise ServicioMockError(
                f"El servicio_mock respondió con error de cliente: "
                f"HTTP {respuesta.status_code}: {respuesta.text}"
            )

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
    return respuesta.json()
