// =============================================================================
// hooks/useServerDate.js
// Obtiene la fecha actual desde el servidor PHP para evitar depender del
// reloj local del cliente (que puede estar mal configurado).
// =============================================================================
import { useState, useEffect } from 'react'

const API_BASE = import.meta.env.DEV
  ? '/api'
  : 'https://rimconsultorio.com/backend'

// Cache y offset para el cálculo dinámico de la hora del servidor
let _cached = null
let _promise = null
let _timeOffsetMs = 0          // Diferencia (Servidor UTC - Cliente Local UTC)
let _serverTimezoneOffsetMs = 0 // Offset del servidor (ej. America/New_York)
let _syncError = null

/** Devuelve la fecha/hora actual del servidor en tiempo real (calculada) */
export const getActualServerDatetime = () => {
  if (_timeOffsetMs === 0 && _serverTimezoneOffsetMs === 0) {
    return '' // No sincronizado aún
  }
  // Hora UTC actual real (asumiendo que _timeOffsetMs corrige el reloj del cliente)
  const currentUtcMs = Date.now() + _timeOffsetMs
  // Ajustamos al timezone del servidor
  const serverLocalMs = currentUtcMs + _serverTimezoneOffsetMs
  return new Date(serverLocalMs).toISOString().slice(0, 16)
}

/** Devuelve la fecha "YYYY-MM-DD" actual del servidor en tiempo real */
export const getActualServerDate = () => {
  const dt = getActualServerDatetime()
  return dt ? dt.slice(0, 10) : ''
}

async function fetchServerDate() {
  if (_cached) return _cached

  if (!_promise) {
    _promise = fetch(`${API_BASE}/server_date.php`, { cache: 'no-store' })
      .then((r) => {
        if (!r.ok) {
          throw new Error('No se pudo establecer conexión con el servidor de fecha y hora.')
        }
        return r.json()
      })
      .then((data) => {
        if (data?.success && data?.timestamp !== undefined) {
          _timeOffsetMs = data.timestamp - Date.now()
          _serverTimezoneOffsetMs = data.timezone_offset || 0
          _cached = getActualServerDate()
          _syncError = null
        } else {
          throw new Error(data?.message || 'La respuesta del servidor de fecha y hora es inválida.')
        }
        return _cached
      })
      .catch((err) => {
        _syncError = err.message || 'Error de sincronización con Internet.'
        _cached = null
        return null
      })
  }

  return _promise
}

export function useServerDate() {
  const [hoy, setHoy] = useState(() => _cached ?? '')
  const [datetime, setDatetime] = useState(() => _cached ? getActualServerDatetime() : '')
  const [cargando, setCargando] = useState(!_cached)
  const [error, setError] = useState(_syncError)

  useEffect(() => {
    if (_cached) {
      setHoy(getActualServerDate())
      setDatetime(getActualServerDatetime())
      setError(null)
      setCargando(false)
      return
    }

    if (_syncError) {
      setError(_syncError)
      setCargando(false)
      return
    }

    let activo = true
    setCargando(true)
    fetchServerDate().then((res) => {
      if (activo) {
        if (res) {
          setHoy(getActualServerDate())
          setDatetime(getActualServerDatetime())
          setError(null)
        } else {
          setError(_syncError || 'Error de sincronización de hora.')
        }
        setCargando(false)
      }
    })
    return () => { activo = false }
  }, [])

  return { hoy, datetime, cargando, error }
}
