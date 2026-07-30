// =============================================================================
// utils/fechas.js — Helpers de fecha para filtros de ventas
// =============================================================================

/**
 * Devuelve la fecha actual en formato YYYY-MM-DD.
 * @param {string} [fechaBase] — Si se provee, se usa en lugar del reloj local
 *   del cliente (pasar la fecha obtenida del servidor para mayor precisión).
 */
export const hoyISO = (fechaBase) => {
  if (fechaBase) return String(fechaBase).slice(0, 10)
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

/**
 * Devuelve la fecha de ayer en formato YYYY-MM-DD.
 * @param {string} [fechaBase] — Base para calcular «ayer» (fecha del servidor).
 */
export const ayerISO = (fechaBase) => {
  const d = parseFechaLocal(hoyISO(fechaBase))
  d.setDate(d.getDate() - 1)
  return toISO(d)
}

export const parseFechaLocal = (iso) => {
  if (!iso) return new Date(NaN)
  const parts = String(iso).split('-').map(Number)
  if (parts.length < 3 || parts.some(isNaN)) return new Date(NaN)
  const [y, m, d] = parts
  return new Date(y, m - 1, d)
}

export const toISO = (d) => {
  if (!d || isNaN(d.getTime())) return ''
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

/** @param {string} fecha @param {string} [fechaBase] */
export const esHoy = (fecha, fechaBase) => fecha && fecha === hoyISO(fechaBase)

/** @param {string} fecha @param {string} [fechaBase] */
export const esAyer = (fecha, fechaBase) => fecha && fecha === ayerISO(fechaBase)

/** true si la fecha es anterior al día actual
 * @param {string} fecha @param {string} [fechaBase] */
export const esFechaPasada = (fecha, fechaBase) => fecha && fecha < hoyISO(fechaBase)

export const formatearFechaLarga = (fecha) => {
  if (!fecha) return ''
  const d = parseFechaLocal(fecha)
  if (isNaN(d.getTime())) return ''
  return d.toLocaleDateString('es-MX', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })
}

/** Formato día/mes/año — ej: 05/07/2026 */
export const formatearDMA = (fecha) => {
  if (!fecha) return ''
  const clean = String(fecha).slice(0, 10)
  if (!clean.includes('-')) return ''
  const d = parseFechaLocal(clean)
  if (isNaN(d.getTime())) return ''
  const dia = String(d.getDate()).padStart(2, '0')
  const mes = String(d.getMonth() + 1).padStart(2, '0')
  const anio = d.getFullYear()
  return `${dia}/${mes}/${anio}`
}

/** Formato día-mes-año corto — ej: 15-07-26 */
export const formatearDMAa = (fecha) => {
  if (!fecha) return ''
  const clean = String(fecha).slice(0, 10)
  if (!clean.includes('-')) return ''
  const d = parseFechaLocal(clean)
  if (isNaN(d.getTime())) return ''
  const dia = String(d.getDate()).padStart(2, '0')
  const mes = String(d.getMonth() + 1).padStart(2, '0')
  const anio = String(d.getFullYear()).slice(-2)
  return `${dia}-${mes}-${anio}`
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
