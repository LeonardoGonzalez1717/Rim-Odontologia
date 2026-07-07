-- =============================================================================
-- Migración: campo cédula en doctores
-- Ejecutar una sola vez sobre la base rim_challouf existente
-- =============================================================================

USE `rim_challouf`;

SET @col_exists = (
  SELECT COUNT(*) FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'doctores'
    AND COLUMN_NAME = 'cedula'
);

SET @sql_add_col = IF(
  @col_exists = 0,
  'ALTER TABLE `doctores` ADD COLUMN `cedula` VARCHAR(20) NOT NULL DEFAULT '''' AFTER `id`',
  'SELECT 1'
);
PREPARE stmt FROM @sql_add_col;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;
