<?php
// =============================================================================
// abono_venta.php — Abono exclusivo a deuda Cashea financiada de una venta
// Método: POST
// Body JSON: { venta_id, monto, concepto?, descripcion?, fecha_ingreso? }
// Solo se permite si la venta tiene financiamiento Cashea con deuda pendiente.
// No aplica a saldo pendiente de tratamientos al contado.
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

/**
 * Suma de abonos vinculados a una venta (tratamiento + Cashea).
 */
function sumarAbonosVenta(PDO $pdo, int $ventaId): float
{
    $stmt = $pdo->prepare(
        "SELECT COALESCE(SUM(monto), 0)
         FROM ajustes_cashea
         WHERE concepto LIKE :patron"
    );
    $stmt->execute([':patron' => 'Abono%venta #' . $ventaId . ' –%']);

    return (float) $stmt->fetchColumn();
}

/**
 * Saldo pendiente de cobro en tratamientos (líneas no pagadas).
 */
function saldoPendienteTratamientoVenta(PDO $pdo, int $ventaId): float
{
    $stmt = $pdo->prepare(
        "SELECT COALESCE(SUM(vd.precio), 0)
         FROM venta_detalles vd
         WHERE vd.venta_id = :venta_id
           AND COALESCE(vd.realizado, 1) = 0
           AND COALESCE(vd.cashea, 0) = 0
           AND COALESCE(vd.pagado, 1) = 0"
    );
    $stmt->execute([':venta_id' => $ventaId]);

    return round((float) $stmt->fetchColumn(), 2);
}

/**
 * Aplica un monto a líneas de tratamiento no pagadas (FIFO).
 *
 * @return float Monto efectivamente aplicado a tratamientos
 */
function aplicarPagoTratamientos(PDO $pdo, int $ventaId, float $monto): float
{
    if ($monto <= 0.001) {
        return 0.0;
    }

    $stmt = $pdo->prepare(
        "SELECT id, servicio_id, precio
         FROM venta_detalles
         WHERE venta_id = :venta_id
           AND COALESCE(realizado, 1) = 0
           AND COALESCE(cashea, 0) = 0
           AND COALESCE(pagado, 1) = 0
         ORDER BY id ASC"
    );
    $stmt->execute([':venta_id' => $ventaId]);
    $lineas = $stmt->fetchAll();

    $restante  = $monto;
    $aplicado  = 0.0;

    $stmtMarcar = $pdo->prepare(
        "UPDATE venta_detalles SET pagado = 1 WHERE id = :id"
    );
    $stmtReducir = $pdo->prepare(
        "UPDATE venta_detalles SET precio = :precio WHERE id = :id"
    );
    $stmtInsertar = $pdo->prepare(
        "INSERT INTO venta_detalles (venta_id, servicio_id, precio, realizado, cashea, pagado)
         VALUES (:venta_id, :servicio_id, :precio, 0, 0, 1)"
    );

    foreach ($lineas as $linea) {
        if ($restante <= 0.001) {
            break;
        }

        $id     = (int) $linea['id'];
        $precio = round((float) $linea['precio'], 2);

        if ($precio <= $restante + 0.001) {
            $stmtMarcar->execute([':id' => $id]);
            $restante -= $precio;
            $aplicado += $precio;
            continue;
        }

        // Pago parcial: divide la línea en pendiente + pagado (saldo a favor)
        $pagadoParcial = round($restante, 2);
        $nuevoPendiente = round($precio - $pagadoParcial, 2);

        $stmtReducir->execute([
            ':precio' => $nuevoPendiente,
            ':id'     => $id,
        ]);
        $stmtInsertar->execute([
            ':venta_id'    => $ventaId,
            ':servicio_id' => (int) $linea['servicio_id'],
            ':precio'      => $pagadoParcial,
        ]);

        $aplicado += $pagadoParcial;
        $restante  = 0.0;
    }

    return round($aplicado, 2);
}

