// =============================================================================
// hooks/useVisibilityRefresh.js
// Hook que detecta cuando el usuario regresa a la pestaña y recarga
// automáticamente los datos (o la página completa si estuvo mucho tiempo fuera).
//
// Umbrales:
//   - < 30 segundos ausente   → no hace nada
//   - 30s – 10 minutos        → llama a onRefresh() (recarga de datos por API)
//   - > 10 minutos            → window.location.reload() (recarga de página)
// =============================================================================
import { useEffect, useRef } from 'react'

const UMBRAL_REFRESH_DATOS_MS = 30  * 1000  //  30 segundos
const UMBRAL_RELOAD_PAGINA_MS = 10  * 60 * 1000  // 10 minutos

/**
 * @param {Function} onRefresh  Callback que recarga los datos vía API.
 *                              Se llama cuando el usuario vuelve y estuvo entre
 *                              30 segundos y 10 minutos fuera.
 * @param {boolean}  activo     Permite desactivar el hook (ej. cuando no hay sesión).
 */
export function useVisibilityRefresh(onRefresh, activo = true) {
  // Guardamos el timestamp en que la pestaña se ocultó
  const ocultadaEnRef = useRef(null)

  useEffect(() => {
    if (!activo) return

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'hidden') {
        // El usuario sale de la pestaña → guardar el momento
        ocultadaEnRef.current = Date.now()
        return
      }

      // El usuario vuelve a la pestaña
      if (document.visibilityState === 'visible' && ocultadaEnRef.current !== null) {
        const tiempoFuera = Date.now() - ocultadaEnRef.current
        ocultadaEnRef.current = null  // Resetear

        if (tiempoFuera >= UMBRAL_RELOAD_PAGINA_MS) {
          // Estuvo mucho tiempo fuera → reload completo para obtener assets frescos
          window.location.reload()
        } else if (tiempoFuera >= UMBRAL_REFRESH_DATOS_MS) {
          // Estuvo un tiempo moderado → solo refrescar datos via API
          onRefresh?.()
        }
        // Si estuvo menos de 30s → no hacer nada
      }
    }

    document.addEventListener('visibilitychange', handleVisibilityChange)
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange)
    }
  }, [activo, onRefresh])
}
