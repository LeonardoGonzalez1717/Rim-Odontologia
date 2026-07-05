// =============================================================================
// components/RegistrarVentaModal.jsx
// Modal con el formulario para registrar una nueva venta
// Props:
//   - onClose      {Function} Cierra el modal
//   - onVentaGuardada {Function} Callback tras guardar exitosamente
//   - doctores     {Array}    Lista de doctores activos
//   - servicios    {Array}    Lista de servicios activos
// =============================================================================
import React, { useState, useEffect, useRef } from 'react'
import { X, Save, User, Stethoscope, Calendar, DollarSign, Loader2, CheckCircle2 } from 'lucide-react'
import { registrarVenta } from '../api/api'

/**
 * Obtiene la fecha y hora actual en formato compatible con input[type=datetime-local]
 * → "YYYY-MM-DDTHH:MM"
 */
const getFechaHoraActual = () => {
  const ahora = new Date()
  // Ajustar al offset local sin librerías externas
  const offsetMs = ahora.getTimezoneOffset() * 60 * 1000
  const local    = new Date(ahora.getTime() - offsetMs)
  return local.toISOString().slice(0, 16)
}

/**
 * Estado inicial del formulario (vacío).
 */
const estadoInicial = {
  doctor_id:   '',
  servicio_id: '',
  fecha_venta: getFechaHoraActual(),
  total:       '',
}

const RegistrarVentaModal = ({ onClose, onVentaGuardada, doctores = [], servicios = [] }) => {
  // Estado del formulario
  const [form, setForm]           = useState(estadoInicial)
  // Estado de carga mientras se envía
  const [loading, setLoading]     = useState(false)
  // Mensaje de error para mostrar en el formulario
  const [error, setError]         = useState('')
  // Control de animación de éxito
  const [exito, setExito]         = useState(false)

  // Ref para enfocar el primer campo al abrir el modal
  const primerCampoRef = useRef(null)

  // Enfocar el primer selector al montar el modal
  useEffect(() => {
    primerCampoRef.current?.focus()
  }, [])

  // Cerrar el modal con la tecla Escape
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [onClose])

  /**
   * Actualiza el estado del formulario cuando cambia un campo.
   * Si cambia el servicio, auto-rellena el precio.
   */
  const handleChange = (e) => {
    const { name, value } = e.target
    setError('') // Limpiar errores previos al editar

    if (name === 'servicio_id') {
      // Buscar el precio del servicio seleccionado
      const servicioSeleccionado = servicios.find((s) => String(s.id) === value)
      setForm((prev) => ({
        ...prev,
        servicio_id: value,
        total: servicioSeleccionado ? servicioSeleccionado.precio : '',
      }))
    } else {
      setForm((prev) => ({ ...prev, [name]: value }))
    }
  }

  /**
   * Valida el formulario antes de enviar.
   * @returns {string} Mensaje de error, o '' si es válido
   */
  const validar = () => {
    if (!form.doctor_id)   return 'Por favor, selecciona un doctor.'
    if (!form.servicio_id) return 'Por favor, selecciona un servicio.'
    if (!form.fecha_venta) return 'Por favor, indica la fecha y hora.'
    if (!form.total || parseFloat(form.total) <= 0) return 'El monto debe ser mayor a $0.'
    return ''
  }

  /**
   * Maneja el envío del formulario al backend.
   */
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
      // Convertir fecha_venta de "YYYY-MM-DDTHH:MM" a "YYYY-MM-DD HH:MM:SS"
      const fechaFormateada = form.fecha_venta.replace('T', ' ') + ':00'

      await registrarVenta({
        doctor_id:   parseInt(form.doctor_id),
        servicio_id: parseInt(form.servicio_id),
        fecha_venta: fechaFormateada,
        total:       parseFloat(form.total),
      })

      // Mostrar animación de éxito breve antes de cerrar
      setExito(true)
      setTimeout(() => {
        setExito(false)
        setForm({ ...estadoInicial, fecha_venta: getFechaHoraActual() }) // Resetear
        onVentaGuardada() // Recargar dashboard y opcionalmente cerrar modal
      }, 1200)

    } catch (err) {
      setError(err.message || 'Error al registrar la venta. Inténtalo de nuevo.')
    } finally {
      setLoading(false)
    }
  }

  return (
    /* Overlay oscuro */
    <div
      className="fixed inset-0 z-40 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-fade-in"
      onClick={(e) => e.target === e.currentTarget && onClose()} // Cerrar al click en overlay
    >
      {/* Panel del modal */}
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-lg animate-scale-in">

        {/* Encabezado del modal */}
        <div className="flex items-center justify-between px-7 pt-6 pb-4 border-b border-slate-100">
          <div>
            <h2 className="text-xl font-bold text-slate-800">Registrar Venta</h2>
            <p className="text-sm text-slate-500 mt-0.5">Completa los datos del tratamiento</p>
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

        {/* Formulario */}
        <form onSubmit={handleSubmit} className="px-7 py-6 space-y-5">

          {/* Animación de éxito */}
          {exito && (
            <div className="flex items-center gap-3 bg-pink-50 border border-pink-200
                            text-pink-700 rounded-xl p-4 animate-slide-up">
              <CheckCircle2 size={20} />
              <span className="font-semibold text-sm">¡Venta registrada con éxito!</span>
            </div>
          )}

          {/* Mensaje de error */}
          {error && (
            <div className="flex items-start gap-3 bg-red-50 border border-red-200
                            text-red-700 rounded-xl p-4 animate-slide-up">
              <X size={18} className="flex-shrink-0 mt-0.5" />
              <span className="text-sm">{error}</span>
            </div>
          )}

          {/* Campo: Doctor */}
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

          {/* Campo: Servicio */}
          <div>
            <label htmlFor="servicio_id" className="form-label">
              <Stethoscope size={14} className="inline mr-1.5 text-pink-500" />
              Servicio / Tratamiento
            </label>
            <select
              id="servicio_id"
              name="servicio_id"
              value={form.servicio_id}
              onChange={handleChange}
              className="form-input"
              required
            >
              <option value="">— Selecciona un servicio —</option>
              {servicios.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.nombre_servicio} — ${parseFloat(s.precio).toFixed(2)}
                </option>
              ))}
            </select>
          </div>

          {/* Campo: Precio (auto-rellenado, solo lectura) */}
          <div>
            <label htmlFor="total" className="form-label">
              <DollarSign size={14} className="inline mr-1.5 text-pink-500" />
              Monto ($)
              {form.servicio_id && (
                <span className="ml-2 text-xs text-pink-600 font-normal">
                  ✓ Precio automático aplicado
                </span>
              )}
            </label>
            <div className="relative">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 font-semibold text-sm">
                $
              </span>
              <input
                id="total"
                type="number"
                name="total"
                value={form.total}
                readOnly
                min="0"
                step="0.01"
                placeholder="0.00"
                className="form-input pl-8 cursor-not-allowed bg-slate-100"
                required
              />
            </div>
          </div>

          {/* Campo: Fecha y Hora */}
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

          {/* Botones */}
          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose} className="btn-secondary flex-1">
              Cancelar
            </button>
            <button
              type="submit"
              disabled={loading || exito}
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
