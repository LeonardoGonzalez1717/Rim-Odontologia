<?php
// =============================================================================
// get_ventas.php — Lista ventas por fecha o historial (con paginación)
// Método: GET
// Query params:
//   fecha      {string}  YYYY-MM-DD — ventas de un día (default: hoy)
//   todas      {string}  "1" — historial completo (ignora fecha)
//   pagina     {int}     Página actual (default: 1)
//   por_pagina {int}     Registros por página (default: 10, máx: 50)
// Respuesta:
//   {
//     "success": true,
//     "modo": "dia"|"historial",
//     "fecha": "...",
//     "paginacion": { "pagina", "por_pagina", "total", "total_paginas" },
//     "ventas": [
//       {
//         "id", "fecha", "hora", "doctor", "servicio", "servicios", "total", "estado"
//       }
//     ]
//   }
// =============================================================================

header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');
header('Content-Type: application/json; charset=utf-8');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

require_once 'conexion.php';
require_once 'venta_helpers.php';

if ($_SERVER['REQUEST_METHOD'] !== 'GET') {
    http_response_code(405);
    echo json_encode(['success' => false, 'message' => 'Método no permitido.']);
    exit;
}

try {
    $pdo = obtenerConexion();

    $todas     = isset($_GET['todas']) && $_GET['todas'] === '1';
    $pagina    = max((int) ($_GET['pagina'] ?? 1), 1);
    $porPagina = min(max((int) ($_GET['por_pagina'] ?? $_GET['limite'] ?? 10), 1), 50);
    $offset    = ($pagina - 1) * $porPagina;

    $fromSql = "FROM ventas v
                INNER JOIN doctores d ON v.doctor_id = d.id";

    $selectSql = "SELECT
                    v.id,
                    DATE_FORMAT(v.fecha_venta, '%Y-%m-%d') AS fecha,
                    TIME_FORMAT(v.fecha_venta, '%H:%i')    AS hora,
                    d.nombre                                AS doctor,
                    v.total,
                    v.estado
                  $fromSql";

    if ($todas) {
        $whereSql = '';
        $modo     = 'historial';
        $fecha    = null;
    } else {
        $fecha = trim($_GET['fecha'] ?? date('Y-m-d'));
        if (!preg_match('/^\d{4}-\d{2}-\d{2}$/', $fecha)) {
            http_response_code(400);
            echo json_encode(['success' => false, 'message' => 'Formato de fecha inválido. Use YYYY-MM-DD.']);
            exit;
        }
        $whereSql = ' WHERE DATE(v.fecha_venta) = :fecha';
        $modo     = 'dia';
    }

    $countSql = "SELECT COUNT(*) $fromSql$whereSql";
    $stmtCount = $pdo->prepare($countSql);
    if (!$todas) {
        $stmtCount->bindValue(':fecha', $fecha);
    }
    $stmtCount->execute();
    $total = (int) $stmtCount->fetchColumn();

    $totalPaginas = $total > 0 ? (int) ceil($total / $porPagina) : 1;
    if ($pagina > $totalPaginas) {
        $pagina = $totalPaginas;
        $offset = ($pagina - 1) * $porPagina;
    }

    $sql = $selectSql . $whereSql
         . ' ORDER BY v.fecha_venta DESC LIMIT ' . (int) $porPagina
         . ' OFFSET ' . (int) $offset;
    $stmt = $pdo->prepare($sql);
    if (!$todas) {
        $stmt->bindValue(':fecha', $fecha);
    }
    $stmt->execute();

    $ventas = array_map(function ($row) {
        return [
            'id'     => (int)   $row['id'],
            'fecha'  => $row['fecha'],
            'hora'   => $row['hora'],
            'doctor' => $row['doctor'],
            'total'  => (float) $row['total'],
            'estado' => $row['estado'],
        ];
    }, $stmt->fetchAll());

    $ventas = enriquecerVentasConServicios($pdo, $ventas);

    echo json_encode([
        'success'    => true,
        'modo'       => $modo,
        'fecha'      => $fecha,
        'paginacion' => [
            'pagina'         => $pagina,
            'por_pagina'     => $porPagina,
            'total'          => $total,
            'total_paginas'  => $totalPaginas,
        ],
        'ventas'     => $ventas,
    ]);

} catch (RuntimeException $e) {
    http_response_code(500);
    echo json_encode(['success' => false, 'message' => $e->getMessage()]);

} catch (PDOException $e) {
    http_response_code(500);
    echo json_encode(['success' => false, 'message' => 'Error al obtener ventas: ' . $e->getMessage()]);
}
