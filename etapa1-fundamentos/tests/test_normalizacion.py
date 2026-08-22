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
