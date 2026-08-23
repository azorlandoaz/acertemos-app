"""Normalización de categoría, prioridad y estado del histórico de tickets."""
from __future__ import annotations

import re
import unicodedata

_PREFIJO_NUMERICO = re.compile(r"^\d+-")

_PRIORIDADES_CANONICAS = {
    "alta": "Alta",
    "media": "Media",
    "baja": "Baja",
    "critica": "Crítica",
}


def _sin_acentos(texto: str) -> str:
    """Quita marcas diacríticas (acentos) preservando el resto del texto."""
    return "".join(
        c for c in unicodedata.normalize("NFD", texto) if unicodedata.category(c) != "Mn"
    )


def _normalizar_texto_simple(valor: str | None) -> str | None:
    if valor is None:
        return None
    texto = str(valor).strip()
    if not texto:
        return None
    # Fold accents before casing so "Gestión"/"Gestion" merge into one value.
    return _sin_acentos(texto).lower().capitalize()


def normalizar_categoria(valor: str | None) -> str | None:
    """Normaliza la categoría a formato 'Primera letra mayúscula', sin acentos
    distinguiendo variantes (p. ej. 'Gestion'/'Gestión' -> 'Gestion de accesos')."""
    return _normalizar_texto_simple(valor)


def normalizar_estado(valor: str | None) -> str | None:
    """Normaliza el estado a formato 'Primera letra mayúscula'."""
    return _normalizar_texto_simple(valor)


def normalizar_prioridad(valor: str | None) -> str | None:
    """Normaliza la prioridad a una de 4 categorías canónicas (Alta/Media/Baja/
    Crítica), sin distinguir acentos ni prefijos numéricos como '1-'."""
    if valor is None:
        return None
    texto = str(valor).strip()
    if not texto:
        return None
    texto = _PREFIJO_NUMERICO.sub("", texto)
    clave = _sin_acentos(texto).lower()
    return _PRIORIDADES_CANONICAS.get(clave, texto.lower().capitalize())
