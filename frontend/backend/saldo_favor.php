<?php
// =============================================================================
// saldo_favor.php â Registrar y consultar saldo a favor de clientes
// MÃ©todos: POST, GET
// El saldo a favor se representa con tratamientos pagados y no realizados
// (venta_detalles: pagado=1, realizado=0). No usa tabla saldos_favor.
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
    $metodo = obtenerMetodoHttp();

    if ($metodo === 'POST') {
        $body = json_decode(defined('CACHED_BODY') ? CACHED_BODY : file_get_contents('php://input'), true);

        $clienteId  = (int) ($body['cliente_id'] ?? 0);
        $doctorId   = (int) ($body['doctor_id'] ?? 0);
        $servicioId = (int) ($body['servicio_id'] ?? 0);
        $monto      = isset($body['monto']) ? round((float) $body['monto'], 2) : 0.0;
        $fecha      = trim((string) ($body['fecha'] ?? ''));
        $concepto   = trim((string) ($body['concepto'] ?? 'Saldo a favor registrado'));
        $usuarioId  = !empty($body['usuario_id']) ? (int) $body['usuario_id'] : null;

        if ($clienteId <= 0) {
            http_response_code(400);
            echo json_encode(['success' => false, 'message' => 'Por favor, selecciona un cliente.']);
            exit;
        }

        if ($doctorId <= 0) {
            http_response_code(400);
            echo json_encode(['success' => false, 'message' => 'Por favor, selecciona un doctor.']);
            exit;
        }

        if ($servicioId <= 0) {
            http_response_code(400);
            echo json_encode(['success' => false, 'message' => 'Selecciona el tratamiento a pagar con el saldo a favor.']);
            exit;
        }

        if ($monto <= 0) {
            http_response_code(400);
            echo json_encode(['success' => false, 'message' => 'El monto debe ser mayor a $0.']);
            exit;
        }

        if ($fecha === '') {
            $info = obtenerFechaHoraInternet();
            $fecha = $info['datetime'];
        } else {
            $fecha = str_replace('T', ' ', $fecha);
            if (preg_match('/^\d{4}-\d{2}-\d{2}$/', $fecha)) {
                $fecha .= ' 00:00:00';
            } elseif (preg_match('/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}$/', $fecha)) {
                $fecha .= ':00';
            }
            $dt = DateTime::createFromFormat('Y-m-d H:i:s', $fecha);
            if (!$dt || $dt->format('Y-m-d H:i:s') !== $fecha) {
                http_response_code(400);
                echo json_encode(['success' => false, 'message' => 'La fecha no es vÃ¡lida.']);
                exit;
            }
        }

        if (mb_strlen($concepto) > 255) {
            $concepto = mb_substr($concepto, 0, 255);
        }

        $stmtCli = $pdo->prepare("SELECT id FROM clientes WHERE id = :id AND estado = 'activo' LIMIT 1");
        $stmtCli->execute([':id' => $clienteId]);
        if (!$stmtCli->fetch()) {
            http_response_code(404);
            echo json_encode(['success' => false, 'message' => 'Cliente no encontrado.']);
            exit;
        }

        $stmtDoc = $pdo->prepare("SELECT id FROM doctores WHERE id = :id AND estado = 'activo' LIMIT 1");
        $stmtDoc->execute([':id' => $doctorId]);
        if (!$stmtDoc->fetch()) {
            http_response_code(404);
            echo json_encode(['success' => false, 'message' => 'Doctor no encontrado.']);
            exit;
        }

        $stmtSvc = $pdo->prepare("SELECT id FROM servicios_tratamientos WHERE id = :id AND estado = 'activo' LIMIT 1");
        $stmtSvc->execute([':id' => $servicioId]);
        if (!$stmtSvc->fetch()) {
            http_response_code(404);
            echo json_encode(['success' => false, 'message' => 'Tratamiento no encontrado.']);
            exit;
        }

        $pdo->beginTransaction();

        $stmtVenta = $pdo->prepare(
            "INSERT INTO ventas (doctor_id, cliente_id, usuario_id, fecha_venta, total, cashea, monto_caja, descripcion_cashea, saldo_a_favor, estado)
             VALUES (:doctor_id, :cliente_id, :usuario_id, :fecha_venta, :total, 0, :monto_caja, :descripcion, 1, 'completada')"
        );
        $stmtVenta->execute([
            ':doctor_id'    => $doctorId,
            ':cliente_id'   => $clienteId,
            ':usuario_id'   => $usuarioId,
            ':fecha_venta'  => $fecha,
            ':total'        => $monto,
            ':monto_caja'   => $monto,
            ':descripcion'  => $concepto !== '' ? $concepto : null,
        ]);

        $ventaId = (int) $pdo->lastInsertId();

        $stmtDetalle = $pdo->prepare(
            "INSERT INTO venta_detalles (venta_id, servicio_id, precio, realizado, cashea, pagado)
             VALUES (:venta_id, :servicio_id, :precio, 0, 0, 1)"
        );
        $stmtDetalle->execute([
            ':venta_id'    => $ventaId,
            ':servicio_id' => $servicioId,
            ':precio'      => $monto,
        ]);

        $pdo->commit();

        echo json_encode([
            'success'  => true,
            'message'  => 'Saldo a favor registrado correctamente.',
            'id'       => $ventaId,
            'venta_id' => $ventaId,
        ]);
        exit;
    }

    if ($metodo === 'GET') {
        $clienteId = (int) ($_GET['cliente_id'] ?? 0);

        $condSaldo = sqlDetalleSaldoFavorDisponible('vd', 'v');

        // Detalle de saldo a favor no utilizado de un cliente
        if ($clienteId > 0) {
            $stmt = $pdo->prepare(
                "SELECT
                    vd.id,
                    v.cliente_id,
                    vd.precio AS monto,
                    DATE_FORMAT(v.fecha_venta, '%Y-%m-%d %H:%i') AS fecha,
                    CONCAT(
                      CASE WHEN COALESCE(vd.cashea, 0) = 1 THEN 'Cashea / saldo a favor: ' ELSE 'Tratamiento prepagado: ' END,
                      s.nombre_servicio
                    ) AS concepto
                 FROM venta_detalles vd
                 INNER JOIN ventas v ON v.id = vd.venta_id
                 INNER JOIN servicios_tratamientos s ON s.id = vd.servicio_id
                 WHERE v.cliente_id = :cliente_id
                   AND v.estado = 'completada'
                   AND {$condSaldo}
                 ORDER BY v.fecha_venta DESC, vd.id DESC"
            );
            $stmt->execute([':cliente_id' => $clienteId]);
            $registros = $stmt->fetchAll();

            $totalSaldo = array_reduce($registros, fn($s, $r) => $s + (float) $r['monto'], 0.0);

            echo json_encode([
                'success'     => true,
                'cliente_id'  => $clienteId,
                'total_saldo' => round($totalSaldo, 2),
                'registros'   => $registros,
            ]);
            exit;
        }

        // Listado: clientes con saldo a favor no utilizado
        $stmt = $pdo->query(
            "SELECT
                c.id AS cliente_id,
                c.cedula AS cliente_cedula,
                c.nombre AS cliente_nombre,
                c.telefono AS cliente_telefono,
                COALESCE((
                  SELECT SUM(vd.precio)
                  FROM venta_detalles vd
                  INNER JOIN ventas v ON v.id = vd.venta_id
                  WHERE v.cliente_id = c.id
                    AND v.estado = 'completada'
                    AND {$condSaldo}
                ), 0) AS saldo_prepagado
             FROM clientes c
             WHERE c.estado = 'activo'
             HAVING saldo_prepagado > 0.001
             ORDER BY saldo_prepagado DESC, c.nombre ASC"
        );

        $clientes = [];
        $totalSaldo = 0.0;
        foreach ($stmt->fetchAll() as $row) {
            $prepagado = round((float) $row['saldo_prepagado'], 2);
            $totalSaldo += $prepagado;
            $clientes[] = [
                'cliente_id'       => (int) $row['cliente_id'],
                'cliente_cedula'   => $row['cliente_cedula'],
                'cliente_nombre'   => $row['cliente_nombre'],
                'cliente_telefono' => $row['cliente_telefono'],
                'saldo_a_favor'    => $prepagado,
                'saldo_monetario'  => 0.0,
                'saldo_prepagado'  => $prepagado,
            ];
        }

        if (count($clientes) > 0) {
            $ids = array_column($clientes, 'cliente_id');
            $placeholders = implode(',', array_fill(0, count($ids), '?'));
            $stmtMov = $pdo->prepare(
                "SELECT
                    vd.id,
                    v.cliente_id,
                    vd.precio AS monto,
                    DATE_FORMAT(v.fecha_venta, '%Y-%m-%d') AS fecha,
                    CONCAT(
                      CASE WHEN COALESCE(vd.cashea, 0) = 1 THEN 'Cashea / saldo a favor: ' ELSE 'Tratamiento prepagado: ' END,
                      s.nombre_servicio
                    ) AS concepto
                 FROM venta_detalles vd
                 INNER JOIN ventas v ON v.id = vd.venta_id
                 INNER JOIN servicios_tratamientos s ON s.id = vd.servicio_id
                 WHERE v.cliente_id IN ($placeholders)
                   AND v.estado = 'completada'
                   AND {$condSaldo}
                 ORDER BY v.fecha_venta DESC, vd.id DESC"
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
    echo json_encode(['success' => false, 'message' => 'MÃ©todo no permitido.']);

} catch (Throwable $e) {
    if (isset($pdo) && $pdo instanceof PDO && $pdo->inTransaction()) {
        $pdo->rollBack();
    }
    http_response_code(500);
    echo json_encode(['success' => false, 'message' => 'Error en el servidor: ' . $e->getMessage()]);
}
