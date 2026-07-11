// =============================================================================
// components/VentasPorDoctor.jsx
// =============================================================================
import React, { useState } from 'react'
import { UserCheck, Stethoscope } from 'lucide-react'
import VentasDoctorModal from './VentasDoctorModal'
import Paginacion from './Paginacion'
import { usePaginacion } from '../hooks/usePaginacion'
import { esHoy, formatearFechaCorta } from '../utils/fechas'

const formatCurrency = (value) =>
  new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'USD' }).format(value)

const avatarColors = [
  'bg-pink-500',
  'bg-pink-400',
  'bg-slate-500',
  'bg-slate-400',
  'bg-rose-500',
  'bg-rose-400',
]

const VentasPorDoctor = ({ datos = [], fecha }) => {
  const [doctorSeleccionado, setDoctorSeleccionado] = useState(null)
  const totalGlobal = datos.reduce((sum, d) => sum + d.total, 0)
  const etiquetaFecha = fecha
    ? (esHoy(fecha) ? 'Hoy' : formatearFechaCorta(fecha))
    : 'Hoy'

  const {
    itemsPaginados: doctoresPagina,
    pagina,
    setPagina,
    totalPaginas,
    total,
    indiceInicio,
    indiceFin,
  } = usePaginacion(datos, 10)

  if (datos.length === 0) {
    return (
      <div className="card animate-slide-up">
        <div className="flex items-center gap-2 mb-4">
          <Stethoscope size={18} className="text-pink-600" />
          <h2 className="font-bold text-slate-700 text-base">Ventas por Doctor</h2>
        </div>
        <div className="flex flex-col items-center justify-center py-8 text-slate-400">
          <UserCheck size={36} strokeWidth={1.5} className="mb-2 text-slate-300" />
          <p className="text-sm">Sin datos de ventas hoy</p>
        </div>
      </div>
    )
  }

  return (
    <>
      {doctorSeleccionado && fecha && (
        <VentasDoctorModal
          doctor={doctorSeleccionado}
          fecha={fecha}
          onClose={() => setDoctorSeleccionado(null)}
        />
      )}

      <div className="card animate-slide-up">
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-2">
            <Stethoscope size={18} className="text-pink-600" />
            <h2 className="font-bold text-slate-700 text-base">Ventas por Doctor</h2>
          </div>
          <span className="text-xs text-slate-400 font-medium">{etiquetaFecha}</span>
        </div>

        <div className="space-y-4">
          {doctoresPagina.map((item, index) => {
          const porcentaje = totalGlobal > 0
            ? Math.round((item.total / totalGlobal) * 100)
            : 0

          const iniciales = item.doctor
            .replace(/^Dr[a]?\.\s*/i, '')
            .split(' ')
            .slice(0, 2)
            .map((n) => n[0])
            .join('')
            .toUpperCase()

          const avatarColor = avatarColors[(indiceInicio + index - 1) % avatarColors.length]

            return (
              <button
                key={item.doctor}
                type="button"
                onClick={() => setDoctorSeleccionado(item)}
                className="w-full flex items-center gap-3 text-left rounded-xl p-2 -mx-2
                           hover:bg-slate-50 transition-colors cursor-pointer
                           focus:outline-none focus:ring-2 focus:ring-pink-500 focus:ring-offset-2"
                title={`Ver ventas de ${item.doctor}`}
              >
              <div className={`w-9 h-9 rounded-full ${avatarColor} flex-shrink-0
                              flex items-center justify-center text-white text-xs font-bold`}>
                {iniciales}
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex justify-between items-baseline mb-1">
                  <span className="text-sm font-semibold text-slate-700 truncate pr-2">
                    {item.doctor}
                  </span>
                  <span className="text-sm font-bold text-slate-800 whitespace-nowrap">
                    {formatCurrency(item.total)}
                  </span>
                </div>

                <div className="w-full bg-slate-200 rounded-full h-1.5 overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all duration-700 ease-out ${avatarColor}`}
                    style={{ width: `${porcentaje}%` }}
                  />
                </div>

                <p className="text-xs text-slate-400 mt-1">
                  {item.cantidad} {item.cantidad === 1 ? 'tratamiento' : 'tratamientos'} · {porcentaje}%
                  <span className="text-pink-500 ml-1">· Ver detalle</span>
                </p>
              </div>
              </button>
            )
          })}
        </div>

        <Paginacion
          pagina={pagina}
          totalPaginas={totalPaginas}
          total={total}
          onPaginaChange={setPagina}
          indiceInicio={indiceInicio}
          indiceFin={indiceFin}
          etiquetaSingular="doctor"
          etiquetaPlural="doctores"
        />
      </div>
    </>
  )
}

export default VentasPorDoctor
