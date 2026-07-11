// =============================================================================
// api/api.js — Módulo centralizado para todas las llamadas al backend PHP
// Configuración:
//   - Desarrollo (Vite): /api → proxy en vite.config.js → backend PHP
//   - Producción (Apache): ruta directa al backend en htdocs
// =============================================================================

const API_BASE = import.meta.env.DEV
  ? '/api' // Usa el alias del proxy en desarrollo local
  : 'https://rimconsultorio.freedev.app/backend'; // Usa la URL real en producción

/** Mensaje según código HTTP cuando el backend no envía detalle */
const mensajePorStatus = (status) => {
  switch (status) {
    case 400:
      return 'La solicitud no es válida. Revisa los datos enviados.'
    case 401:
      return 'No autorizado. Verifica tu usuario y contraseña.'
    case 403:
      return 'No tienes permiso para realizar esta acción.'
    case 404:
      return 'No se encontró el endpoint. Verifica que la ruta del backend sea correcta.'
    case 405:
      return 'Método no permitido para esta operación.'
    case 408:
    case 504:
      return 'El servidor tardó demasiado en responder. Intenta de nuevo.'
    case 500:
      return 'Error interno del servidor. Contacta al administrador.'
    case 502:
    case 503:
      return 'El servidor no está disponible en este momento. Intenta más tarde.'
    default:
      if (status >= 500) {
        return `Error del servidor (${status}). Intenta de nuevo más tarde.`
      }
      if (status >= 400) {
        return `Error en la solicitud (${status}). No se pudo completar la operación.`
      }
      return `Error HTTP ${status}.`
  }
}

/** Mensaje cuando la respuesta no es JSON parseable */
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
      ? 'No se encontró el backend. Verifica que los archivos PHP estén desplegados en el servidor.'
      : 'El servidor devolvió una página HTML en lugar de JSON. Puede haber un error de PHP o del hosting.'
  }

  if (
    preview.includes('fatal error')
    || preview.includes('parse error')
    || preview.includes('warning:')
    || preview.includes('notice:')
  ) {
    return 'Error en el servidor PHP. Revisa los logs de Apache o el archivo del endpoint.'
  }

  return response.ok
    ? 'El servidor no devolvió JSON válido. Verifica que Apache esté activo y la ruta del backend sea correcta.'
    : `${mensajePorStatus(response.status)} La respuesta no tiene formato JSON válido.`
}

/**
 * Helper interno: realiza un fetch y lanza un error si la respuesta no es OK.
 * @param {string} url
 * @param {RequestInit} options
 * @returns {Promise<any>} Datos JSON parseados
 */
async function apiFetch(url, options = {}) {
  let response

  try {
    response = await fetch(url, {
      cache: 'no-store',
      headers: { 'Content-Type': 'application/json', ...options.headers },
      ...options,
    })
  } catch (err) {
    const esRed = err instanceof TypeError
      || /failed to fetch|network|load failed/i.test(err.message ?? '')

    if (esRed) {
      throw new Error(
        import.meta.env.DEV
          ? 'No se pudo conectar con el backend local. ¿Está Apache/XAMPP activo y el proxy de Vite configurado?'
          : 'No se pudo conectar con el servidor. Verifica tu conexión a internet o que el hosting esté en línea.',
      )
    }

    throw new Error(err.message || 'Error de red al contactar el servidor.')
  }

  const raw = await response.text()
  let data

  try {
    data = JSON.parse(raw)
  } catch {
    throw new Error(mensajeRespuestaNoJson(response, raw))
  }

  if (!response.ok || !data.success) {
    throw new Error(data.message || mensajePorStatus(response.status))
  }

  return data
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
  });
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
