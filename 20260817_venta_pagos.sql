-- =============================================================================
-- MIGRACIÓN SQL: Crear tabla 'venta_pagos' para métodos de pago
-- Consultorio Odontológico "Rim Challouf"
-- Fecha: 2026-08-17
-- Descripción: Permite registrar múltiples métodos de pago por venta
--              (ej. Efectivo USD, Efectivo Bs, Pago Móvil, Punto de Venta, Zelle, Transferencia)
-- =============================================================================

CREATE TABLE IF NOT EXISTS `venta_pagos` (
  `id` INT(11) NOT NULL AUTO_INCREMENT,
  `venta_id` INT(11) NOT NULL,
  `metodo_pago` VARCHAR(60) NOT NULL,
  `monto` DECIMAL(10, 2) NOT NULL,
  `referencia` VARCHAR(100) NULL DEFAULT NULL,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_venta_pagos_venta_id` (`venta_id`),
  CONSTRAINT `fk_venta_pagos_venta`
    FOREIGN KEY (`venta_id`) REFERENCES `ventas`(`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
