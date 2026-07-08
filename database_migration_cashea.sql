-- =============================================================================
-- Migración: pago Cashea en ventas
-- Ejecutar en la base de datos rim_challouf
-- =============================================================================

USE `rim_challouf`;

ALTER TABLE `ventas`
  ADD COLUMN `cashea` TINYINT(1) NOT NULL DEFAULT 0 AFTER `total`,
  ADD COLUMN `monto_caja` DECIMAL(10, 2) NOT NULL DEFAULT 0.00 AFTER `cashea`;

-- Ventas existentes: el monto en caja coincide con el total
UPDATE `ventas` SET `monto_caja` = `total` WHERE `monto_caja` = 0;
