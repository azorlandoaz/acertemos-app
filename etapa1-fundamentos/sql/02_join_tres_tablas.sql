-- Tickets con su área, su solicitante y la cantidad de adjuntos que tienen.
SELECT
    t.codigo,
    a.nombre AS area,
    u.nombre AS solicitante,
    COUNT(adj.id_adjunto) AS cantidad_adjuntos
FROM tickets t
JOIN areas a ON a.id_area = t.id_area
JOIN usuarios u ON u.id_usuario = t.id_usuario
LEFT JOIN adjuntos adj ON adj.id_ticket = t.id_ticket
GROUP BY t.codigo, a.nombre, u.nombre
ORDER BY cantidad_adjuntos DESC;
