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
//     "ventas_recientes": [ { "id":1, "hora":"10:30", "doctor":"...", "servicio":"...", "total":80, "estado":"completada" }, ... ]
//   }
// =============================================================================

// --- Encabezados CORS y tipo de contenido ---
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');
header('Content-Type: application/json; charset=utf-8');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

require_once 'conexion.php';

try {
    $pdo = obtenerConexion();

    // Fecha a consultar (default: hoy)
    $fecha = trim($_GET['fecha'] ?? date('Y-m-d'));
    if (!preg_match('/^\d{4}-\d{2}-\d{2}$/', $fecha)) {
        http_response_code(400);
        echo json_encode(['success' => false, 'message' => 'Formato de fecha inválido. Use YYYY-MM-DD.']);
        exit;
    }

    // -------------------------------------------------------------------------
    // 1. Suma total de ingresos del día (solo ventas 'completada')
    // -------------------------------------------------------------------------
    $stmtIngresos = $pdo->prepare(
        "SELECT COALESCE(SUM(total), 0) AS ingresos_dia
         FROM ventas
         WHERE DATE(fecha_venta) = :fecha
           AND estado = 'completada'"
    );
    $stmtIngresos->execute([':fecha' => $fecha]);
    $ingresosDia = (float) $stmtIngresos->fetchColumn();

    // -------------------------------------------------------------------------
    // 2. Cantidad de tratamientos realizados hoy (solo 'completada')
    // -------------------------------------------------------------------------
    $stmtTratamientos = $pdo->prepare(
        "SELECT COUNT(*) AS total_tratamientos
         FROM ventas
         WHERE DATE(fecha_venta) = :fecha
           AND estado = 'completada'"
    );
    $stmtTratamientos->execute([':fecha' => $fecha]);
    $totalTratamientos = (int) $stmtTratamientos->fetchColumn();

    // -------------------------------------------------------------------------
    // 3. Desglose de ventas por doctor del día (solo 'completada')
    // -------------------------------------------------------------------------
    $stmtPorDoctor = $pdo->prepare(
        "SELECT
            d.nombre       AS doctor,
            d.especialidad AS especialidad,
            COUNT(v.id)    AS cantidad,
            SUM(v.total)   AS total
         FROM ventas v
         INNER JOIN doctores d ON v.doctor_id = d.id
         WHERE DATE(v.fecha_venta) = :fecha
           AND v.estado = 'completada'
         GROUP BY d.id, d.nombre, d.especialidad
         ORDER BY total DESC"
    );
    $stmtPorDoctor->execute([':fecha' => $fecha]);
    $ventasPorDoctor = $stmtPorDoctor->fetchAll();

    // Castear a tipos correctos
    $ventasPorDoctor = array_map(function ($row) {
        return [
            'doctor'       => $row['doctor'],
            'especialidad' => $row['especialidad'],
            'cantidad'     => (int)   $row['cantidad'],
            'total'        => (float) $row['total'],
        ];
    }, $ventasPorDoctor);

    // -------------------------------------------------------------------------
    // 4. Últimas 10 ventas del día (completadas + canceladas para visualizar)
    // -------------------------------------------------------------------------
    $stmtRecientes = $pdo->prepare(
        "SELECT
            v.id,
            TIME_FORMAT(v.fecha_venta, '%H:%i') AS hora,
            d.nombre                             AS doctor,
            s.nombre_servicio                    AS servicio,
            v.total,
            v.estado
         FROM ventas v
         INNER JOIN doctores d              ON v.doctor_id   = d.id
         INNER JOIN servicios_tratamientos s ON v.servicio_id = s.id
         WHERE DATE(v.fecha_venta) = :fecha
         ORDER BY v.fecha_venta DESC
         LIMIT 10"
    );
    $stmtRecientes->execute([':fecha' => $fecha]);
    $ventasRecientes = $stmtRecientes->fetchAll();

    // Castear tipos numéricos para JSON
    $ventasRecientes = array_map(function ($row) {
        return [
            'id'       => (int)   $row['id'],
            'hora'     => $row['hora'],
            'doctor'   => $row['doctor'],
            'servicio' => $row['servicio'],
            'total'    => (float) $row['total'],
            'estado'   => $row['estado'],
        ];
    }, $ventasRecientes);

    // -------------------------------------------------------------------------
    // Respuesta final consolidada
    // -------------------------------------------------------------------------
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
