<?php
// =============================================================================
// cancelar_venta.php — Cambia el estado de una venta de 'completada' a 'cancelada'
// Método: POST
// Body JSON: { "id": 42 }
// Respuesta: JSON { "success": true, "message": "..." }
// =============================================================================

// --- Encabezados CORS y tipo de contenido ---
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');
header('Content-Type: application/json; charset=utf-8');

// Responder inmediatamente a las solicitudes preflight de CORS
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

// Solo aceptar método POST
if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['success' => false, 'message' => 'Método no permitido. Use POST.']);
    exit;
}

require_once 'conexion.php';

try {
    // --- Leer y decodificar el cuerpo JSON ---
    $body  = file_get_contents('php://input');
    $datos = json_decode($body, true);

    if (json_last_error() !== JSON_ERROR_NONE) {
        http_response_code(400);
        echo json_encode(['success' => false, 'message' => 'JSON inválido.']);
        exit;
    }

    // --- Validar que se envíe el ID ---
    if (empty($datos['id'])) {
        http_response_code(400);
        echo json_encode(['success' => false, 'message' => 'El campo "id" es requerido.']);
        exit;
    }

    $id = (int) $datos['id'];

    if ($id <= 0) {
        http_response_code(400);
        echo json_encode(['success' => false, 'message' => 'El ID debe ser un valor positivo.']);
        exit;
    }

    $pdo = obtenerConexion();

    // --- Verificar que la venta existe y está en estado 'completada' ---
    $stmtCheck = $pdo->prepare(
        "SELECT id, estado FROM ventas WHERE id = :id LIMIT 1"
    );
    $stmtCheck->execute([':id' => $id]);
    $venta = $stmtCheck->fetch();

    if (!$venta) {
        http_response_code(404);
        echo json_encode(['success' => false, 'message' => "No se encontró la venta con ID $id."]);
        exit;
    }

    if ($venta['estado'] === 'cancelada') {
        http_response_code(409); // Conflict
        echo json_encode(['success' => false, 'message' => 'Esta venta ya ha sido cancelada previamente.']);
        exit;
    }

    // --- Actualizar el estado a 'cancelada' ---
    $stmtUpdate = $pdo->prepare(
        "UPDATE ventas SET estado = 'cancelada' WHERE id = :id"
    );
    $stmtUpdate->execute([':id' => $id]);

    // --- Verificar que se afectó al menos una fila ---
    if ($stmtUpdate->rowCount() === 0) {
        http_response_code(500);
        echo json_encode(['success' => false, 'message' => 'No se pudo actualizar la venta.']);
        exit;
    }

    // --- Respuesta exitosa ---
    echo json_encode([
        'success' => true,
        'message' => "Venta #$id cancelada correctamente.",
    ]);

} catch (RuntimeException $e) {
    http_response_code(500);
    echo json_encode(['success' => false, 'message' => $e->getMessage()]);

} catch (PDOException $e) {
    http_response_code(500);
    echo json_encode(['success' => false, 'message' => 'Error al cancelar la venta: ' . $e->getMessage()]);
}
