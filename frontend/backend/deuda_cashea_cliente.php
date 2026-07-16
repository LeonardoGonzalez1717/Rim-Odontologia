<?php
// =============================================================================
// deuda_cashea_cliente.php — Deuda Cashea activa de un cliente
// Método: GET
// Query params:
//   cliente_id {int} — ID del cliente a consultar
// Respuesta:
//   {
//     "success": true,
//     "cliente_id": 5,
//     "deuda_total": 350.00,
//     "ventas_cashea": [
//       {
//         "id": 12,
//         "fecha": "2026-07-01",
//         "total": 500.00,
//         "monto_caja_inicial": 200.00,
//         "pagos_posteriores": 150.00,
//         "deuda_restante": 150.00,
//         "descripcion_cashea": "Plan de cuotas..."
//       }
//     ]
//   }
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

    // Obtener ventas con Cashea activo de este cliente
    // La deuda restante = total - monto_caja (pago inicial) - suma de abonos posteriores
    // Los abonos posteriores se vinculan por concepto: "Abono Cashea – venta #ID – ..."
    $stmt = $pdo->prepare(
        "SELECT
            v.id,
            DATE_FORMAT(v.fecha_venta, '%Y-%m-%d') AS fecha,
            v.total,
            v.monto_caja                            AS monto_caja_inicial,
            v.descripcion_cashea,
            COALESCE(
              (SELECT SUM(a.monto)
               FROM ajustes_cashea a
               WHERE a.concepto LIKE CONCAT('Abono Cashea – venta #', v.id, ' –%')
              ), 0
            )                                       AS pagos_posteriores,
            (v.total - v.monto_caja - COALESCE(
              (SELECT SUM(a.monto)
               FROM ajustes_cashea a
               WHERE a.concepto LIKE CONCAT('Abono Cashea – venta #', v.id, ' –%')
              ), 0
            ))                                      AS deuda_restante
         FROM ventas v
         WHERE v.cliente_id = :cliente_id
           AND v.cashea     = 1
           AND v.estado     = 'completada'
         HAVING deuda_restante > 0.001
         ORDER BY v.fecha_venta DESC"
    );
    $stmt->execute([':cliente_id' => $clienteId]);

    $ventas = array_map(function ($row) {
        return [
            'id'                 => (int)   $row['id'],
            'fecha'              => $row['fecha'],
            'total'              => (float) $row['total'],
            'monto_caja_inicial' => (float) $row['monto_caja_inicial'],
            'pagos_posteriores'  => (float) $row['pagos_posteriores'],
            'deuda_restante'     => round((float) $row['deuda_restante'], 2),
            'descripcion_cashea' => $row['descripcion_cashea'],
        ];
    }, $stmt->fetchAll());

    $deudaTotal = array_reduce($ventas, fn($carry, $v) => $carry + $v['deuda_restante'], 0.0);

    echo json_encode([
        'success'       => true,
        'cliente_id'    => $clienteId,
        'deuda_total'   => round($deudaTotal, 2),
        'ventas_cashea' => $ventas,
    ]);

} catch (RuntimeException $e) {
    http_response_code(500);
    echo json_encode(['success' => false, 'message' => $e->getMessage()]);
} catch (PDOException $e) {
    http_response_code(500);
    echo json_encode(['success' => false, 'message' => 'Error de base de datos: ' . $e->getMessage()]);
}
