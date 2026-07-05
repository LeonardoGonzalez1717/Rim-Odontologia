// =============================================================================
// api/api.js — Módulo centralizado para todas las llamadas al backend PHP
// Configuración:
//   - Desarrollo (Vite): /api → proxy en vite.config.js → backend PHP
//   - Producción (Apache): ruta directa al backend en htdocs
// =============================================================================

const API_BASE = import.meta.env.DEV
  ? '/api'
  : '/Rim-Odontologia/backend';

/**
 * Helper interno: realiza un fetch y lanza un error si la respuesta no es OK.
 * @param {string} url
 * @param {RequestInit} options
 * @returns {Promise<any>} Datos JSON parseados
 */
async function apiFetch(url, options = {}) {
  const response = await fetch(url, {
    headers: { 'Content-Type': 'application/json', ...options.headers },
    ...options,
  });

  // Parsear el JSON (siempre, incluso en error, el backend devuelve JSON)
  const raw = await response.text();
  let data;
  try {
    data = JSON.parse(raw);
  } catch {
    throw new Error(
      response.ok
        ? 'El servidor no devolvió JSON válido. Verifica que Apache esté activo y la ruta del backend sea correcta.'
        : `Error HTTP ${response.status}: no se pudo conectar con el backend.`,
    );
  }

  if (!response.ok || !data.success) {
    throw new Error(data.message || `Error HTTP ${response.status}`);
  }

  return data;
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
// getDatos() — Obtiene doctores y servicios activos para los selectores
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
// @param {{ nombre, especialidad }} datos
export async function crearDoctor(datos) {
  return apiFetch(`${API_BASE}/doctores.php`, {
    method: 'POST',
    body: JSON.stringify(datos),
  })
}

// PUT /api/doctores.php — Actualizar doctor
// @param {{ id, nombre, especialidad }} datos
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
