// =============================================================================
// utils/fechas.js — Helpers de fecha (visualización siempre día/mes/año)
// =============================================================================

/**
 * Extrae YYYY-MM-DD de ISO, datetime-local o "YYYY-MM-DD HH:mm:ss".
 */
const extraerFechaISO = (fecha) => {
  if (!fecha) return ''
  const s = String(fecha).trim().replace('T', ' ')
  const m = s.match(/(\d{4})-(\d{2})-(\d{2})/)
  return m ? `${m[1]}-${m[2]}-${m[3]}` : ''
}

/**
 * Extrae HH:mm de un datetime o de un string "HH:mm" / "HH:mm:ss".
 */
const extraerHora = (fechaOHora) => {
  if (!fechaOHora) return ''
  const s = String(fechaOHora).trim().replace('T', ' ')
  const conFecha = s.match(/\d{4}-\d{2}-\d{2}[ T](\d{2}):(\d{2})/)
  if (conFecha) return `${conFecha[1]}:${conFecha[2]}`
  const soloHora = s.match(/^(\d{1,2}):(\d{2})(?::\d{2})?$/)
  if (soloHora) {
    return `${String(Number(soloHora[1])).padStart(2, '0')}:${soloHora[2]}`
  }
  return ''
}

/**
 * Convierte hora 24h a 12h con am/pm — ej: "17:02" → "5:02 pm"
 * Acepta datetime completo o solo "HH:mm".
 */
export const formatearHora12 = (fechaOHora) => {
  const hhmm = extraerHora(fechaOHora)
  if (!hhmm) return ''
  const [hStr, mStr] = hhmm.split(':')
  let h = Number(hStr)
  if (!Number.isFinite(h)) return ''
  const sufijo = h >= 12 ? 'pm' : 'am'
  h = h % 12
  if (h === 0) h = 12
  return `${h}:${mStr} ${sufijo}`
}

/**
 * Devuelve la fecha actual en formato YYYY-MM-DD (uso interno / API).
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
  const clean = extraerFechaISO(iso) || String(iso)
  const parts = clean.split('-').map(Number)
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

/** Formato día/mes/año — ej: 19/08/2026 */
export const formatearDMA = (fecha) => {
  if (!fecha) return ''
  const clean = extraerFechaISO(fecha)
  if (!clean) return ''
  const d = parseFechaLocal(clean)
  if (isNaN(d.getTime())) return ''
  const dia = String(d.getDate()).padStart(2, '0')
  const mes = String(d.getMonth() + 1).padStart(2, '0')
  const anio = d.getFullYear()
  return `${dia}/${mes}/${anio}`
}

/** Formato día/mes/año · hora 12h — ej: 19/08/2026 · 5:02 pm */
export const formatearDMAHora = (fecha) => {
  const dma = formatearDMA(fecha)
  if (!dma) return ''
  const hora = formatearHora12(fecha)
  return hora ? `${dma} · ${hora}` : dma
}

/** Alias histórico — mismo formato día/mes/año */
export const formatearDMAa = (fecha) => formatearDMA(fecha)

export const formatearFechaCorta = (fecha) => formatearDMA(fecha)

/** Misma convención visual día/mes/año */
export const formatearFechaLarga = (fecha) => formatearDMA(fecha)

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
