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
