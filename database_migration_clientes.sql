-- =============================================================================
-- Migración: tabla clientes y relación con ventas
-- Ejecutar una sola vez en la base de datos rim_challouf
-- =============================================================================

CREATE TABLE IF NOT EXISTS `clientes` (
  `id`         INT(11)      NOT NULL AUTO_INCREMENT,
  `cedula`     VARCHAR(20)  NOT NULL,
  `nombre`     VARCHAR(150) NOT NULL,
  `telefono`   VARCHAR(20)  NULL,
  `estado`     ENUM('activo','inactivo') NOT NULL DEFAULT 'activo',
  `created_at` TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

ALTER TABLE `ventas`
  ADD COLUMN `cliente_id` INT(11) NULL AFTER `doctor_id`;

ALTER TABLE `ventas`
  ADD CONSTRAINT `fk_venta_cliente`
    FOREIGN KEY (`cliente_id`) REFERENCES `clientes`(`id`)
    ON UPDATE CASCADE ON DELETE SET NULL;
