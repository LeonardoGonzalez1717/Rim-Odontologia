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
 * Detecta el método HTTP, soportando method spoofing (_method en el body JSON)
 * para servidores/hostings que bloquean verbos HTTP PUT, DELETE o PATCH.
 *
 * @return string
 */
function obtenerMetodoHttp(): string
{
    $method = $_SERVER['REQUEST_METHOD'] ?? 'GET';
    if ($method === 'POST') {
        $rawEarly = file_get_contents('php://input');
        $tmpData  = json_decode($rawEarly, true);
        if (isset($tmpData['_method']) && in_array(strtoupper($tmpData['_method']), ['PUT', 'DELETE', 'PATCH'], true)) {
            $method = strtoupper($tmpData['_method']);
        }
        if (!defined('CACHED_BODY')) {
            define('CACHED_BODY', $rawEarly);
        }
    }
    return $method;
}

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
        asegurarColumnaUsuario($pdo);
        asegurarTablaVentaPagos($pdo);
        asegurarTablaMetodosPago($pdo);
        return $pdo;
    } catch (PDOException $e) {
        // En producción, loguear el error en vez de mostrarlo al cliente
        throw new RuntimeException('Error de conexión a la base de datos: ' . $e->getMessage(), 500);
    }
}

/**
 * Asegura que la tabla ventas tenga la columna usuario_id.
 */
function asegurarColumnaUsuario(PDO $pdo): void
{
    static $verificado = false;
    if ($verificado) return;

    try {
        $stmt = $pdo->query("SHOW COLUMNS FROM ventas LIKE 'usuario_id'");
        if (!$stmt->fetch()) {
            $pdo->exec("ALTER TABLE ventas ADD COLUMN usuario_id INT(11) NULL DEFAULT NULL AFTER cliente_id");
        }
        $verificado = true;
    } catch (Throwable $e) {
        // Ignorar si falla la verificación estática para evitar bloquear operaciones
    }
}

/**
 * Asegura que la tabla venta_pagos exista.
 */
