<?php
// =============================================================================
// servicios.php — CRUD completo para la tabla `servicios_tratamientos`
// Métodos:
//   GET    → Lista todos los servicios (activos e inactivos)
//   POST   → Crea un nuevo servicio
//   PUT    → Actualiza nombre y precio de un servicio existente
//   PATCH  → Cambia el estado (activo ↔ inactivo)
// =============================================================================

header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, PUT, PATCH, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');
header('Content-Type: application/json; charset=utf-8');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

require_once 'conexion.php';

$method = $_SERVER['REQUEST_METHOD'];

try {
    $pdo = obtenerConexion();

    // ─────────────────────────────────────────────────────────────────────────
    // GET — Listar todos los servicios ordenados por nombre
    // ─────────────────────────────────────────────────────────────────────────
    if ($method === 'GET') {
        $stmt = $pdo->query(
            "SELECT id, nombre_servicio, precio, estado
             FROM servicios_tratamientos
             ORDER BY nombre_servicio ASC"
        );
        $servicios = $stmt->fetchAll();

        // Castear tipos numéricos
        $servicios = array_map(fn($s) => [
            'id'              => (int)   $s['id'],
            'nombre_servicio' => $s['nombre_servicio'],
            'precio'          => (float) $s['precio'],
            'estado'          => $s['estado'],
        ], $servicios);

        echo json_encode(['success' => true, 'servicios' => $servicios]);
        exit;
    }

    // Leer cuerpo JSON para POST / PUT / PATCH
    $body  = file_get_contents('php://input');
    $datos = json_decode($body, true);

    if (json_last_error() !== JSON_ERROR_NONE) {
        http_response_code(400);
        echo json_encode(['success' => false, 'message' => 'JSON inválido.']);
        exit;
    }

    // ─────────────────────────────────────────────────────────────────────────
    // POST — Crear nuevo servicio
    // Body: { "nombre_servicio": "...", "precio": 100.00 }
    // ─────────────────────────────────────────────────────────────────────────
    if ($method === 'POST') {
        $nombre = trim($datos['nombre_servicio'] ?? '');
        $precio = (float) ($datos['precio'] ?? 0);

        if (empty($nombre)) {
            http_response_code(400);
            echo json_encode(['success' => false, 'message' => 'El campo "nombre_servicio" es requerido.']);
            exit;
        }
        if ($precio < 0) {
            http_response_code(400);
            echo json_encode(['success' => false, 'message' => 'El precio no puede ser negativo.']);
            exit;
        }

        $stmt = $pdo->prepare(
            "INSERT INTO servicios_tratamientos (nombre_servicio, precio, estado)
             VALUES (:nombre, :precio, 'activo')"
        );
        $stmt->execute([':nombre' => $nombre, ':precio' => $precio]);
        $id = (int) $pdo->lastInsertId();

        http_response_code(201);
        echo json_encode([
            'success' => true,
            'id'      => $id,
            'message' => "Servicio '$nombre' creado correctamente.",
        ]);
        exit;
    }

    // ─────────────────────────────────────────────────────────────────────────
    // PUT — Actualizar nombre y precio
    // Body: { "id": 1, "nombre_servicio": "...", "precio": 150.00 }
    // ─────────────────────────────────────────────────────────────────────────
    if ($method === 'PUT') {
        $id     = (int)   ($datos['id']              ?? 0);
        $nombre = trim($datos['nombre_servicio'] ?? '');
        $precio = (float) ($datos['precio']          ?? 0);

        if ($id <= 0 || empty($nombre)) {
            http_response_code(400);
            echo json_encode(['success' => false, 'message' => 'ID y nombre son requeridos.']);
            exit;
        }

        $stmt = $pdo->prepare(
            "UPDATE servicios_tratamientos
             SET nombre_servicio = :nombre, precio = :precio
             WHERE id = :id"
        );
        $stmt->execute([':nombre' => $nombre, ':precio' => $precio, ':id' => $id]);

        if ($stmt->rowCount() === 0) {
            http_response_code(404);
            echo json_encode(['success' => false, 'message' => "No se encontró el servicio con ID $id."]);
            exit;
        }

        echo json_encode(['success' => true, 'message' => 'Servicio actualizado correctamente.']);
        exit;
    }

    // ─────────────────────────────────────────────────────────────────────────
    // PATCH — Cambiar estado (activo ↔ inactivo)
    // Body: { "id": 1 }
    // ─────────────────────────────────────────────────────────────────────────
    if ($method === 'PATCH') {
        $id = (int) ($datos['id'] ?? 0);

        if ($id <= 0) {
            http_response_code(400);
            echo json_encode(['success' => false, 'message' => 'El campo "id" es requerido.']);
            exit;
        }

        $stmtCheck = $pdo->prepare("SELECT estado FROM servicios_tratamientos WHERE id = :id LIMIT 1");
        $stmtCheck->execute([':id' => $id]);
        $servicio = $stmtCheck->fetch();

        if (!$servicio) {
            http_response_code(404);
            echo json_encode(['success' => false, 'message' => "Servicio con ID $id no encontrado."]);
            exit;
        }

        $nuevoEstado = $servicio['estado'] === 'activo' ? 'inactivo' : 'activo';

        $stmt = $pdo->prepare("UPDATE servicios_tratamientos SET estado = :estado WHERE id = :id");
        $stmt->execute([':estado' => $nuevoEstado, ':id' => $id]);

        echo json_encode([
            'success'      => true,
            'nuevo_estado' => $nuevoEstado,
            'message'      => "Servicio marcado como '$nuevoEstado'.",
        ]);
        exit;
    }

    http_response_code(405);
    echo json_encode(['success' => false, 'message' => 'Método no permitido.']);

} catch (RuntimeException $e) {
    http_response_code(500);
    echo json_encode(['success' => false, 'message' => $e->getMessage()]);
} catch (PDOException $e) {
    http_response_code(500);
    echo json_encode(['success' => false, 'message' => 'Error de base de datos: ' . $e->getMessage()]);
}
