// =============================================================================
// api/api.js — Módulo centralizado para todas las llamadas al backend PHP
// Configuración:
//   - Desarrollo (Vite): /api → proxy en vite.config.js → backend PHP
//   - Producción (Apache): ruta directa al backend en htdocs
// =============================================================================

const API_BASE = import.meta.env.DEV
  ? '/api'
  : 'https://rimconsultorio.freedev.app/backend'

// ─── Overlay de carga global ──────────────────────────────────────────────────
const DEBOUNCE_CARGA_MS = 400
let peticionesActivas = 0
let debounceTimer = null

const estadoCarga = { visible: false, mensaje: 'Cargando datos…' }
const listenersCarga = new Set()

function notificarCargaBackend() {
  const snapshot = { ...estadoCarga }
  listenersCarga.forEach((fn) => fn(snapshot))
}

function actualizarOverlayCarga() {
  const hayCarga = peticionesActivas > 0
  if (!hayCarga) {
    clearTimeout(debounceTimer)
    debounceTimer = null
    if (estadoCarga.visible) {
      estadoCarga.visible = false
      notificarCargaBackend()
    }
    return
  }
  if (estadoCarga.visible) { notificarCargaBackend(); return }
  if (!debounceTimer) {
    debounceTimer = setTimeout(() => {
      debounceTimer = null
      if (peticionesActivas > 0) {
        estadoCarga.visible = true
        notificarCargaBackend()
      }
    }, DEBOUNCE_CARGA_MS)
  }
}

function iniciarPeticionBackend() {
  peticionesActivas++
  actualizarOverlayCarga()
  return () => {
    peticionesActivas = Math.max(0, peticionesActivas - 1)
    actualizarOverlayCarga()
  }
}

/** Suscripción para el spinner global (BackendLoader) */
export function suscribirCargaBackend(callback) {
  listenersCarga.add(callback)
  callback({ ...estadoCarga })
  return () => listenersCarga.delete(callback)
}

// ─── Mensajes de error descriptivos ──────────────────────────────────────────
const mensajePorStatus = (status) => {
  switch (status) {
    case 400: return 'La solicitud no es válida. Revisa los datos enviados.'
    case 401: return 'No autorizado. Verifica tu usuario y contraseña.'
    case 403: return 'No tienes permiso para realizar esta acción.'
    case 404: return 'No se encontró el endpoint. Verifica que los archivos PHP estén en el servidor.'
    case 405: return 'Método no permitido para esta operación.'
    case 408:
    case 504: return 'El servidor tardó demasiado en responder. Intenta de nuevo.'
    case 500: return 'Error interno del servidor. Contacta al administrador.'
    case 502:
    case 503: return 'El servidor no está disponible en este momento. Intenta más tarde.'
    default:
      if (status >= 500) return `Error del servidor (${status}). Intenta de nuevo más tarde.`
      if (status >= 400) return `Error en la solicitud (${status}). No se pudo completar la operación.`
      return `Error HTTP ${status}.`
  }
}

const mensajeRespuestaNoJson = (response, raw) => {
  const cuerpo = raw.trim()
  const preview = cuerpo.slice(0, 120).toLowerCase()
  if (!cuerpo) {
    return response.ok
      ? 'El servidor respondió vacío. Verifica que Apache y PHP estén activos.'
      : `${mensajePorStatus(response.status)} (sin contenido en la respuesta).`
  }
  if (preview.startsWith('<!doctype') || preview.startsWith('<html')) {
    return response.status === 404
      ? 'No se encontró el backend. Verifica que los archivos PHP estén desplegados.'
      : 'El servidor devolvió HTML en lugar de JSON. Puede haber un error de PHP.'
  }
  if (preview.includes('fatal error') || preview.includes('parse error')
    || preview.includes('warning:') || preview.includes('notice:')) {
    return 'Error en el servidor PHP. Revisa los logs de Apache.'
  }
  return response.ok
    ? 'El servidor no devolvió JSON válido.'
    : `${mensajePorStatus(response.status)} La respuesta no tiene formato JSON válido.`
}

