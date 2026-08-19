/**
 * Plantillas de impresión simplificadas para notas de entrega y reportes de ventas.
 */

import html2canvas from 'html2canvas'
import { formatearDMA, formatearDMAHora, formatearHora12 } from './fechas'

export const fmt = (v) =>
  new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'USD' }).format(v ?? 0)

/** Escapa texto para insertarlo de forma segura en HTML */
const esc = (str) => String(str ?? '')
  .replace(/&/g, '&amp;')
  .replace(/</g, '&lt;')
  .replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;')

/** SAT 15T: rollo 58 mm, área útil ~48 mm, 203 dpi */
const PAPEL_ANCHO_MM = 58
const PAPEL_EXPORT_PX = Math.round(PAPEL_ANCHO_MM * 203 / 25.4)

const PRINT_STYLES = `
  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
  body {
    font-family: Arial, Helvetica, sans-serif;
    max-width: ${PAPEL_ANCHO_MM}mm;
    width: ${PAPEL_ANCHO_MM}mm;
    margin: 8px auto;
    padding: 0 2mm;
    color: #111;
    font-size: 13px;
    line-height: 1.45;
  }

  .brand-header {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 5px;
    margin-bottom: 10px;
    text-align: center;
  }
  .brand-logo {
    width: 40px;
    height: auto;
    object-fit: contain;
  }
  h1 {
    font-size: 16px;
    font-weight: 700;
    text-align: center;
    letter-spacing: 0.02em;
  }

  .header-info {
    text-align: left;
    margin-bottom: 10px;
    border-bottom: 1px dashed #999;
    padding-bottom: 7px;
  }
  .header-info p { margin: 3px 0; font-size: 12px; }

  .report-meta {
    display: flex;
    flex-direction: column;
    gap: 2px;
  }

  table {
    width: 100%;
    border-collapse: collapse;
    margin-bottom: 8px;
    table-layout: fixed;
  }
  th, td {
    padding: 4px 3px;
    text-align: left;
    border-bottom: 1px dashed #ccc;
    font-size: 13px;
    word-wrap: break-word;
    overflow-wrap: break-word;
  }
  th:last-child, td:last-child { text-align: right; }
  th { font-weight: 700; border-bottom: 1px solid #111; }

  .total {
    text-align: right;
    font-size: 14px;
    font-weight: 700;
    padding-top: 7px;
    border-top: 1px solid #111;
  }
  .nota-pagina {
    display: flex;
    flex-direction: column;
    width: 100%;
    max-width: ${PAPEL_ANCHO_MM}mm;
    margin: 0 auto;
  }
  .nota-cuerpo {
    flex: 0 1 auto;
  }
  .nota-pie {
    flex-shrink: 0;
    margin-top: 8px;
    padding-top: 4px;
  }
  .nota-export-root {
    width: ${PAPEL_EXPORT_PX}px;
    background: #fff;
    color: #111;
    overflow: hidden;
  }
  .nota-export-root .nota-pagina {
    max-width: none;
    width: 100%;
    padding: 8px 6px;
    box-sizing: border-box;
  }
  .print-bar {
    text-align: center;
    margin-bottom: 12px;
  }
  .print-bar button {
    padding: 6px 14px;
    margin: 0 4px;
    font-size: 12px;
    cursor: pointer;
    border: 1px solid #ccc;
    border-radius: 4px;
    background: #fff;
  }
  .print-bar button:first-child {
    background: #111;
    color: #fff;
    border-color: #111;
  }
  @media print {
    @page { size: ${PAPEL_ANCHO_MM}mm auto; margin: 1mm 2mm; }
    body {
      margin: 0;
      padding: 0;
      max-width: ${PAPEL_ANCHO_MM}mm;
      width: ${PAPEL_ANCHO_MM}mm;
      font-size: 13px;
    }
    .nota-pagina { max-width: ${PAPEL_ANCHO_MM}mm; }
    .no-print { display: none !important; }
  }
`

