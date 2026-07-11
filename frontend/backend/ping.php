<?php
// =============================================================================
// ping.php — Verificación ligera de que PHP responde JSON (calentar anti-bot)
// Método: GET
// =============================================================================

header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');
header('Content-Type: application/json; charset=utf-8');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

echo json_encode(['success' => true, 'message' => 'ok']);
