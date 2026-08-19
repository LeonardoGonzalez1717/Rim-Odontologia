// =============================================================================
// components/TratamientosPendientes.jsx
// Lista de clientes con tratamientos pagados pendientes de realizar
// =============================================================================
import React, { useState, useEffect, useCallback, useRef, memo } from 'react'
import {
  ChevronLeft, Loader2, Search, X, CheckCircle2, Contact, Clock, Banknote,
} from 'lucide-react'
import { getTratamientosPendientes, marcarTratamientoRealizado } from '../api/api'
import { formatearDMA } from '../utils/fechas'

const fmt = (v) =>
  new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'USD' }).format(v)

const TratamientosPendientes = ({ onVolver, onToast, onRegistrarPago, onTratamientoRealizado, reloadKey = 0 }) => {
  const [clientes, setClientes] = useState([])
  const [loading, setLoading] = useState(true)
  const [busqueda, setBusqueda] = useState('')
  const [expandidoId, setExpandidoId] = useState(null)
  const [marcandoId, setMarcandoId] = useState(null)
  const [resumen, setResumen] = useState({
    total_pendiente: 0,
    total_tratamientos: 0,
    total_clientes: 0,
  })

  const onToastRef = useRef(onToast)
  onToastRef.current = onToast

  const onRegistrarPagoRef = useRef(onRegistrarPago)
  onRegistrarPagoRef.current = onRegistrarPago

  const onTratamientoRealizadoRef = useRef(onTratamientoRealizado)
  onTratamientoRealizadoRef.current = onTratamientoRealizado

  const tieneDatosRef = useRef(false)

  const cargar = useCallback(async ({ silencioso = false } = {}) => {
    if (!silencioso) setLoading(true)
    try {
      const res = await getTratamientosPendientes()
      setClientes(res.clientes ?? [])
      setResumen({
        total_pendiente: res.total_pendiente ?? 0,
        total_tratamientos: res.total_tratamientos ?? 0,
        total_clientes: res.total_clientes ?? 0,
      })
      tieneDatosRef.current = true
    } catch (err) {
      console.error('Error al cargar tratamientos pendientes:', err)
      onToastRef.current?.(err.message || 'No se pudieron cargar los tratamientos pendientes.')
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
      c.cliente_telefono?.toLowerCase().includes(q) ||
      c.tratamientos?.some((t) => t.nombre?.toLowerCase().includes(q))
    )
  })

  const handleMarcarRealizado = async (detalleId) => {
    setMarcandoId(detalleId)
    try {
      await marcarTratamientoRealizado(detalleId)
      onToastRef.current?.('Tratamiento marcado como realizado.')
      await cargar({ silencioso: true })
      // Notificar al padre para que recargue Saldo a Favor
      // (el tratamiento realizado ya no debe aparecer como saldo a favor)
      onTratamientoRealizadoRef.current?.()
    } catch (err) {
      onToastRef.current?.(err.message || 'No se pudo marcar el tratamiento.')
    } finally {
      setMarcandoId(null)
    }
  }

  const handleRegistrarPago = (cliente, tratamiento) => {
    if (!onRegistrarPagoRef.current) {
      onToastRef.current?.('No se puede abrir el registro de pago.')
      return
    }
    onRegistrarPagoRef.current({
      detalle_id: tratamiento.id,
      cliente_id: cliente.cliente_id,
      doctor_id: tratamiento.doctor_id,
      doctor_nombre: tratamiento.doctor_nombre,
      servicio_id: tratamiento.servicio_id,
      nombre: tratamiento.nombre,
      precio: tratamiento.precio,
      venta_id: tratamiento.venta_id,
    })
  }

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
            <h2 className="text-xl font-bold text-slate-800">Tratamientos pendientes</h2>
            <p className="text-sm text-slate-500">
              {resumen.total_clientes} cliente{resumen.total_clientes !== 1 ? 's' : ''} ·{' '}
              {resumen.total_tratamientos} pendiente{resumen.total_tratamientos !== 1 ? 's' : ''} ·{' '}
              {fmt(resumen.total_pendiente)}
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
          placeholder="Buscar por cliente, cédula o tratamiento…"
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
          <div className="flex items-center justify-center py-16 gap-2 text-pink-500">
            <Loader2 size={20} className="animate-spin" />
            <span className="text-sm">Cargando pendientes…</span>
          </div>
        ) : filtrados.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-slate-400">
            <CheckCircle2 size={36} strokeWidth={1.5} className="mb-2 text-slate-300" />
            <p className="text-sm">
              {busqueda
                ? 'Sin resultados para esa búsqueda.'
                : 'No hay tratamientos pendientes por realizar.'}
            </p>
          </div>
        ) : (
          <ul className="divide-y divide-slate-100">
            {filtrados.map((cliente) => {
              const abierto = expandidoId === cliente.cliente_id
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
                          {' · '}
                          {cliente.tratamientos.length} tratamiento
                          {cliente.tratamientos.length !== 1 ? 's' : ''}
                        </p>
                      </div>
                    </div>
                    <span className="text-sm font-bold text-emerald-700 whitespace-nowrap">
                      {fmt(cliente.total_pendiente)}
                    </span>
                  </button>

                  {abierto && (
                    <ul className="bg-slate-50/80 border-t border-slate-100 divide-y divide-slate-100">
                      {cliente.tratamientos.map((t) => {
                        // Un item pagado=true con un hermano pagado=false en la misma venta
                        // proviene de un pago parcial, no del toggle "Hoy" desmarcado.
                        // En ese caso NO se muestra "Ya se realizó".
                        const tieneHermanoPendiente = t.pagado && cliente.tratamientos.some(
                          (otro) =>
                            otro.id !== t.id &&
                            otro.venta_id === t.venta_id &&
                            otro.servicio_id === t.servicio_id &&
                            !otro.pagado,
                        )
                        const esSaldoFavor = t.pagado && !tieneHermanoPendiente

                        return (
                          <li
                            key={t.id}
                            className="flex flex-col sm:flex-row sm:items-center justify-between
                                       gap-3 px-5 sm:px-6 py-3.5"
                          >
                            <div className="min-w-0">
                              <p className="text-sm font-medium text-slate-800">{t.nombre}</p>
                              <p className="text-xs text-slate-400 mt-0.5 flex items-center gap-1">
                                <Clock size={11} />
                                Venta del {formatearDMA(t.fecha)} · {fmt(t.precio)}
                                {!t.pagado && (
                                  <span className="text-amber-700 font-medium"> · Pendiente de pago</span>
                                )}
                                {tieneHermanoPendiente && (
                                  <span className="text-emerald-700 font-medium"> · Prepagado</span>
                                )}
                              </p>
                            </div>
                            <div className="flex flex-wrap items-center gap-2">
                              {!t.pagado && (
                              <button
                                type="button"
                                onClick={() => handleRegistrarPago(cliente, t)}
                                className="btn-primary text-xs py-2 px-3 flex items-center justify-center gap-1.5
                                           whitespace-nowrap"
                              >
                                <Banknote size={13} />
                                Registrar pago
                              </button>
                              )}
                              {esSaldoFavor && (
                              <button
                                type="button"
                                onClick={() => handleMarcarRealizado(t.id)}
                                disabled={marcandoId === t.id}
                                className="btn-secondary text-xs py-2 px-3 flex items-center justify-center gap-1.5
                                           whitespace-nowrap disabled:opacity-50"
                              >
                                {marcandoId === t.id ? (
                                  <>
                                    <Loader2 size={13} className="animate-spin" />
                                    Guardando…
                                  </>
                                ) : (
                                  <>
                                    <CheckCircle2 size={13} />
                                    Ya se realizó
                                  </>
                                )}
                              </button>
                              )}
                            </div>
                          </li>
                        )
                      })}
                    </ul>
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

export default memo(TratamientosPendientes)
