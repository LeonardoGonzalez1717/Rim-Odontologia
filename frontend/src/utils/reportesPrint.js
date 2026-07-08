/**
 * Plantillas de impresión simplificadas para notas de entrega y reportes de ventas.
 */

export const fmt = (v) =>
  new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'USD' }).format(v ?? 0)

/** Escapa texto para insertarlo de forma segura en HTML */
const esc = (str) => String(str ?? '')
  .replace(/&/g, '&amp;')
  .replace(/</g, '&lt;')
  .replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;')

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
  
  .brand-header {
    display: flex;
    align-items: center;
    gap: 12px;
    margin-bottom: 20px;
  }
  .brand-logo {
    width: 40px;
    height: auto;
    object-fit: contain;
  }
  h1 {
    font-size: 22px;
    font-weight: 700;
    text-align: left;
  }

  .header-info {
    text-align: left;
    margin-bottom: 24px;
    border-bottom: 1px solid #eee;
    padding-bottom: 8px;
  }
  .header-info p { margin: 4px 0; }
  
  /* Contenedor flexible para alinear el título del reporte y la fecha a los extremos */
  .report-meta {
    display: flex;
    justify-content: space-between;
    align-items: baseline;
  }
  
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
  <title>${esc(titulo)}</title>
  <style>${PRINT_STYLES}</style>
</head>
<body>
  ${contenido}
</body>
</html>`

  // about:blank evita que el popup cargue la SPA del padre (React la dejaría en blanco)
  const ventana = window.open(
    'about:blank',
    nombreVentana,
    'width=640,height=720,scrollbars=yes,resizable=yes',
  )

  if (!ventana) {
    window.alert('Permite ventanas emergentes para ver el documento de impresión.')
    return
  }

  const doc = ventana.document
  doc.open()
  doc.write(html)
  doc.close()
  ventana.focus()
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
      <td>${esc(s.nombre)}</td>
      <td>${fmt(s.precio)}</td>
    </tr>
  `).join('')

  const contenido = `
  <div class="brand-header">
    <img src="./public/logoBlanco.png" alt="Logo" class="brand-logo" />
    <h1>Rim Challouf</h1>
  </div>
  <div class="header-info">
    <div class="report-meta">
      <p><strong>Cliente:</strong> ${venta.cliente || '—'}</p>
      <p><strong>Doctor:</strong> ${venta.doctor}</p>
      <p style="color: #666;"><strong>Fecha:</strong> ${venta.fecha_venta ? venta.fecha_venta : ' '}</p>
    </div>
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
 * Reporte de ventas: cabecera con empresa; lista de tratamientos y total con fecha.
 */
export const abrirReporteDiario = (datos) => {
  const ventas = (datos.ventas_recientes ?? []).filter((v) => v.estado === 'completada')

  // Intentamos sacar la fecha de los datos globales, de la primera venta ('fecha_venta') o la de hoy por defecto
  const fechaReporte = datos.fecha_reporte ?? ventas[0]?.fecha_venta ?? null;

  const filas = ventas.flatMap((v) => {
    const lineas = v.servicios?.length
      ? v.servicios
      : [{ nombre: v.servicio, precio: v.total }]

    return lineas.map((s) => `
    <tr>
      <td>${esc(v.doctor)}</td>
      <td>${esc(s.nombre)}</td>
      <td>${fmt(s.precio)}</td>
    </tr>
  `)
  }).join('')

  const totalVentas = datos.ingresos_ventas ?? ventas.reduce((sum, v) => sum + (v.monto_caja ?? v.total), 0)
  const totalCashea = datos.ingresos_cuotas_cashea ?? 0
  const cuotas = datos.cuotas_cashea ?? []

  const filasCashea = cuotas.map((c) => `
    <tr>
      <td>${esc(c.concepto)}</td>
      <td>${esc(c.hora)}</td>
      <td>${fmt(c.monto)}</td>
    </tr>
  `).join('')

  const total = datos.ingresos_dia ?? totalVentas + totalCashea

  const contenido = `
  <div class="brand-header">
    <img src="./public/logoBlanco.png" alt="Logo" class="brand-logo" />
    <h1>Rim Challouf</h1>
  </div>
  <div class="header-info">
    <div class="report-meta">
      <p style="font-size: 16px; font-weight: 600; color: #555;">Reporte de Ventas</p>
      <p style="color: #666;"><strong>Fecha:</strong> ${fechaReporte ? fechaReporte : ' '}</p>
    </div>
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
  ${cuotas.length > 0 ? `
  <p style="margin: 20px 0 8px; font-weight: 600;">Cuotas Cashea</p>
  <table>
    <thead>
      <tr>
        <th>Concepto</th>
        <th>Hora</th>
        <th>Monto</th>
      </tr>
    </thead>
    <tbody>
      ${filasCashea}
    </tbody>
  </table>` : ''}
  <div class="total">
    ${totalCashea > 0
      ? `Ventas: ${fmt(totalVentas)} · Cashea: ${fmt(totalCashea)}<br>Total: ${fmt(total)}`
      : `Total: ${fmt(total)}`}
  </div>`

  abrirVentanaImpresion(
    `Reporte de Ventas — Rim Challouf`,
    contenido,
    'reporte_diario',
  )
}