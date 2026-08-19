// =============================================================================
// pages/MetodosPago.jsx
// CRUD de Métodos de Pago — lista, crear, editar, activar/desactivar, eliminar
// =============================================================================
import React, { useState, useEffect, useCallback } from 'react'
import {
  Plus, Pencil, Trash2, Power, PowerOff, Loader2,
  CheckCircle2, XCircle, X, Save, Wallet, AlertCircle,
  GripVertical,
} from 'lucide-react'
import ConfirmPinModal from '../components/ConfirmPinModal'
import {
  getMetodosPago, crearMetodoPago, actualizarMetodoPago,
  toggleMetodoPago, eliminarMetodoPago,
} from '../api/api'

// ─────────────────────────────────────────────────────────────────────────────
// Modal de Crear / Editar
// ─────────────────────────────────────────────────────────────────────────────
const MetodoPagoModal = ({ metodo, onClose, onGuardado }) => {
  const esEdicion = !!metodo
  const [nombre, setNombre] = useState(metodo?.nombre ?? '')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    const fn = (e) => { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', fn)
    return () => document.removeEventListener('keydown', fn)
  }, [onClose])

  const handleSubmit = async (e) => {
    e.preventDefault()
    const nombreTrim = nombre.trim()
    if (!nombreTrim) { setError('El nombre no puede estar vacío.'); return }
    if (nombreTrim.length > 80) { setError('Máximo 80 caracteres.'); return }

    setLoading(true)
    setError('')
    try {
      if (esEdicion) {
        await actualizarMetodoPago({ id: metodo.id, nombre: nombreTrim })
      } else {
        await crearMetodoPago({ nombre: nombreTrim })
      }
      onGuardado()
    } catch (err) {
      setError(err.message || 'Error al guardar.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-fade-in"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-sm animate-scale-in">
        {/* Header */}
        <div className="flex items-center justify-between px-7 pt-6 pb-4 border-b border-slate-100">
          <div>
            <h2 className="text-xl font-bold text-slate-800">
              {esEdicion ? 'Editar Método' : 'Nuevo Método de Pago'}
            </h2>
            <p className="text-sm text-slate-500 mt-0.5">
              {esEdicion ? 'Modifica el nombre del método' : 'Agrega un nuevo método de pago al catálogo'}
            </p>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200
                       flex items-center justify-center text-slate-500 transition-all"
          >
            <X size={16} />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="px-7 py-6 space-y-4">
          {error && (
            <div className="flex items-center gap-2 bg-red-50 border border-red-200
                            text-red-700 rounded-xl p-3 text-sm animate-slide-up">
              <AlertCircle size={15} className="flex-shrink-0" /> {error}
            </div>
          )}

          <div>
            <label htmlFor="nombre_metodo" className="form-label">Nombre del método</label>
            <div className="relative mt-1">
              <Wallet size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-pink-400" />
              <input
                id="nombre_metodo"
                type="text"
                value={nombre}
                onChange={(e) => { setError(''); setNombre(e.target.value) }}
                placeholder="Ej: Divisas, Binance, Nequi…"
                className="form-input pl-9"
                autoFocus
                required
                maxLength={80}
              />
            </div>
            <p className="text-xs text-slate-400 mt-1">{nombre.trim().length}/80 caracteres</p>
          </div>

          <div className="flex gap-3 pt-1">
            <button type="button" onClick={onClose} className="btn-secondary flex-1">
              Cancelar
            </button>
            <button
              type="submit"
              disabled={loading}
              className="btn-primary flex-1 flex items-center justify-center gap-2"
            >
              {loading
                ? <><Loader2 size={15} className="animate-spin" /> Guardando…</>
                : <><Save size={15} /> {esEdicion ? 'Actualizar' : 'Crear'}</>
              }
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Página principal
// ─────────────────────────────────────────────────────────────────────────────
const MetodosPago = ({ onToast }) => {
  const [metodos, setMetodos] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [modal, setModal] = useState(null)           // null | 'nuevo' | objeto metodo
  const [pinConfirm, setPinConfirm] = useState(null)
  const [procesando, setProcesando] = useState(null)

  const cargar = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const res = await getMetodosPago()
      setMetodos(res.metodos ?? [])
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { cargar() }, [cargar])

  const handleGuardado = async () => {
    setModal(null)
    onToast({ mensaje: 'Método de pago guardado correctamente.', tipo: 'success' })
    await cargar()
  }

  const handleToggle = async (metodo) => {
    setProcesando(metodo.id)
    try {
      const res = await toggleMetodoPago(metodo.id)
      onToast({ mensaje: res.message, tipo: 'success' })
      await cargar()
    } catch (err) {
      onToast({ mensaje: err.message, tipo: 'error' })
    } finally {
      setProcesando(null)
    }
  }

  const handleEliminar = async (metodo) => {
    setProcesando(metodo.id)
    try {
      const res = await eliminarMetodoPago(metodo.id)
      onToast({ mensaje: res.message, tipo: 'success' })
      await cargar()
    } catch (err) {
      onToast({ mensaje: err.message, tipo: 'error' })
    } finally {
      setProcesando(null)
    }
  }

  const activos = metodos.filter((m) => m.estado === 'activo')
  const inactivos = metodos.filter((m) => m.estado !== 'activo')

  return (
    <div className="space-y-6 animate-fade-in">
      {pinConfirm && (
        <ConfirmPinModal {...pinConfirm} onClose={() => setPinConfirm(null)} />
      )}

      {modal !== null && (
        <MetodoPagoModal
          metodo={modal === 'nuevo' ? null : modal}
          onClose={() => setModal(null)}
          onGuardado={handleGuardado}
        />
      )}

      {/* Encabezado */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-800">Métodos de Pago</h2>
          <p className="text-slate-500 text-sm mt-1">
            {activos.length} activo{activos.length !== 1 ? 's' : ''} · {inactivos.length} inactivo{inactivos.length !== 1 ? 's' : ''} — Se muestran en el registro de ventas
          </p>
        </div>
        <button
          onClick={() => setPinConfirm({
            titulo: 'Autorizar creación',
            descripcion: 'Agregar nuevo método de pago',
            detalle: 'Se requiere PIN de administrador.',
            textoConfirmar: 'Continuar',
            variante: 'warning',
            onConfirm: () => setModal('nuevo'),
          })}
          className="btn-primary flex items-center gap-2 self-start sm:self-auto"
        >
          <Plus size={16} /> Nuevo Método
        </button>
      </div>

      {/* Nota informativa
      <div className="flex items-start gap-3 bg-pink-50 border border-pink-200 rounded-2xl px-4 py-3 text-sm text-pink-800">
        <Wallet size={16} className="flex-shrink-0 mt-0.5 text-pink-600" />
        <p>
          Los métodos <span className="font-semibold">activos</span> aparecerán en el selector al registrar una venta.
          Los inactivos se ocultan del formulario pero conservan su historial.
        </p>
      </div> */}

      {/* Error */}
      {error && (
        <div className="flex items-center gap-2 bg-red-50 border border-red-200
                        text-red-700 rounded-2xl p-4 text-sm">
          <XCircle size={16} /> {error}
        </div>
      )}

      {/* Tabla */}
      <div className="card p-0 overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-16 gap-2 text-slate-400">
            <Loader2 size={20} className="animate-spin" />
            <span className="text-sm">Cargando métodos de pago…</span>
          </div>
        ) : metodos.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-slate-400">
            <Wallet size={36} strokeWidth={1.5} className="mb-2 text-slate-300" />
            <p className="text-sm">No hay métodos de pago registrados.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-slate-50 border-b border-slate-100">
                <tr>
                  {['', 'Método de Pago', 'Estado', 'Acciones'].map((h) => (
                    <th
                      key={h}
                      className="text-left text-xs font-semibold text-slate-400 uppercase
                                 tracking-wider px-6 py-4 first:pl-6"
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {metodos.map((m) => (
                  <tr
                    key={m.id}
                    className={`transition-colors duration-150 hover:bg-slate-50/70
                                ${m.estado !== 'activo' ? 'opacity-60' : ''}`}
                  >
                    {/* Grip (visual, no drag) */}
                    <td className="pl-6 pr-2 py-4 w-8">
                      <GripVertical size={14} className="text-slate-300" />
                    </td>

                    {/* Nombre */}
                    <td className="px-4 py-4">
                      <div className="flex items-center gap-2">
                        <span className="w-8 h-8 rounded-xl bg-pink-50 flex items-center justify-center flex-shrink-0">
                          <Wallet size={14} className="text-pink-500" />
                        </span>
                        <span className="text-sm font-semibold text-slate-800">{m.nombre}</span>
                      </div>
                    </td>

                    {/* Estado */}
                    <td className="px-6 py-4">
                      {m.estado === 'activo'
                        ? <span className="badge badge-completada gap-1">
                          <CheckCircle2 size={11} /> Activo
                        </span>
                        : <span className="badge badge-cancelada gap-1">
                          <XCircle size={11} /> Inactivo
                        </span>
                      }
                    </td>

                    {/* Acciones */}
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2 flex-wrap">

                        {/* Editar */}
                        <button
                          onClick={() => setPinConfirm({
                            titulo: 'Autorizar edición',
                            descripcion: `Editar "${m.nombre}"`,
                            detalle: 'Se requiere PIN de administrador.',
                            textoConfirmar: 'Continuar',
                            variante: 'warning',
                            onConfirm: () => setModal(m),
                          })}
                          className="flex items-center gap-1.5 text-xs font-semibold
                                     text-pink-600 bg-pink-50 hover:bg-pink-100
                                     border border-pink-200 px-3 py-1.5 rounded-lg
                                     transition-all duration-200"
                          title="Editar nombre"
                        >
                          <Pencil size={12} /> Editar
                        </button>

                        {/* Toggle */}
                        <button
                          onClick={() => setPinConfirm({
                            titulo: m.estado === 'activo' ? 'Desactivar método' : 'Activar método',
                            descripcion: m.nombre,
                            detalle: 'Se requiere PIN de administrador.',
                            textoConfirmar: m.estado === 'activo' ? 'Desactivar' : 'Activar',
                            variante: 'warning',
                            onConfirm: () => handleToggle(m),
                          })}
                          disabled={procesando === m.id}
                          className={`flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg
                                      border transition-all duration-200 disabled:opacity-50
                                      ${m.estado === 'activo'
                              ? 'text-amber-700 bg-amber-50 hover:bg-amber-100 border-amber-200'
                              : 'text-slate-700 bg-slate-100 hover:bg-slate-200 border-slate-300'
                            }`}
                          title={m.estado === 'activo' ? 'Desactivar' : 'Activar'}
                        >
                          {procesando === m.id
                            ? <Loader2 size={12} className="animate-spin" />
                            : m.estado === 'activo'
                              ? <><PowerOff size={12} /> Desactivar</>
                              : <><Power size={12} /> Activar</>
                          }
                        </button>

                        {/* Eliminar */}
                        <button
                          onClick={() => setPinConfirm({
                            titulo: 'Eliminar método',
                            descripcion: `¿Eliminar "${m.nombre}"?`,
                            detalle: 'Solo se puede eliminar si no tiene ventas registradas con este método.',
                            textoConfirmar: 'Eliminar',
                            variante: 'danger',
                            onConfirm: () => handleEliminar(m),
                          })}
                          disabled={procesando === m.id}
                          className="flex items-center gap-1.5 text-xs font-semibold
                                     text-rose-600 bg-rose-50 hover:bg-rose-100
                                     border border-rose-200 px-3 py-1.5 rounded-lg
                                     transition-all duration-200 disabled:opacity-50"
                          title="Eliminar método"
                        >
                          {procesando === m.id
                            ? <Loader2 size={12} className="animate-spin" />
                            : <><Trash2 size={12} /> Eliminar</>
                          }
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}

export default MetodosPago