/** Estilos para reportes ejecutivos en Hoja Estándar (Carta / A4) */
const REPORT_HOJA_STYLES = `
  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
  body {
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
    width: 100%;
    max-width: 900px;
    margin: 20px auto;
    padding: 0 20px;
    color: #1e293b;
    font-size: 13px;
    line-height: 1.5;
    background: #fff;
  }

  .report-page-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding-bottom: 16px;
    border-bottom: 2px solid #e2e8f0;
    margin-bottom: 20px;
  }
  .report-brand {
    display: flex;
    align-items: center;
    gap: 14px;
  }
  .report-brand img {
    width: 50px;
    height: auto;
    object-fit: contain;
  }
  .report-brand h1 {
    font-size: 20px;
    font-weight: 800;
    color: #0f172a;
    letter-spacing: -0.02em;
    margin-bottom: 2px;
  }
  .report-brand p {
    font-size: 12px;
    color: #64748b;
  }
  .report-doc-title {
    text-align: right;
  }
  .report-doc-title h2 {
    font-size: 18px;
    font-weight: 800;
    color: #db2777;
    text-transform: uppercase;
    letter-spacing: 0.05em;
  }
  .report-doc-title p {
    font-size: 12px;
    color: #64748b;
    margin-top: 3px;
  }

  .report-kpis {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
    gap: 14px;
    margin-bottom: 22px;
  }
  .report-kpi-card {
    background: #f8fafc;
    border: 1px solid #e2e8f0;
    border-radius: 12px;
    padding: 12px 16px;
  }
  .report-kpi-card.highlight {
    background: #fdf2f8;
    border-color: #fbcfe8;
  }
  .report-kpi-title {
    font-size: 11px;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.05em;
    color: #64748b;
    margin-bottom: 4px;
  }
  .report-kpi-card.highlight .report-kpi-title {
    color: #db2777;
  }
  .report-kpi-value {
    font-size: 22px;
    font-weight: 800;
    color: #0f172a;
  }
  .report-kpi-card.highlight .report-kpi-value {
    color: #be185d;
  }

  .section-title {
    font-size: 13px;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.05em;
    color: #334155;
    margin: 20px 0 10px 0;
    display: flex;
    align-items: center;
    gap: 6px;
  }

  .two-col-grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 16px;
    margin-bottom: 16px;
  }

  table.data-table {
    width: 100%;
    border-collapse: collapse;
    margin-bottom: 16px;
    font-size: 12px;
  }
  table.data-table th {
    background: #f1f5f9;
    color: #475569;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.04em;
    font-size: 11px;
    padding: 8px 10px;
    border-top: 1px solid #e2e8f0;
    border-bottom: 2px solid #cbd5e1;
    text-align: left;
  }
  table.data-table td {
    padding: 8px 10px;
    border-bottom: 1px solid #f1f5f9;
    color: #334155;
  }
  table.data-table tbody tr:nth-child(even) {
    background: #fafafa;
  }
  table.data-table td.numeric, table.data-table th.numeric {
    text-align: right;
  }
  table.data-table td.center, table.data-table th.center {
    text-align: center;
  }

  .badge-metodo {
    display: inline-block;
    padding: 2px 8px;
    border-radius: 6px;
    font-size: 11px;
    font-weight: 600;
    background: #fdf2f8;
    color: #be185d;
    border: 1px solid #fbcfe8;
  }

  .report-footer {
    margin-top: 30px;
    padding-top: 16px;
    border-top: 2px solid #e2e8f0;
    display: flex;
    align-items: center;
    justify-content: space-between;
    font-size: 11px;
    color: #64748b;
  }

  .print-action-bar {
    display: flex;
    align-items: center;
    justify-content: flex-end;
    gap: 8px;
    margin-bottom: 16px;
  }
  .print-action-bar button {
    padding: 8px 18px;
    font-size: 13px;
    font-weight: 600;
    cursor: pointer;
    border-radius: 8px;
    border: 1px solid #cbd5e1;
    background: #db2777;
    color: #fff;
    box-shadow: 0 1px 2px rgba(0,0,0,0.05);
    transition: all 0.2s;
  }
  .print-action-bar button:hover {
    background: #be185d;
  }

  @media print {
    @page { size: auto; margin: 12mm 12mm 15mm 12mm; }
    body {
      margin: 0;
      padding: 0;
      max-width: 100%;
      width: 100%;
      font-size: 11.5px;
    }
    .no-print { display: none !important; }
    table.data-table { page-break-inside: auto; }
    table.data-table tr { page-break-inside: avoid; page-break-after: auto; }
    .report-kpi-card { border: 1px solid #ccc; }
  }
`

