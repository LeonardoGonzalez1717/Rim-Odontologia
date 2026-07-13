// =============================================================================
// BackendLoader.jsx — Overlay global mientras el backend / anti-bot responde
// =============================================================================
import React, { useState, useEffect } from 'react'
import { Loader2 } from 'lucide-react'
import { suscribirCargaBackend } from '../api/api'

export function useBackendCargando() {
  const [estado, setEstado] = useState({
    visible: false,
    mensaje: 'Cargando datos…',
    esWarmup: false,
  })

  useEffect(() => suscribirCargaBackend(setEstado), [])

  return estado
}

const BackendLoader = () => {
  const { visible, mensaje } = useBackendCargando()

  if (!visible) return null

  return (
    <div
      className="fixed bottom-6 right-6 z-[200] pointer-events-none animate-fade-in"
      role="status"
      aria-live="polite"
      aria-busy="true"
      aria-label={mensaje}
    >
      <div className="bg-white/80 backdrop-blur-sm p-2 rounded-full shadow-lg">
        <Loader2 size={28} className="animate-spin text-pink-500" />
      </div>
    </div>
  )
}

export default BackendLoader
