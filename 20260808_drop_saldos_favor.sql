-- Elimina la tabla de saldo a favor monetario (ya no se usa).
-- Los tratamientos pendientes siguen en venta_detalles (realizado/pagado).

DROP TABLE IF EXISTS `saldos_favor`;