const abrirVentanaImpresion = (titulo, contenido, nombreVentana, { estilos = PRINT_STYLES, ancho = 320, alto = 680 } = {}) => {
  const html = `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <title>${esc(titulo)}</title>
  <style>${estilos}</style>
</head>
<body>
  ${contenido}
</body>
</html>`

  // about:blank evita que el popup cargue la SPA del padre (React la dejaría en blanco)
  const ventana = window.open(
    'about:blank',
    nombreVentana,
    `width=${ancho},height=${alto},scrollbars=yes,resizable=yes`,
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
 * Igual que abrirVentanaImpresion pero lanza window.print() de forma automática
 * tan pronto el contenido está listo, sin mostrar reporte intermedio al usuario.
 */
const imprimirVentanaDirecta = (titulo, contenido, nombreVentana, { estilos = PRINT_STYLES, ancho = 320, alto = 680 } = {}) => {
  // Inyectamos un script que dispara print() automáticamente
  const scriptAutoPrint = `<script>
    (function () {
      var img = document.querySelector('img.brand-logo') || document.querySelector('img');
      function doPrint() {
        window.focus();
        window.print();
      }
      if (img && !img.complete) {
        img.addEventListener('load', doPrint);
        img.addEventListener('error', doPrint);
        // Fallback por si el evento nunca llega
        setTimeout(doPrint, 800);
      } else {
        setTimeout(doPrint, 150);
      }
    })();
  <\/script>`

  const html = `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <title>${esc(titulo)}</title>
  <style>${estilos}</style>
</head>
<body>
  ${contenido}
  ${scriptAutoPrint}
</body>
</html>`

  const ventana = window.open(
    'about:blank',
    nombreVentana,
    `width=${ancho},height=${alto},scrollbars=yes,resizable=yes`,
  )

  if (!ventana) {
    window.alert('Permite ventanas emergentes para imprimir el documento.')
    return
  }

  const doc = ventana.document
  doc.open()
  doc.write(html)
  doc.close()
  ventana.focus()
}

const LOGO_URL = `${window.location.origin}/logoBlanco.png`

const buildNotaEntregaContenido = (venta, { incluirBarraImpresion = true } = {}) => {
  const lineas = venta.servicios?.length
    ? venta.servicios
    : [{ nombre: venta.servicio, precio: venta.total }]

  const filas = lineas.map((s) => `
    <tr>
      <td>${esc(s.nombre)}</td>
      <td>${fmt(s.precio)}</td>
    </tr>
  `).join('')

  const barraImpresion = incluirBarraImpresion
    ? `<div class="print-bar no-print">
         <button type="button" onclick="window.print()">Imprimir</button>
       </div>`
    : ''

  const cuerpo = `
  <div class="brand-header">
    <img src="${LOGO_URL}" alt="Logo" class="brand-logo" crossorigin="anonymous" />
    <h1>Rim Challouf</h1>
  </div>
  <div class="header-info">
    <div class="report-meta">
      <p><strong>Cliente:</strong> ${esc(venta.cliente || '—')}</p>
      <p><strong>Doctor:</strong> ${esc(venta.doctor)}</p>
      <p style="color: #666;"><strong>Fecha:</strong> ${esc(formatearDMAHora(venta.fecha_venta) || ' ')}</p>
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
  </table>`

  const pagosHtml = venta.pagos?.length > 0
    ? `<div style="margin-top: 6px; padding-top: 5px; border-top: 1px dashed #999; font-size: 11px;">
        <p style="font-weight: 700; margin-bottom: 2px;">Métodos de Pago:</p>
        ${venta.pagos.map((p) => `<p style="display:flex; justify-content:space-between; margin:1px 0;"><span>${esc(p.metodo_pago)}${p.referencia ? ` (${esc(p.referencia)})` : ''}:</span> <strong>${fmt(p.monto)}</strong></p>`).join('')}
       </div>`
    : ''

  const pie = `<div class="total">Total: ${fmt(venta.total)}</div>${pagosHtml}`

  return `
  ${barraImpresion}
  <div class="nota-pagina">
    <div class="nota-cuerpo">${cuerpo}</div>
    <div class="nota-pie">${pie}</div>
  </div>`
}

const esperarImagenes = (contenedor) => {
  const imagenes = [...contenedor.querySelectorAll('img')]
  return Promise.all(
    imagenes.map((img) => {
      if (img.complete) return Promise.resolve()
      return new Promise((resolve) => {
        img.onload = resolve
        img.onerror = resolve
      })
    }),
  )
}

const descargarBlob = (blob, nombreArchivo) => {
  const url = URL.createObjectURL(blob)
  const enlace = document.createElement('a')
  enlace.href = url
  enlace.download = nombreArchivo
  document.body.appendChild(enlace)
  enlace.click()
  document.body.removeChild(enlace)
  URL.revokeObjectURL(url)
}

/** Normaliza los datos de venta para la nota de entrega */
export const prepararVentaParaNota = (venta) => ({
  ...venta,
  fecha_venta: venta.fecha_venta
    ?? [venta.fecha, venta.hora].filter(Boolean).join(' ')
    ?? '',
})

/**
 * Nota de entrega: cabecera con empresa, doctor y tratamientos; lista y total.
 */
export const abrirNotaEntrega = (venta) => {
  const datos = prepararVentaParaNota(venta)
  abrirVentanaImpresion(
    'Nota de Entrega — Rim Challouf',
    buildNotaEntregaContenido(datos),
    `nota_${datos.id}`,
  )
}

/**
 * Imprime la nota de entrega directamente sin mostrar la ventana de previsualización.
 * Abre el popup y dispara window.print() de forma automática.
 */
export const imprimirNotaEntrega = (venta) => {
  const datos = prepararVentaParaNota(venta)
  imprimirVentanaDirecta(
    'Nota de Entrega — Rim Challouf',
    buildNotaEntregaContenido(datos, { incluirBarraImpresion: false }),
    `imprimir_nota_${datos.id}`,
  )
}

/** Descarga la nota de entrega como imagen PNG (hoja A4 completa) */
export const descargarNotaEntrega = async (venta) => {
  const datos = prepararVentaParaNota(venta)
  const contenedor = document.createElement('div')
  contenedor.className = 'nota-export-root'
  contenedor.style.cssText = 'position: fixed; left: -9999px; top: 0;'

  const estilos = document.createElement('style')
  estilos.textContent = `${PRINT_STYLES}
    .nota-export-root {
      font-family: Arial, Helvetica, sans-serif;
      font-size: 13px;
      line-height: 1.45;
    }`
  contenedor.appendChild(estilos)

  const contenido = document.createElement('div')
  contenido.innerHTML = buildNotaEntregaContenido(datos, { incluirBarraImpresion: false })
  contenedor.appendChild(contenido)

  document.body.appendChild(contenedor)

  try {
    await esperarImagenes(contenedor)

    const canvas = await html2canvas(contenedor, {
      backgroundColor: '#ffffff',
      scale: 2,
      useCORS: true,
      logging: false,
      width: 794,
      height: 1123,
      windowWidth: 794,
      windowHeight: 1123,
    })

    const blob = await new Promise((resolve, reject) => {
      canvas.toBlob(
        (resultado) => (resultado ? resolve(resultado) : reject(new Error('No se pudo generar la imagen.'))),
        'image/png',
      )
    })

    descargarBlob(blob, `nota-entrega-${datos.id}.png`)
  } finally {
    document.body.removeChild(contenedor)
  }
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
      <td>${esc(formatearHora12(c.hora) || c.hora)}</td>
      <td>${fmt(c.monto)}</td>
    </tr>
  `).join('')

  const total = datos.ingresos_dia ?? totalVentas + totalCashea

  const contenido = `
  <div class="brand-header">
    <img src="${LOGO_URL}" alt="Logo" class="brand-logo" crossorigin="anonymous" />
    <h1>Rim Challouf</h1>
  </div>
  <div class="header-info">
    <div class="report-meta">
      <p style="font-weight: 700;">Reporte de Ventas</p>
      <p><strong>Fecha:</strong> ${fechaReporte ? esc(formatearDMAHora(fechaReporte) || formatearDMA(fechaReporte)) : ' '}</p>
    </div>
  </div>
  <table>
    <thead>
      <tr>
        <th style="width:22%">Doc.</th>
        <th style="width:48%">Trat.</th>
        <th style="width:30%">Precio</th>
      </tr>
    </thead>
    <tbody>
      ${filas || '<tr><td colspan="3" style="text-align:center;color:#666;">Sin ventas</td></tr>'}
    </tbody>
  </table>
  ${cuotas.length > 0 ? `
  <p style="margin: 8px 0 4px; font-weight: 700; font-size: 12px;">Cuotas Cashea</p>
  <table>
    <thead>
      <tr>
        <th style="width:40%">Concepto</th>
        <th style="width:25%">Hora</th>
        <th style="width:35%">Monto</th>
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

/**
 * Plantilla de impresión para Cierre de Caja con desglose por métodos de pago y asistentes
 * Formato: Hoja normal completa (Carta / A4) - Diseño Minimalista
 */
export const buildCierreCajaContenido = (datos, { incluirBarraImpresion = true } = {}) => {
  const fecha = datos.fecha || ''
  const metodos = datos.metodos || []
  const usuarios = datos.usuarios || []
  const transacciones = datos.transacciones || []
  const totalCaja = datos.total_caja ?? metodos.reduce((sum, m) => sum + m.total, 0)
  const totalTransacciones = datos.total_transacciones ?? transacciones.length
  const totalVentasConteo = datos.total_ventas_conteo ?? transacciones.length

  const barraImpresion = incluirBarraImpresion
    ? `<div class="print-action-bar no-print">
         <button type="button" onclick="window.print()">Imprimir Cierre de Caja</button>
       </div>`
    : ''

  const filasMetodos = metodos.map((m) => `
    <tr>
      <td style="font-weight: 600;">${esc(m.metodo_pago)}</td>
      <td class="center">${m.cantidad}</td>
      <td class="center">${m.porcentaje || 0}%</td>
      <td class="numeric" style="font-weight: 700;">${fmt(m.total)}</td>
    </tr>
  `).join('')

  const filasUsuarios = usuarios.map((u) => {
    const metodosStr = u.metodos?.map((m) => `${esc(m.metodo_pago)}: ${fmt(m.total)}`).join(' · ') || '—'
    return `
    <tr>
      <td style="font-weight: 600; color: #0f172a;">${esc(u.usuario_nombre)}</td>
      <td class="center">${u.total_ventas || 1}</td>
      <td style="color: #64748b; font-size: 11px;">${metodosStr}</td>
      <td class="numeric" style="font-weight: 700;">${fmt(u.total_caja)}</td>
    </tr>
  `}).join('')

  const filasTransacciones = transacciones.map((t, index) => `
    <tr>
      <td class="center" style="color: #64748b; font-family: monospace;">${index + 1}</td>
      <td class="center" style="font-family: monospace; font-weight: 600;">${esc(formatearHora12(t.hora) || t.hora)}</td>
      <td>
        <span style="font-weight: 600; color: #0f172a;">${esc(t.cliente || '—')}</span>
        ${t.cliente_cedula ? `<span style="display: block; font-size: 10px; color: #64748b; font-family: monospace;">CI: ${esc(t.cliente_cedula)}</span>` : ''}
      </td>
      <td style="color: #334155;">${esc(t.doctor || '—')}</td>
      <td style="color: #334155;">${esc(t.tratamientos || '—')}</td>
      <td>
        <span class="badge-metodo">${esc(t.metodo_pago)}</span>
      </td>
      <td style="color: #64748b; font-family: monospace; font-size: 11px;">${esc(t.referencia || '—')}</td>
      <td style="color: #334155; font-size: 11px;">${esc(t.usuario || '—')}</td>
      <td class="numeric" style="font-weight: 700; color: #0f172a;">${fmt(t.monto)}</td>
    </tr>
  `).join('')

  const ahora = new Date()
  const horaImpresion = formatearHora12(
    `${String(ahora.getHours()).padStart(2, '0')}:${String(ahora.getMinutes()).padStart(2, '0')}`
  )

  return `
  ${barraImpresion}
  <div>
    <!-- Encabezado Institucional -->
    <div class="report-page-header">
      <div class="report-brand">
        <img src="${LOGO_URL}" alt="Rim Challouf Logo" crossorigin="anonymous" />
        <div>
          <h1>Rim Challouf</h1>
          <p>Consultorio Odontológico · Control de Ventas</p>
        </div>
      </div>
      <div class="report-doc-title">
        <h2>Cierre de Caja</h2>
        <p>Fecha: <strong>${esc(formatearDMA(fecha) || fecha)}</strong> · Emisión: <strong>${horaImpresion}</strong></p>
      </div>
    </div>

    <!-- KPIs Principales -->
    <div class="report-kpis">
      <div class="report-kpi-card highlight">
        <p class="report-kpi-title">Total Ingresado a Caja</p>
        <p class="report-kpi-value">${fmt(totalCaja)}</p>
      </div>
      <div class="report-kpi-card">
        <p class="report-kpi-title">Ventas Realizadas</p>
        <p class="report-kpi-value">${totalVentasConteo}</p>
      </div>
      <div class="report-kpi-card">
        <p class="report-kpi-title">Cobros Registrados</p>
        <p class="report-kpi-value">${totalTransacciones}</p>
      </div>
      ${datos.total_cuotas_cashea > 0 ? `
      <div class="report-kpi-card">
        <p class="report-kpi-title">Cuotas Cashea</p>
        <p class="report-kpi-value">${fmt(datos.total_cuotas_cashea)}</p>
      </div>` : ''}
    </div>

    <!-- Tablas de Resumen: Métodos de Pago y Asistentes -->
    <div class="two-col-grid">
      <!-- Resumen por Métodos -->
      <div>
        <h3 class="section-title">Resumen por Métodos de Pago</h3>
        <table class="data-table">
          <thead>
            <tr>
              <th>Método</th>
              <th class="center" style="width: 55px;">Cant.</th>
              <th class="center" style="width: 45px;">%</th>
              <th class="numeric" style="width: 85px;">Total</th>
            </tr>
          </thead>
          <tbody>
            ${filasMetodos || '<tr><td colspan="4" class="center" style="color: #94a3b8;">Sin movimientos</td></tr>'}
          </tbody>
        </table>
      </div>

      <!-- Resumen por Asistentes -->
      <div>
        <h3 class="section-title">Cobros por Asistente / Usuario</h3>
        <table class="data-table">
          <thead>
            <tr>
              <th>Asistente</th>
              <th class="center" style="width: 45px;">Ventas</th>
              <th>Desglose</th>
              <th class="numeric" style="width: 80px;">Total</th>
            </tr>
          </thead>
          <tbody>
            ${filasUsuarios || '<tr><td colspan="4" class="center" style="color: #94a3b8;">Sin cobros registrados</td></tr>'}
          </tbody>
        </table>
      </div>
    </div>

    <!-- Detalle de Todas las Transacciones -->
    <h3 class="section-title">Detalle de Movimientos de Caja</h3>
    <table class="data-table">
      <thead>
        <tr>
          <th class="center" style="width: 25px;">#</th>
          <th class="center" style="width: 50px;">Hora</th>
          <th>Cliente</th>
          <th>Doctor</th>
          <th>Tratamiento(s)</th>
          <th>Método</th>
          <th>Ref / Nota</th>
          <th>Asistente</th>
          <th class="numeric" style="width: 80px;">Monto</th>
        </tr>
      </thead>
      <tbody>
        ${filasTransacciones || '<tr><td colspan="9" class="center" style="color: #94a3b8; padding: 20px;">No hay transacciones registradas para esta fecha</td></tr>'}
      </tbody>
      <tfoot>
        <tr style="background: #f8fafc; font-weight: 700; border-top: 2px solid #94a3b8;">
          <td colspan="8" style="text-align: right; padding: 8px 10px; font-size: 12px; text-transform: uppercase;">Total General en Caja:</td>
          <td class="numeric" style="font-size: 13px; color: #0f172a; padding: 8px 10px;">${fmt(totalCaja)}</td>
        </tr>
      </tfoot>
    </table>

    <!-- Pie del Reporte y Firmas -->
    <div class="report-footer">
      <div>
        <p><strong>Consultorio Odontológico Rim Challouf</strong></p>
        <p>Control Interno y Arqueo de Caja</p>
      </div>
      <div style="text-align: center; border-top: 1px solid #94a3b8; width: 200px; padding-top: 4px; margin-top: 15px;">
        <p style="font-weight: 600; color: #334155;">Responsable de Caja</p>
        <p style="font-size: 10px; color: #94a3b8;">Firma</p>
      </div>
    </div>
  </div>
  `
}

/**
 * Abre la ventana de previsualización para imprimir el Cierre de Caja en hoja normal
 */
export const abrirCierreCaja = (datos) => {
  abrirVentanaImpresion(
    `Cierre de Caja — Rim Challouf (${formatearDMA(datos.fecha) || datos.fecha || ''})`,
    buildCierreCajaContenido(datos),
    'cierre_caja',
    { estilos: REPORT_HOJA_STYLES, ancho: 960, alto: 850 },
  )
}

/**
 * Imprime directamente el Cierre de Caja en hoja normal
 */
export const imprimirCierreCaja = (datos) => {
  imprimirVentanaDirecta(
    `Cierre de Caja — Rim Challouf (${formatearDMA(datos.fecha) || datos.fecha || ''})`,
    buildCierreCajaContenido(datos, { incluirBarraImpresion: false }),
    'imprimir_cierre_caja',
    { estilos: REPORT_HOJA_STYLES, ancho: 960, alto: 850 },
  )
}

