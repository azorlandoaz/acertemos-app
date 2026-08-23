from datetime import date

from src.fechas import normalizar_fecha


def test_formato_iso():
    assert normalizar_fecha("2025-03-08") == date(2025, 3, 8)


def test_formato_dd_mm_aaaa():
    assert normalizar_fecha("03/06/2025") == date(2025, 6, 3)


def test_formato_dd_mes_es_aaaa():
    assert normalizar_fecha("30-Jun-2025") == date(2025, 6, 30)


def test_formato_dd_mes_es_minusculas():
    assert normalizar_fecha("20-Ene-2026") == date(2026, 1, 20)


def test_valor_vacio_devuelve_none():
    assert normalizar_fecha("") is None
    assert normalizar_fecha(None) is None


def test_formato_invalido_devuelve_none():
    assert normalizar_fecha("no es una fecha") is None
