// =============================================================================
// components/RegistrarVentaModal.jsx
// Modal con el formulario para registrar una nueva venta (varios tratamientos)
// Cuando se selecciona un cliente con deuda Cashea, aparece un toggle para elegir
// entre registrar una nueva venta o hacer un abono a la deuda existente.
// Props:
//   - onClose            {Function} Cierra el modal
//   - onVentaGuardada    {Function} Callback tras guardar una venta
//   - onAbonoRegistrado  {Function} Callback tras registrar un abono Cashea
//   - doctores           {Array}    Lista de doctores activos
//   - servicios          {Array}    Lista de servicios activos
//   - clientes           {Array}    Lista de clientes activos (con tiene_deuda_cashea)
// =============================================================================
import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react'
import {
  X, Save, User, Stethoscope, Calendar, Loader2,
  CheckCircle2, Plus, Trash2, Contact, CreditCard, AlertTriangle, Banknote,
} from 'lucide-react'
import { registrarVenta, getDeudaCasheaCliente, registrarAbonoCashea, getSaldoFavorCliente } from '../api/api'
import { formatearDMAa } from '../utils/fechas'
import ClienteModal from './ClienteModal'
import ClienteSelect from './ClienteSelect'
import DoctorSelect from './DoctorSelect'
import ServicioSelect from './ServicioSelect'
import { useServerDate, getActualServerDatetime } from '../hooks/useServerDate'

const getFechaHoraActualFallback = () => {
  const ahora = new Date()
  const offsetMs = ahora.getTimezoneOffset() * 60 * 1000
  const local = new Date(ahora.getTime() - offsetMs)
  return local.toISOString().slice(0, 16)
}

const PORCENTAJE_INICIAL_CASHEA = 0.4

const calcularMontoCajaCashea = (total) =>
  Math.round(total * PORCENTAJE_INICIAL_CASHEA * 100) / 100

const crearEstadoInicial = () => ({
  cliente_id: '',
  doctor_id: '',
  fecha_venta: getActualServerDatetime(),
})

