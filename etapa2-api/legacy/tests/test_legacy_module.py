from datetime import date

from legacy_module import filtrar_por_periodo


def test_s1_incluye_tickets_creados_el_primer_dia_del_periodo():
    """Causa raíz: filtrar_por_periodo usaba comparadores estrictos
    (fc > inicio and fc < fin), excluyendo los tickets creados exactamente
    el primer o el último día del periodo."""
    tickets = [{"fecha_creacion": "2025-03-01"}]
    resultado = filtrar_por_periodo(tickets, date(2025, 3, 1), date(2025, 3, 31))
    assert len(resultado) == 1


def test_s1_incluye_tickets_creados_el_ultimo_dia_del_periodo():
    tickets = [{"fecha_creacion": "2025-03-31"}]
    resultado = filtrar_por_periodo(tickets, date(2025, 3, 1), date(2025, 3, 31))
    assert len(resultado) == 1
