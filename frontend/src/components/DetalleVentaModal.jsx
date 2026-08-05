// =============================================================================
// components/DetalleVentaModal.jsx — Detalle y opciones de una venta
// =============================================================================
import React, { useEffect } from 'react'
import {
  X, Clock, User, Contact, Stethoscope, DollarSign, CreditCard, FileText,
  ExternalLink, XCircle, Loader2, CheckCircle2, UserCheck
} from 'lucide-react'
import { fmt as formatCurrency, abrirNotaEntrega } from '../utils/reportesPrint'

const DetalleVentaModal = ({
  venta,
  onClose,
  mostrarFecha = false,
  soloLectura = false,
  onSolicitarCancelacion,
  cancelando = false
}) => {
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
  const estaCancelando = cancelando === venta.id

  const handleNotaEntrega = () => {
    abrirNotaEntrega(venta)
  }

  const handleCancelar = () => {
    if (onSolicitarCancelacion) {
      onSolicitarCancelacion(venta.id)
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-fade-in"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-lg max-h-[90vh] flex flex-col animate-scale-in">
        {/* Cabecera */}
        <div className="flex items-center justify-between px-7 pt-6 pb-4 border-b border-slate-100 flex-shrink-0">
          <div>
            <h2 className="text-xl font-bold text-slate-800">Opciones y Detalle de Venta</h2>
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

        {/* Contenido principal */}
        <div className="px-7 py-6 space-y-5 overflow-y-auto flex-1 min-h-0">
          {/* Información del Cliente, Doctor y Registrador */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-slate-50/80 border border-slate-100 rounded-2xl p-4">
            <div>
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">
                <Contact size={12} className="inline mr-1 text-slate-500" />
                Cliente
              </p>
              <p className="text-sm font-bold text-slate-800">{venta.cliente || '—'}</p>
            </div>
            <div>
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">
                <User size={12} className="inline mr-1 text-slate-500" />
                Doctor
              </p>
              <p className="text-sm font-bold text-slate-800">{venta.doctor}</p>
            </div>
            {venta.usuario_nombre && (
              <div className="sm:col-span-2 pt-2 border-t border-slate-200/60">
                <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">
                  <UserCheck size={12} className="inline mr-1 text-pink-500" />
                  Registrado por
                </p>
                <p className="text-sm font-medium text-slate-700">{venta.usuario_nombre}</p>
              </div>
            )}
          </div>

          {/* Tratamientos */}
          <div>
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
              <Stethoscope size={12} className="inline mr-1" />
              Tratamientos / Servicios
            </p>
            <ul className="space-y-2">
              {servicios.map((s, i) => (
                <li
                  key={s.id ?? i}
                  className={`flex items-center justify-between gap-3 rounded-xl px-3.5 py-2.5 border
                             ${s.cashea
                      ? 'bg-amber-50/70 border-amber-200'
                      : 'bg-slate-50 border-slate-100'}`}
                >
                  <div className="min-w-0 flex-1">
                    <span className="text-sm font-medium text-slate-700">{s.nombre}</span>
                    <div className="flex flex-wrap gap-1.5 mt-1">
                      {s.cashea && (
                        <span className="text-[10px] font-bold uppercase tracking-wide
                                         text-amber-800 bg-amber-100 border border-amber-200
                                         rounded px-1.5 py-0.5">
                          Cashea
                        </span>
                      )}
                      {s.realizado === false && (
                        <span className="text-[10px] font-bold uppercase tracking-wide
                                         text-emerald-800 bg-emerald-100 border border-emerald-200
                                         rounded px-1.5 py-0.5">
                          Otro día
                        </span>
                      )}
                    </div>
                  </div>
                  {s.precio != null && (
                    <span className="text-sm font-semibold text-slate-800 whitespace-nowrap">
                      {formatCurrency(s.precio)}
                    </span>
                  )}
                </li>
              ))}
            </ul>
          </div>

          {/* Desglose Financiero */}
          <div className="bg-slate-50 border border-slate-100 rounded-2xl p-4 space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="text-sm text-slate-600 flex items-center gap-1.5">
                <DollarSign size={14} className="text-pink-500" />
                Total de la venta
              </span>
              <span className={`text-base font-bold ${esCancelada ? 'line-through text-slate-400' : 'text-slate-800'}`}>
                {formatCurrency(venta.total)}
              </span>
            </div>

            {venta.cashea ? (
              <>
                <div className="flex items-center justify-between pt-2 border-t border-slate-200">
                  <span className="text-sm text-slate-600 flex items-center gap-1.5">
                    <CreditCard size={14} className="text-amber-600" />
                    Monto en caja
                  </span>
                  <span className={`text-sm font-bold ${esCancelada ? 'line-through text-slate-400' : 'text-slate-800'}`}>
                    {formatCurrency(venta.monto_caja ?? venta.total)}
                  </span>
                </div>
                {!esCancelada && (venta.deuda_restante ?? 0) > 0.001 && (
                  <div className="flex items-center justify-between pt-1 text-amber-700 bg-amber-50 px-3 py-1.5 rounded-lg border border-amber-200/60">
                    <span className="text-xs font-semibold uppercase tracking-wide">Saldo pendiente (Cashea)</span>
                    <span className="text-sm font-bold">Debe {formatCurrency(venta.deuda_restante)}</span>
                  </div>
                )}
                {venta.descripcion_cashea && (
                  <div className="pt-2 border-t border-slate-200">
                    <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">
                      <FileText size={12} className="inline mr-1" />
                      Descripción Cashea
                    </p>
                    <p className="text-sm text-slate-700 whitespace-pre-wrap leading-relaxed bg-white p-2.5 rounded-lg border border-slate-200/80">
                      {venta.descripcion_cashea}
                    </p>
                  </div>
                )}
              </>
            ) : null}
          </div>

          {/* Estado de la venta */}
          <div className="flex items-center justify-between text-sm pt-1">
            <span className="text-slate-500 flex items-center gap-1.5 font-medium">
              <Clock size={14} />
              Estado de la venta
            </span>
            {esCancelada ? (
              <span className="badge badge-cancelada gap-1">
                <XCircle size={12} /> Cancelada
              </span>
            ) : venta.por_pagar ? (
              <span className="badge badge-por-pagar gap-1">
                <Clock size={12} /> Por terminar de pagar
              </span>
            ) : (
              <span className="badge badge-completada gap-1">
                <CheckCircle2 size={12} /> Completada
              </span>
            )}
          </div>
        </div>

        {/* Footer / Acciones disponibles */}
        <div className="flex-shrink-0 px-7 py-4 border-t border-slate-100 bg-slate-50/50 rounded-b-3xl space-y-3">
          <div className="flex flex-col sm:flex-row gap-2.5">
            {!esCancelada && (
              <button
                type="button"
                onClick={handleNotaEntrega}
                className="flex-1 inline-flex items-center justify-center gap-2 text-xs font-semibold
                           text-pink-600 bg-pink-50 hover:bg-pink-100
                           border border-pink-200 px-4 py-2.5 rounded-xl
                           transition-all duration-200 shadow-sm"
              >
                <ExternalLink size={14} />
                Generar Nota de Entrega
              </button>
            )}

            {!soloLectura && !esCancelada && onSolicitarCancelacion && (
              <button
                type="button"
                onClick={handleCancelar}
                disabled={estaCancelando}
                className="inline-flex items-center justify-center gap-2 text-xs font-semibold
                           text-rose-600 bg-rose-50 hover:bg-rose-100
                           border border-rose-200 px-4 py-2.5 rounded-xl
                           transition-all duration-200 shadow-sm"
              >
                {estaCancelando ? (
                  <Loader2 size={14} className="animate-spin" />
                ) : (
                  <XCircle size={14} />
                )}
                Cancelar Venta
              </button>
            )}
          </div>

          <button
            type="button"
            onClick={onClose}
            className="btn-secondary w-full text-xs font-semibold py-2"
          >
            Cerrar
          </button>
        </div>
      </div>
    </div>
  )
}

export default DetalleVentaModal
