-- =============================================================================
-- Migración: Cashea por tratamiento (pago mixto)
-- Permite marcar qué líneas de una venta van con Cashea y cuáles de contado.
-- Ejecutar en la base de datos rim_challouf
-- Fecha: 2026-07-21
-- =============================================================================

USE `rim_challouf`;

ALTER TABLE `venta_detalles`
  ADD COLUMN `cashea` TINYINT(1) NOT NULL DEFAULT 0
  COMMENT '1=pagado con Cashea, 0=contado'
  AFTER `realizado`;

-- Ventas ya marcadas como Cashea: todas sus líneas pasan a cashea=1
UPDATE `venta_detalles` vd
INNER JOIN `ventas` v ON v.id = vd.venta_id
SET vd.cashea = 1
WHERE v.cashea = 1;