try {
    $body  = file_get_contents('php://input');
    $datos = json_decode($body, true);

    if (json_last_error() !== JSON_ERROR_NONE) {
        http_response_code(400);
        echo json_encode(['success' => false, 'message' => 'JSON inválido.']);
        exit;
    }

    $ventaId = (int) ($datos['venta_id'] ?? 0);
    $monto   = isset($datos['monto']) ? round((float) $datos['monto'], 2) : 0.0;

    if ($ventaId <= 0) {
        http_response_code(400);
        echo json_encode(['success' => false, 'message' => 'El venta_id es requerido.']);
        exit;
    }

    if ($monto <= 0) {
        http_response_code(400);
        echo json_encode(['success' => false, 'message' => 'El monto debe ser mayor a cero.']);
        exit;
    }

    $pdo = obtenerConexion();

    $stmtVenta = $pdo->prepare(
        "SELECT v.id, v.cliente_id, v.total, v.monto_caja, v.cashea, v.estado, c.nombre AS cliente_nombre
         FROM ventas v
         INNER JOIN clientes c ON c.id = v.cliente_id
         WHERE v.id = :id
         LIMIT 1"
    );
    $stmtVenta->execute([':id' => $ventaId]);
    $venta = $stmtVenta->fetch();

    if (!$venta) {
        http_response_code(404);
        echo json_encode(['success' => false, 'message' => 'Venta no encontrada.']);
        exit;
    }

    if ($venta['estado'] !== 'completada') {
        http_response_code(400);
        echo json_encode(['success' => false, 'message' => 'La venta no está completada.']);
        exit;
    }

    if ((int) $venta['cashea'] !== 1) {
        http_response_code(400);
        echo json_encode(['success' => false, 'message' => 'Esta venta no tiene financiamiento Cashea.']);
        exit;
    }

    $total     = (float) $venta['total'];
    $montoCaja = (float) $venta['monto_caja'];
    $abonos    = sumarAbonosVenta($pdo, $ventaId);
    $deudaRest = round(max(0, $total - $montoCaja - $abonos), 2);
    $saldoTratamiento = saldoPendienteTratamientoVenta($pdo, $ventaId);
    // Solo la porción financiada con Cashea es abonable por este endpoint
    $deudaCashea = round(max(0, $deudaRest - $saldoTratamiento), 2);

    if ($deudaCashea <= 0.001) {
        http_response_code(400);
        echo json_encode([
            'success' => false,
            'message' => 'Solo se pueden registrar abonos sobre deuda Cashea. Esta venta no tiene deuda Cashea pendiente.',
        ]);
        exit;
    }

    if ($monto > $deudaCashea + 0.001) {
        http_response_code(400);
        echo json_encode([
            'success' => false,
            'message' => 'El abono no puede superar la deuda Cashea de la venta ($' . number_format($deudaCashea, 2, '.', '') . ').',
        ]);
        exit;
    }

    $infoInternet = obtenerFechaHoraInternet();
    $fechaIngreso = trim((string) ($datos['fecha_ingreso'] ?? ''));

    if ($fechaIngreso === '') {
        $fechaIngreso = $infoInternet['datetime'];
    } else {
        $fechaIngreso = str_replace('T', ' ', $fechaIngreso);
        if (preg_match('/^\d{4}-\d{2}-\d{2}$/', $fechaIngreso)) {
            $fechaIngreso .= ' 00:00:00';
        } elseif (preg_match('/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}$/', $fechaIngreso)) {
            $fechaIngreso .= ':00';
        }

        $dt = DateTime::createFromFormat('Y-m-d H:i:s', $fechaIngreso);
        if (!$dt || $dt->format('Y-m-d H:i:s') !== $fechaIngreso) {
            http_response_code(400);
            echo json_encode(['success' => false, 'message' => 'La fecha_ingreso no es válida. Use el formato YYYY-MM-DD HH:MM:SS.']);
            exit;
        }
    }

    $pdo->beginTransaction();

    $nombreCliente = $venta['cliente_nombre'] ?? 'Cliente';
    $descExtra     = trim((string) ($datos['descripcion'] ?? $datos['concepto'] ?? ''));
    if ($descExtra !== '' && mb_strlen($descExtra) > 180) {
        $descExtra = mb_substr($descExtra, 0, 180);
    }

    $montoCashea = $monto;
    $conceptoCashea = $descExtra !== ''
        ? "Abono Cashea – venta #{$ventaId} – {$nombreCliente} – {$descExtra}"
        : "Abono Cashea – venta #{$ventaId} – {$nombreCliente}";

    $stmtAjuste = $pdo->prepare(
        "INSERT INTO ajustes_cashea (monto, concepto, fecha_ingreso)
         VALUES (:monto, :concepto, :fecha_ingreso)"
    );
    $stmtAjuste->execute([
        ':monto'         => $montoCashea,
        ':concepto'      => $conceptoCashea,
        ':fecha_ingreso' => $fechaIngreso,
    ]);

    $pdo->commit();

    echo json_encode([
        'success'              => true,
        'venta_id'             => $ventaId,
        'monto_total'          => $monto,
        'monto_tratamiento'    => 0.0,
        'monto_cashea'         => $montoCashea,
        'deuda_restante_antes' => $deudaCashea,
        'message'              => 'Abono registrado correctamente.',
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
    echo json_encode(['success' => false, 'message' => 'Error al registrar abono: ' . $e->getMessage()]);
}
