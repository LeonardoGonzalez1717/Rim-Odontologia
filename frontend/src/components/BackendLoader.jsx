// =============================================================================
// BackendLoader.jsx — Overlay global mientras el backend / anti-bot responde
// =============================================================================
import React, { useState, useEffect } from 'react'
import { Loader2 } from 'lucide-react'
import { suscribirCargaBackend } from '../api/api'
import Logo from './Logo'

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
  const { visible, mensaje, esWarmup } = useBackendCargando()

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
      <div className="bg-white rounded-3xl shadow-2xl px-10 py-8 max-w-sm mx-4
                      text-center animate-scale-in">
        <div className="inline-flex mb-4">
          <Logo size="md" />
        </div>
        <Loader2 size={32} className="animate-spin text-pink-500 mx-auto mb-4" />
        <p className="text-base font-semibold text-slate-800">{mensaje}</p>
        <p className="text-sm text-slate-500 mt-2 leading-relaxed">
          {esWarmup
            ? 'Verificando conexión segura con el servidor. Esto puede tardar unos segundos…'
            : 'Obteniendo información del consultorio…'}
        </p>
      </div>
    </div>
  )
}

export default BackendLoader
