-- =====================================================================
-- Etapa 4 — extensión de trazabilidad: registro por paso del pipeline
-- de orquestación. Se aplica sobre el esquema base (materiales/datos/esquema.sql).
-- =====================================================================

CREATE TABLE IF NOT EXISTS interacciones_ia (
  id_interaccion   INT AUTO_INCREMENT PRIMARY KEY,
  id_ticket        INT NOT NULL,
  evento_id        VARCHAR(80) NOT NULL,
  paso_pipeline    VARCHAR(30) NOT NULL,
  decision         VARCHAR(30) NOT NULL,
  confianza        DECIMAL(4,3),
  fecha            DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_interaccion_ticket FOREIGN KEY (id_ticket) REFERENCES tickets(id_ticket)
);

CREATE INDEX IF NOT EXISTS idx_interacciones_evento ON interacciones_ia (evento_id);
