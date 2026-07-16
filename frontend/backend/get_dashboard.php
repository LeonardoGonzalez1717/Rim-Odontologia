<?php
// =============================================================================
// get_dashboard.php — Datos del dashboard del día actual
// Método: GET
// Respuesta JSON:
//   {
//     "success": true,
//     "fecha": "2024-01-15",
//     "ingresos_dia": 1234.50,
//     "total_tratamientos": 8,
//     "ventas_por_doctor": [ { "doctor": "...", "total": 500, "cantidad": 3 }, ... ],
//     "ventas_recientes": [ { "id":1, "hora":"10:30", "doctor":"...", "servicio":"...", "servicios":[], "total":80, "estado":"completada" }, ... ]
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

require_once 'conexion.php';
require_once 'venta_helpers.php';

try {
    $pdo = obtenerConexion();

    $fecha = trim($_GET['fecha'] ?? date('Y-m-d'));
    if (!preg_match('/^\d{4}-\d{2}-\d{2}$/', $fecha)) {
        http_response_code(400);
        echo json_encode(['success' => false, 'message' => 'Formato de fecha inválido. Use YYYY-MM-DD.']);
        exit;
    }

    // 1. Suma de ingresos en caja del día (monto_caja; si no existe la columna, usar total)
    $stmtIngresos = $pdo->prepare(
        "SELECT COALESCE(SUM(COALESCE(v.monto_caja, v.total)), 0) AS ingresos_dia
         FROM ventas v
         WHERE DATE(v.fecha_venta) = :fecha
           AND v.estado = 'completada'"
    );
    $stmtIngresos->execute([':fecha' => $fecha]);
    $ingresosVentas = (float) $stmtIngresos->fetchColumn();

    $stmtCuotas = $pdo->prepare(
        "SELECT COALESCE(SUM(monto), 0) FROM ajustes_cashea WHERE DATE(fecha_ingreso) = :fecha"
    );
    $stmtCuotas->execute([':fecha' => $fecha]);
    $ingresosCuotasCashea = (float) $stmtCuotas->fetchColumn();

    $ingresosDia = $ingresosVentas + $ingresosCuotasCashea;

    // Cuotas Cashea del día (detalle para el dashboard)
    $stmtCuotasLista = $pdo->prepare(
        "SELECT id, monto, concepto,
                TIME_FORMAT(fecha_ingreso, '%H:%i') AS hora
         FROM ajustes_cashea
         WHERE DATE(fecha_ingreso) = :fecha
         ORDER BY fecha_ingreso DESC"
    );
    $stmtCuotasLista->execute([':fecha' => $fecha]);
    $cuotasCashea = array_map(function ($row) {
        return [
            'id'       => (int) $row['id'],
            'monto'    => (float) $row['monto'],
            'concepto' => $row['concepto'],
            'hora'     => $row['hora'],
        ];
    }, $stmtCuotasLista->fetchAll());

    // 2. Cantidad de tratamientos realizados hoy (líneas de detalle completadas)
    $stmtTratamientos = $pdo->prepare(
        "SELECT COUNT(vd.id) AS total_tratamientos
         FROM venta_detalles vd
         INNER JOIN ventas v ON vd.venta_id = v.id
         WHERE DATE(v.fecha_venta) = :fecha
           AND v.estado = 'completada'"
    );
    $stmtTratamientos->execute([':fecha' => $fecha]);
    $totalTratamientos = (int) $stmtTratamientos->fetchColumn();

    // 3. Desglose de ventas por doctor del día (solo 'completada')
    $stmtPorDoctor = $pdo->prepare(
        "SELECT
            d.nombre       AS doctor,
            d.especialidad AS especialidad,
            COALESCE(t.cantidad, 0) AS cantidad,
            COALESCE(tg.total, 0)   AS total
         FROM doctores d
         INNER JOIN (
            SELECT v.doctor_id, COUNT(vd.id) AS cantidad
            FROM ventas v
            INNER JOIN venta_detalles vd ON vd.venta_id = v.id
            WHERE DATE(v.fecha_venta) = :fecha
              AND v.estado = 'completada'
            GROUP BY v.doctor_id
         ) t ON t.doctor_id = d.id
         INNER JOIN (
            SELECT doctor_id, SUM(total) AS total
            FROM ventas
            WHERE DATE(fecha_venta) = :fecha2
              AND estado = 'completada'
            GROUP BY doctor_id
         ) tg ON tg.doctor_id = d.id
         ORDER BY total DESC"
    );
    $stmtPorDoctor->execute([':fecha' => $fecha, ':fecha2' => $fecha]);
    $ventasPorDoctor = array_map(function ($row) {
        return [
            'doctor'       => $row['doctor'],
            'especialidad' => $row['especialidad'],
            'cantidad'     => (int)   $row['cantidad'],
            'total'        => (float) $row['total'],
        ];
    }, $stmtPorDoctor->fetchAll());

    // 4. Últimas 10 ventas del día
    $stmtRecientes = $pdo->prepare(
        "SELECT
            v.id,
            TIME_FORMAT(v.fecha_venta, '%H:%i') AS hora,
            d.nombre                             AS doctor,
            c.nombre                             AS cliente,
            v.total,
            COALESCE(v.cashea, 0) AS cashea,
            COALESCE(v.monto_caja, v.total) AS monto_caja,
            v.descripcion_cashea,
            v.estado
         FROM ventas v
         INNER JOIN doctores d ON v.doctor_id = d.id
         LEFT JOIN clientes c ON v.cliente_id = c.id
         WHERE DATE(v.fecha_venta) = :fecha
         ORDER BY v.fecha_venta DESC
         LIMIT 10"
    );
    $stmtRecientes->execute([':fecha' => $fecha]);

    $ventasRecientes = array_map(function ($row) {
        return [
            'id'      => (int)   $row['id'],
            'hora'    => $row['hora'],
            'doctor'  => $row['doctor'],
            'cliente' => $row['cliente'],
            'total'      => (float) $row['total'],
            'cashea'             => (bool)  $row['cashea'],
            'monto_caja'         => (float) $row['monto_caja'],
            'descripcion_cashea' => $row['descripcion_cashea'],
            'estado'             => $row['estado'],
        ];
    }, $stmtRecientes->fetchAll());

    $ventasRecientes = enriquecerVentasConServicios($pdo, $ventasRecientes);
    $ventasRecientes = enriquecerVentasConDeudaCashea($pdo, $ventasRecientes);

    echo json_encode([
        'success'             => true,
        'fecha'               => $fecha,
        'ingresos_dia'        => $ingresosDia,
        'ingresos_ventas'     => $ingresosVentas,
        'ingresos_cuotas_cashea' => $ingresosCuotasCashea,
        'cuotas_cashea'       => $cuotasCashea,
        'total_tratamientos'  => $totalTratamientos,
        'ventas_por_doctor'   => $ventasPorDoctor,
        'ventas_recientes'    => $ventasRecientes,
    ]);

} catch (RuntimeException $e) {
    http_response_code(500);
    echo json_encode(['success' => false, 'message' => $e->getMessage()]);

} catch (PDOException $e) {
    http_response_code(500);
    echo json_encode(['success' => false, 'message' => 'Error al obtener el dashboard: ' . $e->getMessage()]);
}
