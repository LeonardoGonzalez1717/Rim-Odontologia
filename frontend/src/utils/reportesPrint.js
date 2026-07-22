/**
 * Plantillas de impresión simplificadas para notas de entrega y reportes de ventas.
 */

import html2canvas from 'html2canvas'

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
    'width=320,height=680,scrollbars=yes,resizable=yes',
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
      <p style="color: #666;"><strong>Fecha:</strong> ${esc(venta.fecha_venta || ' ')}</p>
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

  const pie = `<div class="total">Total: ${fmt(venta.total)}</div>`

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
      <td>${esc(c.hora)}</td>
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
      <p><strong>Fecha:</strong> ${fechaReporte ? esc(fechaReporte) : ' '}</p>
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