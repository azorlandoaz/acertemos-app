"""Deduplicación, validación y resumen del histórico de tickets."""
from __future__ import annotations

from src.fechas import normalizar_fecha


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
