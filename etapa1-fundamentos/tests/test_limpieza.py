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
