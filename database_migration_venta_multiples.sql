-- =============================================================================
-- Migración: múltiples tratamientos por venta
-- Ejecutar una sola vez sobre la base rim_challouf existente
-- =============================================================================

USE `rim_challouf`;

-- Tabla de detalle: cada línea es un tratamiento de la venta
CREATE TABLE IF NOT EXISTS `venta_detalles` (
  `id`          INT(11)        NOT NULL AUTO_INCREMENT,
  `venta_id`    INT(11)        NOT NULL,
  `servicio_id` INT(11)        NOT NULL,
  `precio`      DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
  PRIMARY KEY (`id`),
  CONSTRAINT `fk_detalle_venta`
    FOREIGN KEY (`venta_id`)    REFERENCES `ventas`(`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `fk_detalle_servicio`
    FOREIGN KEY (`servicio_id`) REFERENCES `servicios_tratamientos`(`id`) ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Migrar ventas existentes (solo si aún tienen servicio_id)
INSERT INTO `venta_detalles` (`venta_id`, `servicio_id`, `precio`)
SELECT v.`id`, v.`servicio_id`, v.`total`
FROM `ventas` v
WHERE v.`servicio_id` IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM `venta_detalles` vd WHERE vd.`venta_id` = v.`id`
  );

-- Quitar columna servicio_id de ventas (si existe)
SET @fk_exists = (
  SELECT COUNT(*) FROM information_schema.TABLE_CONSTRAINTS
  WHERE CONSTRAINT_SCHEMA = DATABASE()
    AND TABLE_NAME = 'ventas'
    AND CONSTRAINT_NAME = 'fk_venta_servicio'
);
SET @sql_drop_fk = IF(@fk_exists > 0, 'ALTER TABLE `ventas` DROP FOREIGN KEY `fk_venta_servicio`', 'SELECT 1');
PREPARE stmt FROM @sql_drop_fk;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @col_exists = (
  SELECT COUNT(*) FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'ventas'
    AND COLUMN_NAME = 'servicio_id'
);
SET @sql_drop_col = IF(@col_exists > 0, 'ALTER TABLE `ventas` DROP COLUMN `servicio_id`', 'SELECT 1');
PREPARE stmt FROM @sql_drop_col;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;
