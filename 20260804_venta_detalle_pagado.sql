-- =============================================================================
-- Columna pagado en venta_detalles
-- pagado=1 → monto ya cobrado (saldo a favor clínico si realizado=0)
-- pagado=0 → pendiente de cobro (realizado=0 en ventas Cashea/contado parcial)
-- =============================================================================

ALTER TABLE `venta_detalles`
  ADD COLUMN `pagado` TINYINT(1) NOT NULL DEFAULT 1
  COMMENT '1=cobrado, 0=pendiente de pago'
  AFTER `realizado`;

-- Líneas no pagadas en ventas Cashea (porción pendiente de tratamiento)
UPDATE `venta_detalles` vd
INNER JOIN `ventas` v ON v.id = vd.venta_id
SET vd.pagado = 0
WHERE v.cashea = 1
  AND v.estado = 'completada'
  AND COALESCE(vd.realizado, 1) = 0
  AND COALESCE(vd.cashea, 0) = 0
  AND EXISTS (
    SELECT 1 FROM `venta_detalles` vc
    WHERE vc.venta_id = v.id AND COALESCE(vc.cashea, 0) = 1
  );

-- Ventas al contado con pago parcial (línea pendiente de cobro)
UPDATE `venta_detalles` vd
INNER JOIN `ventas` v ON v.id = vd.venta_id
SET vd.pagado = 0
WHERE v.estado = 'completada'
  AND COALESCE(vd.realizado, 1) = 0
  AND COALESCE(vd.cashea, 0) = 0
  AND EXISTS (
    SELECT 1 FROM `venta_detalles` vp
    WHERE vp.venta_id = v.id AND vp.id <> vd.id
  );
