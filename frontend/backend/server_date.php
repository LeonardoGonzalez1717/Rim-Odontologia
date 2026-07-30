<?php
// =============================================================================
// server_date.php — Fecha y hora actual del servidor
// GET /api/server_date.php
// =============================================================================

require_once __DIR__ . '/conexion.php'; // Aplica date_default_timezone_set()

header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');
header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: no-store, no-cache, must-revalidate');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(204);
    exit;
}

$info = obtenerFechaHoraInternet();

echo json_encode([
    'success'         => true,
    'fecha'           => $info['fecha'],
    'datetime'        => $info['datetime'],
    'timestamp'       => $info['timestamp'] * 1000, // milisegundos UTC
    'timezone_offset' => (int)$info['offset'] * 1000, // milisegundos de offset
    'synchronized'    => $info['synchronized'],
    'source'          => $info['source'],
]);

