-- =============================================================================
-- Migración: descripción en ventas con pago Cashea
-- Ejecutar en la base de datos rim_challouf
-- =============================================================================

USE `rim_challouf`;

ALTER TABLE `ventas`
  ADD COLUMN `descripcion_cashea` VARCHAR(500) NULL DEFAULT NULL AFTER `monto_caja`;
