<?php
// =============================================================================
// login.php — Autenticación de usuarios
// Método: POST
// Body: { "username": "...", "password": "..." }
// =============================================================================

header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');
header('Content-Type: application/json; charset=utf-8');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

require_once 'conexion.php';

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['success' => false, 'message' => 'Método no permitido.']);
    exit;
}

try {
    $pdo = obtenerConexion();
    $body = file_get_contents('php://input');
    $datos = json_decode($body, true);

    $username = trim($datos['username'] ?? '');
    $password = trim($datos['password'] ?? '');

    if (empty($username) || empty($password)) {
        http_response_code(400);
        echo json_encode(['success' => false, 'message' => 'Usuario y contraseña requeridos.']);
        exit;
    }

    $stmt = $pdo->prepare("SELECT id, username, nombre, rol, password FROM usuarios WHERE username = :username LIMIT 1");
    $stmt->execute([':username' => $username]);
    $user = $stmt->fetch();

    if ($user && password_verify($password, $user['password'])) {
        echo json_encode([
            'success' => true,
            'user' => [
                'id'       => (int) $user['id'],
                'username' => $user['username'],
                'nombre'   => $user['nombre'],
                'rol'      => $user['rol'],
            ],
            'message' => 'Inicio de sesión exitoso.'
        ]);
    } else {
        http_response_code(401);
        echo json_encode(['success' => false, 'message' => 'Usuario o contraseña incorrectos.']);
    }

} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(['success' => false, 'message' => 'Error del servidor: ' . $e->getMessage()]);
}
