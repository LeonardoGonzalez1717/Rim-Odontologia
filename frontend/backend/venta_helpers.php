<?php
// =============================================================================
// venta_helpers.php — Utilidades compartidas para ventas con múltiples tratamientos
// =============================================================================

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
            vd.precio
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
        ];
    }

    return $porVenta;
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

        return array_merge($venta, [
            'servicios' => $servicios,
            'servicio'  => implode(', ', $nombres),
        ]);
    }, $ventas);
}
