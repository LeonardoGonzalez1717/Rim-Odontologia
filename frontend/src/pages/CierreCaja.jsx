// =============================================================================
// pages/CierreCaja.jsx
// Módulo de Cierre de Caja: Arqueo de ingresos por métodos de pago y por asistente
// Diseño minimalista unificado con la estética del Dashboard
// =============================================================================
import React, { useState, useEffect, useCallback } from 'react'
import {
  Wallet, DollarSign, Activity, Printer, Loader2, XCircle,
  Calendar, Search, X, Users, UserCheck, TrendingUp,
} from 'lucide-react'
import { getCierreCaja } from '../api/api'
import { fmt, abrirCierreCaja, imprimirCierreCaja } from '../utils/reportesPrint'
import FiltroFechaVentas from '../components/FiltroFechaVentas'
import MetricCard from '../components/MetricCard'
import Paginacion from '../components/Paginacion'
import { usePaginacion } from '../hooks/usePaginacion'
import { useServerDate } from '../hooks/useServerDate'
import { esHoy, formatearFechaCorta } from '../utils/fechas'

const CierreCaja = ({ onToast }) => {
  const { hoy: hoyServidor } = useServerDate()
  const [fecha, setFecha] = useState(hoyServidor || '')
  const [datos, setDatos] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [busqueda, setBusqueda] = useState('')
  const [metodoSeleccionado, setMetodoSeleccionado] = useState(null)
  const [asistenteSeleccionado, setAsistenteSeleccionado] = useState(null)

  useEffect(() => {
    if (hoyServidor && !fecha) {
      setFecha(hoyServidor)
    }
  }, [hoyServidor, fecha])

  const cargar = useCallback(async (fechaConsultar = fecha, asistenteId = asistenteSeleccionado) => {
    if (!fechaConsultar) return
    setLoading(true)
    setError('')
    try {
      const res = await getCierreCaja({
        fecha: fechaConsultar,
        usuario_id: asistenteId,
      })
      setDatos(res)
    } catch (err) {
      setError(err.message || 'Error al obtener el cierre de caja.')
    } finally {
      setLoading(false)
    }
  }, [fecha, asistenteSeleccionado])

  useEffect(() => {
    if (fecha) {
      cargar(fecha, asistenteSeleccionado)
    }
  }, [fecha, asistenteSeleccionado, cargar])

  const handleFechaChange = (nuevaFecha) => {
    setFecha(nuevaFecha)
    setMetodoSeleccionado(null)
    setBusqueda('')
  }

  const handleAsistenteChange = (id) => {
    setAsistenteSeleccionado(id)
    setMetodoSeleccionado(null)
    setBusqueda('')
  }

  // Filtrar transacciones por buscador y método
  const transacciones = datos?.transacciones ?? []
  const q = busqueda.toLowerCase().trim()
  const qNum = q.replace(/^#/, '')
  const transaccionesFiltradas = transacciones.filter((t) => {
    const coincideMetodo = !metodoSeleccionado || t.metodo_pago === metodoSeleccionado
    const coincideBusqueda = !q
      || String(t.venta_id).includes(qNum)
      || (`#${t.venta_id}`).includes(q)
      || t.cliente?.toLowerCase().includes(q)
      || t.cliente_cedula?.toLowerCase().includes(q)
      || t.doctor?.toLowerCase().includes(q)
      || t.tratamientos?.toLowerCase().includes(q)
      || t.referencia?.toLowerCase().includes(q)
      || t.metodo_pago?.toLowerCase().includes(q)
      || t.usuario?.toLowerCase().includes(q)

    return coincideMetodo && coincideBusqueda
  })

  const {
    itemsPaginados: transaccionesPagina,
    pagina,
    setPagina,
    totalPaginas,
    total,
    indiceInicio,
    indiceFin,
  } = usePaginacion(transaccionesFiltradas, 12, [busqueda, metodoSeleccionado, asistenteSeleccionado, fecha])

  const metodos = datos?.metodos ?? []
  const usuarios = datos?.usuarios ?? []
  const asistentes = datos?.asistentes ?? []
  const totalCaja = datos?.total_caja ?? 0

  return (
    <div className="space-y-6">
      {/* ── 1. Filtro de Fecha ── */}
      <div className="card p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <p className="text-sm font-semibold text-slate-700">Cierre de Caja por Fecha</p>
          <p className="text-xs text-slate-400 mt-0.5">
            Arqueo de ingresos y balance de movimientos del día seleccionado
          </p>
        </div>
        <FiltroFechaVentas fecha={fecha} onChange={handleFechaChange} />
      </div>

      {/* ── 2. Fila de Acciones: Filtros por Asistente (Izq) + Imprimir (Der) ── */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        {asistentes.length > 0 ? (
          <div className="flex flex-col gap-1.5">
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => handleAsistenteChange(null)}
                className={`inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg border transition-all duration-200 ${asistenteSeleccionado === null
                  ? 'bg-slate-700 text-white border-slate-700 shadow-sm'
                  : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                  }`}
              >
                Todos
              </button>
              {asistentes.map((a) => (
                <button
                  type="button"
                  key={a.id}
                  onClick={() => handleAsistenteChange(a.id)}
                  className={`inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg border transition-all duration-200 ${asistenteSeleccionado === a.id
                    ? 'bg-pink-600 text-white border-pink-600 shadow-sm'
                    : 'bg-white text-slate-600 border-slate-200 hover:bg-pink-50 hover:border-pink-300 hover:text-pink-700'
                    }`}
                >
                  {a.nombre}
                </button>
              ))}
            </div>
            <p className="text-[11px] font-medium text-slate-400 italic">
              * Filtra las ventas y arqueo según el asistente que registró los cobros.
            </p>
          </div>
        ) : (
          <div />
        )}

        {/* Botón Imprimir Cierre */}
        {datos && (
          <div className="flex-shrink-0 lg:self-start">
            <button
              type="button"
              onClick={() => abrirCierreCaja(datos)}
              className="flex items-center gap-2 text-xs font-semibold text-slate-700 bg-white hover:bg-slate-50 border border-slate-200 px-4 py-2.5 rounded-xl transition-all duration-200 shadow-sm"
              title="Abrir e imprimir reporte de cierre de caja"
            >
              <Printer size={15} className="text-pink-600" />
              Imprimir Cierre de Caja
            </button>
          </div>
        )}
      </div>

      {/* ── Mensaje de Error ── */}
      {error && (
        <div className="flex items-center gap-2 bg-red-50 border border-red-200 text-red-700 rounded-2xl p-4 text-sm">
          <XCircle size={16} /> {error}
        </div>
      )}

      {/* ── Skeleton de Carga ── */}
      {loading ? (
        <div className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
            {[1, 2, 3].map((i) => (
              <div key={i} className="card p-5 animate-pulse space-y-3">
                <div className="h-4 bg-slate-200 rounded w-24" />
                <div className="h-8 bg-slate-200 rounded w-36" />
                <div className="h-3 bg-slate-200 rounded w-20" />
              </div>
            ))}
          </div>
          <div className="card p-8 animate-pulse">
            <div className="h-6 bg-slate-200 rounded w-48 mb-4" />
            <div className="h-28 bg-slate-100 rounded-xl" />
          </div>
        </div>
      ) : datos ? (
        <>
          {/* ── 3. Métricas Principales (Estilo Dashboard) ── */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
            <MetricCard
              title={esHoy(fecha) ? 'Ingresos en Caja Hoy' : 'Ingresos en Caja'}
              value={fmt(totalCaja)}
              icon={DollarSign}
              color="pink"
              subtitle={
                datos.total_cuotas_cashea > 0
                  ? `${fmt(datos.total_ventas)} ventas · ${fmt(datos.total_cuotas_cashea)} Cashea`
                  : esHoy(fecha) ? 'Total ingresado a caja' : formatearFechaCorta(fecha)
              }
            />

            <MetricCard
              title="Cobros Registrados"
              value={datos.total_transacciones ?? 0}
              icon={Activity}
              color="slate"
              subtitle="Transacciones individuales"
            />

            <MetricCard
              title="Ventas del Día"
              value={datos.total_ventas_conteo ?? 0}
              icon={Wallet}
              color="rose"
              subtitle="Pacientes atendidos"
            />
          </div>

          {/* ── 4. Desglose de Métodos de Pago ── */}
          <div className="card p-5 space-y-3.5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-pink-50 flex items-center justify-center text-pink-600">
                  <Wallet size={15} />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-800">
                    Desglose por Métodos de Pago
                  </h3>
                  <p className="text-xs text-slate-400">
                    Haz clic en un método para filtrar los movimientos de caja
                  </p>
                </div>
              </div>

              {metodoSeleccionado && (
                <button
                  type="button"
                  onClick={() => setMetodoSeleccionado(null)}
                  className="text-xs text-pink-600 font-semibold hover:underline"
                >
                  Ver todos
                </button>
              )}
            </div>

            {metodos.length === 0 ? (
              <div className="py-6 text-center text-slate-400 text-xs">
                No hay ingresos registrados en caja para esta fecha.
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
                {metodos.map((m) => {
                  const seleccionado = metodoSeleccionado === m.metodo_pago
                  return (
                    <button
                      type="button"
                      key={m.metodo_pago}
                      onClick={() => setMetodoSeleccionado(seleccionado ? null : m.metodo_pago)}
                      className={`text-left p-3 rounded-xl border transition-all duration-200 cursor-pointer ${seleccionado
                        ? 'bg-pink-50/90 border-pink-400 ring-2 ring-pink-500/20 shadow-sm'
                        : 'bg-slate-50 hover:bg-slate-100/80 border-slate-200/80'
                        }`}
                    >
                      <div className="flex items-center justify-between gap-1 mb-1">
                        <span className="text-xs font-bold text-slate-700 truncate" title={m.metodo_pago}>
                          {m.metodo_pago}
                        </span>
                        <span className="text-[10px] font-semibold text-slate-400">
                          {m.porcentaje}%
                        </span>
                      </div>
                      <p className="text-base font-bold text-slate-900">
                        {fmt(m.total)}
                      </p>
                      <p className="text-[10px] text-slate-400 mt-0.5">
                        {m.cantidad} cobro{m.cantidad !== 1 ? 's' : ''}
                      </p>
                    </button>
                  )
                })}
              </div>
            )}
          </div>

          {/* ── 5. Desglose por Asistente (si hay más de un usuario o ventas registradas) ── */}
          {usuarios.length > 0 && !asistenteSeleccionado && (
            <div className="card p-5 space-y-3.5">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-pink-50 flex items-center justify-center text-pink-600">
                  <UserCheck size={15} />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-800">
                    Cobros por Asistente
                  </h3>
                  <p className="text-xs text-slate-400">
                    Total cobrado por cada usuario en la jornada
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {usuarios.map((u) => (
                  <div
                    key={u.usuario_id || u.usuario_nombre}
                    className="bg-slate-50 border border-slate-200/80 rounded-xl p-3.5 flex flex-col justify-between"
                  >
                    <div className="flex items-center justify-between gap-2 mb-2">
                      <span className="text-xs font-bold text-slate-800 truncate">
                        {u.usuario_nombre}
                      </span>
                      <span className="text-sm font-bold text-slate-900">
                        {fmt(u.total_caja)}
                      </span>
                    </div>

                    {u.metodos && u.metodos.length > 0 && (
                      <div className="flex flex-wrap gap-1 pt-1.5 border-t border-slate-200/60">
                        {u.metodos.map((um) => (
                          <span
                            key={um.metodo_pago}
                            className="text-[10px] text-slate-600 bg-white border border-slate-200 px-1.5 py-0.5 rounded"
                          >
                            {um.metodo_pago}: <strong className="text-slate-800">{fmt(um.total)}</strong>
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ── 6. Detalle de Movimientos de Caja (Estilo VentasRecientes) ── */}
          <div className="card p-0 overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h3 className="text-sm font-bold text-slate-800">
                  Movimientos de Caja {metodoSeleccionado ? `· ${metodoSeleccionado}` : ''}
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  {transaccionesFiltradas.length} cobro{transaccionesFiltradas.length !== 1 ? 's' : ''} registrado{transaccionesFiltradas.length !== 1 ? 's' : ''}
                </p>
              </div>

              {/* Buscador */}
              <div className="relative w-full sm:w-64">
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                <input
                  type="text"
                  placeholder="Buscar N° venta, cliente, doctor…"
                  value={busqueda}
                  onChange={(e) => setBusqueda(e.target.value)}
                  className="w-full bg-slate-50 hover:bg-slate-100/70 focus:bg-white text-slate-800 placeholder:text-slate-400 text-xs rounded-xl pl-9 pr-8 py-2 border border-slate-200 focus:border-pink-500 focus:ring-2 focus:ring-pink-500/20 outline-none transition-all"
                />
                {busqueda && (
                  <button
                    type="button"
                    onClick={() => setBusqueda('')}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-0.5 rounded-full hover:bg-slate-200/60 transition-colors"
                  >
                    <X size={13} />
                  </button>
                )}
              </div>
            </div>

            {transaccionesFiltradas.length === 0 ? (
              <div className="py-14 text-center text-slate-400 text-xs">
                No se encontraron movimientos con los filtros seleccionados.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-slate-50 border-b border-slate-100">
                    <tr>
                      {['N° Venta', 'Hora', 'Cliente', 'Doctor', 'Tratamiento', 'Método', 'Ref / Nota', 'Asistente', 'Monto'].map((h) => (
                        <th
                          key={h}
                          className="text-left text-xs font-semibold text-slate-400 uppercase tracking-wider px-4 py-3 first:pl-5 last:pr-5 last:text-right whitespace-nowrap"
                        >
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50 text-xs">
                    {transaccionesPagina.map((t, idx) => (
                      <tr key={`${t.venta_id}-${t.metodo_pago}-${idx}`} className="hover:bg-slate-50/70 transition-colors">
                        <td className="px-4 py-3 pl-5 font-mono text-xs font-bold text-slate-700">
                          #{t.venta_id}
                        </td>
                        <td className="px-4 py-3 font-mono text-slate-500">
                          {t.hora}
                        </td>
                        <td className="px-4 py-3">
                          <span className="font-semibold text-slate-800">{t.cliente}</span>
                          {t.cliente_cedula && (
                            <span className="block text-[10px] text-slate-400 font-mono">
                              {t.cliente_cedula}
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-slate-600">
                          {t.doctor}
                        </td>
                        <td className="px-4 py-3 text-slate-600 max-w-xs truncate" title={t.tratamientos}>
                          {t.tratamientos}
                        </td>
                        <td className="px-4 py-3">
                          <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-medium bg-slate-100 text-slate-700 border border-slate-200">
                            {t.metodo_pago}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-slate-500 font-mono text-[11px]">
                          {t.referencia || '—'}
                        </td>
                        <td className="px-4 py-3 text-slate-600 text-[11px]">
                          {t.usuario || '—'}
                        </td>
                        <td className="px-4 py-3 pr-5 font-bold text-slate-900 text-right">
                          {fmt(t.monto)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>

                {/* Paginación */}
                <div className="px-5 pb-4 pt-2">
                  <Paginacion
                    pagina={pagina}
                    totalPaginas={totalPaginas}
                    total={total}
                    onPaginaChange={setPagina}
                    indiceInicio={indiceInicio}
                    indiceFin={indiceFin}
                    etiquetaSingular="cobro"
                    etiquetaPlural="cobros"
                  />
                </div>
              </div>
            )}
          </div>
        </>
      ) : null}
    </div>
  )
}

export default CierreCaja

