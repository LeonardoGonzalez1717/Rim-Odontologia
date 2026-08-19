<?php
// =============================================================================
// metodos_pago.php — CRUD completo para la tabla `metodos_pago`
// Métodos:
//   GET    → Lista todos los métodos de pago ordenados
//   POST   → Crea un nuevo método de pago
//   PUT    → Actualiza nombre y/o orden de un método
//   PATCH  → Cambia el estado (activo ↔ inactivo)
//   DELETE → Elimina un método (si no tiene ventas asociadas)
// =============================================================================

header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, PUT, PATCH, DELETE, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');
header('Content-Type: application/json; charset=utf-8');

if (($_SERVER['REQUEST_METHOD'] ?? '') === 'OPTIONS') {
    http_response_code(200);
    exit;
}

require_once 'conexion.php';

$method = obtenerMetodoHttp();

try {
    $pdo = obtenerConexion();

    // ─────────────────────────────────────────────────────────────────────────
    // GET — Listar todos los métodos de pago ordenados
    // ─────────────────────────────────────────────────────────────────────────
    if ($method === 'GET') {
        $stmt = $pdo->query(
            "SELECT id, nombre, estado, orden
             FROM metodos_pago
             ORDER BY orden ASC, id ASC"
        );
        $metodos = $stmt->fetchAll();

        $metodos = array_map(fn($m) => [
            'id'     => (int)$m['id'],
            'nombre' => $m['nombre'],
            'estado' => $m['estado'],
            'orden'  => (int)$m['orden'],
        ], $metodos);

        echo json_encode(['success' => true, 'metodos' => $metodos]);
        exit;
    }

    // Leer cuerpo JSON para POST / PUT / PATCH / DELETE
    $body  = defined('CACHED_BODY') ? CACHED_BODY : file_get_contents('php://input');
    $datos = json_decode($body, true);

    if (json_last_error() !== JSON_ERROR_NONE) {
        http_response_code(400);
        echo json_encode(['success' => false, 'message' => 'JSON inválido.']);
        exit;
    }

    // ─────────────────────────────────────────────────────────────────────────
    // POST — Crear nuevo método de pago
    // Body: { "nombre": "..." }
    // ─────────────────────────────────────────────────────────────────────────
    if ($method === 'POST') {
        $nombre = trim($datos['nombre'] ?? '');
        if ($nombre === '') {
            http_response_code(400);
            echo json_encode(['success' => false, 'message' => 'El nombre no puede estar vacío.']);
            exit;
        }
        if (mb_strlen($nombre) > 80) {
            http_response_code(400);
            echo json_encode(['success' => false, 'message' => 'El nombre no puede superar 80 caracteres.']);
            exit;
        }

        // Verificar duplicado
        $dup = $pdo->prepare("SELECT id FROM metodos_pago WHERE LOWER(nombre) = LOWER(:n) LIMIT 1");
        $dup->execute([':n' => $nombre]);
        if ($dup->fetch()) {
            http_response_code(409);
            echo json_encode(['success' => false, 'message' => 'Ya existe un método de pago con ese nombre.']);
            exit;
        }

        $maxOrden = $pdo->query("SELECT MAX(orden) FROM metodos_pago")->fetchColumn();
        $orden = intval($maxOrden) + 1;

        $stmt = $pdo->prepare("INSERT INTO metodos_pago (nombre, estado, orden) VALUES (:n, 'activo', :o)");
        $stmt->execute([':n' => $nombre, ':o' => $orden]);
        $nuevoId = (int)$pdo->lastInsertId();

        http_response_code(201);
        echo json_encode([
            'success' => true,
            'id'      => $nuevoId,
            'message' => 'Método de pago creado correctamente.',
        ]);
        exit;
    }

    // ─────────────────────────────────────────────────────────────────────────
    // PUT — Editar nombre / orden
    // Body: { "id": 1, "nombre": "..." }
    // ─────────────────────────────────────────────────────────────────────────
    if ($method === 'PUT') {
        $id     = intval($datos['id'] ?? 0);
        $nombre = trim($datos['nombre'] ?? '');

        if ($id <= 0) {
            http_response_code(400);
            echo json_encode(['success' => false, 'message' => 'ID de método inválido.']);
            exit;
        }
        if ($nombre === '') {
            http_response_code(400);
            echo json_encode(['success' => false, 'message' => 'El nombre no puede estar vacío.']);
            exit;
        }
        if (mb_strlen($nombre) > 80) {
            http_response_code(400);
            echo json_encode(['success' => false, 'message' => 'El nombre no puede superar 80 caracteres.']);
            exit;
        }

        // Verificar existencia
        $check = $pdo->prepare("SELECT id FROM metodos_pago WHERE id = :id");
        $check->execute([':id' => $id]);
        if (!$check->fetch()) {
            http_response_code(404);
            echo json_encode(['success' => false, 'message' => 'Método de pago no encontrado.']);
            exit;
        }

        // Verificar duplicado
        $dup = $pdo->prepare("SELECT id FROM metodos_pago WHERE LOWER(nombre) = LOWER(:n) AND id != :id LIMIT 1");
        $dup->execute([':n' => $nombre, ':id' => $id]);
        if ($dup->fetch()) {
            http_response_code(409);
            echo json_encode(['success' => false, 'message' => 'Ya existe otro método de pago con ese nombre.']);
            exit;
        }

        $orden = isset($datos['orden']) ? intval($datos['orden']) : null;
        if ($orden !== null) {
            $stmt = $pdo->prepare("UPDATE metodos_pago SET nombre = :n, orden = :o WHERE id = :id");
            $stmt->execute([':n' => $nombre, ':o' => $orden, ':id' => $id]);
        } else {
            $stmt = $pdo->prepare("UPDATE metodos_pago SET nombre = :n WHERE id = :id");
            $stmt->execute([':n' => $nombre, ':id' => $id]);
        }

        echo json_encode(['success' => true, 'message' => 'Método de pago actualizado correctamente.']);
        exit;
    }

    // ─────────────────────────────────────────────────────────────────────────
    // PATCH — Toggle activo / inactivo
    // Body: { "id": 1 }
    // ─────────────────────────────────────────────────────────────────────────
    if ($method === 'PATCH') {
        $id = intval($datos['id'] ?? 0);
        if ($id <= 0) {
            http_response_code(400);
            echo json_encode(['success' => false, 'message' => 'ID inválido.']);
            exit;
        }

        $stmt = $pdo->prepare("SELECT estado FROM metodos_pago WHERE id = :id");
        $stmt->execute([':id' => $id]);
        $row = $stmt->fetch();
        if (!$row) {
            http_response_code(404);
            echo json_encode(['success' => false, 'message' => 'Método de pago no encontrado.']);
            exit;
        }

        $nuevoEstado = ($row['estado'] === 'activo') ? 'inactivo' : 'activo';
        $update = $pdo->prepare("UPDATE metodos_pago SET estado = :e WHERE id = :id");
        $update->execute([':e' => $nuevoEstado, ':id' => $id]);

        echo json_encode([
            'success' => true,
            'estado'  => $nuevoEstado,
            'message' => $nuevoEstado === 'activo' ? 'Método activado.' : 'Método desactivado.',
        ]);
        exit;
    }

    // ─────────────────────────────────────────────────────────────────────────
    // DELETE — Eliminar método de pago
    // Body: { "id": 1 }
    // ─────────────────────────────────────────────────────────────────────────
    if ($method === 'DELETE') {
        $id = intval($datos['id'] ?? 0);
        if ($id <= 0) {
            http_response_code(400);
            echo json_encode(['success' => false, 'message' => 'ID inválido.']);
            exit;
        }

        // Obtener nombre del método
        $stmtMetodo = $pdo->prepare("SELECT nombre FROM metodos_pago WHERE id = :id");
        $stmtMetodo->execute([':id' => $id]);
        $metodo = $stmtMetodo->fetch();

        if (!$metodo) {
            http_response_code(404);
            echo json_encode(['success' => false, 'message' => 'Método de pago no encontrado.']);
            exit;
        }

        // Verificar si tiene ventas registradas en venta_pagos
        $stmtUso = $pdo->prepare("SELECT COUNT(*) FROM venta_pagos WHERE metodo_pago = :n");
        $stmtUso->execute([':n' => $metodo['nombre']]);
        $numVentas = (int)$stmtUso->fetchColumn();

        if ($numVentas > 0) {
            http_response_code(409);
            echo json_encode([
                'success' => false,
                'message' => "No se puede eliminar '{$metodo['nombre']}' porque está registrado en {$numVentas} pago(s) de ventas. Puedes desactivarlo en su lugar.",
            ]);
            exit;
        }

        $del = $pdo->prepare("DELETE FROM metodos_pago WHERE id = :id");
        $del->execute([':id' => $id]);

        echo json_encode(['success' => true, 'message' => 'Método de pago eliminado correctamente.']);
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
} catch (Throwable $e) {
    http_response_code(500);
    echo json_encode(['success' => false, 'message' => 'Error interno: ' . $e->getMessage()]);
}