function asegurarTablaVentaPagos(PDO $pdo): void
{
    static $verificado = false;
    if ($verificado) return;

    try {
        $pdo->exec("
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
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
        ");
        $verificado = true;
    } catch (Throwable $e) {
        // Ignorar si falla la verificación estática para evitar bloquear operaciones
    }
}

/**
 * Asegura que la tabla metodos_pago exista con sus semillas por defecto.
 */
function asegurarTablaMetodosPago(PDO $pdo): void
{
    static $verificado = false;
    if ($verificado) return;

    try {
        $pdo->exec("
            CREATE TABLE IF NOT EXISTS `metodos_pago` (
              `id` INT(11) NOT NULL AUTO_INCREMENT,
              `nombre` VARCHAR(80) NOT NULL,
              `estado` ENUM('activo','inactivo') NOT NULL DEFAULT 'activo',
              `orden` INT(11) NOT NULL DEFAULT 0,
              `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
              PRIMARY KEY (`id`),
              UNIQUE KEY `uq_metodos_pago_nombre` (`nombre`)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
        ");

        // Insertar semillas por defecto si la tabla está vacía
        $count = (int)$pdo->query("SELECT COUNT(*) FROM `metodos_pago`")->fetchColumn();
        if ($count === 0) {
            $pdo->exec("
                INSERT IGNORE INTO `metodos_pago` (`nombre`, `estado`, `orden`) VALUES
                  ('Efectivo ($)', 'activo', 1),
                  ('Efectivo (Bs)', 'activo', 2),
                  ('Pago Móvil', 'activo', 3),
                  ('Punto de Venta', 'activo', 4),
                  ('Zelle', 'activo', 5),
                  ('Transferencia', 'activo', 6),
                  ('Otro', 'activo', 7)
            ");
        }
        $verificado = true;
    } catch (Throwable $e) {
        // Ignorar si falla la verificación estática para evitar bloquear operaciones
    }
}

/**
 * Obtiene la fecha y hora oficial de Internet usando APIs de hora redundantes
 * y una consulta de cabecera HTTP Date como último recurso infalible.
 * Evita depender de la hora local de la computadora (servidor/cliente).
 *
 * @return array
 */
function obtenerFechaHoraInternet(): array
{
    $timezone = 'America/New_York';
    $timestamp = null;
    $metodo = 'ninguno';

    // 1. Intentar obtener de Google (cabecera Date de HTTP, extremadamente precisa y confiable)
    $ch = curl_init();
    curl_setopt($ch, CURLOPT_URL, "https://www.google.com");
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    curl_setopt($ch, CURLOPT_HEADER, true);
    curl_setopt($ch, CURLOPT_NOBODY, true);
    curl_setopt($ch, CURLOPT_TIMEOUT, 2);
    curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, false);
    curl_setopt($ch, CURLOPT_HTTPHEADER, ["Cache-Control: no-cache", "Pragma: no-cache"]);
    $response = curl_exec($ch);
    curl_close($ch);

    if ($response && preg_match('/^[Dd]ate:\s*(.*?)$/m', $response, $matches)) {
        $dateStr = trim($matches[1]);
        $t = strtotime($dateStr);
        if ($t !== false) {
            $timestamp = $t;
            $metodo = 'http_header_google';
        }
    }

    // 2. Intentar obtener de Cloudflare (cabecera Date de HTTP) si Google falla
    if (!$timestamp) {
        $ch = curl_init();
        curl_setopt($ch, CURLOPT_URL, "https://1.1.1.1");
        curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
        curl_setopt($ch, CURLOPT_HEADER, true);
        curl_setopt($ch, CURLOPT_NOBODY, true);
        curl_setopt($ch, CURLOPT_TIMEOUT, 2);
        curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, false);
        curl_setopt($ch, CURLOPT_HTTPHEADER, ["Cache-Control: no-cache", "Pragma: no-cache"]);
        $response = curl_exec($ch);
        curl_close($ch);

        if ($response && preg_match('/^[Dd]ate:\s*(.*?)$/m', $response, $matches)) {
            $dateStr = trim($matches[1]);
            $t = strtotime($dateStr);
            if ($t !== false) {
                $timestamp = $t;
                $metodo = 'http_header_cloudflare';
            }
        }
    }

    // 3. Intentar WorldTimeAPI (JSON) si los anteriores fallan
    if (!$timestamp) {
        $ch = curl_init();
        curl_setopt($ch, CURLOPT_URL, "http://worldtimeapi.org/api/timezone/" . $timezone);
        curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
        curl_setopt($ch, CURLOPT_TIMEOUT, 2);
        curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, false);
        curl_setopt($ch, CURLOPT_HTTPHEADER, ["Cache-Control: no-cache", "Pragma: no-cache"]);
        $response = curl_exec($ch);
        curl_close($ch);

        if ($response) {
            $data = json_decode($response, true);
            if (isset($data['unixtime'])) {
                $timestamp = (int)$data['unixtime'];
                $metodo = 'worldtimeapi';
            }
        }
    }

    // 4. Intentar TimeAPI si los anteriores fallan
    if (!$timestamp) {
        $ch = curl_init();
        curl_setopt($ch, CURLOPT_URL, "https://timeapi.io/api/Time/current/zone?timeZone=" . $timezone);
        curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
        curl_setopt($ch, CURLOPT_TIMEOUT, 2);
        curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, false);
        curl_setopt($ch, CURLOPT_HTTPHEADER, ["Cache-Control: no-cache", "Pragma: no-cache"]);
        $response = curl_exec($ch);
        curl_close($ch);

        if ($response) {
            $data = json_decode($response, true);
            if (isset($data['dateTime'])) {
                try {
                    $dt = new DateTime($data['dateTime'], new DateTimeZone($timezone));
                    $timestamp = $dt->getTimestamp();
                    $metodo = 'timeapi';
                } catch (Throwable $e) {
                    // Ignorar error de parsing
                }
            }
        }
    }

    // 5. Fallback: hora del servidor de hosting (NTP). No usa la hora del PC del cliente.
    if (!$timestamp) {
        $dt = new DateTime('now', new DateTimeZone($timezone));
        return [
            'timestamp'    => $dt->getTimestamp(),
            'fecha'        => $dt->format('Y-m-d'),
            'datetime'     => $dt->format('Y-m-d H:i:s'),
            'timezone'     => $timezone,
            'offset'       => $dt->getOffset(),
            'synchronized' => false,
            'source'       => 'server_php',
        ];
    }

    $dt = new DateTime();
    $dt->setTimezone(new DateTimeZone($timezone));
    $dt->setTimestamp($timestamp);

    return [
        'timestamp'    => $timestamp,
        'fecha'        => $dt->format('Y-m-d'),
        'datetime'     => $dt->format('Y-m-d H:i:s'),
        'timezone'     => $timezone,
        'offset'       => $dt->getOffset(),
        'synchronized' => true,
        'source'       => $metodo,
    ];
}


