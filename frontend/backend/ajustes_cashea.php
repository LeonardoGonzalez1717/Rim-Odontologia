<?php
// =============================================================================
// ajustes_cashea.php — Registro de cuotas Cashea que ingresan a caja
// Métodos:
//   GET  → Lista ajustes por fecha (query: fecha=YYYY-MM-DD)
//   POST → Registra un nuevo ajuste { monto, concepto?, fecha_ingreso? }
// =============================================================================

header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');
header('Content-Type: application/json; charset=utf-8');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

require_once 'conexion.php';

const CONCEPTO_CUOTA_CASHEA = 'Cuota de Cashea';

try {
    $pdo = obtenerConexion();

    if ($_SERVER['REQUEST_METHOD'] === 'GET') {
        $fecha = trim($_GET['fecha'] ?? date('Y-m-d'));
        if (!preg_match('/^\d{4}-\d{2}-\d{2}$/', $fecha)) {
            http_response_code(400);
            echo json_encode(['success' => false, 'message' => 'Formato de fecha inválido. Use YYYY-MM-DD.']);
            exit;
        }

        $stmt = $pdo->prepare(
            "SELECT id, monto, concepto,
                    DATE_FORMAT(fecha_ingreso, '%Y-%m-%d') AS fecha,
                    TIME_FORMAT(fecha_ingreso, '%H:%i') AS hora,
                    fecha_ingreso
             FROM ajustes_cashea
             WHERE DATE(fecha_ingreso) = :fecha
             ORDER BY fecha_ingreso DESC"
        );
        $stmt->execute([':fecha' => $fecha]);
        $ajustes = array_map(function ($row) {
            return [
                'id'       => (int) $row['id'],
                'monto'    => (float) $row['monto'],
                'concepto' => $row['concepto'],
                'fecha'    => $row['fecha'],
                'hora'     => $row['hora'],
            ];
        }, $stmt->fetchAll());

        $stmtTotal = $pdo->prepare(
            "SELECT COALESCE(SUM(monto), 0) FROM ajustes_cashea WHERE DATE(fecha_ingreso) = :fecha"
        );
        $stmtTotal->execute([':fecha' => $fecha]);
        $totalDia = (float) $stmtTotal->fetchColumn();

        echo json_encode([
            'success'   => true,
            'fecha'     => $fecha,
            'total_dia' => $totalDia,
            'ajustes'   => $ajustes,
        ]);
        exit;
    }

    if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
        http_response_code(405);
        echo json_encode(['success' => false, 'message' => 'Método no permitido.']);
        exit;
    }

    $body  = file_get_contents('php://input');
    $datos = json_decode($body, true);

    if (json_last_error() !== JSON_ERROR_NONE) {
        http_response_code(400);
        echo json_encode(['success' => false, 'message' => 'JSON inválido.']);
        exit;
    }

    $monto = isset($datos['monto']) ? (float) $datos['monto'] : 0;
    if ($monto <= 0) {
        http_response_code(400);
        echo json_encode(['success' => false, 'message' => 'El monto debe ser mayor a cero.']);
        exit;
    }

    $fechaIngreso = !empty($datos['fecha_ingreso'])
        ? $datos['fecha_ingreso']
        : date('Y-m-d H:i:s');

    // Concepto personalizado (p. ej. abono vinculado a una venta) o el default de cuota
    $concepto = trim((string) ($datos['concepto'] ?? ''));
    if ($concepto === '') {
        $concepto = CONCEPTO_CUOTA_CASHEA;
    }
    if (mb_strlen($concepto) > 255) {
        $concepto = mb_substr($concepto, 0, 255);
    }

    $stmt = $pdo->prepare(
        "INSERT INTO ajustes_cashea (monto, concepto, fecha_ingreso)
         VALUES (:monto, :concepto, :fecha_ingreso)"
    );
    $stmt->execute([
        ':monto'         => $monto,
        ':concepto'      => $concepto,
        ':fecha_ingreso' => $fechaIngreso,
    ]);

    http_response_code(201);
    echo json_encode([
        'success' => true,
        'id'      => (int) $pdo->lastInsertId(),
        'message' => 'Cuota de Cashea registrada en caja.',
    ]);

} catch (RuntimeException $e) {
    http_response_code(500);
    echo json_encode(['success' => false, 'message' => $e->getMessage()]);

} catch (PDOException $e) {
    http_response_code(500);
    echo json_encode(['success' => false, 'message' => 'Error en ajustes Cashea: ' . $e->getMessage()]);
}
