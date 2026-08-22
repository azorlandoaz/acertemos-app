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