const mensajeErrorRed = () => (
  import.meta.env.DEV
    ? 'No se pudo conectar con el backend local. ¿Está Apache/XAMPP activo?'
    : 'No se pudo conectar con el servidor. Verifica tu conexión a internet.'
)

// ─── Lógica de reintentos ─────────────────────────────────────────────────────
const RETRY_MAX = 2
const RETRY_BASE_MS = 500
const sleep = (ms) => new Promise((resolve) => { setTimeout(resolve, ms) })

const esRespuestaHtml = (raw) => {
  const preview = raw.trim().slice(0, 120).toLowerCase()
  return preview.startsWith('<!doctype') || preview.startsWith('<html')
}

const esReintentable = (response, raw, err) => {
  if (err) return err instanceof TypeError || /failed to fetch|network|load failed|aborted/i.test(err.message ?? '')
  if ([408, 429, 502, 503, 504].includes(response?.status)) return true
  if (!raw.trim()) return true
  return esRespuestaHtml(raw)
}

/**
 * Helper interno: fetch con reintentos ante fallos de red o respuestas inválidas.
 * @param {string} url
 * @param {RequestInit} options
 * @param {number} intento
 * @returns {Promise<any>} Datos JSON parseados
 */
async function apiFetch(url, options = {}, intento = 0, finPeticion = null) {
  const fin = finPeticion ?? iniciarPeticionBackend()
  const esRaiz = finPeticion === null

  try {
    let response
    try {
      response = await fetch(url, {
        cache: 'no-store',
        headers: { 'Content-Type': 'application/json', ...options.headers },
        ...options,
      })
    } catch (err) {
      if (intento < RETRY_MAX && esReintentable(null, '', err)) {
        await sleep(RETRY_BASE_MS * (intento + 1))
        return apiFetch(url, options, intento + 1, fin)
      }
      const esRed = err instanceof TypeError || /failed to fetch|network|load failed/i.test(err.message ?? '')
      throw new Error(esRed ? mensajeErrorRed() : (err.message || 'Error de red al contactar el servidor.'))
    }

    const raw = await response.text()
    let data
    try {
      data = JSON.parse(raw)
    } catch {
      if (intento < RETRY_MAX && esReintentable(response, raw, null)) {
        await sleep(RETRY_BASE_MS * (intento + 1))
        return apiFetch(url, options, intento + 1, fin)
      }
      throw new Error(mensajeRespuestaNoJson(response, raw))
    }

    if (!response.ok || !data.success) {
      throw new Error(data.message || mensajePorStatus(response.status))
    }
    return data
  } finally {
    if (esRaiz) fin()
  }
}

// -----------------------------------------------------------------------------
// login(credenciales) — Autenticación de usuario
// Endpoint: POST /api/login.php
// @param {{ username, password }} credenciales
// -----------------------------------------------------------------------------
export async function login(credenciales) {
  return apiFetch(`${API_BASE}/login.php`, {
    method: 'POST',
    body: JSON.stringify(credenciales),
  })
}

// -----------------------------------------------------------------------------
// verifyPin(pin) — Verifica el PIN de un administrador
// Endpoint: POST /api/verificar_pin.php
// -----------------------------------------------------------------------------
export async function verifyPin(pin) {
  return apiFetch(`${API_BASE}/verificar_pin.php`, {
    method: 'POST',
    body: JSON.stringify({ pin }),
  });
}

