<?php
// =============================================================================
// saldo_favor_cliente.php — Tratamientos pendientes (saldo a favor) de un cliente
// Método: GET
// Query: cliente_id
// =============================================================================

header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');
header('Content-Type: application/json; charset=utf-8');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

if ($_SERVER['REQUEST_METHOD'] !== 'GET') {
    http_response_code(405);
    echo json_encode(['success' => false, 'message' => 'Método no permitido.']);
    exit;
}

require_once 'conexion.php';

try {
    $clienteId = (int) ($_GET['cliente_id'] ?? 0);
    if ($clienteId <= 0) {
        http_response_code(400);
        echo json_encode(['success' => false, 'message' => 'El parámetro cliente_id es requerido.']);
        exit;
    }

    $pdo = obtenerConexion();

    $stmt = $pdo->prepare(
        "SELECT
            vd.id,
            vd.precio,
            s.nombre_servicio AS nombre,
            v.id AS venta_id,
            DATE_FORMAT(v.fecha_venta, '%Y-%m-%d') AS fecha
         FROM venta_detalles vd
         INNER JOIN ventas v ON v.id = vd.venta_id
         INNER JOIN servicios_tratamientos s ON s.id = vd.servicio_id
         WHERE v.cliente_id = :cliente_id
           AND v.estado = 'completada'
           AND vd.realizado = 0
         ORDER BY v.fecha_venta DESC, vd.id ASC"
    );
    $stmt->execute([':cliente_id' => $clienteId]);

    $tratamientos = array_map(function ($row) {
        return [
            'id'       => (int) $row['id'],
            'venta_id' => (int) $row['venta_id'],
            'nombre'   => $row['nombre'],
            'precio'   => (float) $row['precio'],
            'fecha'    => $row['fecha'],
        ];
    }, $stmt->fetchAll());

    $total = array_reduce($tratamientos, fn($s, $t) => $s + $t['precio'], 0.0);

    echo json_encode([
        'success'       => true,
        'cliente_id'    => $clienteId,
        'saldo_a_favor' => round($total, 2),
        'tratamientos'  => $tratamientos,
    ]);
} catch (RuntimeException $e) {
    http_response_code(500);
    echo json_encode(['success' => false, 'message' => $e->getMessage()]);
} catch (PDOException $e) {
    http_response_code(500);
    echo json_encode(['success' => false, 'message' => 'Error de base de datos: ' . $e->getMessage()]);
}
