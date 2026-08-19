// =============================================================================
// components/FiltroFechaVentas.jsx
// Selector de fecha para consultar ventas de días anteriores
// =============================================================================
import React, { useRef } from 'react'
import { Calendar, ChevronLeft, ChevronRight } from 'lucide-react'
import { ayerISO, esHoy, esAyer, sumarDias, formatearDMA } from '../utils/fechas'
import { useServerDate } from '../hooks/useServerDate'

const FiltroFechaVentas = ({ fecha, onChange, className = '' }) => {
  const inputRef = useRef(null)

  // Fecha del servidor — evita que un reloj local incorrecto afecte el filtro
  const { hoy: hoyServidor } = useServerDate()

  const maxFecha = hoyServidor
  const puedeAvanzar = fecha < maxFecha

  const solicitarCambio = (nuevaFecha) => {
    if (!nuevaFecha || nuevaFecha === fecha) return
    onChange(nuevaFecha)
  }

  const abrirCalendario = () => {
    const input = inputRef.current
    if (!input) return
    try {
      if (typeof input.showPicker === 'function') {
        input.showPicker()
      } else {
        input.focus()
      }
    } catch {
      input.focus()
    }
  }

  const irDia = (delta) => {
    const nueva = sumarDias(fecha, delta)
    if (delta > 0 && nueva > maxFecha) return
    solicitarCambio(nueva)
  }

  const handleFechaInput = (e) => {
    const nueva = e.target.value
    if (!nueva) return
    solicitarCambio(nueva)
  }

  return (
    <div className={`flex flex-wrap items-center gap-2 ${className}`}>
      <div className="flex items-center gap-1 bg-slate-100 rounded-xl p-1">
        <button
          type="button"
          onClick={() => irDia(-1)}
          className="w-8 h-8 rounded-lg flex items-center justify-center
                     text-slate-500 hover:bg-white hover:text-slate-700
                     transition-all duration-200"
          title="Día anterior"
          aria-label="Día anterior"
        >
          <ChevronLeft size={16} />
        </button>

        <label
          className="relative flex items-center gap-2 bg-white rounded-lg
                        border border-slate-200 px-3 py-1.5 cursor-pointer
                        hover:border-pink-300 transition-colors min-w-[8.5rem]"
          onClick={(e) => {
            e.preventDefault()
            abrirCalendario()
          }}
        >
          <Calendar size={14} className="text-pink-500 flex-shrink-0 pointer-events-none" />
          <span className="text-sm font-semibold text-slate-700 pointer-events-none tabular-nums">
            {formatearDMA(fecha)}
          </span>
          <input
            ref={inputRef}
            type="date"
            value={fecha}
            max={maxFecha}
            onChange={handleFechaInput}
            className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
            aria-label={`Seleccionar fecha, actual: ${formatearDMA(fecha)}`}
          />
        </label>

        <button
          type="button"
          onClick={() => irDia(1)}
          disabled={!puedeAvanzar}
          className="w-8 h-8 rounded-lg flex items-center justify-center
                     text-slate-500 hover:bg-white hover:text-slate-700
                     transition-all duration-200 disabled:opacity-30
                     disabled:cursor-not-allowed"
          title="Día siguiente"
          aria-label="Día siguiente"
        >
          <ChevronRight size={16} />
        </button>
      </div>

      <div className="flex items-center gap-1.5">
        <button
          type="button"
          onClick={() => solicitarCambio(hoyServidor)}
          className={`text-xs font-semibold px-3 py-1.5 rounded-lg border transition-all duration-200
            ${esHoy(fecha, hoyServidor)
              ? 'bg-pink-600 text-white border-pink-600'
              : 'bg-white text-slate-600 border-slate-200 hover:border-pink-300 hover:text-pink-600'
            }`}
        >
          Hoy
        </button>
        <button
          type="button"
          onClick={() => solicitarCambio(ayerISO(hoyServidor))}
          className={`text-xs font-semibold px-3 py-1.5 rounded-lg border transition-all duration-200
            ${esAyer(fecha, hoyServidor)
              ? 'bg-pink-600 text-white border-pink-600'
              : 'bg-white text-slate-600 border-slate-200 hover:border-pink-300 hover:text-pink-600'
            }`}
        >
          Ayer
        </button>
      </div>
    </div>
  )
}

export default FiltroFechaVentas
