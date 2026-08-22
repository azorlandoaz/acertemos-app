-- Tickets que registran al menos una reapertura, según el contador
-- autoritativo tickets.reaperturas (historial_estado no guarda un log
-- completo de reaperturas en este dataset: registra un ciclo de vida fijo
-- de 3 filas por ticket, por lo que COUNT(...) sobre él no refleja el
-- número real de reaperturas ni detecta todos los tickets reabiertos).
SELECT
    codigo,
    estado,
    reaperturas AS veces_reabierto
FROM tickets
WHERE reaperturas > 0
ORDER BY reaperturas DESC;
