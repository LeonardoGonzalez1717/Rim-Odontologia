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

try {
    $pdo = obtenerConexion();

    if ($_SERVER['REQUEST_METHOD'] === 'GET') {
        $stmt = $pdo->query(
            "SELECT
                vd.id,
                vd.precio,
                COALESCE(vd.realizado, 1) AS realizado,
                s.nombre_servicio AS nombre,
                v.id AS venta_id,
                DATE_FORMAT(v.fecha_venta, '%Y-%m-%d') AS fecha,
                c.id AS cliente_id,
                c.nombre AS cliente_nombre,
                c.cedula AS cliente_cedula,
                c.telefono AS cliente_telefono
             FROM venta_detalles vd
             INNER JOIN ventas v ON v.id = vd.venta_id
             INNER JOIN servicios_tratamientos s ON s.id = vd.servicio_id
             INNER JOIN clientes c ON c.id = v.cliente_id
             WHERE v.estado = 'completada'
               AND vd.realizado = 0
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
                'id'       => (int) $row['id'],
                'venta_id' => (int) $row['venta_id'],
                'nombre'   => $row['nombre'],
                'precio'   => $precio,
                'fecha'    => $row['fecha'],
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

    if ($_SERVER['REQUEST_METHOD'] !== 'PATCH') {
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

    $detalleId = (int) ($datos['id'] ?? 0);
    if ($detalleId <= 0) {
        http_response_code(400);
        echo json_encode(['success' => false, 'message' => 'El id del tratamiento es requerido.']);
        exit;
    }

    $stmtCheck = $pdo->prepare(
        "SELECT vd.id, vd.realizado, v.estado
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

    $stmtUpdate = $pdo->prepare(
        "UPDATE venta_detalles SET realizado = 1 WHERE id = :id"
    );
    $stmtUpdate->execute([':id' => $detalleId]);

    echo json_encode([
        'success' => true,
        'id'      => $detalleId,
        'message' => 'Tratamiento marcado como realizado.',
    ]);

} catch (RuntimeException $e) {
    http_response_code(500);
    echo json_encode(['success' => false, 'message' => $e->getMessage()]);
} catch (PDOException $e) {
    http_response_code(500);
    echo json_encode(['success' => false, 'message' => 'Error de base de datos: ' . $e->getMessage()]);
}
