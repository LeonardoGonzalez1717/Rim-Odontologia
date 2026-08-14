-- =============================================================================
-- MIGRACIÓN SQL: Agregar 'saldo_favor_aplicado' a la tabla 'ventas'
-- Consultorio Odontológico "Rim Challouf"
-- Fecha: 2026-08-14
-- Descripción: Guarda el monto de saldo a favor que fue aplicado como descuento
--              al registrar una venta, para poder mostrarlo en el detalle.
-- =============================================================================

ALTER TABLE `ventas`
  ADD COLUMN `saldo_favor_aplicado` DECIMAL(10,2) NULL DEFAULT NULL
  AFTER `monto_caja`;
