<?php
// =============================================================================
// venta_helpers.php — Utilidades compartidas para ventas con múltiples tratamientos
// =============================================================================

/**
 * Excluye la porción Cashea ya cobrada cuando el mismo tratamiento tiene saldo pendiente de pago.
 * Evita duplicar registros en tratamientos pendientes (Cashea + saldo a favor).
 */
function sqlExcluirCasheaDuplicadoEnPendientes(string $alias = 'vd'): string
{
    return "NOT (
        COALESCE({$alias}.cashea, 0) = 1
        AND COALESCE({$alias}.pagado, 1) = 1
        AND EXISTS (
            SELECT 1 FROM venta_detalles vp
            WHERE vp.venta_id = {$alias}.venta_id
              AND vp.servicio_id = {$alias}.servicio_id
              AND vp.id <> {$alias}.id
              AND vp.realizado = 0
              AND COALESCE(vp.pagado, 1) = 0
        )
    )";
}

/**
 * Indica si un detalle Cashea cobrado debe omitirse porque ya hay saldo pendiente del mismo tratamiento.
 *
 * @param list<array{cashea?: bool, pagado?: bool, realizado?: bool, servicio_id?: int}> $detalles
 */
function esCasheaDuplicadoEnPendientes(array $detalle, array $detalles): bool
{
    if (empty($detalle['cashea']) || ($detalle['pagado'] ?? true) !== true) {
        return false;
    }

    $servicioId = (int) ($detalle['servicio_id'] ?? 0);
    foreach ($detalles as $otro) {
        if (($otro['servicio_id'] ?? null) !== $servicioId) {
            continue;
        }
        if (($otro['realizado'] ?? true) === false && ($otro['pagado'] ?? true) === false) {
            return true;
        }
    }

    return false;
}

/**
 * Obtiene los detalles (tratamientos) de un conjunto de ventas.
 *
 * @return array<int, list<array{id: int, servicio_id: int, nombre: string, precio: float}>>
 */
function obtenerDetallesPorVentas(PDO $pdo, array $ventaIds): array
{
    if (empty($ventaIds)) {
        return [];
    }

    $placeholders = implode(',', array_fill(0, count($ventaIds), '?'));
    $stmt = $pdo->prepare(
        "SELECT
            vd.id,
            vd.venta_id,
            vd.servicio_id,
            s.nombre_servicio AS nombre,
            vd.precio,
            COALESCE(vd.realizado, 1) AS realizado,
            COALESCE(vd.cashea, 0) AS cashea,
            COALESCE(vd.pagado, 1) AS pagado
         FROM venta_detalles vd
         INNER JOIN servicios_tratamientos s ON vd.servicio_id = s.id
         WHERE vd.venta_id IN ($placeholders)
         ORDER BY vd.id ASC"
    );
    $stmt->execute(array_values($ventaIds));

    $porVenta = [];
    while ($row = $stmt->fetch()) {
        $ventaId = (int) $row['venta_id'];
        $porVenta[$ventaId][] = [
            'id'          => (int) $row['id'],
            'servicio_id' => (int) $row['servicio_id'],
            'nombre'      => $row['nombre'],
            'precio'      => (float) $row['precio'],
            'realizado'   => !isset($row['realizado']) || (bool) $row['realizado'],
            'cashea'      => !empty($row['cashea']),
            'pagado'      => !isset($row['pagado']) || (bool) $row['pagado'],
        ];
    }

    return $porVenta;
}

/**
 * Enriquece filas de venta con deuda Cashea pendiente.
 *
 * @param list<array<string, mixed>> $ventas
 * @return list<array<string, mixed>>
 */
function enriquecerVentasConDeudaCashea(PDO $pdo, array $ventas): array
{
    if (empty($ventas)) {
        return $ventas;
    }

    $idsCashea = [];
    foreach ($ventas as $venta) {
        if (!empty($venta['cashea'])) {
            $idsCashea[] = (int) $venta['id'];
        }
    }

    $abonosPorVenta = [];
    if (!empty($idsCashea)) {
        $placeholders = implode(',', array_fill(0, count($idsCashea), '?'));
        $stmt = $pdo->prepare(
            "SELECT v.id AS venta_id, COALESCE(SUM(a.monto), 0) AS abonos
             FROM ventas v
             LEFT JOIN ajustes_cashea a
               ON a.concepto LIKE CONCAT('Abono%venta #', v.id, ' –%')
             WHERE v.id IN ($placeholders)
             GROUP BY v.id"
        );
        $stmt->execute($idsCashea);
        while ($row = $stmt->fetch()) {
            $abonosPorVenta[(int) $row['venta_id']] = (float) $row['abonos'];
        }
    }

    return array_map(function ($venta) use ($abonosPorVenta) {
        $total     = (float) ($venta['total'] ?? 0);
        $montoCaja = (float) ($venta['monto_caja'] ?? $total);

        if (empty($venta['cashea'])) {
            $pendiente = round(max(0, $total - $montoCaja), 2);
            return array_merge($venta, [
                'deuda_restante' => $pendiente,
                'por_pagar'      => $pendiente > 0.001,
            ]);
        }

        $abonos = $abonosPorVenta[(int) $venta['id']] ?? 0.0;
        $deuda  = round(max(0, $total - $montoCaja - $abonos), 2);

        return array_merge($venta, [
            'deuda_restante' => $deuda,
            'por_pagar'      => $deuda > 0.001,
        ]);
    }, $ventas);
}

