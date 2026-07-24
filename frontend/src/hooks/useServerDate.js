// =============================================================================
// hooks/useServerDate.js
// Obtiene la fecha actual desde el servidor PHP para evitar depender del
// reloj local del cliente (que puede estar mal configurado).
// =============================================================================
import { useState, useEffect } from 'react'
import { hoyISO } from '../utils/fechas'

const API_BASE = import.meta.env.DEV
  ? '/api'
  : 'https://rimconsultorio.com/backend'

// Cache y offset para el cálculo dinámico de la hora del servidor
let _cached = null
let _promise = null
let _timeOffsetMs = 0          // Diferencia (Servidor UTC - Cliente Local UTC)
let _serverTimezoneOffsetMs = 0 // Offset del servidor (ej. America/New_York)

/** Devuelve YYYY-MM-DDTHH:mm usando la hora local del cliente (fallback) */
const getLocalDatetime = () => {
  const ahora = new Date()
  const offsetMs = ahora.getTimezoneOffset() * 60 * 1000
  const local = new Date(ahora.getTime() - offsetMs)
  return local.toISOString().slice(0, 16)
}

/** Devuelve la fecha/hora actual del servidor en tiempo real (calculada) */
export const getActualServerDatetime = () => {
  if (_timeOffsetMs === 0 && _serverTimezoneOffsetMs === 0) {
    return getLocalDatetime() // No sincronizado aún
  }
  // Hora UTC actual real (asumiendo que _timeOffsetMs corrige el reloj del cliente)
  const currentUtcMs = Date.now() + _timeOffsetMs
  // Ajustamos al timezone del servidor
  const serverLocalMs = currentUtcMs + _serverTimezoneOffsetMs
  return new Date(serverLocalMs).toISOString().slice(0, 16)
}

/** Devuelve la fecha "YYYY-MM-DD" actual del servidor en tiempo real */
export const getActualServerDate = () => {
  return getActualServerDatetime().slice(0, 10)
}

async function fetchServerDate() {
  if (_cached) return _cached

  if (!_promise) {
    _promise = fetch(`${API_BASE}/server_date.php`, { cache: 'no-store' })
      .then((r) => r.json())
      .then((data) => {
        if (data?.success && data?.timestamp !== undefined) {
          _timeOffsetMs = data.timestamp - Date.now()
          _serverTimezoneOffsetMs = data.timezone_offset || 0
          _cached = getActualServerDate()
        } else {
          _cached = hoyISO()
        }
        return _cached
      })
      .catch(() => {
        _cached = hoyISO()
        return _cached
      })
  }

  return _promise
}

export function useServerDate() {
  const [hoy, setHoy] = useState(() => _cached ?? hoyISO())
  // El datetime inicial de cuando se llama al hook
  const [datetime, setDatetime] = useState(() => getActualServerDatetime())
  const [cargando, setCargando] = useState(!_cached)

  useEffect(() => {
    if (_cached) {
      setHoy(getActualServerDate())
      setDatetime(getActualServerDatetime())
      setCargando(false)
      return
    }

    let activo = true
    setCargando(true)
    fetchServerDate().then(() => {
      if (activo) {
        setHoy(getActualServerDate())
        setDatetime(getActualServerDatetime())
        setCargando(false)
      }
    })
    return () => { activo = false }
  }, [])

  return { hoy, datetime, cargando }
}
