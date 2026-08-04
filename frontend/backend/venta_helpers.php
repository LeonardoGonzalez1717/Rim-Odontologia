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
        foreach ($servicios as $s) {
            if ($s['realizado'] === false && $s['pagado'] === true
                && !esCasheaDuplicadoEnPendientes($s, $servicios)) {
                $saldoFavor += $s['precio'];
            }
        }
        $saldoFavor = round($saldoFavor, 2);

        return array_merge($venta, [
            'servicios'        => $servicios,
            'servicio'         => implode(', ', $nombres),
            'saldo_favor'      => $saldoFavor,
            'tiene_saldo_favor'=> $saldoFavor > 0.001,
        ]);
    }, $ventas);
}
