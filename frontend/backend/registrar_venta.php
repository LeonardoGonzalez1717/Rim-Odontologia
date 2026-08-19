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
require_once 'venta_helpers.php';

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
    $infoInternet = obtenerFechaHoraInternet();
    $fecha_venta = trim((string) ($datos['fecha_venta'] ?? ''));

    if ($fecha_venta === '') {
        $fecha_venta = $infoInternet['datetime'];
    } else {
        $fecha_venta = str_replace('T', ' ', $fecha_venta);
        if (preg_match('/^\d{4}-\d{2}-\d{2}$/', $fecha_venta)) {
            $fecha_venta .= ' 00:00:00';
        } elseif (preg_match('/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}$/', $fecha_venta)) {
            $fecha_venta .= ':00';
        }

        $dt = DateTime::createFromFormat('Y-m-d H:i:s', $fecha_venta);
        if (!$dt || $dt->format('Y-m-d H:i:s') !== $fecha_venta) {
            http_response_code(400);
            echo json_encode(['success' => false, 'message' => 'La fecha_venta no es válida. Use el formato YYYY-MM-DD HH:MM:SS.']);
            exit;
        }
    }

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
            // true por defecto: se realiza hoy. false = pendiente → saldo a favor
            'realizado'   => array_key_exists('realizado', $linea)
                ? (!empty($linea['realizado']) ? 1 : 0)
                : 1,
            // Cashea por línea (permite pago mixto contado + Cashea)
            'cashea'      => !empty($linea['cashea']) ? 1 : 0,
            // pagado=0 solo para porciones aún no cobradas (realizado=0 explícito desde el front)
            'pagado'      => array_key_exists('pagado', $linea)
                ? (!empty($linea['pagado']) ? 1 : 0)
                : 1,
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

    $totalCashea = 0.0;
    $totalContado = 0.0;
    $totalPendiente = 0.0;
    foreach ($lineasNormalizadas as $linea) {
        if ($linea['cashea']) {
            $totalCashea += $linea['precio'];
        } elseif ((int) $linea['realizado'] === 0 && (int) $linea['pagado'] === 0) {
            // Porción aún no cobrada (pago parcial)
            $totalPendiente += $linea['precio'];
        } else {
            // Cobrado hoy: realizado hoy o saldo a favor (pagado=1, realizado=0)
            $totalContado += $linea['precio'];
        }
    }

    // Flag de cabecera: hay Cashea si alguna línea lo marca
    // (también acepta cashea=true a nivel venta por compatibilidad)
    $cashea = $totalCashea > 0.001 || !empty($datos['cashea']);

    // Si mandaron cashea a nivel venta sin marcar líneas, marcar todas
    if ($cashea && $totalCashea < 0.001) {
        foreach ($lineasNormalizadas as &$linea) {
            $linea['cashea'] = 1;
        }
        unset($linea);
        $totalCashea  = $totalCalculado;
        $totalContado = 0.0;
    }

    $descripcionCashea = null;
    $montoCaja = $total;

    if ($cashea) {
        // monto_caja = contado completo + cuota inicial de la parte Cashea
        $montoInicialCashea = isset($datos['monto_caja_cashea'])
            ? (float) $datos['monto_caja_cashea']
            : (isset($datos['monto_caja'])
                ? max(0, (float) $datos['monto_caja'] - $totalContado)
                : round($totalCashea * 0.4, 2));

        if ($montoInicialCashea <= 0) {
            http_response_code(400);
            echo json_encode(['success' => false, 'message' => 'Indica el monto inicial de Cashea que ingresa a caja.']);
            exit;
        }
        if ($montoInicialCashea > $totalCashea + 0.01) {
            http_response_code(400);
            echo json_encode([
                'success' => false,
                'message' => 'El monto inicial de Cashea no puede ser mayor al total financiado.',
            ]);
            exit;
        }

        $descripcionCashea = trim((string) ($datos['descripcion_cashea'] ?? ''));
        if ($descripcionCashea === '') {
            $descripcionCashea = null;
        } elseif (mb_strlen($descripcionCashea) > 500) {
            http_response_code(400);
            echo json_encode(['success' => false, 'message' => 'La descripción no puede superar 500 caracteres.']);
            exit;
        }

        $montoCaja = round($totalContado + $montoInicialCashea, 2);
    } else {
        // Sin Cashea: solo entra a caja lo cobrado hoy (no la porción pendiente de pago)
        $montoCaja = round($totalContado, 2);
    }

    $saldoFavorAplicado = isset($datos['saldo_favor_aplicado'])
        ? round(max(0, (float) $datos['saldo_favor_aplicado']), 2)
        : 0.0;

    $pdo = obtenerConexion();

    if ($saldoFavorAplicado > 0.001) {
        $saldoDisponible = calcularSaldoFavorDisponible($pdo, $cliente_id);
        if ($saldoFavorAplicado > $saldoDisponible + 0.01) {
            http_response_code(400);
            echo json_encode([
                'success' => false,
                'message' => "El saldo a favor aplicado ($saldoFavorAplicado) supera el disponible ($saldoDisponible).",
            ]);
            exit;
        }
        if ($saldoFavorAplicado > $montoCaja + 0.01) {
            http_response_code(400);
            echo json_encode([
                'success' => false,
                'message' => 'El descuento por saldo a favor no puede superar el monto a cobrar hoy.',
            ]);
            exit;
        }
        $montoCaja = round(max(0, $montoCaja - $saldoFavorAplicado), 2);
    }

    // Procesar métodos de pago
    $pagosNormalizados = [];
    if (!empty($datos['pagos']) && is_array($datos['pagos'])) {
        foreach ($datos['pagos'] as $pago) {
            $metodo = trim((string) ($pago['metodo_pago'] ?? ''));
            $montoPago = isset($pago['monto']) ? round((float) $pago['monto'], 2) : 0.0;
            $referencia = trim((string) ($pago['referencia'] ?? ''));
            if ($referencia === '') $referencia = null;

            if ($metodo !== '' && $montoPago > 0) {
                $pagosNormalizados[] = [
                    'metodo_pago' => mb_substr($metodo, 0, 60),
                    'monto'       => $montoPago,
                    'referencia'  => $referencia !== null ? mb_substr($referencia, 0, 100) : null,
                ];
            }
        }
    }

    if ($montoCaja > 0.001) {
        if (empty($pagosNormalizados)) {
            $pagosNormalizados[] = [
                'metodo_pago' => 'Efectivo ($)',
                'monto'       => $montoCaja,
                'referencia'  => null,
            ];
        } else {
            $sumaPagos = round(array_sum(array_column($pagosNormalizados, 'monto')), 2);
            if (abs($sumaPagos - $montoCaja) > 0.01) {
                http_response_code(400);
                echo json_encode([
                    'success' => false,
                    'message' => "La suma de los métodos de pago ($" . number_format($sumaPagos, 2, '.', '') . ") no coincide con el total a cobrar en caja ($" . number_format($montoCaja, 2, '.', '') . ").",
                ]);
                exit;
            }
        }
    }

    $stmtCheck = $pdo->prepare("
        SELECT id FROM ventas 
        WHERE cliente_id = :cliente_id 
          AND doctor_id = :doctor_id 
          AND total = :total
          AND fecha_venta = :fecha_venta
        ORDER BY id DESC LIMIT 1
    ");
    $stmtCheck->execute([
        ':cliente_id'  => $cliente_id,
        ':doctor_id'   => $doctor_id,
        ':total'       => $total,
        ':fecha_venta' => $fecha_venta,
    ]);

    if ($row = $stmtCheck->fetch(PDO::FETCH_ASSOC)) {
        http_response_code(200);
        echo json_encode([
            'success' => true,
            'id'      => (int) $row['id'],
            'message' => 'Venta registrada correctamente.',
        ]);
        exit;
    }

    $usuario_id = !empty($datos['usuario_id']) ? (int) $datos['usuario_id'] : null;

    // Flag de cabecera saldo_a_favor:
    //  - Contado cobrado y no realizado (Hoy desmarcado o monto parcial cobrado)
    //  - Monto inferior al total (queda porción pendiente de cobro), también con Cashea
    // No marcar solo por Cashea a precio completo.
    $esSaldoAFavor = false;
    foreach ($lineasNormalizadas as $linea) {
        $esCashea    = (int) ($linea['cashea'] ?? 0) === 1;
        $esRealizado = (int) ($linea['realizado'] ?? 1) === 1;
        $esPagado    = (int) ($linea['pagado'] ?? 1) === 1;

        if (!$esCashea && !$esRealizado && $esPagado) {
            $esSaldoAFavor = true;
            break;
        }
        if (!$esPagado && !$esRealizado) {
            $esSaldoAFavor = true;
            break;
        }
    }

    $pdo->beginTransaction();

    $stmtVenta = $pdo->prepare(
        "INSERT INTO ventas (doctor_id, cliente_id, usuario_id, fecha_venta, total, cashea, monto_caja, saldo_favor_aplicado, descripcion_cashea, saldo_a_favor, estado)
         VALUES (:doctor_id, :cliente_id, :usuario_id, :fecha_venta, :total, :cashea, :monto_caja, :saldo_favor_aplicado, :descripcion_cashea, :saldo_a_favor, 'completada')"
    );
    $stmtVenta->execute([
        ':doctor_id'              => $doctor_id,
        ':cliente_id'             => $cliente_id,
        ':usuario_id'             => $usuario_id,
        ':fecha_venta'            => $fecha_venta,
        ':total'                  => $total,
        ':cashea'                 => $cashea ? 1 : 0,
        ':monto_caja'             => $montoCaja,
        ':saldo_favor_aplicado'   => $saldoFavorAplicado > 0.001 ? $saldoFavorAplicado : null,
        ':descripcion_cashea'     => $descripcionCashea,
        ':saldo_a_favor'          => $esSaldoAFavor ? 1 : 0,
    ]);

    $nuevoId = (int) $pdo->lastInsertId();

    $stmtDetalle = $pdo->prepare(
        "INSERT INTO venta_detalles (venta_id, servicio_id, precio, realizado, cashea, pagado)
         VALUES (:venta_id, :servicio_id, :precio, :realizado, :cashea, :pagado)"
    );

    foreach ($lineasNormalizadas as $linea) {
        $stmtDetalle->execute([
            ':venta_id'    => $nuevoId,
            ':servicio_id' => $linea['servicio_id'],
            ':precio'      => $linea['precio'],
            ':realizado'   => $linea['realizado'],
            ':cashea'      => $linea['cashea'],
            ':pagado'      => $linea['pagado'],
        ]);
    }

    if (!empty($pagosNormalizados)) {
        $stmtPago = $pdo->prepare(
            "INSERT INTO venta_pagos (venta_id, metodo_pago, monto, referencia)
             VALUES (:venta_id, :metodo_pago, :monto, :referencia)"
        );
        foreach ($pagosNormalizados as $pago) {
            $stmtPago->execute([
                ':venta_id'    => $nuevoId,
                ':metodo_pago' => $pago['metodo_pago'],
                ':monto'       => $pago['monto'],
                ':referencia'  => $pago['referencia'],
            ]);
        }
    }

    if ($saldoFavorAplicado > 0.001) {
        $consumido = consumirSaldoFavorCliente(
            $pdo,
            $cliente_id,
            $saldoFavorAplicado,
            $nuevoId,
            $fecha_venta
        );
        if ($consumido + 0.01 < $saldoFavorAplicado) {
            throw new RuntimeException('No se pudo aplicar todo el saldo a favor indicado.');
        }
    }

    $pdo->commit();

    http_response_code(201);
    echo json_encode([
        'success'               => true,
        'id'                    => $nuevoId,
        'saldo_favor_aplicado'  => $saldoFavorAplicado > 0.001 ? $saldoFavorAplicado : null,
        'message'               => 'Venta registrada correctamente.',
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