/**
 * Enriquece filas de venta con servicios y texto resumido.
 *
 * @param list<array<string, mixed>> $ventas
 * @return list<array<string, mixed>>
 */
/**
 * Saldo a favor disponible del cliente (monetario + tratamientos prepagados no realizados).
 */
function calcularSaldoFavorDisponible(PDO $pdo, int $clienteId): float
{
    $stmt = $pdo->prepare(
        "SELECT (COALESCE((
              SELECT SUM(sf.monto)
              FROM saldos_favor sf
              WHERE sf.cliente_id = :cliente_id
            ), 0) + COALESCE((
              SELECT SUM(vd.precio)
              FROM venta_detalles vd
              INNER JOIN ventas v ON v.id = vd.venta_id
              WHERE v.cliente_id = :cliente_id2
                AND v.estado = 'completada'
                AND vd.realizado = 0
                AND COALESCE(vd.pagado, 1) = 1
                AND " . sqlExcluirCasheaDuplicadoEnPendientes('vd') . "
            ), 0)) AS saldo"
    );
    $stmt->execute([
        ':cliente_id'  => $clienteId,
        ':cliente_id2' => $clienteId,
    ]);

    return round(max(0, (float) $stmt->fetchColumn()), 2);
}

/**
 * Descuenta saldo a favor del cliente al registrar una venta.
 * Primero consume saldo monetario (saldos_favor) y luego tratamientos prepagados (FIFO).
 *
 * @return float Monto efectivamente consumido
 */
function consumirSaldoFavorCliente(
    PDO $pdo,
    int $clienteId,
    float $monto,
    int $ventaId,
    string $fecha
): float {
    if ($monto <= 0.001) {
        return 0.0;
    }

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

    $restante = round($monto, 2);
    $consumido = 0.0;

    $stmtMon = $pdo->prepare(
        'SELECT COALESCE(SUM(monto), 0) FROM saldos_favor WHERE cliente_id = :cliente_id'
    );
    $stmtMon->execute([':cliente_id' => $clienteId]);
    $saldoMonetario = max(0, round((float) $stmtMon->fetchColumn(), 2));

    $usarMonetario = min($restante, $saldoMonetario);
    if ($usarMonetario > 0.001) {
        $stmtIns = $pdo->prepare(
            'INSERT INTO saldos_favor (cliente_id, monto, fecha, concepto)
             VALUES (:cliente_id, :monto, :fecha, :concepto)'
        );
        $stmtIns->execute([
            ':cliente_id' => $clienteId,
            ':monto'      => -$usarMonetario,
            ':fecha'      => $fecha,
            ':concepto'   => "Aplicado en venta #{$ventaId}",
        ]);
        $restante -= $usarMonetario;
        $consumido += $usarMonetario;
    }

    if ($restante > 0.001) {
        $stmtTrat = $pdo->prepare(
            "SELECT vd.id, vd.precio
             FROM venta_detalles vd
             INNER JOIN ventas v ON v.id = vd.venta_id
             WHERE v.cliente_id = :cliente_id
               AND v.estado = 'completada'
               AND COALESCE(vd.realizado, 1) = 0
               AND COALESCE(vd.pagado, 1) = 1
               AND " . sqlExcluirCasheaDuplicadoEnPendientes('vd') . "
             ORDER BY v.fecha_venta ASC, vd.id ASC"
        );
        $stmtTrat->execute([':cliente_id' => $clienteId]);

        $stmtMarcar = $pdo->prepare(
            'UPDATE venta_detalles SET realizado = 1 WHERE id = :id'
        );

        while ($row = $stmtTrat->fetch(PDO::FETCH_ASSOC)) {
            if ($restante <= 0.001) {
                break;
            }
            $precio = round((float) $row['precio'], 2);
            if ($precio <= 0.001 || $precio > $restante + 0.001) {
                continue;
            }
            $stmtMarcar->execute([':id' => (int) $row['id']]);
            $restante -= $precio;
            $consumido += $precio;
        }
    }

    return round($consumido, 2);
}

function enriquecerVentasConServicios(PDO $pdo, array $ventas): array
{
    if (empty($ventas)) {
        return [];
    }

    $ids = array_map(fn($v) => (int) $v['id'], $ventas);
    $detalles = obtenerDetallesPorVentas($pdo, $ids);

    return array_map(function ($venta) use ($detalles) {
        $servicios = $detalles[(int) $venta['id']] ?? [];
        $nombres   = array_column($servicios, 'nombre');

        $saldoFavor = 0.0;
        $tieneSaldoFavor = false;
        foreach ($servicios as $s) {
            if ($s['realizado'] === false) {
                $tieneSaldoFavor = true;
                if ($s['pagado'] === true && !esCasheaDuplicadoEnPendientes($s, $servicios)) {
                    $saldoFavor += $s['precio'];
                }
            }
        }
        $saldoFavor = round($saldoFavor, 2);

        return array_merge($venta, [
            'servicios'           => $servicios,
            'servicio'            => implode(', ', $nombres),
            'saldo_favor'         => $saldoFavor,
            'tiene_saldo_favor'   => $saldoFavor > 0.001,
            'tiene_saldo_a_favor' => $tieneSaldoFavor,
        ]);
    }, $ventas);
}