const RegistrarVentaModal = ({
  onClose,
  onVentaGuardada,
  onAbonoRegistrado,
  doctores = [],
  servicios = [],
  clientes = [],
  onRecargarClientes,
}) => {
  const { datetime: _, cargando } = useServerDate()
  const [form, setForm] = useState(crearEstadoInicial)
  
  // Al abrir el modal, aseguramos que la hora esté fresca
  useEffect(() => {
    if (!cargando) {
      setForm((prev) => {
        if (prev.fecha_venta === getFechaHoraActualFallback() || prev.fecha_venta < getActualServerDatetime()) {
          return { ...prev, fecha_venta: getActualServerDatetime() }
        }
        return prev
      })
    }
  }, [cargando])

  const [servicioSeleccionado, setServicioSeleccionado] = useState('')
  const [lineas, setLineas] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [exito, setExito] = useState(false)
  const [modalClienteAbierto, setModalClienteAbierto] = useState(false)
  // montoCashea = cuota inicial de la PARTE financiada (no incluye contado)
  const [montoCashea, setMontoCashea] = useState('')
  const [montoCasheaEditado, setMontoCasheaEditado] = useState(false)
  const [descripcionCashea, setDescripcionCashea] = useState('')

  // ── Modo: 'venta' | 'abono'  (solo relevante cuando clienteTieneDeuda) ──
  const [modoAbono, setModoAbono] = useState(false)

  // ── Estado de deuda Cashea del cliente seleccionado ──
  const [deudaInfo, setDeudaInfo]           = useState(null)  // null | { deuda_total, ventas_cashea }
  const [loadingDeuda, setLoadingDeuda]     = useState(false)
  // ── Formulario de pago de deuda ──
  const [montoAbono, setMontoAbono]     = useState('')
  const [descripcionAbono, setDescripcionAbono] = useState('')
  const [loadingAbono, setLoadingAbono] = useState(false)
  const [exitoAbono, setExitoAbono]     = useState(false)
  const [errorAbono, setErrorAbono]     = useState('')
  const [ventaAbonoId, setVentaAbonoId] = useState('')  // venta_id elegida para el abono

  // ── Saldo a favor (tratamientos pendientes del cliente) ──
  const [mostrarTratamientosFavor, setMostrarTratamientosFavor] = useState(false)
  const [tratamientosFavor, setTratamientosFavor] = useState([])
  const [loadingTratamientosFavor, setLoadingTratamientosFavor] = useState(false)

  const primerCampoRef = useRef(null)
  const casheaSectionRef = useRef(null)
  const deudaSectionRef = useRef(null)
  const descripcionRef = useRef(null)

  const DESC_MAX_ALTURA_PX = 160

  const ajustarAlturaDescripcion = useCallback(() => {
    const el = descripcionRef.current
    if (!el) return
    el.style.height = 'auto'
    el.style.height = `${Math.min(el.scrollHeight, DESC_MAX_ALTURA_PX)}px`
    el.style.overflowY = el.scrollHeight > DESC_MAX_ALTURA_PX ? 'auto' : 'hidden'
  }, [])

  useEffect(() => {
    ajustarAlturaDescripcion()
  }, [descripcionCashea, ajustarAlturaDescripcion])

  const total = useMemo(
    () => lineas.reduce((sum, l) => sum + l.precio, 0),
    [lineas],
  )

  const totalCashea = useMemo(
    () => lineas.filter((l) => l.cashea).reduce((sum, l) => sum + l.precio, 0),
    [lineas],
  )

  const totalContado = useMemo(
    () => lineas.filter((l) => !l.cashea).reduce((sum, l) => sum + l.precio, 0),
    [lineas],
  )

  const tieneCashea = totalCashea > 0.001

  const todosCashea = lineas.length > 0 && lineas.every((l) => l.cashea)

  const montoInicialCashea = useMemo(() => {
    if (!tieneCashea) return 0
    const monto = parseFloat(montoCashea)
    return Number.isFinite(monto) ? monto : 0
  }, [tieneCashea, montoCashea])

  // En caja hoy = contado completo + cuota inicial Cashea
  const montoCaja = useMemo(() => {
    if (!tieneCashea) return total
    return Math.round((totalContado + montoInicialCashea) * 100) / 100
  }, [tieneCashea, total, totalContado, montoInicialCashea])

  const montoSugeridoCashea = useMemo(
    () => (totalCashea > 0 ? calcularMontoCajaCashea(totalCashea) : 0),
    [totalCashea],
  )

  const deudaEstimada = useMemo(
    () => (tieneCashea ? Math.max(0, Math.round((totalCashea - montoInicialCashea) * 100) / 100) : 0),
    [tieneCashea, totalCashea, montoInicialCashea],
  )

  // Cliente seleccionado con su info de deuda
  const clienteSeleccionado = useMemo(
    () => clientes.find((c) => String(c.id) === form.cliente_id) ?? null,
    [clientes, form.cliente_id],
  )

  const clienteTieneDeuda = clienteSeleccionado?.tiene_deuda_cashea === true

  const ventaAbonoSeleccionada = useMemo(
    () => deudaInfo?.ventas_cashea?.find((v) => String(v.id) === ventaAbonoId) ?? null,
    [deudaInfo, ventaAbonoId],
  )

  const montoYaPagado = useMemo(() => {
    if (!ventaAbonoSeleccionada) return 0
    return (
      (ventaAbonoSeleccionada.monto_caja_inicial ?? 0) +
      (ventaAbonoSeleccionada.pagos_posteriores ?? 0)
    )
  }, [ventaAbonoSeleccionada])

  // ── Cargar deuda Cashea al seleccionar un cliente con deuda ──
  const cargarDeuda = useCallback(async (clienteId) => {
    setDeudaInfo(null)
    setMontoAbono('')
    setDescripcionAbono('')
    setVentaAbonoId('')
    setErrorAbono('')
    setExitoAbono(false)
    if (!clienteId) return
    setLoadingDeuda(true)
    try {
      const data = await getDeudaCasheaCliente(clienteId)
      setDeudaInfo(data)
      // Pre-seleccionar la primera venta con deuda
      if (data.ventas_cashea?.length > 0) {
        setVentaAbonoId(String(data.ventas_cashea[0].id))
      }
    } catch (err) {
      console.error('Error al cargar deuda Cashea:', err)
      setDeudaInfo(null)
    } finally {
      setLoadingDeuda(false)
    }
  }, [])

  useEffect(() => {
    if (clienteTieneDeuda && form.cliente_id) {
      setModoAbono(true)   // al seleccionar cliente con deuda, proponer modo abono por defecto
      cargarDeuda(form.cliente_id)
      setTimeout(() => {
        deudaSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
      }, 200)
    } else {
      setModoAbono(false)
      setDeudaInfo(null)
      setMontoAbono('')
      setDescripcionAbono('')
      setVentaAbonoId('')
      setErrorAbono('')
      setExitoAbono(false)
    }
  }, [form.cliente_id, clienteTieneDeuda, cargarDeuda])

  // Al cambiar de cliente, ocultar el detalle de tratamientos pendientes
  useEffect(() => {
    setMostrarTratamientosFavor(false)
    setTratamientosFavor([])
  }, [form.cliente_id])

  const handleVerTratamientosFavor = async () => {
    if (mostrarTratamientosFavor) {
      setMostrarTratamientosFavor(false)
      return
    }
    if (!form.cliente_id) return
    setMostrarTratamientosFavor(true)
    if (tratamientosFavor.length > 0) return
    setLoadingTratamientosFavor(true)
    try {
      const data = await getSaldoFavorCliente(form.cliente_id)
      setTratamientosFavor(data.tratamientos ?? [])
    } catch (err) {
      console.error('Error al cargar tratamientos pendientes:', err)
      setTratamientosFavor([])
    } finally {
      setLoadingTratamientosFavor(false)
    }
  }

  useEffect(() => {
    if (tieneCashea && totalCashea > 0 && !montoCasheaEditado) {
      setMontoCashea(montoSugeridoCashea.toFixed(2))
    }
    if (!tieneCashea) {
      setMontoCashea('')
      setMontoCasheaEditado(false)
    }
  }, [tieneCashea, totalCashea, montoSugeridoCashea, montoCasheaEditado])

  useEffect(() => {
    if (!tieneCashea) return
    const timer = setTimeout(() => {
      casheaSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
    }, 100)
    return () => clearTimeout(timer)
  }, [tieneCashea])

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
        realizado: true, // se realiza hoy; si se desmarca → saldo a favor
        cashea: false,   // contado por defecto; se marca para financiar
      },
    ])
    setServicioSeleccionado('')
  }

  const handleToggleRealizado = (key) => {
    setError('')
    setLineas((prev) =>
      prev.map((l) => (l.key === key ? { ...l, realizado: !l.realizado } : l)),
    )
  }

  const handleToggleCasheaLinea = (key) => {
    setError('')
    setMontoCasheaEditado(false)
    setLineas((prev) =>
      prev.map((l) => (l.key === key ? { ...l, cashea: !l.cashea } : l)),
    )
  }

  const handleToggleTodosCashea = () => {
    setError('')
    setMontoCasheaEditado(false)
    const activar = !todosCashea
    setLineas((prev) => prev.map((l) => ({ ...l, cashea: activar })))
  }

  const handleQuitarLinea = (key) => {
    setError('')
    setMontoCasheaEditado(false)
    setLineas((prev) => prev.filter((l) => l.key !== key))
  }

  const clienteSaldoFavor = clienteSeleccionado?.saldo_a_favor ?? 0
  const clienteTieneSaldoFavor = clienteSeleccionado?.tiene_saldo_a_favor === true
    || clienteSaldoFavor > 0.001

  const validar = () => {
    if (!form.cliente_id) return 'Por favor, selecciona un cliente.'
    if (!form.doctor_id) return 'Por favor, selecciona un doctor.'
    if (lineas.length === 0) return 'Agrega al menos un tratamiento a la venta.'
    if (!form.fecha_venta) return 'Por favor, indica la fecha y hora.'
    if (total <= 0) return 'El monto debe ser mayor a $0.'
    if (tieneCashea) {
      const monto = parseFloat(montoCashea)
      if (!montoCashea || !Number.isFinite(monto) || monto <= 0) {
        return 'Indica el monto inicial de Cashea que ingresa a caja.'
      }
      if (monto > totalCashea + 0.001) {
        return 'El monto inicial de Cashea no puede ser mayor al total financiado.'
      }
      if (descripcionCashea.trim().length > 500) {
        return 'La descripción no puede superar 500 caracteres.'
      }
    }
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
      // Al guardar, usar la hora obtenida del servidor (o fallback local)
      const fechaActual = getActualServerDatetime()
      setForm((prev) => ({ ...prev, fecha_venta: fechaActual }))
      const fechaFormateada = fechaActual.replace('T', ' ') + ':00'

      const res = await registrarVenta({
        cliente_id: parseInt(form.cliente_id),
        doctor_id: parseInt(form.doctor_id),
        fecha_venta: fechaFormateada,
        total,
        cashea: tieneCashea,
        monto_caja: montoCaja,
        monto_caja_cashea: tieneCashea ? montoInicialCashea : null,
        descripcion_cashea: tieneCashea && descripcionCashea.trim()
          ? descripcionCashea.trim()
          : null,
        servicios: lineas.map((l) => ({
          servicio_id: l.servicio_id,
          precio: l.precio,
          realizado: l.realizado !== false,
          cashea: !!l.cashea,
        })),
      })

      const cliente = clientes.find((c) => String(c.id) === form.cliente_id)
      const doctor = doctores.find((d) => String(d.id) === form.doctor_id)
      const ventaRegistrada = {
        id: res.id,
        cliente: cliente?.nombre,
        doctor: doctor?.nombre,
        fecha_venta: fechaFormateada,
        total,
        cashea: tieneCashea,
        monto_caja: montoCaja,
        servicios: lineas.map((l) => ({
          nombre: l.nombre,
          precio: l.precio,
          cashea: !!l.cashea,
          realizado: l.realizado !== false,
        })),
        estado: 'completada',
      }

      setExito(true)
      setTimeout(() => {
        const resetForm = () => {
          setForm(crearEstadoInicial())
          setLineas([])
          setModoAbono(false)
          setMontoAbono('')
          setDescripcionAbono('')
          setDeudaInfo(null)
          setMontoCashea('')
          setMontoCasheaEditado(false)
          setDescripcionCashea('')
        }
        setExito(false)
        resetForm()
        onVentaGuardada(ventaRegistrada)
      }, 1200)
    } catch (err) {
      setError(err.message || 'Error al registrar la venta. Inténtalo de nuevo.')
    } finally {
      setLoading(false)
    }
  }

  const handleClienteGuardado = async (nuevoCliente) => {
    setModalClienteAbierto(false)
    if (onRecargarClientes) await onRecargarClientes()
    if (nuevoCliente?.id) {
      setForm((prev) => ({ ...prev, cliente_id: String(nuevoCliente.id) }))
    }
  }

  // ── Registrar abono de deuda Cashea ──
  const handleRegistrarAbono = async () => {
    setErrorAbono('')
    const monto = parseFloat(montoAbono)
    if (!montoAbono || !Number.isFinite(monto) || monto <= 0) {
      setErrorAbono('Indica un monto válido mayor a $0.')
      return
    }
    if (!ventaAbonoId) {
      setErrorAbono('Selecciona la venta a la que aplicar el abono.')
      return
    }
    const ventaSeleccionada = deudaInfo?.ventas_cashea?.find(
      (v) => String(v.id) === ventaAbonoId
    )
    if (ventaSeleccionada && monto > ventaSeleccionada.deuda_restante + 0.001) {
      setErrorAbono(`El abono no puede superar la deuda de esa venta ($${ventaSeleccionada.deuda_restante.toFixed(2)}).`)
      return
    }

    setLoadingAbono(true)
    try {
      const nombreCliente = clienteSeleccionado?.nombre ?? 'Cliente'
      const desc = descripcionAbono.trim()
      const concepto = desc
        ? `Abono Cashea – venta #${ventaAbonoId} – ${nombreCliente} – ${desc}`
        : `Abono Cashea – venta #${ventaAbonoId} – ${nombreCliente}`
      await registrarAbonoCashea({ monto, concepto })
      setExitoAbono(true)
      setMontoAbono('')
      setDescripcionAbono('')
      // Recargar deuda: ventas saldadas salen del select
      await cargarDeuda(form.cliente_id)
      // Actualizar flag tiene_deuda_cashea del cliente
      if (onRecargarClientes) await onRecargarClientes()
      // Refrescar ingresos / cuotas del dashboard sin cerrar el modal
      if (onAbonoRegistrado) onAbonoRegistrado()
      setTimeout(() => setExitoAbono(false), 3000)
    } catch (err) {
      setErrorAbono(err.message || 'Error al registrar el abono.')
    } finally {
      setLoadingAbono(false)
    }
  }

  const serviciosDisponibles = servicios

  return (
    <>
    {modalClienteAbierto && (
      <ClienteModal
        onClose={() => setModalClienteAbierto(false)}
        onGuardado={handleClienteGuardado}
      />
    )}
    <div
      className="fixed inset-0 z-40 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-fade-in"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-3xl max-h-[90vh] flex flex-col animate-scale-in">

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

        <form onSubmit={handleSubmit} className="flex flex-col flex-1 min-h-0">

          <div className="px-7 py-6 space-y-5 overflow-y-auto flex-1 min-h-0">

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

          {/* ── Cliente + Doctor ── */}
          <div className={`grid grid-cols-1 gap-4 ${
            (!clienteTieneDeuda || !modoAbono) ? 'sm:grid-cols-2' : ''
          }`}>
            <div className="min-w-0">
              <label htmlFor="cliente_id" className="form-label">
                <Contact size={14} className="inline mr-1.5 text-pink-500" />
                Cliente
              </label>
              <ClienteSelect
                id="cliente_id"
                clientes={clientes}
                value={form.cliente_id}
                onChange={(val) => {
                  setError('')
                  setForm((prev) => ({ ...prev, cliente_id: val }))
                }}
                placeholder="Buscar por cédula o nombre…"
                inputRef={primerCampoRef}
                onNuevoCliente={() => setModalClienteAbierto(true)}
              />
            </div>

            {(!clienteTieneDeuda || !modoAbono) && (
              <div className="min-w-0">
                <label htmlFor="doctor_id" className="form-label">
                  <User size={14} className="inline mr-1.5 text-pink-500" />
                  Doctor
                </label>
                <DoctorSelect
                  id="doctor_id"
                  doctores={doctores}
                  value={form.doctor_id}
                  onChange={(val) => {
                    setError('')
                    setForm((prev) => ({ ...prev, doctor_id: val }))
                  }}
                  placeholder="Buscar doctor…"
                />
              </div>
            )}
          </div>

          {/* ── Aviso saldo a favor del cliente ── */}
          {form.cliente_id && clienteTieneSaldoFavor && (
            <div className="space-y-2 animate-slide-up">
              <div className="flex items-center justify-between gap-3 px-3 py-2.5
                              bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-800">
                <span className="flex items-center gap-2 min-w-0">
                  <CheckCircle2 size={13} className="flex-shrink-0 text-emerald-600" />
                  <span>
                    Este cliente tiene saldo a favor:{' '}
                    <span className="font-semibold">${clienteSaldoFavor.toFixed(2)}</span>
                  </span>
                </span>
                <button
                  type="button"
                  onClick={handleVerTratamientosFavor}
                  className="flex-shrink-0 text-emerald-700 font-semibold hover:text-emerald-900
                             underline underline-offset-2 transition-colors"
                >
                  {mostrarTratamientosFavor ? 'Ocultar' : 'Ver tratamientos'}
                </button>
              </div>

              {mostrarTratamientosFavor && (
                <div className="rounded-xl border border-emerald-100 bg-white px-3 py-2.5 space-y-2">
                  {loadingTratamientosFavor ? (
                    <p className="text-xs text-slate-400 flex items-center gap-1.5">
                      <Loader2 size={12} className="animate-spin" />
                      Cargando tratamientos…
                    </p>
                  ) : tratamientosFavor.length === 0 ? (
                    <p className="text-xs text-slate-400">No hay tratamientos pendientes.</p>
                  ) : (
                    <ul className="divide-y divide-slate-100">
                      {tratamientosFavor.map((t) => (
                        <li key={t.id} className="flex items-center justify-between gap-3 py-2 text-xs">
                          <div className="min-w-0">
                            <p className="font-medium text-slate-700 truncate">{t.nombre}</p>
                            <p className="text-slate-400 mt-0.5">{formatearDMAa(t.fecha)}</p>
                          </div>
                          <span className="font-semibold text-emerald-700 whitespace-nowrap">
                            ${Number(t.precio).toFixed(2)}
                          </span>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              )}
            </div>
          )}

          {/* ── Aviso + toggle de modo (sólo si cliente tiene deuda) ── */}
          {form.cliente_id && clienteTieneDeuda && (
            <div className="flex items-center justify-between gap-3 px-3 py-2.5
                            bg-orange-50 border border-orange-200 rounded-xl animate-slide-up">
              <span className="text-xs text-orange-700 flex items-center gap-1.5">
                <AlertTriangle size={13} className="flex-shrink-0" />
                Cliente con deuda Cashea
                {deudaInfo && (
                  <span className="font-semibold">— ${deudaInfo.deuda_total.toFixed(2)}</span>
                )}
              </span>
              <div className="flex items-center gap-1 bg-white border border-slate-200 rounded-lg p-0.5">
                <button
                  type="button"
                  onClick={() => setModoAbono(false)}
                  className={`px-2.5 py-1 rounded-md text-xs font-medium transition-all duration-150
                    ${ !modoAbono ? 'bg-slate-800 text-white' : 'text-slate-500 hover:text-slate-700' }`}
                >
                  Nueva venta
                </button>
                <button
                  type="button"
                  onClick={() => setModoAbono(true)}
                  className={`px-2.5 py-1 rounded-md text-xs font-medium transition-all duration-150
                    ${ modoAbono ? 'bg-slate-800 text-white' : 'text-slate-500 hover:text-slate-700' }`}
                >
                  Abono
                </button>
              </div>
            </div>
          )}

          {/* ── Panel de deuda — sólo en modo abono ── */}
          {form.cliente_id && clienteTieneDeuda && modoAbono && (
            <div ref={deudaSectionRef} className="space-y-3 animate-slide-up">
              {loadingDeuda && (
                <div className="flex items-center gap-2 text-slate-400 text-xs py-1">
                  <Loader2 size={12} className="animate-spin" />
                  <span>Cargando deuda…</span>
                </div>
              )}

              {!loadingDeuda && deudaInfo && deudaInfo.ventas_cashea.length > 0 && (
                <>
                  <div>
                    <label className="form-label">Aplicar abono a</label>
                    <select
                      value={ventaAbonoId}
                      onChange={(e) => { setErrorAbono(''); setVentaAbonoId(e.target.value) }}
                      className="form-input"
                    >
                      {deudaInfo.ventas_cashea.map((v) => (
                        <option key={v.id} value={String(v.id)}>
                          {formatearDMAa(v.fecha)} — ${v.deuda_restante.toFixed(2)} pendiente
                        </option>
                      ))}
                    </select>
                    {ventaAbonoSeleccionada && (
                      <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-xs">
                        <span className="text-slate-600">
                          Total venta:{' '}
                          <span className="font-semibold text-slate-800">
                            ${ventaAbonoSeleccionada.total.toFixed(2)}
                          </span>
                        </span>
                        <span className="text-green-700">
                          Ya pagado:{' '}
                          <span className="font-semibold">${montoYaPagado.toFixed(2)}</span>
                        </span>
                        <span className="text-amber-700">
                          Pendiente:{' '}
                          <span className="font-semibold">
                            ${ventaAbonoSeleccionada.deuda_restante.toFixed(2)}
                          </span>
                        </span>
                      </div>
                    )}
                  </div>

                  <div>
                    <label className="form-label">Monto del abono ($)</label>
                    <div className="relative">
                      <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 font-semibold text-sm">$</span>
                      <input
                        type="number"
                        min="0.01"
                        step="0.01"
                        value={montoAbono}
                        onChange={(e) => { setErrorAbono(''); setMontoAbono(e.target.value) }}
                        placeholder="0.00"
                        className="form-input pl-8"
                      />
                    </div>
                  </div>

                  <div>
                    <label htmlFor="descripcion_abono" className="form-label">
                      Descripción
                    </label>
                    <textarea
                      id="descripcion_abono"
                      rows={2}
                      value={descripcionAbono}
                      onChange={(e) => { setErrorAbono(''); setDescripcionAbono(e.target.value) }}
                      placeholder="Ej: Cuota 2 de 4, pago parcial…"
                      className="form-input resize-none"
                      maxLength={180}
                    />
                  </div>

                  {errorAbono && (
                    <p className="text-xs text-red-600 flex items-center gap-1">
                      <X size={12} /> {errorAbono}
                    </p>
                  )}
                  {exitoAbono && (
                    <p className="text-xs text-green-600 flex items-center gap-1">
                      <CheckCircle2 size={12} /> Pago registrado correctamente.
                    </p>
                  )}

                  <button
                    type="button"
                    onClick={handleRegistrarAbono}
                    disabled={loadingAbono || !montoAbono}
                    className="w-full flex items-center justify-center gap-2
                               bg-red-600 hover:bg-red-700 disabled:opacity-50
                               text-white text-sm font-semibold rounded-xl px-4 py-2.5
                               transition-colors duration-200"
                  >
                    {loadingAbono ? (
                      <>
                        <Loader2 size={14} className="animate-spin" />
                        Registrando…
                      </>
                    ) : (
                      <>
                        <Banknote size={14} />
                        Registrar Pago
                      </>
                    )}
                  </button>
                </>
              )}

              {!loadingDeuda && (!deudaInfo || deudaInfo.ventas_cashea.length === 0) && (
                <p className="text-xs text-slate-500 flex items-center gap-1.5">
                  <CheckCircle2 size={13} className="text-green-500" />
                  ¡Deuda saldada! Este cliente está al día.
                </p>
              )}
            </div>
          )}

          {/* ══════════════════════════════════════════════════════════
              FORMULARIO DE VENTA — solo en modo nueva venta
          ══════════════════════════════════════════════════════════ */}
          {(!clienteTieneDeuda || !modoAbono) && (
          <>

          {/* ── Tratamientos (selector en una sola fila) ── */}
          <div>
            <label htmlFor="servicio_add" className="form-label">
              <Stethoscope size={14} className="inline mr-1.5 text-pink-500" />
              Tratamientos
            </label>
            <div className="flex gap-2 items-stretch">
              <div className="flex-1 min-w-0">
                <ServicioSelect
                  id="servicio_add"
                  servicios={serviciosDisponibles}
                  value={servicioSeleccionado}
                  onChange={(val) => {
                    setError('')
                    setServicioSeleccionado(val)
                  }}
                  placeholder="Buscar tratamiento por nombre…"
                />
              </div>
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
              <div className="mt-3 space-y-2">
                <label className="flex items-center gap-2 text-xs font-medium text-slate-600
                                  cursor-pointer select-none px-1">
                  <input
                    type="checkbox"
                    checked={todosCashea}
                    onChange={handleToggleTodosCashea}
                    className="w-4 h-4 rounded border-slate-300 text-amber-600
                               focus:ring-amber-500 cursor-pointer"
                  />
                  <CreditCard size={12} className="text-amber-600" />
                  Todos con Cashea
                </label>

                <ul className="space-y-2">
                  {lineas.map((linea) => (
                    <li
                      key={linea.key}
                      className={`flex flex-wrap sm:flex-nowrap items-center gap-2 sm:gap-3
                                 border rounded-xl px-3 py-2.5 transition-colors
                                 ${linea.cashea
                                   ? 'bg-amber-50/70 border-amber-200'
                                   : linea.realizado === false
                                     ? 'bg-emerald-50/70 border-emerald-200'
                                     : 'bg-slate-50 border-slate-100'}`}
                    >
                      <span className="text-sm text-slate-700 flex-1 min-w-[8rem] leading-tight">
                        {linea.nombre}
                      </span>
                      <span className="text-sm font-semibold text-slate-800 whitespace-nowrap">
                        ${linea.precio.toFixed(2)}
                      </span>

                      <label className="flex items-center gap-1.5 text-xs text-slate-600 cursor-pointer
                                        whitespace-nowrap select-none">
                        <input
                          type="checkbox"
                          checked={!!linea.cashea}
                          onChange={() => handleToggleCasheaLinea(linea.key)}
                          className="w-4 h-4 rounded border-slate-300 text-amber-600
                                     focus:ring-amber-500 cursor-pointer"
                        />
                        <span className={linea.cashea ? 'text-amber-800 font-medium' : ''}>
                          Cashea
                        </span>
                      </label>

                      <label className="flex items-center gap-1.5 text-xs text-slate-600 cursor-pointer
                                        whitespace-nowrap select-none">
                        <input
                          type="checkbox"
                          checked={linea.realizado !== false}
                          onChange={() => handleToggleRealizado(linea.key)}
                          className="w-4 h-4 rounded border-slate-300 text-pink-600
                                     focus:ring-pink-500 cursor-pointer"
                        />
                        <span className={linea.realizado === false ? 'text-emerald-700 font-medium' : ''}>
                          {linea.realizado === false ? 'Saldo a favor' : 'Hoy'}
                        </span>
                      </label>

                      <button
                        type="button"
                        onClick={() => handleQuitarLinea(linea.key)}
                        className="w-8 h-8 rounded-lg text-red-500 hover:bg-red-50
                                   flex items-center justify-center transition-colors flex-shrink-0"
                        aria-label={`Quitar ${linea.nombre}`}
                      >
                        <Trash2 size={15} />
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            ) : (
              <p className="text-xs text-slate-400 mt-2">
                Agrega los tratamientos incluidos en esta venta.
              </p>
            )}
          </div>

          {/* ── Descripción (opcional) ── */}
          <div>
            <label htmlFor="descripcion_cashea" className="form-label">
              Descripción
              <span className="ml-1.5 text-xs font-normal text-slate-400">(opcional)</span>
            </label>
            <textarea
              ref={descripcionRef}
              id="descripcion_cashea"
              value={descripcionCashea}
              onChange={(e) => {
                setError('')
                setDescripcionCashea(e.target.value)
              }}
              placeholder="Notas de la venta o del financiamiento Cashea…"
              rows={2}
              maxLength={500}
              className="form-input resize-none overflow-hidden"
              style={{ maxHeight: DESC_MAX_ALTURA_PX }}
            />
            <p className="text-xs text-slate-500 mt-1">
              {descripcionCashea.length}/500 caracteres
            </p>
          </div>

          {/* ── Fecha ── */}
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

          {/* ── Contado / Cashea / Total ── */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-3">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-400 mb-1">
                Contado
              </p>
              <p className="text-lg font-bold text-slate-800">
                ${totalContado.toFixed(2)}
              </p>
              <p className="text-[11px] text-slate-500 mt-1">Entra completo a caja</p>
            </div>

            <div
              ref={casheaSectionRef}
              className={`rounded-xl border px-3 py-3 ${
                tieneCashea
                  ? 'border-amber-200 bg-amber-50'
                  : 'border-slate-200 bg-slate-50'
              }`}
            >
              <p className={`text-xs font-semibold uppercase tracking-wide mb-1 ${
                tieneCashea ? 'text-amber-700' : 'text-slate-400'
              }`}>
                Cashea
              </p>
              <p className={`text-lg font-bold ${tieneCashea ? 'text-amber-800' : 'text-slate-400'}`}>
                ${totalCashea.toFixed(2)}
              </p>
              {tieneCashea ? (
                <div className="mt-2 space-y-2">
                  <div>
                    <label htmlFor="monto_cashea" className="text-[11px] font-medium text-amber-800">
                      Cuota inicial en caja
                    </label>
                    <div className="relative mt-0.5">
                      <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 text-xs font-semibold">
                        $
                      </span>
                      <input
                        id="monto_cashea"
                        type="number"
                        min="0.01"
                        step="0.01"
                        max={totalCashea > 0 ? totalCashea : undefined}
                        value={montoCashea}
                        onChange={(e) => {
                          setError('')
                          setMontoCasheaEditado(true)
                          setMontoCashea(e.target.value)
                        }}
                        placeholder="0.00"
                        className="form-input pl-6 py-1.5 text-sm bg-white"
                      />
                    </div>
                    <p className="text-[10px] text-amber-700/80 mt-1">
                      Sugerido 40%: ${montoSugeridoCashea.toFixed(2)}
                    </p>
                  </div>
                  <p className="text-[11px] text-orange-700">
                    Deuda: <span className="font-semibold">${deudaEstimada.toFixed(2)}</span>
                  </p>
                </div>
              ) : (
                <p className="text-[11px] text-slate-500 mt-1">
                  Marca tratamientos con Cashea
                </p>
              )}
            </div>

            <div className="rounded-xl border border-pink-200 bg-pink-50 px-3 py-3">
              <p className="text-xs font-semibold uppercase tracking-wide text-pink-600 mb-1">
                Total venta
                {lineas.length > 0 && (
                  <span className="ml-1 font-normal normal-case tracking-normal text-pink-500">
                    ({lineas.length})
                  </span>
                )}
              </p>
              <p className="text-lg font-bold text-pink-800">
                ${total > 0 ? total.toFixed(2) : '0.00'}
              </p>
              {tieneCashea ? (
                <p className="text-[11px] text-pink-700 mt-1 font-medium">
                  Caja hoy: ${montoCaja.toFixed(2)}
                </p>
              ) : (
                <p className="text-[11px] text-slate-500 mt-1">Pago completo</p>
              )}
            </div>
          </div>

          </>
          )}  {/* fin del bloque de nueva venta */}

          </div>

          <div className="flex-shrink-0 px-7 py-4 border-t border-slate-100 bg-white rounded-b-3xl flex gap-3">
            <button type="button" onClick={onClose} className="btn-secondary flex-1">
              Cancelar
            </button>
            {/* En modo abono no hay botón de submit — el pago se lanza desde el panel */}
            {(!clienteTieneDeuda || !modoAbono) && (
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
            )}
          </div>
        </form>
      </div>
    </div>
    </>
  )
}

export default RegistrarVentaModal
