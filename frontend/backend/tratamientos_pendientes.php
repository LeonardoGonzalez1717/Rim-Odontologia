<?php
// =============================================================================
// tratamientos_pendientes.php — Tratamientos pagados aún no realizados
// Métodos:
//   GET  → Lista todos los pendientes (agrupados por cliente)
//   PATCH → Marca un detalle como realizado { "id": detalle_id }
// =============================================================================

header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, PATCH, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');
header('Content-Type: application/json; charset=utf-8');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

require_once 'conexion.php';
require_once 'venta_helpers.php';

$method = obtenerMetodoHttp();

try {
    $pdo = obtenerConexion();

    if ($method === 'GET') {
        $stmt = $pdo->query(
            "SELECT
                vd.id,
                vd.servicio_id,
                vd.precio,
                COALESCE(vd.realizado, 1) AS realizado,
                COALESCE(vd.pagado, 1) AS pagado,
                s.nombre_servicio AS nombre,
                v.id AS venta_id,
                v.doctor_id,
                d.nombre AS doctor_nombre,
                DATE_FORMAT(v.fecha_venta, '%Y-%m-%d') AS fecha,
                c.id AS cliente_id,
                c.nombre AS cliente_nombre,
                c.cedula AS cliente_cedula,
                c.telefono AS cliente_telefono
             FROM venta_detalles vd
             INNER JOIN ventas v ON v.id = vd.venta_id
             INNER JOIN servicios_tratamientos s ON s.id = vd.servicio_id
             INNER JOIN clientes c ON c.id = v.cliente_id
             INNER JOIN doctores d ON d.id = v.doctor_id
             WHERE v.estado = 'completada'
               AND vd.realizado = 0
               AND " . sqlExcluirCasheaDuplicadoEnPendientes('vd') . "
             ORDER BY c.nombre ASC, v.fecha_venta DESC, vd.id ASC"
        );

        $porCliente = [];
        foreach ($stmt->fetchAll() as $row) {
            $clienteId = (int) $row['cliente_id'];
            if (!isset($porCliente[$clienteId])) {
                $porCliente[$clienteId] = [
                    'cliente_id'       => $clienteId,
                    'cliente_nombre'   => $row['cliente_nombre'],
                    'cliente_cedula'   => $row['cliente_cedula'],
                    'cliente_telefono' => $row['cliente_telefono'],
                    'total_pendiente'  => 0.0,
                    'tratamientos'     => [],
                ];
            }

            $precio = (float) $row['precio'];
            $porCliente[$clienteId]['tratamientos'][] = [
                'id'            => (int) $row['id'],
                'servicio_id'   => (int) $row['servicio_id'],
                'venta_id'      => (int) $row['venta_id'],
                'doctor_id'     => (int) $row['doctor_id'],
                'doctor_nombre' => $row['doctor_nombre'],
                'nombre'        => $row['nombre'],
                'precio'        => $precio,
                'fecha'         => $row['fecha'],
                'pagado'        => (int) $row['pagado'] === 1,
            ];
            $porCliente[$clienteId]['total_pendiente'] += $precio;
        }

        $clientes = array_values(array_map(function ($c) {
            $c['total_pendiente'] = round($c['total_pendiente'], 2);
            return $c;
        }, $porCliente));

        $totalGeneral = array_reduce($clientes, fn($s, $c) => $s + $c['total_pendiente'], 0.0);
        $totalItems = array_reduce($clientes, fn($s, $c) => $s + count($c['tratamientos']), 0);

        echo json_encode([
            'success'              => true,
            'total_pendiente'      => round($totalGeneral, 2),
            'total_tratamientos'   => $totalItems,
            'total_clientes'       => count($clientes),
            'clientes'             => $clientes,
        ]);
        exit;
    }

    if ($method !== 'PATCH') {
        http_response_code(405);
        echo json_encode(['success' => false, 'message' => 'Método no permitido.']);
        exit;
    }

    $body  = defined('CACHED_BODY') ? CACHED_BODY : file_get_contents('php://input');
    $datos = json_decode($body, true);

    if (json_last_error() !== JSON_ERROR_NONE) {
        http_response_code(400);
        echo json_encode(['success' => false, 'message' => 'JSON inválido.']);
        exit;
    }

    $detalleId = (int) ($datos['id'] ?? 0);
    if ($detalleId <= 0) {
        http_response_code(400);
        echo json_encode(['success' => false, 'message' => 'El id del tratamiento es requerido.']);
        exit;
    }

    $stmtCheck = $pdo->prepare(
        "SELECT vd.id, vd.realizado, vd.venta_id, v.estado
         FROM venta_detalles vd
         INNER JOIN ventas v ON v.id = vd.venta_id
         WHERE vd.id = :id
         LIMIT 1"
    );
    $stmtCheck->execute([':id' => $detalleId]);
    $detalle = $stmtCheck->fetch();

    if (!$detalle) {
        http_response_code(404);
        echo json_encode(['success' => false, 'message' => 'Tratamiento no encontrado.']);
        exit;
    }

    if ($detalle['estado'] !== 'completada') {
        http_response_code(400);
        echo json_encode(['success' => false, 'message' => 'La venta asociada no está activa.']);
        exit;
    }

    if ((int) $detalle['realizado'] === 1) {
        echo json_encode([
            'success' => true,
            'message' => 'El tratamiento ya estaba marcado como realizado.',
        ]);
        exit;
    }

    $pdo->beginTransaction();

    $stmtUpdate = $pdo->prepare(
        "UPDATE venta_detalles SET realizado = 1 WHERE id = :id"
    );
    $stmtUpdate->execute([':id' => $detalleId]);

    // Recalcular flag de cabecera saldo_a_favor:
    // cobrado no realizado (sin Cashea) O porción pendiente por monto inferior.
    $ventaId = (int) $detalle['venta_id'];
    $stmtFlag = $pdo->prepare(
        "UPDATE ventas v
         SET v.saldo_a_favor = (
           EXISTS (
             SELECT 1 FROM venta_detalles vd
             WHERE vd.venta_id = v.id
               AND COALESCE(vd.cashea, 0) = 0
               AND COALESCE(vd.realizado, 1) = 0
               AND COALESCE(vd.pagado, 1) = 1
           )
           OR EXISTS (
             SELECT 1 FROM venta_detalles vd
             WHERE vd.venta_id = v.id
               AND COALESCE(vd.realizado, 1) = 0
               AND COALESCE(vd.pagado, 1) = 0
           )
         )
         WHERE v.id = :venta_id"
    );
    $stmtFlag->execute([':venta_id' => $ventaId]);

    $pdo->commit();

    echo json_encode([
        'success' => true,
        'id'      => $detalleId,
        'message' => 'Tratamiento marcado como realizado.',
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
    echo json_encode(['success' => false, 'message' => 'Error de base de datos: ' . $e->getMessage()]);
}
