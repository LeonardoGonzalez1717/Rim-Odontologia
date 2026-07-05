// =============================================================================
// components/FiltroFechaVentas.jsx
// Selector de fecha para consultar ventas de días anteriores
// =============================================================================
import React from 'react'
import { Calendar, ChevronLeft, ChevronRight } from 'lucide-react'
import { hoyISO, ayerISO, esHoy, esAyer, sumarDias, formatearDMA } from '../utils/fechas'

const FiltroFechaVentas = ({ fecha, onChange, className = '' }) => {
  const maxFecha = hoyISO()
  const puedeAvanzar = fecha < maxFecha

  const irDia = (delta) => {
    const nueva = sumarDias(fecha, delta)
    if (delta > 0 && nueva > maxFecha) return
    onChange(nueva)
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

        <label className="relative flex items-center gap-2 bg-white rounded-lg
                          border border-slate-200 px-3 py-1.5 cursor-pointer
                          hover:border-pink-300 transition-colors min-w-[8.5rem]">
          <Calendar size={14} className="text-pink-500 flex-shrink-0 pointer-events-none" />
          <span className="text-sm font-semibold text-slate-700 pointer-events-none tabular-nums">
            {formatearDMA(fecha)}
          </span>
          <input
            type="date"
            value={fecha}
            max={maxFecha}
            onChange={(e) => e.target.value && onChange(e.target.value)}
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
          onClick={() => onChange(hoyISO())}
          className={`text-xs font-semibold px-3 py-1.5 rounded-lg border transition-all duration-200
            ${esHoy(fecha)
              ? 'bg-pink-600 text-white border-pink-600'
              : 'bg-white text-slate-600 border-slate-200 hover:border-pink-300 hover:text-pink-600'
            }`}
        >
          Hoy
        </button>
        <button
          type="button"
          onClick={() => onChange(ayerISO())}
          className={`text-xs font-semibold px-3 py-1.5 rounded-lg border transition-all duration-200
            ${esAyer(fecha)
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
