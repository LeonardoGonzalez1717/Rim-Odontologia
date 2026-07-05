-- =============================================================================
-- TABLA: usuarios
-- Almacena las credenciales, PIN de admin y roles del sistema
-- =============================================================================
CREATE TABLE IF NOT EXISTS `usuarios` (
  `id`         INT(11)      NOT NULL AUTO_INCREMENT,
  `username`   VARCHAR(50)  NOT NULL UNIQUE,
  `password`   VARCHAR(255) NOT NULL,
  `pin`        VARCHAR(255) NULL DEFAULT NULL,
  `rol`        ENUM('admin','asistente') NOT NULL DEFAULT 'asistente',
  `nombre`     VARCHAR(100) NOT NULL,
  `created_at` TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Si ya tenías la tabla sin PIN, ejecuta manualmente:
-- ALTER TABLE `usuarios` ADD COLUMN `pin` VARCHAR(255) NULL DEFAULT NULL AFTER `password`;

-- Insertar usuarios por defecto
-- Contraseñas: admin / asistente | PIN admin por defecto: 1234
INSERT INTO `usuarios` (`username`, `password`, `pin`, `rol`, `nombre`) VALUES
  ('admin', '$2y$10$Y2Woqzspy41c66URedNvzuk4KnJOtXdSGApyyDTdqQO5kCrErdDR6', '$2y$10$jf.bboLyeM5PV8CIcWOpkuIe6Xgnx3e5jokJvCcsF56ekNHowv0ge', 'admin', 'Administrador Principal'),
  ('asistente', '$2y$10$jSLQtO4uKaCEs2Ub8BqGnexO3vLZXxntdOK9aYCtoqXJGFUZSYNQ6', NULL, 'asistente', 'Asistente Consultorio')
  ON DUPLICATE KEY UPDATE `username`=`username`;

-- Actualizar PIN del admin existente si no tiene uno
UPDATE `usuarios`
SET `pin` = '$2y$10$jf.bboLyeM5PV8CIcWOpkuIe6Xgnx3e5jokJvCcsF56ekNHowv0ge'
WHERE `username` = 'admin' AND `rol` = 'admin' AND (`pin` IS NULL OR `pin` = '');
