<?php
// =============================================================================
// usuarios.php — CRUD de usuarios del sistema (solo administración)
// Métodos:
//   GET    → Lista todos los usuarios (sin contraseña ni PIN)
//   POST   → Crea un nuevo usuario
//   PUT    → Actualiza nombre, rol, contraseña y/o PIN
//   DELETE → Elimina un usuario por ID
// =============================================================================

header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');
header('Content-Type: application/json; charset=utf-8');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

require_once 'conexion.php';

$method = $_SERVER['REQUEST_METHOD'];

function responderError(int $codigo, string $mensaje): void {
    http_response_code($codigo);
    echo json_encode(['success' => false, 'message' => $mensaje]);
    exit;
}

function validarRol(string $rol): bool {
    return in_array($rol, ['admin', 'asistente'], true);
}

function validarFormatoPin(string $pin): bool {
    return preg_match('/^\d{4,6}$/', $pin) === 1;
}

function hashPin(string $pin): string {
    return password_hash($pin, PASSWORD_BCRYPT);
}

try {
    $pdo = obtenerConexion();

    if ($method === 'GET') {
        $stmt = $pdo->query(
            "SELECT id, username, nombre, rol, pin, created_at
             FROM usuarios
             ORDER BY nombre ASC"
        );
        $usuarios = $stmt->fetchAll();

        $usuarios = array_map(function ($u) {
            return [
                'id'         => (int) $u['id'],
                'username'   => $u['username'],
                'nombre'     => $u['nombre'],
                'rol'        => $u['rol'],
                'tiene_pin'  => $u['rol'] === 'admin' && !empty($u['pin']),
                'created_at' => $u['created_at'],
            ];
        }, $usuarios);

        echo json_encode(['success' => true, 'usuarios' => $usuarios]);
        exit;
    }

    $body  = file_get_contents('php://input');
    $datos = json_decode($body, true);

    if (json_last_error() !== JSON_ERROR_NONE) {
        responderError(400, 'JSON inválido.');
    }

    if ($method === 'POST') {
        $username = trim($datos['username'] ?? '');
        $password = $datos['password'] ?? '';
        $nombre   = trim($datos['nombre']   ?? '');
        $rol      = trim($datos['rol']      ?? 'asistente');
        $pin      = trim($datos['pin']      ?? '');

        if (empty($username) || empty($password) || empty($nombre)) {
            responderError(400, 'Usuario, contraseña y nombre son requeridos.');
        }

        if (strlen($username) < 3) {
            responderError(400, 'El usuario debe tener al menos 3 caracteres.');
        }

        if (strlen($password) < 4) {
            responderError(400, 'La contraseña debe tener al menos 4 caracteres.');
        }

        if (!validarRol($rol)) {
            responderError(400, 'Rol inválido. Use "admin" o "asistente".');
        }

        if ($rol === 'admin') {
            if ($pin === '') {
                responderError(400, 'El PIN es requerido para administradores.');
            }
            if (!validarFormatoPin($pin)) {
                responderError(400, 'El PIN debe tener entre 4 y 6 dígitos numéricos.');
            }
        }

        $stmtCheck = $pdo->prepare('SELECT id FROM usuarios WHERE username = :username LIMIT 1');
        $stmtCheck->execute([':username' => $username]);
        if ($stmtCheck->fetch()) {
            responderError(409, "El usuario '$username' ya existe.");
        }

        $hashPassword = password_hash($password, PASSWORD_BCRYPT);
        $hashPinVal   = $rol === 'admin' ? hashPin($pin) : null;

        $stmt = $pdo->prepare(
            "INSERT INTO usuarios (username, password, pin, nombre, rol)
             VALUES (:username, :password, :pin, :nombre, :rol)"
        );
        $stmt->execute([
            ':username' => $username,
            ':password' => $hashPassword,
            ':pin'      => $hashPinVal,
            ':nombre'   => $nombre,
            ':rol'      => $rol,
        ]);

        $id = (int) $pdo->lastInsertId();

        http_response_code(201);
        echo json_encode([
            'success' => true,
            'id'      => $id,
            'message' => "Usuario '$username' creado correctamente.",
        ]);
        exit;
    }

    if ($method === 'PUT') {
        $id       = (int) ($datos['id'] ?? 0);
        $username = trim($datos['username'] ?? '');
        $nombre   = trim($datos['nombre']   ?? '');
        $rol      = trim($datos['rol']      ?? '');
        $password = $datos['password'] ?? '';
        $pin      = trim($datos['pin']      ?? '');

        if ($id <= 0 || empty($username) || empty($nombre)) {
            responderError(400, 'ID, usuario y nombre son requeridos.');
        }

        if (strlen($username) < 3) {
            responderError(400, 'El usuario debe tener al menos 3 caracteres.');
        }

        if (!validarRol($rol)) {
            responderError(400, 'Rol inválido. Use "admin" o "asistente".');
        }

        if ($password !== '' && strlen($password) < 4) {
            responderError(400, 'La contraseña debe tener al menos 4 caracteres.');
        }

        if ($pin !== '' && !validarFormatoPin($pin)) {
            responderError(400, 'El PIN debe tener entre 4 y 6 dígitos numéricos.');
        }

        $stmtUser = $pdo->prepare('SELECT id, username, rol, pin FROM usuarios WHERE id = :id LIMIT 1');
        $stmtUser->execute([':id' => $id]);
        $actual = $stmtUser->fetch();

        if (!$actual) {
            responderError(404, "No se encontró el usuario con ID $id.");
        }

        $stmtDup = $pdo->prepare(
            'SELECT id FROM usuarios WHERE username = :username AND id != :id LIMIT 1'
        );
        $stmtDup->execute([':username' => $username, ':id' => $id]);
        if ($stmtDup->fetch()) {
            responderError(409, "El usuario '$username' ya está en uso.");
        }

        if ($actual['rol'] === 'admin' && $rol !== 'admin') {
            $stmtAdmins = $pdo->query("SELECT COUNT(*) FROM usuarios WHERE rol = 'admin'");
            if ((int) $stmtAdmins->fetchColumn() <= 1) {
                responderError(400, 'No se puede cambiar el rol del único administrador.');
            }
        }

        if ($rol === 'admin' && $pin === '' && empty($actual['pin'])) {
            responderError(400, 'El PIN es requerido para administradores.');
        }

        $pinFinal = null;
        if ($rol === 'admin') {
            if ($pin !== '') {
                $pinFinal = hashPin($pin);
            } else {
                $pinFinal = $actual['pin'];
            }
        }

        $params = [
            ':username' => $username,
            ':nombre'   => $nombre,
            ':rol'      => $rol,
            ':pin'      => $pinFinal,
            ':id'       => $id,
        ];

        if ($password !== '') {
            $params[':password'] = password_hash($password, PASSWORD_BCRYPT);
            $stmt = $pdo->prepare(
                "UPDATE usuarios
                 SET username = :username, nombre = :nombre, rol = :rol,
                     pin = :pin, password = :password
                 WHERE id = :id"
            );
        } else {
            $stmt = $pdo->prepare(
                "UPDATE usuarios
                 SET username = :username, nombre = :nombre, rol = :rol, pin = :pin
                 WHERE id = :id"
            );
        }

        $stmt->execute($params);

        echo json_encode(['success' => true, 'message' => 'Usuario actualizado correctamente.']);
        exit;
    }

    if ($method === 'DELETE') {
        $id = (int) ($datos['id'] ?? 0);

        if ($id <= 0) {
            responderError(400, 'ID de usuario requerido.');
        }

        $stmtUser = $pdo->prepare('SELECT id, username, rol FROM usuarios WHERE id = :id LIMIT 1');
        $stmtUser->execute([':id' => $id]);
        $usuario = $stmtUser->fetch();

        if (!$usuario) {
            responderError(404, "No se encontró el usuario con ID $id.");
        }

        if ($usuario['rol'] === 'admin') {
            $stmtAdmins = $pdo->query("SELECT COUNT(*) FROM usuarios WHERE rol = 'admin'");
            if ((int) $stmtAdmins->fetchColumn() <= 1) {
                responderError(400, 'No se puede eliminar el único administrador del sistema.');
            }
        }

        $stmt = $pdo->prepare('DELETE FROM usuarios WHERE id = :id');
        $stmt->execute([':id' => $id]);

        echo json_encode([
            'success' => true,
            'message' => "Usuario '{$usuario['username']}' eliminado correctamente.",
        ]);
        exit;
    }

    responderError(405, 'Método no permitido.');

} catch (RuntimeException $e) {
    responderError(500, $e->getMessage());
} catch (PDOException $e) {
    if ($e->getCode() === '23000') {
        responderError(409, 'El nombre de usuario ya existe.');
    }
    responderError(500, 'Error de base de datos: ' . $e->getMessage());
}
