<?php
// =============================================================================
// registrar_venta.php — Inserta una nueva venta con uno o más tratamientos
// Método: POST
// Body JSON:
// {
//   "doctor_id": 1,
//   "fecha_venta": "2024-01-15 10:30:00",
//   "total": 200.00,
//   "servicios": [
//     { "servicio_id": 2, "precio": 80.00 },
//     { "servicio_id": 3, "precio": 120.00 }
//   ]
// }
// Respuesta: JSON { "success": true, "id": 42, "message": "..." }
// =============================================================================

header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');
header('Content-Type: application/json; charset=utf-8');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['success' => false, 'message' => 'Método no permitido. Use POST.']);
    exit;
}

require_once 'conexion.php';

try {
    $body  = file_get_contents('php://input');
    $datos = json_decode($body, true);

    if (json_last_error() !== JSON_ERROR_NONE) {
        http_response_code(400);
        echo json_encode(['success' => false, 'message' => 'JSON inválido en el cuerpo de la solicitud.']);
        exit;
    }

    if (empty($datos['doctor_id'])) {
        http_response_code(400);
        echo json_encode(['success' => false, 'message' => "El campo 'doctor_id' es requerido."]);
        exit;
    }

    if (empty($datos['cliente_id'])) {
        http_response_code(400);
        echo json_encode(['success' => false, 'message' => "El campo 'cliente_id' es requerido."]);
        exit;
    }

    // Compatibilidad: aceptar un solo servicio_id o un arreglo servicios
    $lineas = [];
    if (!empty($datos['servicios']) && is_array($datos['servicios'])) {
        $lineas = $datos['servicios'];
    } elseif (!empty($datos['servicio_id'])) {
        $lineas = [[
            'servicio_id' => $datos['servicio_id'],
            'precio'      => $datos['total'] ?? null,
        ]];
    }

    if (empty($lineas)) {
        http_response_code(400);
        echo json_encode(['success' => false, 'message' => 'Debe incluir al menos un tratamiento.']);
        exit;
    }

    $doctor_id   = (int) $datos['doctor_id'];
    $cliente_id  = (int) $datos['cliente_id'];
    $fecha_venta = !empty($datos['fecha_venta']) ? $datos['fecha_venta'] : date('Y-m-d H:i:s');

    if ($doctor_id <= 0) {
        http_response_code(400);
        echo json_encode(['success' => false, 'message' => 'El doctor_id debe ser un valor positivo.']);
        exit;
    }

    if ($cliente_id <= 0) {
        http_response_code(400);
        echo json_encode(['success' => false, 'message' => 'El cliente_id debe ser un valor positivo.']);
        exit;
    }

    $lineasNormalizadas = [];
    foreach ($lineas as $i => $linea) {
        $servicioId = (int) ($linea['servicio_id'] ?? 0);
        $precio     = isset($linea['precio']) ? (float) $linea['precio'] : null;

        if ($servicioId <= 0) {
            http_response_code(400);
            echo json_encode(['success' => false, 'message' => "Tratamiento #" . ($i + 1) . ": servicio_id inválido."]);
            exit;
        }
        if ($precio === null || $precio < 0) {
            http_response_code(400);
            echo json_encode(['success' => false, 'message' => "Tratamiento #" . ($i + 1) . ": precio inválido."]);
            exit;
        }

        $lineasNormalizadas[] = [
            'servicio_id' => $servicioId,
            'precio'      => $precio,
        ];
    }

    $totalCalculado = array_sum(array_column($lineasNormalizadas, 'precio'));
    $total          = isset($datos['total']) ? (float) $datos['total'] : $totalCalculado;

    if ($total < 0) {
        http_response_code(400);
        echo json_encode(['success' => false, 'message' => 'El total debe ser un valor positivo.']);
        exit;
    }

    if (abs($total - $totalCalculado) > 0.01) {
        http_response_code(400);
        echo json_encode([
            'success' => false,
            'message' => 'El total no coincide con la suma de los tratamientos.',
        ]);
        exit;
    }

    $cashea = !empty($datos['cashea']);
    $montoCaja = isset($datos['monto_caja']) ? (float) $datos['monto_caja'] : $total;

    $descripcionCashea = null;

    if ($cashea) {
        if ($montoCaja <= 0) {
            http_response_code(400);
            echo json_encode(['success' => false, 'message' => 'Indica el monto inicial que ingresa a caja.']);
            exit;
        }
        if ($montoCaja > $total + 0.01) {
            http_response_code(400);
            echo json_encode(['success' => false, 'message' => 'El monto inicial no puede ser mayor al total de la venta.']);
            exit;
        }

        $descripcionCashea = trim((string) ($datos['descripcion_cashea'] ?? ''));
        if ($descripcionCashea === '') {
            http_response_code(400);
            echo json_encode(['success' => false, 'message' => 'Indica una descripción para la venta con Cashea.']);
            exit;
        }
        if (mb_strlen($descripcionCashea) > 500) {
            http_response_code(400);
            echo json_encode(['success' => false, 'message' => 'La descripción no puede superar 500 caracteres.']);
            exit;
        }
    } else {
        $montoCaja = $total;
    }

    $pdo = obtenerConexion();
    $pdo->beginTransaction();

    $stmtVenta = $pdo->prepare(
        "INSERT INTO ventas (doctor_id, cliente_id, fecha_venta, total, cashea, monto_caja, descripcion_cashea, estado)
         VALUES (:doctor_id, :cliente_id, :fecha_venta, :total, :cashea, :monto_caja, :descripcion_cashea, 'completada')"
    );
    $stmtVenta->execute([
        ':doctor_id'           => $doctor_id,
        ':cliente_id'          => $cliente_id,
        ':fecha_venta'         => $fecha_venta,
        ':total'               => $total,
        ':cashea'              => $cashea ? 1 : 0,
        ':monto_caja'          => $montoCaja,
        ':descripcion_cashea'  => $descripcionCashea,
    ]);

    $nuevoId = (int) $pdo->lastInsertId();

    $stmtDetalle = $pdo->prepare(
        "INSERT INTO venta_detalles (venta_id, servicio_id, precio)
         VALUES (:venta_id, :servicio_id, :precio)"
    );

    foreach ($lineasNormalizadas as $linea) {
        $stmtDetalle->execute([
            ':venta_id'    => $nuevoId,
            ':servicio_id' => $linea['servicio_id'],
            ':precio'      => $linea['precio'],
        ]);
    }

    $pdo->commit();

    http_response_code(201);
    echo json_encode([
        'success' => true,
        'id'      => $nuevoId,
        'message' => 'Venta registrada correctamente.',
    ]);

} catch (RuntimeException $e) {
    if (isset($pdo) && $pdo->inTransaction()) {
        $pdo->rollBack();
    }
    http_response_code(500);
    echo json_encode(['success' => false, 'message' => $e->getMessage()]);

} catch (PDOException $e) {
    if (isset($pdo) && $pdo->inTransaction()) {
        $pdo->rollBack();
    }
    http_response_code(500);
    echo json_encode(['success' => false, 'message' => 'Error al registrar la venta: ' . $e->getMessage()]);
}
