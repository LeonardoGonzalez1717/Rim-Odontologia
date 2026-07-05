<?php
// =============================================================================
// conexion.php — Conexión segura a MySQL mediante PDO
// Consultorio Odontológico "Rim Challouf"
// =============================================================================

// --- Configuración de la base de datos ---
// ⚠️ Modifica estos valores según tu entorno (XAMPP usa root sin contraseña por defecto)
define('DB_HOST', 'localhost');
define('DB_NAME', 'rim_challouf');
define('DB_USER', 'root');
define('DB_PASS', '');          // Cambiar en producción
define('DB_CHARSET', 'utf8mb4');

// Zona horaria del consultorio (debe coincidir con la del navegador al registrar ventas)
date_default_timezone_set('America/New_York');

/**
 * Crea y devuelve una instancia de PDO configurada.
 * Lanza una excepción si la conexión falla.
 *
 * @return PDO
 * @throws RuntimeException
 */
function obtenerConexion(): PDO
{
    $dsn = sprintf(
        'mysql:host=%s;dbname=%s;charset=%s',
        DB_HOST,
        DB_NAME,
        DB_CHARSET
    );

    $opciones = [
        PDO::ATTR_ERRMODE            => PDO::ERRMODE_EXCEPTION,   // Lanza excepciones en errores
        PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,         // Resultados como array asociativo
        PDO::ATTR_EMULATE_PREPARES   => false,                    // Consultas preparadas nativas
    ];

    try {
        $pdo = new PDO($dsn, DB_USER, DB_PASS, $opciones);
        return $pdo;
    } catch (PDOException $e) {
        // En producción, loguear el error en vez de mostrarlo al cliente
        throw new RuntimeException('Error de conexión a la base de datos: ' . $e->getMessage(), 500);
    }
}
