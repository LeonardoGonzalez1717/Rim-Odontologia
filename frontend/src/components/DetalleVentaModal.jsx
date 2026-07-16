// =============================================================================
// components/DetalleVentaModal.jsx — Detalle de una venta
// =============================================================================
import React, { useEffect } from 'react'
import {
  X, Clock, User, Contact, Stethoscope, DollarSign, CreditCard, FileText,
} from 'lucide-react'
import { fmt as formatCurrency } from '../utils/reportesPrint'

const DetalleVentaModal = ({ venta, onClose, mostrarFecha = false }) => {
  useEffect(() => {
    const fn = (e) => { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', fn)
    return () => document.removeEventListener('keydown', fn)
  }, [onClose])

  if (!venta) return null

  const servicios = venta.servicios?.length
    ? venta.servicios
    : [{ nombre: venta.servicio, precio: venta.total }]

  const esCancelada = venta.estado === 'cancelada'

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-fade-in"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-lg max-h-[90vh] flex flex-col animate-scale-in">
        <div className="flex items-center justify-between px-7 pt-6 pb-4 border-b border-slate-100 flex-shrink-0">
          <div>
            <h2 className="text-xl font-bold text-slate-800">Detalle de venta</h2>
            <p className="text-sm text-slate-500 mt-0.5">
              {mostrarFecha && venta.fecha
                ? `${new Date(`${venta.fecha}T12:00:00`).toLocaleDateString('es-MX', {
                    day: '2-digit', month: 'short', year: 'numeric',
                  })} · ${venta.hora}`
                : venta.hora}
            </p>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200
                       flex items-center justify-center text-slate-500 hover:text-slate-700
                       transition-all duration-200"
            aria-label="Cerrar"
          >
            <X size={16} />
          </button>
        </div>

        <div className="px-7 py-6 space-y-5 overflow-y-auto flex-1 min-h-0">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">
                <Contact size={12} className="inline mr-1" />
                Cliente
              </p>
              <p className="text-sm font-medium text-slate-800">{venta.cliente || '—'}</p>
            </div>
            <div>
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">
                <User size={12} className="inline mr-1" />
                Doctor
              </p>
              <p className="text-sm font-medium text-slate-800">{venta.doctor}</p>
            </div>
          </div>

          <div>
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
              <Stethoscope size={12} className="inline mr-1" />
              Tratamientos
            </p>
            <ul className="space-y-2">
              {servicios.map((s, i) => (
                <li
                  key={s.id ?? i}
                  className="flex items-center justify-between gap-3 bg-slate-50
                             border border-slate-100 rounded-xl px-3 py-2.5"
                >
                  <span className="text-sm text-slate-700">{s.nombre}</span>
                  {s.precio != null && (
                    <span className="text-sm font-semibold text-slate-800 whitespace-nowrap">
                      {formatCurrency(s.precio)}
                    </span>
                  )}
                </li>
              ))}
            </ul>
          </div>

          <div className="bg-slate-50 border border-slate-100 rounded-xl p-4 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm text-slate-600 flex items-center gap-1.5">
                <DollarSign size={14} className="text-pink-500" />
                Total de la venta
              </span>
              <span className={`text-sm font-bold ${esCancelada ? 'line-through text-slate-400' : 'text-slate-800'}`}>
                {formatCurrency(venta.total)}
              </span>
            </div>

            {venta.cashea && (
              <>
                <div className="flex items-center justify-between pt-1 border-t border-slate-200">
                  <span className="text-sm text-slate-600 flex items-center gap-1.5">
                    <CreditCard size={14} className="text-amber-600" />
                    Monto en caja
                  </span>
                  <span className={`text-sm font-bold ${esCancelada ? 'line-through text-slate-400' : 'text-slate-800'}`}>
                    {formatCurrency(venta.monto_caja ?? venta.total)}
                  </span>
                </div>
                {venta.descripcion_cashea && (
                  <div className="pt-2 border-t border-slate-200">
                    <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">
                      <FileText size={12} className="inline mr-1" />
                      Descripción Cashea
                    </p>
                    <p className="text-sm text-slate-700 whitespace-pre-wrap leading-relaxed">
                      {venta.descripcion_cashea}
                    </p>
                  </div>
                )}
              </>
            )}
          </div>

          <div className="flex items-center justify-between text-sm">
            <span className="text-slate-500 flex items-center gap-1.5">
              <Clock size={14} />
              Estado
            </span>
            {esCancelada ? (
              <span className="badge badge-cancelada">Cancelada</span>
            ) : venta.por_pagar ? (
              <span className="badge badge-por-pagar">Por terminar de pagar</span>
            ) : (
              <span className="badge badge-completada">Completada</span>
            )}
          </div>
        </div>

        <div className="flex-shrink-0 px-7 py-4 border-t border-slate-100">
          <button type="button" onClick={onClose} className="btn-secondary w-full">
            Cerrar
          </button>
        </div>
      </div>
    </div>
  )
}

export default DetalleVentaModal
