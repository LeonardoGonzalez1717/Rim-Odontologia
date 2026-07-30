<?php
// =============================================================================
// server_date.php — Fecha y hora actual del servidor
// GET /api/server_date.php
// =============================================================================

require_once __DIR__ . '/conexion.php'; // Aplica date_default_timezone_set()

header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: no-store, no-cache, must-revalidate');

try {
    $info = obtenerFechaHoraInternet();

    echo json_encode([
        'success'         => true,
        'fecha'           => $info['fecha'],        
        'datetime'        => $info['datetime'], 
        'timestamp'       => $info['timestamp'] * 1000, // milisegundos UTC
        'timezone_offset' => (int)$info['offset'] * 1000, // milisegundos de offset
        'synchronized'    => $info['synchronized'],
        'source'          => $info['source']
    ]);
} catch (Throwable $e) {
    http_response_code(503);
    echo json_encode([
        'success' => false,
        'message' => 'No se pudo sincronizar la fecha/hora con Internet. Por favor, verifica tu conexión y recarga la página.'
    ]);
}

