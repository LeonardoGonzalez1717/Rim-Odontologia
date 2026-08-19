// =============================================================================
// components/SaldoFavorModal.jsx
// Modal para registrar un saldo a favor a un cliente (cliente, monto, fecha, concepto)
// =============================================================================
import React, { useState, useEffect } from 'react'
import { X, Sparkles, User, Calendar, DollarSign, FileText, Loader2, CheckCircle2 } from 'lucide-react'
import ClienteSelect from './ClienteSelect'
import { registrarSaldoFavor } from '../api/api'
import { useServerDate, getActualServerDatetime } from '../hooks/useServerDate'
import { formatearDMAHora } from '../utils/fechas'

const SaldoFavorModal = ({
  onClose,
  clientes = [],
  onSaldoFavorGuardado,
  onRecargarClientes,
}) => {
  const { cargando } = useServerDate()
  const [clienteId, setClienteId] = useState('')
  const [monto, setMonto] = useState('')
  const [fecha, setFecha] = useState(getActualServerDatetime())
  const [concepto, setConcepto] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [exito, setExito] = useState(false)

  useEffect(() => {
    if (cargando) return
    const f = getActualServerDatetime()
    if (f) setFecha(f)
  }, [cargando])

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [onClose])

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')

    if (!clienteId) {
      setError('Por favor, selecciona un cliente.')
      return
    }

    const montoNum = parseFloat(monto)
    if (!monto || !Number.isFinite(montoNum) || montoNum <= 0) {
      setError('Indica un monto válido mayor a $0.')
      return
    }

    setLoading(true)
    try {
      await registrarSaldoFavor({
        cliente_id: parseInt(clienteId, 10),
        monto: montoNum,
        fecha: '',
        concepto: concepto.trim() || 'Saldo a favor registrado',
      })

      if (onRecargarClientes) await onRecargarClientes()
      setExito(true)

      setTimeout(() => {
        setExito(false)
        if (onSaldoFavorGuardado) onSaldoFavorGuardado()
        onClose()
      }, 1000)
    } catch (err) {
      setError(err.message || 'No se pudo registrar el saldo a favor.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-fade-in"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md flex flex-col animate-scale-in">
        {/* Cabecera */}
        <div className="flex items-center justify-between px-6 pt-5 pb-4 border-b border-slate-100 flex-shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <Sparkles size={18} />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-800">Registrar Saldo a Favor</h2>
              <p className="text-xs text-slate-500">Asigna un saldo a favor o abono a un cliente</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-500 transition-colors"
            aria-label="Cerrar"
          >
            <X size={16} />
          </button>
        </div>

        {/* Formulario */}
        <form onSubmit={handleSubmit} className="px-6 py-5 space-y-4">
          {error && (
            <div className="p-3 text-xs bg-red-50 border border-red-200 text-red-700 rounded-xl">
              {error}
            </div>
          )}

          {exito && (
            <div className="p-3 text-xs bg-emerald-50 border border-emerald-200 text-emerald-700 rounded-xl flex items-center gap-2">
              <CheckCircle2 size={16} />
              <span>¡Saldo a favor registrado exitosamente!</span>
            </div>
          )}

          {/* Cliente */}
          <div>
            <label htmlFor="cliente_id_sf" className="form-label text-xs font-semibold text-slate-700">
              <User size={13} className="inline mr-1 text-slate-500" />
              Cliente
            </label>
            <ClienteSelect
              id="cliente_id_sf"
              clientes={clientes}
              value={clienteId}
              onChange={(val) => {
                setError('')
                setClienteId(val)
              }}
              placeholder="Buscar cliente…"
            />
          </div>

          {/* Monto */}
          <div>
            <label htmlFor="monto_sf" className="form-label text-xs font-semibold text-slate-700">
              <DollarSign size={13} className="inline mr-1 text-slate-500" />
              Monto ($)
            </label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm font-bold">$</span>
              <input
                id="monto_sf"
                type="text"
                inputMode="decimal"
                value={monto}
                onChange={(e) => {
                  setError('')
                  setMonto(e.target.value)
                }}
                placeholder="0.00"
                className="form-input pl-7 py-2 text-base font-bold text-slate-800"
                required
              />
            </div>
          </div>

          {/* Fecha */}
          <div>
            <label htmlFor="fecha_sf" className="form-label text-xs font-semibold text-slate-700">
              <Calendar size={13} className="inline mr-1 text-slate-500" />
              Fecha
            </label>
            <input
              id="fecha_sf"
              type="text"
              value={fecha ? formatearDMAHora(fecha) : ''}
              readOnly
              tabIndex={-1}
              className="form-input text-sm bg-slate-50 text-slate-600 cursor-default"
              aria-label="Fecha y hora de Venezuela (no editable)"
            />
          </div>

          {/* Concepto / Notas */}
          <div>
            <label htmlFor="concepto_sf" className="form-label text-xs font-semibold text-slate-700">
              <FileText size={13} className="inline mr-1 text-slate-500" />
              Concepto / Notas <span className="text-slate-400 font-normal">(opcional)</span>
            </label>
            <input
              id="concepto_sf"
              type="text"
              value={concepto}
              onChange={(e) => setConcepto(e.target.value)}
              placeholder="Ej. Abono anticipado, pago a cuenta…"
              className="form-input text-sm"
            />
          </div>

          {/* Botones */}
          <div className="pt-2 flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="btn-secondary text-xs px-4 py-2"
              disabled={loading}
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={loading || exito}
              className="btn-primary text-xs px-5 py-2 flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 border-emerald-600"
            >
              {loading ? <Loader2 size={14} className="animate-spin" /> : <Sparkles size={14} />}
              <span>{loading ? 'Guardando…' : 'Guardar saldo a favor'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default SaldoFavorModal
