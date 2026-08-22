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
