-- =============================================================================
-- Migración: marcar si un tratamiento se realiza hoy o queda pendiente
-- (saldo a favor del cliente = suma de tratamientos no realizados)
-- Ejecutar en la base de datos rim_challouf
-- =============================================================================

USE `rim_challouf`;

ALTER TABLE `venta_detalles`
  ADD COLUMN `realizado` TINYINT(1) NOT NULL DEFAULT 1 AFTER `precio`;

-- 1 = se realizó / se realizará hoy
-- 0 = pendiente para otro día → cuenta como saldo a favor del cliente
