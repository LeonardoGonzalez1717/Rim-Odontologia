<?php
// =============================================================================
// get_data.php — Devuelve doctores y servicios activos para los selectores
// Método: GET
// Respuesta: JSON { "doctores": [...], "servicios": [...] }
// =============================================================================

// --- Encabezados CORS y tipo de contenido ---
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');
header('Content-Type: application/json; charset=utf-8');

// Responder inmediatamente a las solicitudes preflight de CORS
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

require_once 'conexion.php';

try {
    $pdo = obtenerConexion();

    // --- Consulta de doctores activos ---
    $stmtDoctores = $pdo->query(
        "SELECT id, nombre, especialidad
         FROM doctores
         WHERE estado = 'activo'
         ORDER BY nombre ASC"
    );
    $doctores = $stmtDoctores->fetchAll();

    // --- Consulta de servicios activos ---
    $stmtServicios = $pdo->query(
        "SELECT id, nombre_servicio, precio
         FROM servicios_tratamientos
         WHERE estado = 'activo'
         ORDER BY nombre_servicio ASC"
    );
    $servicios = $stmtServicios->fetchAll();

    // --- Consulta de clientes activos + flag de deuda Cashea ---
    // Un cliente "tiene deuda" si tiene al menos una venta con cashea=1,
    // estado=completada, y (total - monto_caja - abonos_posteriores) > 0.
    $stmtClientes = $pdo->query(
        "SELECT
            c.id,
            c.cedula,
            c.nombre,
            c.telefono,
            EXISTS (
              SELECT 1 FROM ventas v
              WHERE v.cliente_id = c.id
                AND v.cashea     = 1
                AND v.estado     = 'completada'
                AND (v.total - v.monto_caja - COALESCE(
                      (SELECT SUM(a.monto)
                       FROM ajustes_cashea a
                       WHERE a.concepto LIKE CONCAT('Abono Cashea – venta #', v.id, ' –%')
                      ), 0
                    )) > 0.001
            ) AS tiene_deuda_cashea
         FROM clientes c
         WHERE c.estado = 'activo'
         ORDER BY c.nombre ASC"
    );
    $clientes = array_map(
        fn($c) => [...$c, 'tiene_deuda_cashea' => (bool) $c['tiene_deuda_cashea']],
        $stmtClientes->fetchAll()
    );

    // --- Respuesta exitosa ---
    echo json_encode([
        'success'   => true,
        'doctores'  => $doctores,
        'servicios' => $servicios,
        'clientes'  => $clientes,
    ]);

} catch (RuntimeException $e) {
    // Error de conexión
    http_response_code(500);
    echo json_encode(['success' => false, 'message' => $e->getMessage()]);

} catch (PDOException $e) {
    // Error de consulta
    http_response_code(500);
    echo json_encode(['success' => false, 'message' => 'Error al obtener los datos: ' . $e->getMessage()]);
}
