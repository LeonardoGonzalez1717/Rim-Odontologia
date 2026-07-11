// =============================================================================
// components/VentasAsistente.jsx — Ventas del día para el asistente
// Muestra solo cliente, doctor y acción para generar nota de entrega.
// =============================================================================
import React from 'react'
import { Receipt, Loader2, ExternalLink } from 'lucide-react'
import Paginacion from './Paginacion'
import { usePaginacion } from '../hooks/usePaginacion'
import { abrirNotaEntrega } from '../utils/reportesPrint'

const VentasAsistente = ({ ventas = [], loading = false }) => {
  const completadas = ventas.filter((v) => v.estado === 'completada')

  const {
    itemsPaginados: ventasPagina,
    pagina,
    setPagina,
    totalPaginas,
    total,
    indiceInicio,
    indiceFin,
  } = usePaginacion(completadas, 10)

  return (
    <div className="card animate-slide-up mt-8">
      <div className="flex items-center justify-between gap-3 mb-5">
        <div className="flex items-center gap-2">
          <Receipt size={18} className="text-pink-600" />
          <h2 className="font-bold text-slate-700 text-base">Ventas de hoy</h2>
        </div>
        <span className="text-xs text-slate-400 bg-slate-100 px-2 py-1 rounded-full font-medium">
          {completadas.length} {completadas.length === 1 ? 'venta' : 'ventas'}
        </span>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-12 gap-2 text-pink-500">
          <Loader2 size={20} className="animate-spin" />
          <span className="text-sm">Cargando ventas…</span>
        </div>
      ) : completadas.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 text-slate-400">
          <Receipt size={36} strokeWidth={1.5} className="mb-2 text-slate-300" />
          <p className="text-sm">No hay ventas registradas hoy.</p>
        </div>
      ) : (
        <>
          <div className="overflow-x-auto -mx-6 px-6">
            <table className="w-full min-w-[400px]">
              <thead>
                <tr className="border-b border-slate-100">
                  <th className="text-left text-xs font-semibold text-slate-400 uppercase tracking-wider pb-3">
                    Cliente
                  </th>
                  <th className="text-left text-xs font-semibold text-slate-400 uppercase tracking-wider pb-3">
                    Doctor
                  </th>
                  <th className="text-right text-xs font-semibold text-slate-400 uppercase tracking-wider pb-3">
                    Nota de entrega
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {ventasPagina.map((venta) => (
                  <tr key={venta.id} className="hover:bg-slate-50/70 transition-colors">
                    <td className="py-3.5 pr-4">
                      <span className="text-sm font-medium text-slate-700">
                        {venta.cliente || '—'}
                      </span>
                    </td>
                    <td className="py-3.5 pr-4">
                      <span className="text-sm font-semibold text-slate-800">
                        {venta.doctor}
                      </span>
                    </td>
                    <td className="py-3.5 text-right">
                      <button
                        type="button"
                        onClick={() => abrirNotaEntrega(venta)}
                        className="inline-flex items-center gap-1.5 text-xs font-semibold
                                   text-pink-600 bg-pink-50 hover:bg-pink-100
                                   border border-pink-200 px-3 py-1.5 rounded-lg
                                   transition-all duration-200"
                        title="Generar nota de entrega"
                      >
                        <ExternalLink size={12} />
                        Generar Nota
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <Paginacion
            pagina={pagina}
            totalPaginas={totalPaginas}
            total={total}
            onPaginaChange={setPagina}
            indiceInicio={indiceInicio}
            indiceFin={indiceFin}
            etiquetaSingular="venta"
            etiquetaPlural="ventas"
          />
        </>
      )}
    </div>
  )
}

export default VentasAsistente
