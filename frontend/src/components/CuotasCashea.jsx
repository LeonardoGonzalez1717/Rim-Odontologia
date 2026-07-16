// =============================================================================
// components/CuotasCashea.jsx — Cuotas Cashea del día en el dashboard
// =============================================================================
import React from 'react'
import { CreditCard, Clock } from 'lucide-react'
import Paginacion from './Paginacion'
import { usePaginacion } from '../hooks/usePaginacion'

const formatCurrency = (value) =>
  new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'USD' }).format(value ?? 0)

/** Parsea "Abono Cashea – venta #ID – Cliente – descripción" para el listado */
const formatearConcepto = (concepto) => {
  const raw = String(concepto || '').trim()
  const match = raw.match(/^Abono Cashea – venta #\d+ – (.+)$/)
  if (!match) {
    return { titulo: raw || 'Cuota de Cashea', detalle: null }
  }

  const partes = match[1].split(' – ')
  const cliente = partes[0]?.trim() || 'Cliente'
  const descripcion = partes.slice(1).join(' – ').trim()

  return {
    titulo: descripcion || `Abono · ${cliente}`,
    detalle: cliente,
  }
}

const CuotasCashea = ({ datos = [], total = 0 }) => {
  const {
    itemsPaginados: cuotasPagina,
    pagina,
    setPagina,
    totalPaginas,
    total: totalCuotas,
    indiceInicio,
    indiceFin,
  } = usePaginacion(datos, 10)

  return (
    <div className="card animate-slide-up">
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-2">
          <CreditCard size={18} className="text-amber-600" />
          <h2 className="font-bold text-slate-700 text-base">Cuotas Cashea del Día</h2>
        </div>
        <span className="text-sm font-bold text-amber-700 bg-amber-50 px-2.5 py-1 rounded-lg border border-amber-100">
          {formatCurrency(total)}
        </span>
      </div>

      {datos.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-8 text-slate-400">
          <CreditCard size={36} strokeWidth={1.5} className="mb-2 text-slate-300" />
          <p className="text-sm">No hay cuotas Cashea registradas este día.</p>
        </div>
      ) : (
        <>
          <ul className="divide-y divide-slate-100 -mx-6">
            {cuotasPagina.map((cuota) => {
              const { titulo, detalle } = formatearConcepto(cuota.concepto)
              return (
                <li
                  key={cuota.id}
                  className="flex items-center justify-between gap-4 px-6 py-3.5 hover:bg-slate-50/70 transition-colors"
                >
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-slate-800 truncate">
                      {titulo}
                    </p>
                    <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-slate-500 mt-0.5">
                      <span className="inline-flex items-center gap-1.5 text-xs">
                        <Clock size={12} className="flex-shrink-0" />
                        {cuota.hora}
                      </span>
                      {detalle && (
                        <span className="text-xs truncate">{detalle}</span>
                      )}
                    </div>
                  </div>
                  <span className="text-sm font-bold text-slate-800 whitespace-nowrap">
                    {formatCurrency(cuota.monto)}
                  </span>
                </li>
              )
            })}
          </ul>

          <Paginacion
            pagina={pagina}
            totalPaginas={totalPaginas}
            total={totalCuotas}
            onPaginaChange={setPagina}
            indiceInicio={indiceInicio}
            indiceFin={indiceFin}
            etiquetaSingular="cuota"
            etiquetaPlural="cuotas"
            className="mx-0"
          />
        </>
      )}

      {datos.length > 0 && (
        <p className="text-xs text-slate-400 mt-4 pt-4 border-t border-slate-100">
          Este monto se suma a los ingresos del día junto con las ventas en caja.
        </p>
      )}
    </div>
  )
}

export default CuotasCashea
