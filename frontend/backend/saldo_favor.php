<?php
// =============================================================================
// saldo_favor.php — Registrar y consultar saldo a favor de clientes
// Métodos: POST, GET
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
require_once 'venta_helpers.php';

try {
    $pdo = obtenerConexion();

    // Crear tabla saldos_favor si no existe
    $pdo->exec(
        "CREATE TABLE IF NOT EXISTS saldos_favor (
            id INT AUTO_INCREMENT PRIMARY KEY,
            cliente_id INT NOT NULL,
            monto DECIMAL(10,2) NOT NULL,
            fecha DATETIME NOT NULL,
            concepto VARCHAR(255) DEFAULT 'Saldo a favor registrado',
            creado_en TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            INDEX idx_cliente (cliente_id)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;"
    );

    $metodo = obtenerMetodoHttp();

    if ($metodo === 'POST') {
        $body = json_decode(CACHED_BODY ?? file_get_contents('php://input'), true);

        $clienteId = (int) ($body['cliente_id'] ?? 0);
        $monto     = (float) ($body['monto'] ?? 0);
        $fecha     = trim($body['fecha'] ?? '');
        $concepto  = trim($body['concepto'] ?? 'Saldo a favor registrado');

        if ($clienteId <= 0) {
            http_response_code(400);
            echo json_encode(['success' => false, 'message' => 'Por favor, selecciona un cliente.']);
            exit;
        }

        if ($monto <= 0) {
            http_response_code(400);
            echo json_encode(['success' => false, 'message' => 'El monto debe ser mayor a $0.']);
            exit;
        }

        if (empty($fecha)) {
            $fecha = date('Y-m-d H:i:s');
        } else {
            if (strlen($fecha) === 10) {
                $fecha .= ' ' . date('H:i:s');
            } elseif (strlen($fecha) === 16) {
                $fecha .= ':00';
            }
        }

        $stmt = $pdo->prepare(
            "INSERT INTO saldos_favor (cliente_id, monto, fecha, concepto)
             VALUES (:cliente_id, :monto, :fecha, :concepto)"
        );
        $stmt->execute([
            ':cliente_id' => $clienteId,
            ':monto'      => $monto,
            ':fecha'      => $fecha,
            ':concepto'   => $concepto,
        ]);

        echo json_encode([
            'success' => true,
            'message' => 'Saldo a favor registrado correctamente.',
            'id'      => (int) $pdo->lastInsertId(),
        ]);
        exit;
    }

    if ($metodo === 'GET') {
        $clienteId = (int) ($_GET['cliente_id'] ?? 0);

        // Detalle de movimientos de un cliente
        if ($clienteId > 0) {
            $stmt = $pdo->prepare(
                "SELECT id, cliente_id, monto, DATE_FORMAT(fecha, '%Y-%m-%d %H:%i') AS fecha, concepto
                 FROM saldos_favor
                 WHERE cliente_id = :cliente_id
                 ORDER BY fecha DESC"
            );
            $stmt->execute([':cliente_id' => $clienteId]);
            $registros = $stmt->fetchAll();

            $totalSaldo = array_reduce($registros, fn($s, $r) => $s + (float)$r['monto'], 0.0);

            echo json_encode([
                'success'     => true,
                'cliente_id'  => $clienteId,
                'total_saldo' => round($totalSaldo, 2),
                'registros'   => $registros,
            ]);
            exit;
        }

        // Listado: clientes con saldo a favor disponible (> 0)
        $stmt = $pdo->query(
            "SELECT
                c.id AS cliente_id,
                c.cedula AS cliente_cedula,
                c.nombre AS cliente_nombre,
                c.telefono AS cliente_telefono,
                COALESCE((
                  SELECT SUM(sf.monto)
                  FROM saldos_favor sf
                  WHERE sf.cliente_id = c.id
                ), 0) AS saldo_monetario,
                COALESCE((
                  SELECT SUM(vd.precio)
                  FROM venta_detalles vd
                  INNER JOIN ventas v ON v.id = vd.venta_id
                  WHERE v.cliente_id = c.id
                    AND v.estado = 'completada'
                    AND vd.realizado = 0
                    AND COALESCE(vd.pagado, 1) = 1
                    AND " . sqlExcluirCasheaDuplicadoEnPendientes('vd') . "
                ), 0) AS saldo_prepagado
             FROM clientes c
             WHERE c.estado = 'activo'
             HAVING (saldo_monetario + saldo_prepagado) > 0.001
             ORDER BY (saldo_monetario + saldo_prepagado) DESC, c.nombre ASC"
        );

        $clientes = [];
        $totalSaldo = 0.0;
        foreach ($stmt->fetchAll() as $row) {
            $monetario = round((float) $row['saldo_monetario'], 2);
            $prepagado = round((float) $row['saldo_prepagado'], 2);
            $saldo = round($monetario + $prepagado, 2);
            $totalSaldo += $saldo;
            $clientes[] = [
                'cliente_id'       => (int) $row['cliente_id'],
                'cliente_cedula'   => $row['cliente_cedula'],
                'cliente_nombre'   => $row['cliente_nombre'],
                'cliente_telefono' => $row['cliente_telefono'],
                'saldo_a_favor'    => $saldo,
                'saldo_monetario'  => max(0, $monetario),
                'saldo_prepagado'  => max(0, $prepagado),
            ];
        }

        // Movimientos recientes por cliente (para el detalle expandible)
        if (count($clientes) > 0) {
            $ids = array_column($clientes, 'cliente_id');
            $placeholders = implode(',', array_fill(0, count($ids), '?'));
            $stmtMov = $pdo->prepare(
                "SELECT id, cliente_id, monto,
                        DATE_FORMAT(fecha, '%Y-%m-%d') AS fecha,
                        concepto
                 FROM saldos_favor
                 WHERE cliente_id IN ($placeholders)
                 ORDER BY fecha DESC, id DESC"
            );
            $stmtMov->execute($ids);
            $movimientosPorCliente = [];
            foreach ($stmtMov->fetchAll() as $mov) {
                $cid = (int) $mov['cliente_id'];
                if (!isset($movimientosPorCliente[$cid])) {
                    $movimientosPorCliente[$cid] = [];
                }
                if (count($movimientosPorCliente[$cid]) >= 12) {
                    continue;
                }
                $movimientosPorCliente[$cid][] = [
                    'id'       => (int) $mov['id'],
                    'monto'    => (float) $mov['monto'],
                    'fecha'    => $mov['fecha'],
                    'concepto' => $mov['concepto'],
                ];
            }
            foreach ($clientes as &$c) {
                $c['movimientos'] = $movimientosPorCliente[$c['cliente_id']] ?? [];
            }
            unset($c);
        }

        echo json_encode([
            'success'        => true,
            'clientes'       => $clientes,
            'total_clientes' => count($clientes),
            'total_saldo'    => round($totalSaldo, 2),
        ]);
        exit;
    }

    http_response_code(405);
    echo json_encode(['success' => false, 'message' => 'Método no permitido.']);

} catch (Throwable $e) {
    http_response_code(500);
    echo json_encode(['success' => false, 'message' => 'Error en el servidor: ' . $e->getMessage()]);
}
