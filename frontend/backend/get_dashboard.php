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

    // 1. Suma total de ingresos del día (solo ventas 'completada')
    $stmtIngresos = $pdo->prepare(
        "SELECT COALESCE(SUM(total), 0) AS ingresos_dia
         FROM ventas
         WHERE DATE(fecha_venta) = :fecha
           AND estado = 'completada'"
    );
    $stmtIngresos->execute([':fecha' => $fecha]);
    $ingresosDia = (float) $stmtIngresos->fetchColumn();

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
            v.total,
            v.estado
         FROM ventas v
         INNER JOIN doctores d ON v.doctor_id = d.id
         WHERE DATE(v.fecha_venta) = :fecha
         ORDER BY v.fecha_venta DESC
         LIMIT 10"
    );
    $stmtRecientes->execute([':fecha' => $fecha]);

    $ventasRecientes = array_map(function ($row) {
        return [
            'id'     => (int)   $row['id'],
            'hora'   => $row['hora'],
            'doctor' => $row['doctor'],
            'total'  => (float) $row['total'],
            'estado' => $row['estado'],
        ];
    }, $stmtRecientes->fetchAll());

    $ventasRecientes = enriquecerVentasConServicios($pdo, $ventasRecientes);

    echo json_encode([
        'success'             => true,
        'fecha'               => $fecha,
        'ingresos_dia'        => $ingresosDia,
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
