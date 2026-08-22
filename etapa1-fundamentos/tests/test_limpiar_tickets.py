import csv
import json

from src.limpiar_tickets import limpiar, main


def test_limpiar_normaliza_deduplica_y_valida():
    tickets = [
        {"id": "TK-1", "area": "Vacaciones", "fecha_creacion": "2025-03-08",
         "fecha_cierre": "", "categoria": "VACACIONES", "prioridad": "1-Alta",
         "estado": "REABIERTO"},
        {"id": "TK-1", "area": "Vacaciones", "fecha_creacion": "2025-03-08",
         "fecha_cierre": "", "categoria": "Vacaciones", "prioridad": "Alta",
         "estado": "Reabierto"},
        {"id": "TK-2", "area": "", "fecha_creacion": "2025-01-01",
         "fecha_cierre": "", "categoria": "Hardware", "prioridad": "Baja",
         "estado": "Abierto"},
    ]
    validos, descartados, duplicados = limpiar(tickets)

    assert duplicados == 1
    assert len(validos) == 1
    assert validos[0]["id"] == "TK-1"
    assert validos[0]["categoria"] == "Vacaciones"
    assert validos[0]["prioridad"] == "Alta"
    assert validos[0]["estado"] == "Reabierto"
    assert len(descartados) == 1
    assert descartados[0]["_motivo_descarte"] == "area vacía"


def test_main_extremo_a_extremo(tmp_path):
    csv_entrada = tmp_path / "entrada.csv"
    csv_entrada.write_text(
        "id,fecha_creacion,fecha_cierre,area,categoria,prioridad,canal,"
        "solicitante,asunto,descripcion,estado,reaperturas\n"
        "TK-1,2025-03-08,,Compras,VACACIONES,1-Alta,correo,u1@x.com,Asunto,Desc,REABIERTO,1\n",
        encoding="utf-8",
    )
    csv_salida = tmp_path / "salida.csv"
    resumen_json = tmp_path / "resumen.json"

    main([str(csv_entrada), str(csv_salida), str(resumen_json)])

    assert csv_salida.exists()
    with csv_salida.open(encoding="utf-8") as fh:
        filas = list(csv.DictReader(fh))
    assert len(filas) == 1
    assert filas[0]["categoria"] == "Vacaciones"

    resumen = json.loads(resumen_json.read_text(encoding="utf-8"))
    assert resumen["total_validos"] == 1


def test_main_archivo_vacio(tmp_path):
    csv_entrada = tmp_path / "vacio.csv"
    csv_entrada.write_text(
        "id,fecha_creacion,fecha_cierre,area,categoria,prioridad,canal,"
        "solicitante,asunto,descripcion,estado,reaperturas\n",
        encoding="utf-8",
    )
    csv_salida = tmp_path / "salida.csv"
    resumen_json = tmp_path / "resumen.json"

    main([str(csv_entrada), str(csv_salida), str(resumen_json)])

    resumen = json.loads(resumen_json.read_text(encoding="utf-8"))
    assert resumen["total_validos"] == 0
    assert not csv_salida.exists()


def test_main_escribe_reporte_de_descartes(tmp_path):
    csv_entrada = tmp_path / "entrada.csv"
    csv_entrada.write_text(
        "id,fecha_creacion,fecha_cierre,area,categoria,prioridad,canal,"
        "solicitante,asunto,descripcion,estado,reaperturas\n"
        "TK-1,2025-03-08,,Compras,Hardware,Alta,correo,u1@x.com,Asunto,Desc,Abierto,0\n"
        "TK-2,2025-03-08,,,Hardware,Alta,correo,u2@x.com,Asunto,Desc,Abierto,0\n",
        encoding="utf-8",
    )
    csv_salida = tmp_path / "salida.csv"
    resumen_json = tmp_path / "resumen.json"

    main([str(csv_entrada), str(csv_salida), str(resumen_json)])

    ruta_descartados = tmp_path / "tickets_descartados.csv"
    assert ruta_descartados.exists()
    with ruta_descartados.open(encoding="utf-8") as fh:
        filas = list(csv.DictReader(fh))
    assert len(filas) == 1
    assert filas[0]["_motivo_descarte"] == "area vacía"
