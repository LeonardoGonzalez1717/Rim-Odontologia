-- =============================================================================
-- MIGRACIÓN SQL: Agregar 'usuario_id' a la tabla 'ventas'
-- Consultorio Odontológico "Rim Challouf"
-- Fecha: 2026-07-26
-- =============================================================================

-- 1. Agregar columna usuario_id
ALTER TABLE `ventas` 
  ADD COLUMN `usuario_id` INT(11) NULL DEFAULT NULL AFTER `cliente_id`;

-- 2. Agregar clave foránea referenciando a la tabla usuarios
ALTER TABLE `ventas`
  ADD CONSTRAINT `fk_venta_usuario` 
  FOREIGN KEY (`usuario_id`) REFERENCES `usuarios`(`id`) 
  ON DELETE SET NULL ON UPDATE CASCADE;
