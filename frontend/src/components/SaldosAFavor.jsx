// =============================================================================
// components/SaldosAFavor.jsx
// Lista de clientes con saldo a favor disponible.
// Al consumirse el saldo (aplicado en una venta), el cliente desaparece de la lista.
// =============================================================================
import React, { useState, useEffect, useCallback, useRef, memo } from 'react'
import {
  ChevronLeft, Loader2, Search, X, CheckCircle2, Contact, Sparkles,
} from 'lucide-react'
import { getSaldosAFavor } from '../api/api'
import { formatearDMAa } from '../utils/fechas'

const fmt = (v) =>
  new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'USD' }).format(v)

const SaldosAFavor = ({ onVolver, onToast, reloadKey = 0 }) => {
  const [clientes, setClientes] = useState([])
  const [loading, setLoading] = useState(true)
  const [busqueda, setBusqueda] = useState('')
  const [expandidoId, setExpandidoId] = useState(null)
  const [resumen, setResumen] = useState({
    total_saldo: 0,
    total_clientes: 0,
  })

  const onToastRef = useRef(onToast)
  onToastRef.current = onToast

  const tieneDatosRef = useRef(false)

  const cargar = useCallback(async ({ silencioso = false } = {}) => {
    if (!silencioso) setLoading(true)
    try {
      const res = await getSaldosAFavor()
      setClientes(res.clientes ?? [])
      setResumen({
        total_saldo: res.total_saldo ?? 0,
        total_clientes: res.total_clientes ?? 0,
      })
      tieneDatosRef.current = true
    } catch (err) {
      console.error('Error al cargar saldos a favor:', err)
      onToastRef.current?.(err.message || 'No se pudieron cargar los saldos a favor.')
      setClientes([])
    } finally {
      if (!silencioso) setLoading(false)
    }
  }, [])

  useEffect(() => {
    cargar({ silencioso: tieneDatosRef.current })
  }, [reloadKey, cargar])

  const filtrados = clientes.filter((c) => {
    const q = busqueda.toLowerCase().trim()
    if (!q) return true
    return (
      c.cliente_nombre?.toLowerCase().includes(q) ||
      c.cliente_cedula?.toLowerCase().includes(q) ||
      c.cliente_telefono?.toLowerCase().includes(q)
    )
  })

  return (
    <div className="space-y-5 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          {onVolver && (
            <button
              type="button"
              onClick={onVolver}
              className="w-9 h-9 rounded-xl bg-slate-100 hover:bg-slate-200
                         flex items-center justify-center text-slate-600 transition-colors"
              aria-label="Volver al inicio"
            >
              <ChevronLeft size={18} />
            </button>
          )}
          <div>
            <h2 className="text-xl font-bold text-slate-800">Saldo a favor</h2>
            <p className="text-sm text-slate-500">
              {resumen.total_clientes} cliente{resumen.total_clientes !== 1 ? 's' : ''} ·{' '}
              {fmt(resumen.total_saldo)} disponible
            </p>
          </div>
        </div>
      </div>

      <div className="relative">
        <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
        <input
          type="text"
          value={busqueda}
          onChange={(e) => setBusqueda(e.target.value)}
          placeholder="Buscar por cliente, cédula o teléfono…"
          className="form-input pl-10"
        />
        {busqueda && (
          <button
            type="button"
            onClick={() => setBusqueda('')}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
          >
            <X size={14} />
          </button>
        )}
      </div>

      <div className="card p-0 overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-16 gap-2 text-emerald-600">
            <Loader2 size={20} className="animate-spin" />
            <span className="text-sm">Cargando saldos a favor…</span>
          </div>
        ) : filtrados.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-slate-400">
            <CheckCircle2 size={36} strokeWidth={1.5} className="mb-2 text-slate-300" />
            <p className="text-sm">
              {busqueda
                ? 'Sin resultados para esa búsqueda.'
                : 'No hay clientes con saldo a favor.'}
            </p>
          </div>
        ) : (
          <ul className="divide-y divide-slate-100">
            {filtrados.map((cliente) => {
              const abierto = expandidoId === cliente.cliente_id
              const movimientos = cliente.movimientos ?? []
              return (
                <li key={cliente.cliente_id}>
                  <button
                    type="button"
                    onClick={() =>
                      setExpandidoId(abierto ? null : cliente.cliente_id)
                    }
                    className="w-full flex items-center justify-between gap-4 px-5 sm:px-6 py-4
                               hover:bg-slate-50/70 transition-colors text-left"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-700
                                      flex items-center justify-center flex-shrink-0">
                        <Contact size={16} />
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-slate-800 truncate">
                          {cliente.cliente_nombre}
                        </p>
                        <p className="text-xs text-slate-400 mt-0.5">
                          {cliente.cliente_cedula}
                          {cliente.cliente_telefono ? ` · ${cliente.cliente_telefono}` : ''}
                        </p>
                      </div>
                    </div>
                    <span className="text-sm font-bold text-emerald-700 whitespace-nowrap flex items-center gap-1.5">
                      <Sparkles size={13} className="text-emerald-500" />
                      {fmt(cliente.saldo_a_favor)}
                    </span>
                  </button>

                  {abierto && (
                    <div className="bg-slate-50/80 border-t border-slate-100 px-5 sm:px-6 py-3.5 space-y-3">
                      <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs">
                        <span className="text-emerald-800">
                          Tratamientos prepagados:{' '}
                          <span className="font-semibold">{fmt(cliente.saldo_prepagado ?? cliente.saldo_a_favor)}</span>
                        </span>
                      </div>

                      {movimientos.length === 0 ? (
                        <p className="text-xs text-slate-400">
                          Sin tratamientos prepagados pendientes.
                        </p>
                      ) : (
                        <ul className="divide-y divide-slate-100 rounded-xl border border-slate-100 bg-white">
                          {movimientos.map((m) => (
                            <li
                              key={m.id}
                              className="flex items-center justify-between gap-3 px-3 py-2.5 text-xs"
                            >
                              <div className="min-w-0">
                                <p className="font-medium text-slate-700 truncate">
                                  {m.concepto || 'Movimiento'}
                                </p>
                                <p className="text-slate-400 mt-0.5">
                                  {formatearDMAa(m.fecha)}
                                </p>
                              </div>
                              <span
                                className={`font-semibold whitespace-nowrap ${
                                  m.monto < 0 ? 'text-rose-600' : 'text-emerald-700'
                                }`}
                              >
                                {m.monto < 0 ? '−' : '+'}
                                {fmt(Math.abs(m.monto))}
                              </span>
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>
                  )}
                </li>
              )
            })}
          </ul>
        )}
      </div>
    </div>
  )
}

export default memo(SaldosAFavor)
