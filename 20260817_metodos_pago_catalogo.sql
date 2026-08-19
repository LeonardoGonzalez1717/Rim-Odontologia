-- Migración: Catálogo de Métodos de Pago personalizables
-- Fecha: 2026-08-17
-- Base de datos: rim_challouf

CREATE TABLE IF NOT EXISTS metodos_pago (
  id          INT AUTO_INCREMENT PRIMARY KEY,
  nombre      VARCHAR(80)  NOT NULL,
  activo      TINYINT(1)   NOT NULL DEFAULT 1,
  orden       INT          NOT NULL DEFAULT 0,
  created_at  TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uq_metodos_pago_nombre (nombre)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Semillas por defecto (los métodos que ya estaban hardcodeados)
INSERT IGNORE INTO metodos_pago (nombre, activo, orden) VALUES
  ('Efectivo ($)',      1, 1),
  ('Efectivo (Bs)',     1, 2),
  ('Pago Móvil',       1, 3),
  ('Punto de Venta',   1, 4),
  ('Zelle',            1, 5),
  ('Transferencia',    1, 6),
  ('Otro',             1, 7);
