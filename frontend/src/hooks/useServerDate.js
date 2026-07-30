// =============================================================================
// hooks/useServerDate.js
// Obtiene la fecha actual desde el servidor PHP para evitar depender del
// reloj local del cliente (que puede estar mal configurado).
// Reintenta hasta obtener respuesta del servidor; nunca usa hora del dispositivo.
// =============================================================================
import { useState, useEffect } from 'react'

const API_BASE = import.meta.env.DEV
  ? '/api'
  : 'https://rimconsultorio.com/backend'

const RETRY_BASE_MS = 800
const RETRY_MAX_MS = 8000
const FETCH_TIMEOUT_MS = 12000
const MAX_INTENTOS = 20

const sleep = (ms) => new Promise((resolve) => { setTimeout(resolve, ms) })

const mensajeErrorConexion = () => (
  'No se pudo conectar con el servidor. Verifica tu conexión a Internet e intenta de nuevo.'
)

// Cache y offset para el cálculo dinámico de la hora del servidor
let _cached = null
let _promise = null
let _synced = false
let _timeOffsetMs = 0
let _serverTimezoneOffsetMs = 0
let _cargando = true
let _intentos = 0
let _error = null

const listeners = new Set()

/** Indica si la hora del servidor/internet ya fue sincronizada */
export const isServerDateSynced = () => _synced

/** Devuelve la fecha/hora actual del servidor en tiempo real (calculada) */
export const getActualServerDatetime = () => {
  if (!_synced) return ''
  const currentUtcMs = Date.now() + _timeOffsetMs
  const serverLocalMs = currentUtcMs + _serverTimezoneOffsetMs
  return new Date(serverLocalMs).toISOString().slice(0, 16)
}

/** Devuelve la fecha "YYYY-MM-DD" actual del servidor en tiempo real */
export const getActualServerDate = () => {
  const dt = getActualServerDatetime()
  return dt ? dt.slice(0, 10) : ''
}

const notificar = () => {
  listeners.forEach((fn) => fn())
}

const resetSincronizacion = () => {
  _cached = null
  _promise = null
  _synced = false
  _timeOffsetMs = 0
  _serverTimezoneOffsetMs = 0
  _cargando = true
  _intentos = 0
  _error = null
}

/** Reinicia la sincronización (p. ej. desde el botón Reintentar) */
export const reintentarSincronizacionHora = () => {
  resetSincronizacion()
  notificar()
  return fetchServerDateUntilSuccess()
}

async function fetchServerDateOnce() {
  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS)

  try {
    const response = await fetch(`${API_BASE}/server_date.php`, {
      cache: 'no-store',
      signal: controller.signal,
    })
    if (!response.ok) {
      throw new Error('El servidor de fecha respondió con un error.')
    }
    const data = await response.json()
    if (data?.success && data?.timestamp !== undefined) {
      _timeOffsetMs = data.timestamp - Date.now()
      _serverTimezoneOffsetMs = data.timezone_offset || 0
      _synced = true
      _cached = getActualServerDate()
      _cargando = false
      _error = null
      return _cached
    }
    throw new Error(data?.message || 'La respuesta del servidor de fecha y hora es inválida.')
  } catch (err) {
    if (err.name === 'AbortError') {
      throw new Error('El servidor tardó demasiado en responder.')
    }
    throw err
  } finally {
    clearTimeout(timeoutId)
  }
}

async function fetchServerDateUntilSuccess() {
  if (_cached) return _cached

  if (!_promise) {
    _cargando = true
    _error = null
    notificar()

    _promise = (async () => {
      while (_intentos < MAX_INTENTOS) {
        _intentos += 1
        notificar()
        try {
          const result = await fetchServerDateOnce()
          notificar()
          return result
        } catch (err) {
          console.warn(`Sincronización de hora (intento ${_intentos}):`, err.message)
          if (_intentos >= MAX_INTENTOS) {
            _cargando = false
            _error = mensajeErrorConexion()
            notificar()
            return null
          }
          const delay = Math.min(RETRY_BASE_MS * _intentos, RETRY_MAX_MS)
          await sleep(delay)
        }
      }
      return null
    })().finally(() => {
      _promise = null
    })
  }

  return _promise
}

export function useServerDate() {
  const [estado, setEstado] = useState(() => ({
    hoy: _cached ?? '',
    datetime: _synced ? getActualServerDatetime() : '',
    cargando: _cargando && !_error,
    error: _error,
    intentos: _intentos,
  }))

  useEffect(() => {
    const actualizar = () => {
      setEstado({
        hoy: getActualServerDate(),
        datetime: getActualServerDatetime(),
        cargando: _cargando && !_error,
        error: _error,
        intentos: _intentos,
      })
    }

    listeners.add(actualizar)
    fetchServerDateUntilSuccess().then(() => {
      if (_synced || _error) actualizar()
    })

    return () => listeners.delete(actualizar)
  }, [])

  return estado
}
