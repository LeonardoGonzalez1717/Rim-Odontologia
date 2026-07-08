<?php
// =============================================================================
// doctores.php — CRUD completo para la tabla `doctores`
// Métodos:
//   GET    → Lista todos los doctores (activos e inactivos)
//   POST   → Crea un nuevo doctor
//   PUT    → Actualiza cédula, nombre y especialidad de un doctor existente
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
require_once 'persona_validacion.php';

$method = $_SERVER['REQUEST_METHOD'];

try {
    $pdo = obtenerConexion();

    // ─────────────────────────────────────────────────────────────────────────
    // GET — Listar todos los doctores ordenados por nombre
    // ─────────────────────────────────────────────────────────────────────────
    if ($method === 'GET') {
        $stmt = $pdo->query(
            "SELECT id, cedula, nombre, especialidad, estado
             FROM doctores
             ORDER BY nombre ASC"
        );
        $doctores = $stmt->fetchAll();

        // Castear id
        $doctores = array_map(fn($d) => [...$d, 'id' => (int)$d['id']], $doctores);

        echo json_encode(['success' => true, 'doctores' => $doctores]);
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
    // POST — Crear nuevo doctor
    // Body: { "cedula": "...", "nombre": "...", "especialidad": "..." }
    // ─────────────────────────────────────────────────────────────────────────
    if ($method === 'POST') {
        $cedula       = $datos['cedula']       ?? '';
        $nombre       = $datos['nombre']       ?? '';
        $especialidad = $datos['especialidad'] ?? 'Odontología General';

        $errorValidacion = validarDatosDoctor($cedula, $nombre, $especialidad);
        if ($errorValidacion !== null) {
            http_response_code(400);
            echo json_encode(['success' => false, 'message' => $errorValidacion]);
            exit;
        }

        $normalizado = normalizarDatosDoctor($cedula, $nombre, $especialidad);

        $stmt = $pdo->prepare(
            "INSERT INTO doctores (cedula, nombre, especialidad, estado)
             VALUES (:cedula, :nombre, :especialidad, 'activo')"
        );
        $stmt->execute([
            ':cedula'       => $normalizado['cedula'],
            ':nombre'       => $normalizado['nombre'],
            ':especialidad' => $normalizado['especialidad'],
        ]);
        $id = (int) $pdo->lastInsertId();

        http_response_code(201);
        echo json_encode([
            'success' => true,
            'id'      => $id,
            'message' => "Doctor '{$normalizado['nombre']}' creado correctamente.",
        ]);
        exit;
    }

    // ─────────────────────────────────────────────────────────────────────────
    // PUT — Actualizar cédula, nombre y especialidad
    // Body: { "id": 1, "cedula": "...", "nombre": "...", "especialidad": "..." }
    // ─────────────────────────────────────────────────────────────────────────
    if ($method === 'PUT') {
        $id           = (int) ($datos['id'] ?? 0);
        $cedula       = $datos['cedula']       ?? '';
        $nombre       = $datos['nombre']       ?? '';
        $especialidad = $datos['especialidad'] ?? '';

        if ($id <= 0) {
            http_response_code(400);
            echo json_encode(['success' => false, 'message' => 'El ID del doctor es requerido.']);
            exit;
        }

        $errorValidacion = validarDatosDoctor($cedula, $nombre, $especialidad);
        if ($errorValidacion !== null) {
            http_response_code(400);
            echo json_encode(['success' => false, 'message' => $errorValidacion]);
            exit;
        }

        $normalizado = normalizarDatosDoctor($cedula, $nombre, $especialidad);

        $stmt = $pdo->prepare(
            "UPDATE doctores
             SET cedula = :cedula, nombre = :nombre, especialidad = :especialidad
             WHERE id = :id"
        );
        $stmt->execute([
            ':cedula'       => $normalizado['cedula'],
            ':nombre'       => $normalizado['nombre'],
            ':especialidad' => $normalizado['especialidad'],
            ':id'           => $id,
        ]);

        if ($stmt->rowCount() === 0) {
            http_response_code(404);
            echo json_encode(['success' => false, 'message' => "No se encontró el doctor con ID $id."]);
            exit;
        }

        echo json_encode(['success' => true, 'message' => 'Doctor actualizado correctamente.']);
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

        // Obtener estado actual para invertirlo
        $stmtCheck = $pdo->prepare("SELECT estado FROM doctores WHERE id = :id LIMIT 1");
        $stmtCheck->execute([':id' => $id]);
        $doctor = $stmtCheck->fetch();

        if (!$doctor) {
            http_response_code(404);
            echo json_encode(['success' => false, 'message' => "Doctor con ID $id no encontrado."]);
            exit;
        }

        $nuevoEstado = $doctor['estado'] === 'activo' ? 'inactivo' : 'activo';

        $stmt = $pdo->prepare("UPDATE doctores SET estado = :estado WHERE id = :id");
        $stmt->execute([':estado' => $nuevoEstado, ':id' => $id]);

        echo json_encode([
            'success'      => true,
            'nuevo_estado' => $nuevoEstado,
            'message'      => "Doctor marcado como '$nuevoEstado'.",
        ]);
        exit;
    }

    // Método no soportado
    http_response_code(405);
    echo json_encode(['success' => false, 'message' => 'Método no permitido.']);

} catch (RuntimeException $e) {
    http_response_code(500);
    echo json_encode(['success' => false, 'message' => $e->getMessage()]);
} catch (PDOException $e) {
    http_response_code(500);
    echo json_encode(['success' => false, 'message' => 'Error de base de datos: ' . $e->getMessage()]);
}
