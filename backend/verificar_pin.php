<?php
// =============================================================================
// verificar_pin.php — Valida el PIN de un administrador
// Método: POST
// Body: { "pin": "1234" }
// =============================================================================

header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');
header('Content-Type: application/json; charset=utf-8');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

require_once 'conexion.php';

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['success' => false, 'message' => 'Método no permitido.']);
    exit;
}

try {
    $pdo = obtenerConexion();
    $body = file_get_contents('php://input');
    $datos = json_decode($body, true);

    $pin = trim($datos['pin'] ?? '');

    if (!preg_match('/^\d{4,6}$/', $pin)) {
        http_response_code(400);
        echo json_encode(['success' => false, 'message' => 'PIN inválido. Debe tener 4 a 6 dígitos.']);
        exit;
    }

    $stmt = $pdo->query(
        "SELECT pin FROM usuarios WHERE rol = 'admin' AND pin IS NOT NULL AND pin != ''"
    );
    $admins = $stmt->fetchAll();

    if (empty($admins)) {
        http_response_code(503);
        echo json_encode(['success' => false, 'message' => 'No hay PIN de administrador configurado.']);
        exit;
    }

    foreach ($admins as $admin) {
        if (password_verify($pin, $admin['pin'])) {
            echo json_encode(['success' => true, 'message' => 'PIN verificado.']);
            exit;
        }
    }

    http_response_code(401);
    echo json_encode(['success' => false, 'message' => 'PIN incorrecto.']);

} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(['success' => false, 'message' => 'Error del servidor: ' . $e->getMessage()]);
}
