from src.normalizacion import (
    normalizar_categoria,
    normalizar_estado,
    normalizar_prioridad,
)


def test_normalizar_categoria_variantes():
    assert normalizar_categoria("VACACIONES") == "Vacaciones"
    assert normalizar_categoria("Vacaciones") == "Vacaciones"
    assert normalizar_categoria("compras") == "Compras"
    # El fold de acentos (Fix 1) hace que "Gestión" y "Gestion" converjan en
    # la variante sin acento, ya que no hay mapa canónico para categorías.
    assert normalizar_categoria("Gestión de accesos") == "Gestion de accesos"


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


def test_normalizar_prioridad_funde_variantes_con_y_sin_acento():
    assert normalizar_prioridad("CRITICA") == normalizar_prioridad("Crítica")
    assert normalizar_prioridad("Crítica") == "Crítica"
    assert normalizar_prioridad("4-Crítica") == "Crítica"


def test_normalizar_categoria_funde_variantes_con_y_sin_acento():
    assert normalizar_categoria("Gestion de accesos") == normalizar_categoria("Gestión de accesos")
