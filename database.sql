-- =============================================================================
-- BASE DE DATOS: rim_challouf
-- Sistema de Control de Ventas — Consultorio Odontológico "Rim Challouf"
-- Compatible con MySQL / PHPMyAdmin
-- =============================================================================

-- Crear y seleccionar la base de datos
CREATE DATABASE IF NOT EXISTS `rim_challouf`
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

USE `rim_challouf`;

-- =============================================================================
-- TABLA: doctores
-- Almacena el personal médico del consultorio
-- =============================================================================
CREATE TABLE IF NOT EXISTS `doctores` (
  `id`           INT(11)      NOT NULL AUTO_INCREMENT,
  `nombre`       VARCHAR(150) NOT NULL,
  `especialidad` VARCHAR(100) NOT NULL DEFAULT 'Odontología General',
  `estado`       ENUM('activo','inactivo') NOT NULL DEFAULT 'activo',
  `created_at`   TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =============================================================================
-- TABLA: servicios_tratamientos
-- Catálogo de servicios que ofrece el consultorio con su precio base
-- =============================================================================
CREATE TABLE IF NOT EXISTS `servicios_tratamientos` (
  `id`              INT(11)        NOT NULL AUTO_INCREMENT,
  `nombre_servicio` VARCHAR(200)   NOT NULL,
  `precio`          DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
  `estado`          ENUM('activo','inactivo') NOT NULL DEFAULT 'activo',
  `created_at`      TIMESTAMP      NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =============================================================================
-- TABLA: ventas
-- Registro de cada venta/tratamiento realizado
-- =============================================================================
CREATE TABLE IF NOT EXISTS `ventas` (
  `id`           INT(11)        NOT NULL AUTO_INCREMENT,
  `doctor_id`    INT(11)        NOT NULL,
  `servicio_id`  INT(11)        NOT NULL,
  `fecha_venta`  TIMESTAMP      NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `total`        DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
  `estado`       ENUM('completada','cancelada') NOT NULL DEFAULT 'completada',
  PRIMARY KEY (`id`),
  -- Llaves foráneas con restricción de integridad referencial
  CONSTRAINT `fk_venta_doctor`
    FOREIGN KEY (`doctor_id`)   REFERENCES `doctores`(`id`) ON UPDATE CASCADE,
  CONSTRAINT `fk_venta_servicio`
    FOREIGN KEY (`servicio_id`) REFERENCES `servicios_tratamientos`(`id`) ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =============================================================================
-- DATOS DE PRUEBA: Doctores
-- =============================================================================
INSERT INTO `doctores` (`nombre`, `especialidad`, `estado`) VALUES
  ('Dr. Rim Challouf',        'Odontología General',  'activo'),


-- =============================================================================
-- DATOS DE PRUEBA: Servicios / Tratamientos
-- =============================================================================
INSERT INTO `servicios_tratamientos` (`nombre_servicio`, `precio`, `estado`) VALUES
  ('Consulta General',                  50.00,  'activo'),
  ('Limpieza Dental (Profilaxis)',       80.00,  'activo'),
  ('Extracción Simple',                120.00,  'activo'),
  ('Extracción de Muela del Juicio',   250.00,  'activo'),
  ('Obturación (Empaste) Simple',       90.00,  'activo'),
  ('Tratamiento de Conducto (Endod.)', 350.00,  'activo'),
  ('Blanqueamiento Dental',            200.00,  'activo'),
  ('Ortodoncia — Consulta Inicial',    100.00,  'activo'),
  ('Ortodoncia — Mensualidad Brackets',180.00,  'activo'),
  ('Corona de Porcelana',              500.00,  'activo'),
  ('Implante Dental',                  800.00,  'activo'),
  ('Radiografía Periapical',            30.00,  'activo'),
  ('Radiografía Panorámica',            60.00,  'activo');
