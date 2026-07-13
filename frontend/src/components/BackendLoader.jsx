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
      className="fixed inset-0 z-[200] flex items-center justify-center
                 bg-slate-900/60 backdrop-blur-sm animate-fade-in"
      role="status"
      aria-live="polite"
      aria-busy="true"
      aria-label={mensaje}
    >
      <Loader2 size={48} className="animate-spin text-pink-500" />
    </div>
  )
}

export default BackendLoader
