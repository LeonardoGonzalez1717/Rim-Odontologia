<?php
// =============================================================================
// clientes.php — CRUD completo para la tabla `clientes`
// Métodos:
//   GET    → Lista todos los clientes (activos e inactivos)
//   POST   → Crea un nuevo cliente
//   PUT    → Actualiza cédula, nombre y teléfono
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

    if ($method === 'GET') {
        $stmt = $pdo->query(
            "SELECT id, cedula, nombre, telefono, estado
             FROM clientes
             ORDER BY nombre ASC"
        );
        $clientes = array_map(
            fn($c) => [...$c, 'id' => (int) $c['id']],
            $stmt->fetchAll()
        );

        echo json_encode(['success' => true, 'clientes' => $clientes]);
        exit;
    }

    $body  = file_get_contents('php://input');
    $datos = json_decode($body, true);

    if (json_last_error() !== JSON_ERROR_NONE) {
        http_response_code(400);
        echo json_encode(['success' => false, 'message' => 'JSON inválido.']);
        exit;
    }

    if ($method === 'POST') {
        $cedula   = trim($datos['cedula']   ?? '');
        $nombre   = trim($datos['nombre']   ?? '');
        $telefono = trim($datos['telefono'] ?? '');

        if (empty($cedula)) {
            http_response_code(400);
            echo json_encode(['success' => false, 'message' => 'El campo "cedula" es requerido.']);
            exit;
        }

        if (empty($nombre)) {
            http_response_code(400);
            echo json_encode(['success' => false, 'message' => 'El campo "nombre" es requerido.']);
            exit;
        }

        $stmt = $pdo->prepare(
            "INSERT INTO clientes (cedula, nombre, telefono, estado)
             VALUES (:cedula, :nombre, :telefono, 'activo')"
        );
        $stmt->execute([
            ':cedula'   => $cedula,
            ':nombre'   => $nombre,
            ':telefono' => $telefono ?: null,
        ]);
        $id = (int) $pdo->lastInsertId();

        http_response_code(201);
        echo json_encode([
            'success' => true,
            'id'      => $id,
            'message' => "Cliente '$nombre' creado correctamente.",
        ]);
        exit;
    }

    if ($method === 'PUT') {
        $id       = (int) ($datos['id'] ?? 0);
        $cedula   = trim($datos['cedula']   ?? '');
        $nombre   = trim($datos['nombre']   ?? '');
        $telefono = trim($datos['telefono'] ?? '');

        if ($id <= 0 || empty($cedula) || empty($nombre)) {
            http_response_code(400);
            echo json_encode(['success' => false, 'message' => 'ID, cédula y nombre son requeridos.']);
            exit;
        }

        $stmt = $pdo->prepare(
            "UPDATE clientes
             SET cedula = :cedula, nombre = :nombre, telefono = :telefono
             WHERE id = :id"
        );
        $stmt->execute([
            ':cedula'   => $cedula,
            ':nombre'   => $nombre,
            ':telefono' => $telefono ?: null,
            ':id'       => $id,
        ]);

        if ($stmt->rowCount() === 0) {
            http_response_code(404);
            echo json_encode(['success' => false, 'message' => "No se encontró el cliente con ID $id."]);
            exit;
        }

        echo json_encode(['success' => true, 'message' => 'Cliente actualizado correctamente.']);
        exit;
    }

    if ($method === 'PATCH') {
        $id = (int) ($datos['id'] ?? 0);

        if ($id <= 0) {
            http_response_code(400);
            echo json_encode(['success' => false, 'message' => 'El campo "id" es requerido.']);
            exit;
        }

        $stmtCheck = $pdo->prepare("SELECT estado FROM clientes WHERE id = :id LIMIT 1");
        $stmtCheck->execute([':id' => $id]);
        $cliente = $stmtCheck->fetch();

        if (!$cliente) {
            http_response_code(404);
            echo json_encode(['success' => false, 'message' => "Cliente con ID $id no encontrado."]);
            exit;
        }

        $nuevoEstado = $cliente['estado'] === 'activo' ? 'inactivo' : 'activo';

        $stmt = $pdo->prepare("UPDATE clientes SET estado = :estado WHERE id = :id");
        $stmt->execute([':estado' => $nuevoEstado, ':id' => $id]);

        echo json_encode([
            'success'      => true,
            'nuevo_estado' => $nuevoEstado,
            'message'      => "Cliente marcado como '$nuevoEstado'.",
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
