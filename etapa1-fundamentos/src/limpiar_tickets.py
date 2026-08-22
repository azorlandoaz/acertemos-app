"""Script principal: limpia el histórico de tickets y genera un resumen.

Uso:
    python -m src.limpiar_tickets <csv_entrada> [csv_salida] [resumen_json]
"""
from __future__ import annotations

import csv
import json
import sys
from pathlib import Path

from src.fechas import normalizar_fecha
from src.limpieza import deduplicar, generar_resumen, validar_registros
from src.normalizacion import normalizar_categoria, normalizar_estado, normalizar_prioridad


def limpiar(tickets: list[dict]) -> tuple[list[dict], list[dict], int]:
    """Normaliza, deduplica y valida. Devuelve (validos, descartados, duplicados_eliminados)."""
    normalizados = []
    for t in tickets:
        nuevo = dict(t)
        nuevo["fecha_creacion"] = normalizar_fecha(t.get("fecha_creacion")) or t.get("fecha_creacion")
        nuevo["fecha_cierre"] = normalizar_fecha(t.get("fecha_cierre"))
        nuevo["categoria"] = normalizar_categoria(t.get("categoria"))
        nuevo["prioridad"] = normalizar_prioridad(t.get("prioridad"))
        nuevo["estado"] = normalizar_estado(t.get("estado"))
        normalizados.append(nuevo)

    unicos, duplicados_eliminados = deduplicar(normalizados)
    validos, descartados = validar_registros(unicos)
    return validos, descartados, duplicados_eliminados


def main(argv: list[str]) -> None:
    if len(argv) < 1:
        print("Uso: python -m src.limpiar_tickets <csv_entrada> [csv_salida] [resumen_json]")
        sys.exit(1)

    ruta_entrada = Path(argv[0])
    ruta_salida = Path(argv[1]) if len(argv) > 1 else ruta_entrada.parent / "tickets_limpios.csv"
    ruta_resumen = Path(argv[2]) if len(argv) > 2 else ruta_entrada.parent / "resumen_por_area_prioridad.json"

    with ruta_entrada.open(encoding="utf-8") as fh:
        tickets = list(csv.DictReader(fh))

    validos, descartados, duplicados = limpiar(tickets)

    if validos:
        campos = list(validos[0].keys())
        with ruta_salida.open("w", encoding="utf-8", newline="") as fh:
            writer = csv.DictWriter(fh, fieldnames=campos)
            writer.writeheader()
            writer.writerows(validos)

    if descartados:
        ruta_descartados = ruta_salida.parent / "tickets_descartados.csv"
        campos_descartados = list(descartados[0].keys())
        with ruta_descartados.open("w", encoding="utf-8", newline="") as fh:
            writer = csv.DictWriter(fh, fieldnames=campos_descartados)
            writer.writeheader()
            writer.writerows(descartados)

    resumen = generar_resumen(validos)
    resumen["total_validos"] = len(validos)
    resumen["total_descartados"] = len(descartados)
    resumen["total_duplicados_eliminados"] = duplicados
    with ruta_resumen.open("w", encoding="utf-8") as fh:
        json.dump(resumen, fh, ensure_ascii=False, indent=2, default=str)

    print(f"Válidos: {len(validos)}  Descartados: {len(descartados)}  Duplicados eliminados: {duplicados}")


if __name__ == "__main__":
    main(sys.argv[1:])
