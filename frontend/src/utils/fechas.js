// =============================================================================
// utils/fechas.js — Helpers de fecha para filtros de ventas
// =============================================================================

export const hoyISO = () => {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

export const ayerISO = () => {
  const d = parseFechaLocal(hoyISO())
  d.setDate(d.getDate() - 1)
  return toISO(d)
}

export const parseFechaLocal = (iso) => {
  const [y, m, d] = iso.split('-').map(Number)
  return new Date(y, m - 1, d)
}

export const toISO = (d) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`

export const esHoy = (fecha) => fecha === hoyISO()

export const esAyer = (fecha) => fecha === ayerISO()

export const formatearFechaLarga = (fecha) =>
  parseFechaLocal(fecha).toLocaleDateString('es-MX', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })

/** Formato día/mes/año — ej: 05/07/2026 */
export const formatearDMA = (fecha) => {
  const d = parseFechaLocal(fecha)
  const dia = String(d.getDate()).padStart(2, '0')
  const mes = String(d.getMonth() + 1).padStart(2, '0')
  const anio = d.getFullYear()
  return `${dia}/${mes}/${anio}`
}

export const formatearFechaCorta = (fecha) => formatearDMA(fecha)

export const etiquetaVentas = (fecha) =>
  esHoy(fecha) ? 'Ventas de Hoy' : `Ventas del ${formatearDMA(fecha)}`

export const mensajeVacioVentas = (fecha) =>
  esHoy(fecha)
    ? 'No hay ventas registradas hoy'
    : `No hay ventas registradas el ${formatearDMA(fecha)}`

export const sumarDias = (fecha, dias) => {
  const d = parseFechaLocal(fecha)
  d.setDate(d.getDate() + dias)
  return toISO(d)
}
