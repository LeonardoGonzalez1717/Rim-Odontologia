// =============================================================================
// appVersion.js — Detecta despliegues nuevos y fuerza recarga si hay caché vieja
// =============================================================================

const STORAGE_KEY = 'rim_app_build_id'
const SESSION_RELOADED = 'rim_entry_reloaded'

/**
 * Compara el ID de build actual con el guardado en el navegador.
 * Si cambió (nuevo despliegue), recarga la página para cargar los assets nuevos.
 */
export function checkAppVersion() {
  const current = typeof __APP_BUILD_ID__ !== 'undefined' ? __APP_BUILD_ID__ : null
  if (!current) return

  const stored = localStorage.getItem(STORAGE_KEY)

  if (stored && stored !== current) {
    localStorage.setItem(STORAGE_KEY, current)
    window.location.reload()
    return
  }

  if (!stored) {
    localStorage.setItem(STORAGE_KEY, current)
  }
}

export function autoRefreshOnEntry() {
  const yaRecargo = sessionStorage.getItem(SESSION_RELOADED)
  if (yaRecargo) return  // Ya se hizo el reload en esta sesión → no hacer nada

  sessionStorage.setItem(SESSION_RELOADED, '1')
  window.location.reload()
}
