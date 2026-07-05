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

    // --- Respuesta exitosa ---
    echo json_encode([
        'success'  => true,
        'doctores' => $doctores,
        'servicios' => $servicios,
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
