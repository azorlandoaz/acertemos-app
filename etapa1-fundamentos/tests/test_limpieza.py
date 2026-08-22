from src.limpieza import deduplicar


def test_deduplicar_elimina_repetidos():
    tickets = [{"id": "TK-1"}, {"id": "TK-2"}, {"id": "TK-1"}]
    unicos, eliminados = deduplicar(tickets)
    assert len(unicos) == 2
    assert eliminados == 1
    assert [t["id"] for t in unicos] == ["TK-1", "TK-2"]


def test_deduplicar_sin_duplicados():
    tickets = [{"id": "TK-1"}, {"id": "TK-2"}]
    unicos, eliminados = deduplicar(tickets)
    assert len(unicos) == 2
    assert eliminados == 0


def test_deduplicar_lista_vacia():
    unicos, eliminados = deduplicar([])
    assert unicos == []
    assert eliminados == 0


from src.limpieza import validar_registro, validar_registros


def test_validar_registro_valido():
    ticket = {"id": "TK-1", "area": "Compras", "fecha_creacion": "2025-01-01"}
    assert validar_registro(ticket) is None


def test_validar_registro_sin_area():
    ticket = {"id": "TK-1", "area": "", "fecha_creacion": "2025-01-01"}
    assert validar_registro(ticket) == "area vacía"


def test_validar_registro_sin_id():
    ticket = {"id": "", "area": "Compras", "fecha_creacion": "2025-01-01"}
    assert validar_registro(ticket) == "id vacío"


def test_validar_registro_fecha_invalida():
    ticket = {"id": "TK-1", "area": "Compras", "fecha_creacion": "fecha-mala"}
    assert validar_registro(ticket) == "fecha_creacion inválida"


def test_validar_registros_separa_validos_e_invalidos():
    tickets = [
        {"id": "TK-1", "area": "Compras", "fecha_creacion": "2025-01-01"},
        {"id": "TK-2", "area": "", "fecha_creacion": "2025-01-01"},
    ]
    validos, descartados = validar_registros(tickets)
    assert len(validos) == 1
    assert len(descartados) == 1
    assert descartados[0]["_motivo_descarte"] == "area vacía"


def test_validar_registros_archivo_vacio():
    validos, descartados = validar_registros([])
    assert validos == []
    assert descartados == []


from src.limpieza import generar_resumen


def test_generar_resumen_cuenta_por_area_y_prioridad():
    tickets = [
        {"area": "Compras", "prioridad": "Alta"},
        {"area": "Compras", "prioridad": "Baja"},
        {"area": "Calidad", "prioridad": "Alta"},
    ]
    resumen = generar_resumen(tickets)
    assert resumen["por_area"] == {"Compras": 2, "Calidad": 1}
    assert resumen["por_prioridad"] == {"Alta": 2, "Baja": 1}


def test_generar_resumen_lista_vacia():
    resumen = generar_resumen([])
    assert resumen == {"por_area": {}, "por_prioridad": {}}
