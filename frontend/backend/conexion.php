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
        asegurarColumnaUsuario($pdo);
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


