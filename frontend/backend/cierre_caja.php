<?php
// =============================================================================
// cierre_caja.php — Reporte de Cierre de Caja por Fecha y Métodos de Pago
// Método: GET
// Parámetros:
//   - fecha: YYYY-MM-DD (por defecto hoy)
//   - usuario_id: opcional (filtrar por usuario/cajero)
// =============================================================================

header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');
header('Content-Type: application/json; charset=utf-8');

if (($_SERVER['REQUEST_METHOD'] ?? '') === 'OPTIONS') {
    http_response_code(200);
    exit;
}

require_once 'conexion.php';
require_once 'venta_helpers.php';

try {
    $pdo = obtenerConexion();

    $infoInternet = obtenerFechaHoraInternet();
    $fecha = trim($_GET['fecha'] ?? $infoInternet['fecha']);
    if (!preg_match('/^\d{4}-\d{2}-\d{2}$/', $fecha)) {
        http_response_code(400);
        echo json_encode(['success' => false, 'message' => 'Formato de fecha inválido. Use YYYY-MM-DD.']);
        exit;
    }

    $usuarioId = isset($_GET['usuario_id']) && (int)$_GET['usuario_id'] > 0
        ? (int)$_GET['usuario_id']
        : null;

    $whereVentas = " WHERE DATE(v.fecha_venta) = :fecha AND v.estado = 'completada'";
    if ($usuarioId !== null) {
        $whereVentas .= " AND v.usuario_id = :usuario_id";
    }

    // 1. Obtener todas las ventas completadas del día
    $stmtVentas = $pdo->prepare(
        "SELECT
            v.id,
            TIME_FORMAT(v.fecha_venta, '%H:%i') AS hora,
            v.fecha_venta,
            v.total,
            COALESCE(v.monto_caja, v.total) AS monto_caja,
            v.cashea,
            v.saldo_favor_aplicado,
            d.nombre AS doctor,
            c.nombre AS cliente,
            c.cedula AS cliente_cedula,
            u.nombre AS usuario_nombre
         FROM ventas v
         INNER JOIN doctores d ON v.doctor_id = d.id
         LEFT JOIN clientes c ON v.cliente_id = c.id
         LEFT JOIN usuarios u ON v.usuario_id = u.id
         $whereVentas
         ORDER BY v.fecha_venta DESC"
    );
    $paramsVentas = [':fecha' => $fecha];
    if ($usuarioId !== null) {
        $paramsVentas[':usuario_id'] = $usuarioId;
    }
    $stmtVentas->execute($paramsVentas);
    $ventas = $stmtVentas->fetchAll();

    // Enriquecer ventas con tratamientos y pagos
    $ventas = enriquecerVentasConServicios($pdo, $ventas);
    $ventas = enriquecerVentasConPagos($pdo, $ventas);

    // 2. Acumular ingresos por método de pago, por asistente y construir lista plana de transacciones
    $totalesPorMetodo = [];
    $totalesPorUsuario = [];
    $transacciones = [];
    $totalCajaVentas = 0;

    foreach ($ventas as $v) {
        $montoCajaVenta = (float)$v['monto_caja'];
        $totalCajaVentas += $montoCajaVenta;
        $serviciosNombres = !empty($v['servicios'])
            ? implode(', ', array_map(fn($s) => $s['nombre'], $v['servicios']))
            : ($v['servicio'] ?? 'Tratamiento');

        $uId = !empty($v['usuario_id']) ? (int)$v['usuario_id'] : 0;
        $uNombre = $v['usuario_nombre'] ?: 'Sin asignar / Administrador';

        if (!isset($totalesPorUsuario[$uId])) {
            $totalesPorUsuario[$uId] = [
                'usuario_id'     => $uId,
                'usuario_nombre' => $uNombre,
                'total_caja'     => 0,
                'total_ventas'   => 0,
                'metodos'        => [],
            ];
        }
        $totalesPorUsuario[$uId]['total_caja'] += $montoCajaVenta;
        $totalesPorUsuario[$uId]['total_ventas'] += 1;

        // Si la venta tiene pagos desglosados en venta_pagos
        if (!empty($v['pagos'])) {
            foreach ($v['pagos'] as $p) {
                $metodo = $p['metodo_pago'] ?: 'Efectivo ($)';
                $monto = (float)$p['monto'];
                $ref = $p['referencia'] ?? null;

                // Total global por método
                if (!isset($totalesPorMetodo[$metodo])) {
                    $totalesPorMetodo[$metodo] = ['total' => 0, 'cantidad' => 0];
                }
                $totalesPorMetodo[$metodo]['total'] += $monto;
                $totalesPorMetodo[$metodo]['cantidad'] += 1;

                // Total del usuario por método
                if (!isset($totalesPorUsuario[$uId]['metodos'][$metodo])) {
                    $totalesPorUsuario[$uId]['metodos'][$metodo] = ['total' => 0, 'cantidad' => 0];
                }
                $totalesPorUsuario[$uId]['metodos'][$metodo]['total'] += $monto;
                $totalesPorUsuario[$uId]['metodos'][$metodo]['cantidad'] += 1;

                $transacciones[] = [
                    'venta_id'       => (int)$v['id'],
                    'hora'           => $v['hora'],
                    'cliente'        => $v['cliente'] ?: '—',
                    'cliente_cedula' => $v['cliente_cedula'] ?: null,
                    'doctor'         => $v['doctor'],
                    'tratamientos'   => $serviciosNombres,
                    'metodo_pago'    => $metodo,
                    'monto'          => $monto,
                    'referencia'     => $ref,
                    'usuario_id'     => $uId,
                    'usuario'        => $v['usuario_nombre'] ?: 'Sin asignar',
                    'cashea'         => (bool)$v['cashea'],
                ];
            }
        } elseif ($montoCajaVenta > 0) {
            // Venta antigua sin desglose en venta_pagos: se asigna a Efectivo ($)
            $metodo = 'Efectivo ($)';
            if (!isset($totalesPorMetodo[$metodo])) {
                $totalesPorMetodo[$metodo] = ['total' => 0, 'cantidad' => 0];
            }
            $totalesPorMetodo[$metodo]['total'] += $montoCajaVenta;
            $totalesPorMetodo[$metodo]['cantidad'] += 1;

            if (!isset($totalesPorUsuario[$uId]['metodos'][$metodo])) {
                $totalesPorUsuario[$uId]['metodos'][$metodo] = ['total' => 0, 'cantidad' => 0];
            }
            $totalesPorUsuario[$uId]['metodos'][$metodo]['total'] += $montoCajaVenta;
            $totalesPorUsuario[$uId]['metodos'][$metodo]['cantidad'] += 1;

            $transacciones[] = [
                'venta_id'       => (int)$v['id'],
                'hora'           => $v['hora'],
                'cliente'        => $v['cliente'] ?: '—',
                'cliente_cedula' => $v['cliente_cedula'] ?: null,
                'doctor'         => $v['doctor'],
                'tratamientos'   => $serviciosNombres,
                'metodo_pago'    => $metodo,
                'monto'          => $montoCajaVenta,
                'referencia'     => null,
                'usuario_id'     => $uId,
                'usuario'        => $v['usuario_nombre'] ?: 'Sin asignar',
                'cashea'         => (bool)$v['cashea'],
            ];
        }
    }

    // Convertir métodos de cada usuario a lista
    $resumenUsuarios = [];
    foreach ($totalesPorUsuario as $uId => $uData) {
        $metodosU = [];
        foreach ($uData['metodos'] as $nMetodo => $infoMetodo) {
            $metodosU[] = [
                'metodo_pago' => $nMetodo,
                'total'       => round($infoMetodo['total'], 2),
                'cantidad'    => $infoMetodo['cantidad'],
            ];
        }
        usort($metodosU, fn($a, $b) => $b['total'] <=> $a['total']);
        $uData['metodos'] = $metodosU;
        $uData['total_caja'] = round($uData['total_caja'], 2);
        $resumenUsuarios[] = $uData;
    }
    usort($resumenUsuarios, fn($a, $b) => $b['total_caja'] <=> $a['total_caja']);

    // 3. Cuotas de Cashea registradas en caja
    $stmtCuotas = $pdo->prepare(
        "SELECT id, monto, concepto,
                TIME_FORMAT(fecha_ingreso, '%H:%i') AS hora
         FROM ajustes_cashea
         WHERE DATE(fecha_ingreso) = :fecha
         ORDER BY fecha_ingreso DESC"
    );
    $stmtCuotas->execute([':fecha' => $fecha]);
    $cuotasCashea = array_map(function ($row) {
        return [
            'id'       => (int) $row['id'],
            'monto'    => (float) $row['monto'],
            'concepto' => $row['concepto'],
            'hora'     => $row['hora'],
        ];
    }, $stmtCuotas->fetchAll());

    $ingresosCuotasCashea = array_reduce($cuotasCashea, fn($sum, $c) => $sum + $c['monto'], 0);
    $totalCajaDia = $totalCajaVentas + $ingresosCuotasCashea;

    // Si hubo cuotas Cashea, agregarlas a los métodos (o registrarlas como Cuota Cashea)
    if ($ingresosCuotasCashea > 0) {
        if (!isset($totalesPorMetodo['Cuotas Cashea'])) {
            $totalesPorMetodo['Cuotas Cashea'] = ['total' => 0, 'cantidad' => 0];
        }
        $totalesPorMetodo['Cuotas Cashea']['total'] += $ingresosCuotasCashea;
        $totalesPorMetodo['Cuotas Cashea']['cantidad'] += count($cuotasCashea);
    }

    // Formatear array de métodos ordenado por total descendente
    $metodosArray = [];
    foreach ($totalesPorMetodo as $nombreMetodo => $info) {
        $metodosArray[] = [
            'metodo_pago' => $nombreMetodo,
            'total'       => round($info['total'], 2),
            'cantidad'    => $info['cantidad'],
            'porcentaje'  => $totalCajaDia > 0 ? round(($info['total'] / $totalCajaDia) * 100, 1) : 0,
        ];
    }
    usort($metodosArray, fn($a, $b) => $b['total'] <=> $a['total']);

    // Obtener lista de asistentes para los botones de filtro
    $stmtAsistentes = $pdo->query("SELECT id, nombre, rol FROM usuarios WHERE rol = 'asistente' ORDER BY nombre ASC");
    $asistentes = $stmtAsistentes->fetchAll();

    echo json_encode([
        'success'               => true,
        'fecha'                 => $fecha,
        'total_caja'            => round($totalCajaDia, 2),
        'total_ventas'          => round($totalCajaVentas, 2),
        'total_cuotas_cashea'   => round($ingresosCuotasCashea, 2),
        'total_transacciones'   => count($transacciones),
        'total_ventas_conteo'   => count($ventas),
        'metodos'               => $metodosArray,
        'usuarios'              => $resumenUsuarios,
        'asistentes'            => $asistentes,
        'transacciones'         => $transacciones,
        'cuotas_cashea'         => $cuotasCashea,
    ]);

} catch (RuntimeException $e) {
    http_response_code(500);
    echo json_encode(['success' => false, 'message' => $e->getMessage()]);
} catch (PDOException $e) {
    http_response_code(500);
    echo json_encode(['success' => false, 'message' => 'Error de base de datos: ' . $e->getMessage()]);
} catch (Throwable $e) {
    http_response_code(500);
    echo json_encode(['success' => false, 'message' => 'Error interno: ' . $e->getMessage()]);
}
