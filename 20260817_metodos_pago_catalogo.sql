-- Migración: Catálogo de Métodos de Pago personalizables
-- Fecha: 2026-08-17
-- Base de datos: rim_challouf
--
-- Nota: si la tabla ya fue creada por el backend (conexion.php),
-- usa la columna `estado` (ENUM), no `activo`.

CREATE TABLE IF NOT EXISTS metodos_pago (
  id          INT AUTO_INCREMENT PRIMARY KEY,
  nombre      VARCHAR(80)  NOT NULL,
  estado      ENUM('activo','inactivo') NOT NULL DEFAULT 'activo',
  orden       INT          NOT NULL DEFAULT 0,
  created_at  TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uq_metodos_pago_nombre (nombre)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Semillas por defecto (los métodos que ya estaban hardcodeados)
INSERT IGNORE INTO metodos_pago (nombre, estado, orden) VALUES
  ('Efectivo ($)',    'activo', 1),
  ('Efectivo (Bs)',   'activo', 2),
  ('Pago Móvil',      'activo', 3),
  ('Punto de Venta',  'activo', 4),
  ('Zelle',           'activo', 5),
  ('Transferencia',   'activo', 6),
  ('Otro',            'activo', 7);
