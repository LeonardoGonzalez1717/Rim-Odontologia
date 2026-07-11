// =============================================================================
// pages/AjusteCashea.jsx — Registro de cuotas Cashea que ingresan a caja
// =============================================================================
import React, { useState, useEffect, useCallback } from 'react'
import {
  CreditCard, Plus, Loader2, DollarSign, Calendar, Save,
} from 'lucide-react'
import ConfirmPinModal from '../components/ConfirmPinModal'
import FiltroFechaVentas from '../components/FiltroFechaVentas'
import Paginacion from '../components/Paginacion'
import { usePaginacion } from '../hooks/usePaginacion'
import { getAjustesCashea, registrarAjusteCashea } from '../api/api'
import { hoyISO } from '../utils/fechas'
import { fmt } from '../utils/reportesPrint'

const CONCEPTO = 'Cuota de Cashea'

const getFechaHoraActual = () => {
  const ahora = new Date()
  const offsetMs = ahora.getTimezoneOffset() * 60 * 1000
  const local = new Date(ahora.getTime() - offsetMs)
  return local.toISOString().slice(0, 16)
}

const AjusteCashea = ({ onToast }) => {
  const [fecha, setFecha] = useState(hoyISO)
  const [ajustes, setAjustes] = useState([])
  const [totalDia, setTotalDia] = useState(0)
  const [loading, setLoading] = useState(true)
  const [guardando, setGuardando] = useState(false)
  const [error, setError] = useState('')
  const [monto, setMonto] = useState('')
  const [fechaIngreso, setFechaIngreso] = useState(getFechaHoraActual)
  const [pinConfirm, setPinConfirm] = useState(null)

  const cargar = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const res = await getAjustesCashea(fecha)
      setAjustes(res.ajustes ?? [])
      setTotalDia(res.total_dia ?? 0)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }, [fecha])

  useEffect(() => { cargar() }, [cargar])

  const {
    itemsPaginados: ajustesPagina,
    pagina,
    setPagina,
    totalPaginas,
    total,
    indiceInicio,
    indiceFin,
  } = usePaginacion(ajustes, 10, [fecha])

  const ejecutarRegistro = async () => {
    const valor = parseFloat(monto)
    if (!monto || !Number.isFinite(valor) || valor <= 0) {
      setError('Indica un monto mayor a cero.')
      return
    }
    if (!fechaIngreso) {
      setError('Indica la fecha y hora del ingreso.')
      return
    }

    setGuardando(true)
    setError('')
    try {
      const res = await registrarAjusteCashea({
        monto: valor,
        fecha_ingreso: fechaIngreso.replace('T', ' ') + ':00',
      })
      onToast({ mensaje: res.message || 'Cuota registrada.', tipo: 'success' })
      setMonto('')
      setFechaIngreso(getFechaHoraActual())
      await cargar()
    } catch (err) {
      setError(err.message)
      onToast({ mensaje: err.message, tipo: 'error' })
    } finally {
      setGuardando(false)
    }
  }

  const handleSubmit = (e) => {
    e.preventDefault()
    setPinConfirm({
      titulo: 'Registrar cuota Cashea',
      descripcion: fmt(parseFloat(monto) || 0),
      detalle: 'Se registrará este ingreso en caja como cuota de Cashea.',
      textoConfirmar: 'Registrar',
      variante: 'warning',
      onConfirm: ejecutarRegistro,
    })
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {pinConfirm && (
        <ConfirmPinModal {...pinConfirm} onClose={() => setPinConfirm(null)} />
      )}

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-800">Ajuste Cashea</h2>
          <p className="text-slate-500 text-sm mt-1">
            Registra cuotas de Cashea que ingresan a caja
          </p>
        </div>
        <FiltroFechaVentas fecha={fecha} onChange={setFecha} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <form onSubmit={handleSubmit} className="card space-y-5">
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
              <Plus size={18} />
            </div>
            <h3 className="font-bold text-slate-800">Nuevo ingreso</h3>
          </div>

          {error && (
            <div className="text-sm text-red-700 bg-red-50 border border-red-200 rounded-xl px-4 py-3">
              {error}
            </div>
          )}

          <div>
            <label className="form-label">Tipo de ingreso</label>
            <div className="form-input bg-slate-100 cursor-not-allowed flex items-center gap-2 text-slate-700">
              <CreditCard size={15} className="text-amber-600" />
              {CONCEPTO}
            </div>
          </div>

          <div>
            <label htmlFor="monto_cuota" className="form-label">
              <DollarSign size={14} className="inline mr-1.5 text-pink-500" />
              Monto en caja ($)
            </label>
            <div className="relative">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 font-semibold text-sm">$</span>
              <input
                id="monto_cuota"
                type="number"
                min="0.01"
                step="0.01"
                value={monto}
                onChange={(e) => { setError(''); setMonto(e.target.value) }}
                placeholder="0.00"
                className="form-input pl-8"
                required
              />
            </div>
          </div>

          <div>
            <label htmlFor="fecha_ingreso" className="form-label">
              <Calendar size={14} className="inline mr-1.5 text-pink-500" />
              Fecha y hora
            </label>
            <input
              id="fecha_ingreso"
              type="datetime-local"
              value={fechaIngreso}
              onChange={(e) => { setError(''); setFechaIngreso(e.target.value) }}
              className="form-input"
              required
            />
          </div>

          <button
            type="submit"
            disabled={guardando}
            className="btn-primary w-full flex items-center justify-center gap-2"
          >
            {guardando ? (
              <>
                <Loader2 size={16} className="animate-spin" />
                Guardando…
              </>
            ) : (
              <>
                <Save size={16} />
                Registrar cuota
              </>
            )}
          </button>
        </form>

        <div className="card p-0 overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <CreditCard size={18} className="text-amber-600" />
              <h3 className="font-bold text-slate-800">Cuotas del día</h3>
            </div>
            <span className="text-sm font-bold text-pink-600">{fmt(totalDia)}</span>
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-16 gap-2 text-pink-500">
              <Loader2 size={20} className="animate-spin" />
              <span className="text-sm">Cargando…</span>
            </div>
          ) : ajustes.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-slate-400">
              <CreditCard size={36} strokeWidth={1.5} className="mb-2 text-slate-300" />
              <p className="text-sm">No hay cuotas registradas este día.</p>
            </div>
          ) : (
            <>
              <ul className="divide-y divide-slate-100">
                {ajustesPagina.map((a) => (
                  <li
                    key={a.id}
                    className="flex items-center justify-between gap-4 px-6 py-4 hover:bg-slate-50/70"
                  >
                    <div>
                      <p className="text-sm font-semibold text-slate-800">{a.concepto}</p>
                      <p className="text-xs text-slate-500">{a.hora}</p>
                    </div>
                    <span className="text-sm font-bold text-slate-800">{fmt(a.monto)}</span>
                  </li>
                ))}
              </ul>
              <div className="px-6 pb-4">
                <Paginacion
                  pagina={pagina}
                  totalPaginas={totalPaginas}
                  total={total}
                  onPaginaChange={setPagina}
                  indiceInicio={indiceInicio}
                  indiceFin={indiceFin}
                  etiquetaSingular="cuota"
                  etiquetaPlural="cuotas"
                />
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}

export default AjusteCashea
