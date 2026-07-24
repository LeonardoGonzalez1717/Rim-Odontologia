<?php
// =============================================================================
// server_date.php — Fecha y hora actual del servidor
// GET /api/server_date.php
// =============================================================================

require_once __DIR__ . '/conexion.php'; // Aplica date_default_timezone_set()

header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: no-store, no-cache, must-revalidate');

echo json_encode([
    'success'         => true,
    'fecha'           => date('Y-m-d'),        
    'datetime'        => date('Y-m-d H:i:s'), 
    'timestamp'       => time() * 1000, // milisegundos UTC
    'timezone_offset' => (int)date('Z') * 1000, // milisegundos de offset
]);
