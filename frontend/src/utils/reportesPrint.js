/**
 * Plantillas de impresión simplificadas para notas de entrega y reportes de ventas.
 */

export const fmt = (v) =>
  new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'USD' }).format(v ?? 0)

const PRINT_STYLES = `
  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
  body {
    font-family: system-ui, -apple-system, sans-serif;
    max-width: 560px;
    margin: 32px auto;
    padding: 0 24px;
    color: #111;
    font-size: 14px;
    line-height: 1.5;
  }
  h1 {
    font-size: 20px;
    font-weight: 700;
    text-align: center;
    margin-bottom: 16px;
  }
  .header-info {
    text-align: center;
    margin-bottom: 28px;
  }
  .header-info p { margin: 4px 0; }
  table {
    width: 100%;
    border-collapse: collapse;
    margin-bottom: 20px;
  }
  th, td {
    padding: 10px 8px;
    text-align: left;
    border-bottom: 1px solid #ccc;
  }
  th:last-child, td:last-child { text-align: right; }
  th { font-weight: 600; border-bottom: 2px solid #111; }
  .total {
    text-align: right;
    font-size: 16px;
    font-weight: 700;
    padding-top: 12px;
    border-top: 2px solid #111;
  }
  .print-bar {
    text-align: center;
    margin-bottom: 24px;
  }
  .print-bar button {
    padding: 8px 18px;
    margin: 0 4px;
    font-size: 13px;
    cursor: pointer;
    border: 1px solid #ccc;
    border-radius: 6px;
    background: #fff;
  }
  .print-bar button:first-child {
    background: #111;
    color: #fff;
    border-color: #111;
  }
  @media print {
    body { margin: 0; padding: 16px; }
    .no-print { display: none !important; }
  }
`

const abrirVentanaImpresion = (titulo, contenido, nombreVentana) => {
  const html = `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <title>${titulo}</title>
  <style>${PRINT_STYLES}</style>
</head>
<body>
  <div class="print-bar no-print">
    <button onclick="window.print()">Imprimir</button>
    <button onclick="window.close()">Cerrar</button>
  </div>
  ${contenido}
</body>
</html>`

  const ventana = window.open('', nombreVentana, 'width=640,height=720,scrollbars=yes')
  if (ventana) {
    ventana.document.write(html)
    ventana.document.close()
  }
}

/**
 * Nota de entrega: cabecera con empresa, doctor y tratamientos; lista y total.
 */
export const abrirNotaEntrega = (venta) => {
  const lineas = venta.servicios?.length
    ? venta.servicios
    : [{ nombre: venta.servicio, precio: venta.total }]

  const filas = lineas.map((s) => `
    <tr>
      <td>${s.nombre}</td>
      <td>${fmt(s.precio)}</td>
    </tr>
  `).join('')

  const resumenTratamientos = lineas.map((s) => s.nombre).join(', ')

  const contenido = `
  <h1>Rim Challouf</h1>
  <div class="header-info">
    <p><strong>Doctor:</strong> ${venta.doctor}</p>
    <p><strong>Tratamiento${lineas.length > 1 ? 's' : ''}:</strong> ${resumenTratamientos}</p>
  </div>
  <table>
    <thead>
      <tr>
        <th>Tratamiento</th>
        <th>Precio</th>
      </tr>
    </thead>
    <tbody>
      ${filas}
    </tbody>
  </table>
  <div class="total">Total: ${fmt(venta.total)}</div>`

  abrirVentanaImpresion(
    `Nota de Entrega — Rim Challouf`,
    contenido,
    `nota_${venta.id}`,
  )
}

/**
 * Reporte de ventas: cabecera con empresa; lista de tratamientos y total.
 */
export const abrirReporteDiario = (datos) => {
  const ventas = (datos.ventas_recientes ?? []).filter((v) => v.estado === 'completada')

  const filas = ventas.flatMap((v) => {
    const lineas = v.servicios?.length
      ? v.servicios
      : [{ nombre: v.servicio, precio: v.total }]

    return lineas.map((s) => `
    <tr>
      <td>${v.doctor}</td>
      <td>${s.nombre}</td>
      <td>${fmt(s.precio)}</td>
    </tr>
  `)
  }).join('')

  const total = datos.ingresos_dia ?? ventas.reduce((sum, v) => sum + v.total, 0)

  const contenido = `
  <h1>Rim Challouf</h1>
  <div class="header-info">
    <p><strong>Reporte de Ventas</strong></p>
  </div>
  <table>
    <thead>
      <tr>
        <th>Doctor</th>
        <th>Tratamiento</th>
        <th>Precio</th>
      </tr>
    </thead>
    <tbody>
      ${filas || '<tr><td colspan="3" style="text-align:center;color:#666;">Sin ventas</td></tr>'}
    </tbody>
  </table>
  <div class="total">Total: ${fmt(total)}</div>`

  abrirVentanaImpresion(
    `Reporte de Ventas — Rim Challouf`,
    contenido,
    'reporte_diario',
  )
}
