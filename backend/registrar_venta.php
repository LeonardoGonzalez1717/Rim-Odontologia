<?php
// =============================================================================
// registrar_venta.php — Inserta una nueva venta en la base de datos
// Método: POST
// Body JSON: { "doctor_id": 1, "servicio_id": 3, "fecha_venta": "2024-01-15 10:30:00", "total": 120.00 }
// Respuesta: JSON { "success": true, "id": 42, "message": "..." }
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
    // --- Leer y decodificar el cuerpo JSON de la solicitud ---
    $body = file_get_contents('php://input');
    $datos = json_decode($body, true);

    // --- Validar que el JSON sea válido ---
    if (json_last_error() !== JSON_ERROR_NONE) {
        http_response_code(400);
        echo json_encode(['success' => false, 'message' => 'JSON inválido en el cuerpo de la solicitud.']);
        exit;
    }

    // --- Validar campos requeridos ---
    $camposRequeridos = ['doctor_id', 'servicio_id', 'total'];
    foreach ($camposRequeridos as $campo) {
        if (empty($datos[$campo])) {
            http_response_code(400);
            echo json_encode(['success' => false, 'message' => "El campo '$campo' es requerido."]);
            exit;
        }
    }

    // --- Sanitizar y asignar valores ---
    $doctor_id   = (int)   $datos['doctor_id'];
    $servicio_id = (int)   $datos['servicio_id'];
    $total       = (float) $datos['total'];
    // Si el frontend envía una fecha personalizada, se usa; si no, se usa NOW()
    $fecha_venta = !empty($datos['fecha_venta']) ? $datos['fecha_venta'] : date('Y-m-d H:i:s');

    // --- Validar valores positivos ---
    if ($doctor_id <= 0 || $servicio_id <= 0 || $total < 0) {
        http_response_code(400);
        echo json_encode(['success' => false, 'message' => 'Los IDs y el total deben ser valores positivos.']);
        exit;
    }

    $pdo = obtenerConexion();

    // --- Insertar la venta con consulta preparada ---
    $stmt = $pdo->prepare(
        "INSERT INTO ventas (doctor_id, servicio_id, fecha_venta, total, estado)
         VALUES (:doctor_id, :servicio_id, :fecha_venta, :total, 'completada')"
    );

    $stmt->execute([
        ':doctor_id'   => $doctor_id,
        ':servicio_id' => $servicio_id,
        ':fecha_venta' => $fecha_venta,
        ':total'       => $total,
    ]);

    $nuevoId = $pdo->lastInsertId();

    // --- Respuesta exitosa ---
    http_response_code(201); // 201 Created
    echo json_encode([
        'success' => true,
        'id'      => (int) $nuevoId,
        'message' => 'Venta registrada correctamente.',
    ]);

} catch (RuntimeException $e) {
    http_response_code(500);
    echo json_encode(['success' => false, 'message' => $e->getMessage()]);

} catch (PDOException $e) {
    http_response_code(500);
    echo json_encode(['success' => false, 'message' => 'Error al registrar la venta: ' . $e->getMessage()]);
}