// -----------------------------------------------------------------------------
// getVentas(opciones) — Lista ventas por fecha o historial (paginado)
// Endpoint: GET /api/get_ventas.php
// @param {{ fecha?: string, todas?: boolean, pagina?: number, por_pagina?: number }} opciones
// -----------------------------------------------------------------------------
export async function getVentas({ fecha, todas = false, pagina = 1, por_pagina = 10 } = {}) {
  const params = new URLSearchParams()
  if (todas) {
    params.set('todas', '1')
  } else if (fecha) {
    params.set('fecha', fecha)
  }
  params.set('pagina', String(pagina))
  params.set('por_pagina', String(por_pagina))

  const qs = params.toString()
  return apiFetch(`${API_BASE}/get_ventas.php${qs ? `?${qs}` : ''}`)
}

// -----------------------------------------------------------------------------
// getDatos() — Obtiene doctores, servicios y clientes activos para los selectores
// Endpoint: GET /api/get_data.php
// -----------------------------------------------------------------------------
export async function getDatos() {
  return apiFetch(`${API_BASE}/get_data.php`);
}

// -----------------------------------------------------------------------------
// getDashboard(fecha?) — Métricas del dashboard para una fecha (default: hoy)
// Endpoint: GET /api/get_dashboard.php
// @param {string} [fecha] — YYYY-MM-DD
export async function getDashboard(fecha) {
  const qs = fecha ? `?fecha=${encodeURIComponent(fecha)}` : ''
  return apiFetch(`${API_BASE}/get_dashboard.php${qs}`)
}

// -----------------------------------------------------------------------------
// registrarVenta(datos) — Inserta una nueva venta
// Endpoint: POST /api/registrar_venta.php
// @param {{ doctor_id, total, fecha_venta, servicios: Array<{servicio_id, precio}> }} datos
// -----------------------------------------------------------------------------
export async function registrarVenta(datos) {
  return apiFetch(`${API_BASE}/registrar_venta.php`, {
    method: 'POST',
    body: JSON.stringify(datos),
  });
}

// -----------------------------------------------------------------------------
// cancelarVenta(id) — Cambia el estado de una venta a 'cancelada'
// Endpoint: POST /api/cancelar_venta.php
// @param {number} id — ID de la venta a cancelar
// -----------------------------------------------------------------------------
export async function cancelarVenta(id) {
  return apiFetch(`${API_BASE}/cancelar_venta.php`, {
    method: 'POST',
    body: JSON.stringify({ id }),
  })
}

// =============================================================================
// DOCTORES
// =============================================================================

// GET /api/doctores.php — Lista completa (activos + inactivos)
export async function getDoctores() {
  return apiFetch(`${API_BASE}/doctores.php`)
}

// POST /api/doctores.php — Crear doctor
// @param {{ cedula, nombre, especialidad }} datos
export async function crearDoctor(datos) {
  return apiFetch(`${API_BASE}/doctores.php`, {
    method: 'POST',
    body: JSON.stringify(datos),
  })
}

// PUT /api/doctores.php — Actualizar doctor
// @param {{ id, cedula, nombre, especialidad }} datos
export async function actualizarDoctor(datos) {
  return apiFetch(`${API_BASE}/doctores.php`, {
    method: 'PUT',
    body: JSON.stringify(datos),
  })
}

// PATCH /api/doctores.php — Toggle estado activo/inactivo
// @param {number} id
export async function toggleDoctor(id) {
  return apiFetch(`${API_BASE}/doctores.php`, {
    method: 'PATCH',
    body: JSON.stringify({ id }),
  })
}

// =============================================================================
// CLIENTES
// =============================================================================

// GET /api/clientes.php — Lista completa (activos + inactivos)
export async function getClientes() {
  return apiFetch(`${API_BASE}/clientes.php`)
}

// POST /api/clientes.php — Crear cliente
// @param {{ cedula, nombre, telefono }} datos
export async function crearCliente(datos) {
  return apiFetch(`${API_BASE}/clientes.php`, {
    method: 'POST',
    body: JSON.stringify(datos),
  })
}

// PUT /api/clientes.php — Actualizar cliente
// @param {{ id, cedula, nombre, telefono }} datos
export async function actualizarCliente(datos) {
  return apiFetch(`${API_BASE}/clientes.php`, {
    method: 'PUT',
    body: JSON.stringify(datos),
  })
}

