-- Cantidad de tickets por área, ordenado de mayor a menor.
SELECT
    a.nombre AS area,
    COUNT(t.id_ticket) AS cantidad_tickets
FROM areas a
LEFT JOIN tickets t ON t.id_area = a.id_area
GROUP BY a.nombre
ORDER BY cantidad_tickets DESC;
