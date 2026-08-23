from datetime import date

from legacy_module import filtrar_por_periodo, resumir_por_area


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


def test_s2_llamadas_sucesivas_no_comparten_conteos():
    """Causa raíz: resumir_por_area(tickets, acumulador={}) tiene un
    argumento por defecto mutable — el diccionario se crea una sola vez
    y se reutiliza entre llamadas sucesivas dentro del mismo proceso."""
    primera = resumir_por_area([{"area": "Compras"}])
    segunda = resumir_por_area([{"area": "Calidad"}])
    assert primera == {"Compras": 1}
    assert segunda == {"Calidad": 1}


def test_s3_cuenta_reabierto_en_mayusculas():
    """Causa raíz: contar_reaperturas comparaba estado == "reabierto" en
    minúscula exacta, pero el dato real trae "REABIERTO" (verificado en
    tickets_historicos.csv, fila TK-00183)."""
    from legacy_module import contar_reaperturas
    tickets = [{"estado": "REABIERTO"}, {"estado": "Abierto"}]
    assert contar_reaperturas(tickets) == 1