// PATCH /api/clientes.php — Toggle estado activo/inactivo
// @param {number} id
export async function toggleCliente(id) {
  return apiFetch(`${API_BASE}/clientes.php`, {
    method: 'PATCH',
    body: JSON.stringify({ id }),
  })
}

// =============================================================================
// SERVICIOS / TRATAMIENTOS
// =============================================================================

// GET /api/servicios.php — Lista completa (activos + inactivos)
export async function getServicios() {
  return apiFetch(`${API_BASE}/servicios.php`)
}

// POST /api/servicios.php — Crear servicio
// @param {{ nombre_servicio, precio }} datos
export async function crearServicio(datos) {
  return apiFetch(`${API_BASE}/servicios.php`, {
    method: 'POST',
    body: JSON.stringify(datos),
  })
}

// PUT /api/servicios.php — Actualizar servicio
// @param {{ id, nombre_servicio, precio }} datos
export async function actualizarServicio(datos) {
  return apiFetch(`${API_BASE}/servicios.php`, {
    method: 'PUT',
    body: JSON.stringify(datos),
  })
}

// PATCH /api/servicios.php — Toggle estado activo/inactivo
// @param {number} id
export async function toggleServicio(id) {
  return apiFetch(`${API_BASE}/servicios.php`, {
    method: 'PATCH',
    body: JSON.stringify({ id }),
  })
}

// =============================================================================
// USUARIOS
// =============================================================================

// GET /api/usuarios.php — Lista de usuarios
export async function getUsuarios() {
  return apiFetch(`${API_BASE}/usuarios.php`)
}

// POST /api/usuarios.php — Crear usuario
// @param {{ username, password, nombre, rol }} datos
export async function crearUsuario(datos) {
  return apiFetch(`${API_BASE}/usuarios.php`, {
    method: 'POST',
    body: JSON.stringify(datos),
  })
}

// PUT /api/usuarios.php — Actualizar usuario
// @param {{ id, username, nombre, rol, password?, pin? }} datos
export async function actualizarUsuario(datos) {
  return apiFetch(`${API_BASE}/usuarios.php`, {
    method: 'PUT',
    body: JSON.stringify(datos),
  })
}

// DELETE /api/usuarios.php — Eliminar usuario
// @param {number} id
export async function eliminarUsuario(id) {
  return apiFetch(`${API_BASE}/usuarios.php`, {
    method: 'DELETE',
    body: JSON.stringify({ id }),
  })
}

// =============================================================================
// AJUSTES CASHEA
// =============================================================================

export async function getAjustesCashea(fecha) {
  const params = new URLSearchParams()
  if (fecha) params.set('fecha', fecha)
  return apiFetch(`${API_BASE}/ajustes_cashea.php?${params}`)
}

export async function registrarAjusteCashea(datos) {
  return apiFetch(`${API_BASE}/ajustes_cashea.php`, {
    method: 'POST',
    body: JSON.stringify(datos),
  })
}

// =============================================================================
// DEUDA CASHEA POR CLIENTE
// =============================================================================

// GET /api/deuda_cashea_cliente.php?cliente_id=X
// Devuelve las ventas con Cashea que aún tienen deuda pendiente para un cliente
// @param {number} clienteId
export async function getDeudaCasheaCliente(clienteId) {
  return apiFetch(`${API_BASE}/deuda_cashea_cliente.php?cliente_id=${encodeURIComponent(clienteId)}`)
}

// POST /api/ajustes_cashea.php — Registra un abono de deuda Cashea vinculado a una venta
// @param {{ monto: number, concepto: string, fecha_ingreso?: string }} datos
export async function registrarAbonoCashea(datos) {
  return apiFetch(`${API_BASE}/ajustes_cashea.php`, {
    method: 'POST',
    body: JSON.stringify(datos),
  })
}
