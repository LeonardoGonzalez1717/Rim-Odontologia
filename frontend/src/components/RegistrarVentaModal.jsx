// =============================================================================
// components/RegistrarVentaModal.jsx
// Modal con el formulario para registrar una nueva venta (varios tratamientos)
// Props:
//   - onClose         {Function} Cierra el modal
//   - onVentaGuardada {Function} Callback tras guardar exitosamente
//   - doctores        {Array}    Lista de doctores activos
//   - servicios       {Array}    Lista de servicios activos
// =============================================================================
import React, { useState, useEffect, useRef, useMemo } from 'react'
import {
  X, Save, User, Stethoscope, Calendar, DollarSign, Loader2,
  CheckCircle2, Plus, Trash2,
} from 'lucide-react'
import { registrarVenta } from '../api/api'

const getFechaHoraActual = () => {
  const ahora = new Date()
  const offsetMs = ahora.getTimezoneOffset() * 60 * 1000
  const local = new Date(ahora.getTime() - offsetMs)
  return local.toISOString().slice(0, 16)
}

const estadoInicial = {
  doctor_id: '',
  fecha_venta: getFechaHoraActual(),
}

const RegistrarVentaModal = ({ onClose, onVentaGuardada, doctores = [], servicios = [] }) => {
  const [form, setForm] = useState(estadoInicial)
  const [servicioSeleccionado, setServicioSeleccionado] = useState('')
  const [lineas, setLineas] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [exito, setExito] = useState(false)

  const primerCampoRef = useRef(null)

  const total = useMemo(
    () => lineas.reduce((sum, l) => sum + l.precio, 0),
    [lineas],
  )

  useEffect(() => {
    primerCampoRef.current?.focus()
  }, [])

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [onClose])

  const handleChange = (e) => {
    const { name, value } = e.target
    setError('')
    setForm((prev) => ({ ...prev, [name]: value }))
  }

  const handleAgregarTratamiento = () => {
    setError('')
    if (!servicioSeleccionado) {
      setError('Selecciona un tratamiento para agregar.')
      return
    }

    const servicio = servicios.find((s) => String(s.id) === servicioSeleccionado)
    if (!servicio) return

    setLineas((prev) => [
      ...prev,
      {
        key: `${servicio.id}-${Date.now()}-${prev.length}`,
        servicio_id: servicio.id,
        nombre: servicio.nombre_servicio,
        precio: parseFloat(servicio.precio),
      },
    ])
    setServicioSeleccionado('')
  }

  const handleQuitarLinea = (key) => {
    setError('')
    setLineas((prev) => prev.filter((l) => l.key !== key))
  }

  const validar = () => {
    if (!form.doctor_id) return 'Por favor, selecciona un doctor.'
    if (lineas.length === 0) return 'Agrega al menos un tratamiento a la venta.'
    if (!form.fecha_venta) return 'Por favor, indica la fecha y hora.'
    if (total <= 0) return 'El monto debe ser mayor a $0.'
    return ''
  }

  const handleSubmit = async (e) => {
    e.preventDefault()

    const errorValidacion = validar()
    if (errorValidacion) {
      setError(errorValidacion)
      return
    }

    setLoading(true)
    setError('')

    try {
      const fechaFormateada = form.fecha_venta.replace('T', ' ') + ':00'

      await registrarVenta({
        doctor_id: parseInt(form.doctor_id),
        fecha_venta: fechaFormateada,
        total,
        servicios: lineas.map((l) => ({
          servicio_id: l.servicio_id,
          precio: l.precio,
        })),
      })

      setExito(true)
      setTimeout(() => {
        setExito(false)
        setForm({ ...estadoInicial, fecha_venta: getFechaHoraActual() })
        setLineas([])
        setServicioSeleccionado('')
        onVentaGuardada()
      }, 1200)
    } catch (err) {
      setError(err.message || 'Error al registrar la venta. Inténtalo de nuevo.')
    } finally {
      setLoading(false)
    }
  }

  const serviciosDisponibles = servicios

  return (
    <div
      className="fixed inset-0 z-40 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-fade-in"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-lg max-h-[90vh] flex flex-col animate-scale-in">

        <div className="flex items-center justify-between px-7 pt-6 pb-4 border-b border-slate-100 flex-shrink-0">
          <div>
            <h2 className="text-xl font-bold text-slate-800">Registrar Venta</h2>
            <p className="text-sm text-slate-500 mt-0.5">Agrega uno o más tratamientos</p>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200
                       flex items-center justify-center text-slate-500 hover:text-slate-700
                       transition-all duration-200 focus:outline-none focus:ring-2
                       focus:ring-slate-300"
            aria-label="Cerrar modal"
          >
            <X size={16} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="px-7 py-6 space-y-5 overflow-y-auto flex-1">

          {exito && (
            <div className="flex items-center gap-3 bg-pink-50 border border-pink-200
                            text-pink-700 rounded-xl p-4 animate-slide-up">
              <CheckCircle2 size={20} />
              <span className="font-semibold text-sm">¡Venta registrada con éxito!</span>
            </div>
          )}

          {error && (
            <div className="flex items-start gap-3 bg-red-50 border border-red-200
                            text-red-700 rounded-xl p-4 animate-slide-up">
              <X size={18} className="flex-shrink-0 mt-0.5" />
              <span className="text-sm">{error}</span>
            </div>
          )}

          <div>
            <label htmlFor="doctor_id" className="form-label">
              <User size={14} className="inline mr-1.5 text-pink-500" />
              Doctor
            </label>
            <select
              id="doctor_id"
              name="doctor_id"
              value={form.doctor_id}
              onChange={handleChange}
              className="form-input"
              ref={primerCampoRef}
              required
            >
              <option value="">— Selecciona un doctor —</option>
              {doctores.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.nombre} · {d.especialidad}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label htmlFor="servicio_add" className="form-label">
              <Stethoscope size={14} className="inline mr-1.5 text-pink-500" />
              Tratamientos
            </label>
            <div className="flex gap-2">
              <select
                id="servicio_add"
                value={servicioSeleccionado}
                onChange={(e) => setServicioSeleccionado(e.target.value)}
                className="form-input flex-1"
              >
                <option value="">— Selecciona un tratamiento —</option>
                {serviciosDisponibles.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.nombre_servicio} — ${parseFloat(s.precio).toFixed(2)}
                  </option>
                ))}
              </select>
              <button
                type="button"
                onClick={handleAgregarTratamiento}
                disabled={!servicioSeleccionado}
                className="btn-secondary flex items-center gap-1.5 px-3 whitespace-nowrap"
              >
                <Plus size={16} />
                Agregar
              </button>
            </div>

            {lineas.length > 0 ? (
              <ul className="mt-3 space-y-2">
                {lineas.map((linea) => (
                  <li
                    key={linea.key}
                    className="flex items-center justify-between gap-3 bg-slate-50
                               border border-slate-100 rounded-xl px-3 py-2.5"
                  >
                    <span className="text-sm text-slate-700 flex-1 leading-tight">
                      {linea.nombre}
                    </span>
                    <span className="text-sm font-semibold text-slate-800 whitespace-nowrap">
                      ${linea.precio.toFixed(2)}
                    </span>
                    <button
                      type="button"
                      onClick={() => handleQuitarLinea(linea.key)}
                      className="w-8 h-8 rounded-lg text-red-500 hover:bg-red-50
                                 flex items-center justify-center transition-colors"
                      aria-label={`Quitar ${linea.nombre}`}
                    >
                      <Trash2 size={15} />
                    </button>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-xs text-slate-400 mt-2">
                Agrega los tratamientos incluidos en esta venta.
              </p>
            )}
          </div>

          <div>
            <label htmlFor="total" className="form-label">
              <DollarSign size={14} className="inline mr-1.5 text-pink-500" />
              Total ($)
              {lineas.length > 0 && (
                <span className="ml-2 text-xs text-pink-600 font-normal">
                  {lineas.length} {lineas.length === 1 ? 'tratamiento' : 'tratamientos'}
                </span>
              )}
            </label>
            <div className="relative">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 font-semibold text-sm">
                $
              </span>
              <input
                id="total"
                type="text"
                value={total > 0 ? total.toFixed(2) : ''}
                readOnly
                placeholder="0.00"
                className="form-input pl-8 cursor-not-allowed bg-slate-100"
              />
            </div>
          </div>

          <div>
            <label htmlFor="fecha_venta" className="form-label">
              <Calendar size={14} className="inline mr-1.5 text-pink-500" />
              Fecha y Hora
            </label>
            <input
              id="fecha_venta"
              type="datetime-local"
              name="fecha_venta"
              value={form.fecha_venta}
              onChange={handleChange}
              className="form-input"
              required
            />
          </div>

          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose} className="btn-secondary flex-1">
              Cancelar
            </button>
            <button
              type="submit"
              disabled={loading || exito || lineas.length === 0}
              className="btn-primary flex-1 flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <Loader2 size={16} className="animate-spin" />
                  Guardando...
                </>
              ) : (
                <>
                  <Save size={16} />
                  Registrar Venta
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default RegistrarVentaModal
