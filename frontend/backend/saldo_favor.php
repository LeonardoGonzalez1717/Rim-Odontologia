<?php
// =============================================================================
// saldo_favor.php — Registrar y consultar saldo a favor de clientes
// Métodos: POST, GET
// =============================================================================

header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');
header('Content-Type: application/json; charset=utf-8');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

require_once 'conexion.php';

try {
    $pdo = obtenerConexion();

    // Crear tabla saldos_favor si no existe
    $pdo->exec(
        "CREATE TABLE IF NOT EXISTS saldos_favor (
            id INT AUTO_INCREMENT PRIMARY KEY,
            cliente_id INT NOT NULL,
            monto DECIMAL(10,2) NOT NULL,
            fecha DATETIME NOT NULL,
            concepto VARCHAR(255) DEFAULT 'Saldo a favor registrado',
            creado_en TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            INDEX idx_cliente (cliente_id)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;"
    );

    $metodo = obtenerMetodoHttp();

    if ($metodo === 'POST') {
        $body = json_decode(CACHED_BODY ?? file_get_contents('php://input'), true);

        $clienteId = (int) ($body['cliente_id'] ?? 0);
        $monto     = (float) ($body['monto'] ?? 0);
        $fecha     = trim($body['fecha'] ?? '');
        $concepto  = trim($body['concepto'] ?? 'Saldo a favor registrado');

        if ($clienteId <= 0) {
            http_response_code(400);
            echo json_encode(['success' => false, 'message' => 'Por favor, selecciona un cliente.']);
            exit;
        }

        if ($monto <= 0) {
            http_response_code(400);
            echo json_encode(['success' => false, 'message' => 'El monto debe ser mayor a $0.']);
            exit;
        }

        if (empty($fecha)) {
            $fecha = date('Y-m-d H:i:s');
        } else {
            if (strlen($fecha) === 10) {
                $fecha .= ' ' . date('H:i:s');
            } elseif (strlen($fecha) === 16) {
                $fecha .= ':00';
            }
        }

        $stmt = $pdo->prepare(
            "INSERT INTO saldos_favor (cliente_id, monto, fecha, concepto)
             VALUES (:cliente_id, :monto, :fecha, :concepto)"
        );
        $stmt->execute([
            ':cliente_id' => $clienteId,
            ':monto'      => $monto,
            ':fecha'      => $fecha,
            ':concepto'   => $concepto,
        ]);

        echo json_encode([
            'success' => true,
            'message' => 'Saldo a favor registrado correctamente.',
            'id'      => (int) $pdo->lastInsertId(),
        ]);
        exit;
    }

    if ($metodo === 'GET') {
        $clienteId = (int) ($_GET['cliente_id'] ?? 0);
        if ($clienteId > 0) {
            $stmt = $pdo->prepare(
                "SELECT id, cliente_id, monto, DATE_FORMAT(fecha, '%Y-%m-%d %H:%i') AS fecha, concepto
                 FROM saldos_favor
                 WHERE cliente_id = :cliente_id
                 ORDER BY fecha DESC"
            );
            $stmt->execute([':cliente_id' => $clienteId]);
            $registros = $stmt->fetchAll();

            $totalSaldo = array_reduce($registros, fn($s, $r) => $s + (float)$r['monto'], 0.0);

            echo json_encode([
                'success'     => true,
                'cliente_id'  => $clienteId,
                'total_saldo' => round($totalSaldo, 2),
                'registros'   => $registros,
            ]);
            exit;
        }
    }

    http_response_code(405);
    echo json_encode(['success' => false, 'message' => 'Método no permitido.']);

} catch (Throwable $e) {
    http_response_code(500);
    echo json_encode(['success' => false, 'message' => 'Error en el servidor: ' . $e->getMessage()]);
}
