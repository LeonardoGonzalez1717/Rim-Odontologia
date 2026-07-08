-- =============================================================================
-- Migración: módulo Ajuste Cashea (cuotas que ingresan a caja)
-- Ejecutar en la base de datos rim_challouf
-- =============================================================================

USE `rim_challouf`;

CREATE TABLE IF NOT EXISTS `ajustes_cashea` (
  `id`            INT(11)        NOT NULL AUTO_INCREMENT,
  `monto`         DECIMAL(10, 2) NOT NULL,
  `concepto`      VARCHAR(100)   NOT NULL DEFAULT 'Cuota de Cashea',
  `fecha_ingreso` TIMESTAMP      NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `created_at`    TIMESTAMP      NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
