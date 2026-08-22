-- Tickets que registran al menos una reapertura en su historial de estado.
SELECT DISTINCT
    t.codigo,
    t.estado,
    COUNT(h.id_historial) AS veces_reabierto
FROM tickets t
JOIN historial_estado h
    ON h.id_ticket = t.id_ticket
    AND h.estado_nuevo = 'Reabierto'
GROUP BY t.codigo, t.estado
ORDER BY veces_reabierto DESC;
