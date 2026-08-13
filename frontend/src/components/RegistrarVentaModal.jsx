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
  Sparkles, DollarSign, FileText, BadgeCheck,
} from 'lucide-react'
import {
  registrarVenta,
  getDeudaCasheaCliente,
  registrarAbonoVenta,
  getSaldoFavorCliente,
  marcarTratamientoRealizado,
  registrarSaldoFavor,
} from '../api/api'
import { formatearDMAa } from '../utils/fechas'
import ClienteModal from './ClienteModal'
import ClienteSelect from './ClienteSelect'
import DoctorSelect from './DoctorSelect'
import ServicioSelect from './ServicioSelect'
import { useServerDate, getActualServerDatetime } from '../hooks/useServerDate'

const PORCENTAJE_INICIAL_CASHEA = 0.4

const calcularMontoCajaCashea = (total) =>
  Math.round(total * PORCENTAJE_INICIAL_CASHEA * 100) / 100

const precioTotalLinea = (linea) =>
  linea.precio_servicio ?? linea.precio_catalogo ?? linea.precio

const montoPendienteLinea = (linea) => {
  const total = precioTotalLinea(linea)
  const pagado = linea.precio
  if (pagado >= total - 0.001) return 0
  const diff = total - pagado
  return diff > 0.001 ? Math.round(diff * 100) / 100 : 0
}

/** Aplica el monto del input: monto pagado hoy; si es menor al total del tratamiento, el resto queda pendiente. */
const aplicarMontoLinea = (linea, monto, rawValue, clearInput = false) => {
  const montoRedondeado = Math.round(monto * 100) / 100
  const base = {
    ...linea,
    precio_input: clearInput ? undefined : rawValue,
  }
  const totalServicio = linea.precio_servicio ?? linea.precio_catalogo ?? linea.precio
  const tienePendiente = totalServicio - montoRedondeado > 0.001

  if (tienePendiente) {
    return {
      ...base,
      precio: montoRedondeado,
      precio_servicio: totalServicio,
      precio_catalogo: totalServicio,
      realizado: false,
    }
  }

  // Pago completo: el input es el monto cobrado (puede ser mayor al catálogo si subieron el precio)
  return {
    ...base,
    precio: montoRedondeado,
    precio_servicio: montoRedondeado,
    precio_catalogo: montoRedondeado,
    realizado: linea.realizado === false ? false : true,
  }
}

/** Convierte líneas del formulario en detalles de venta (parte pagada + pendiente). */
const expandirLineasParaEnvio = (lineas) => {
  const servicios = []
  for (const l of lineas) {
    const total = precioTotalLinea(l)
    const pagado = l.precio
    const pendiente = montoPendienteLinea(l)

    if (l.cashea) {
      // Cashea a precio completo: solo financiamiento (no es saldo a favor).
      // Cashea + monto inferior: la diferencia queda pendiente y la venta sí es saldo a favor.
      const hayPendienteCobro = pendiente > 0.001
      if (pagado > 0.001) {
        servicios.push({
          servicio_id: l.servicio_id,
          precio: pagado,
          cashea: true,
          realizado: hayPendienteCobro ? false : (l.realizado !== false),
          pagado: true,
        })
      }
      if (hayPendienteCobro) {
        servicios.push({
          servicio_id: l.servicio_id,
          precio: pendiente,
          cashea: false,
          realizado: false,
          pagado: false,
        })
      }
    } else if (pendiente > 0.001) {
      // Monto menor al total: lo cobrado queda como saldo a favor (pagado, no realizado);
      // el resto queda pendiente de cobro.
      if (pagado > 0.001) {
        servicios.push({
          servicio_id: l.servicio_id,
          precio: pagado,
          cashea: false,
          realizado: false,
          pagado: true,
        })
      }
      servicios.push({
        servicio_id: l.servicio_id,
        precio: pendiente,
        cashea: false,
        realizado: false,
        pagado: false,
      })
    } else {
      // Pago completo: si desmarca "Hoy", queda pendiente de realizar (saldo a favor)
      const saldoAFavor = l.realizado === false
      servicios.push({
        servicio_id: l.servicio_id,
        precio: pagado >= total - 0.001 ? pagado : total,
        cashea: false,
        realizado: !saldoAFavor,
        pagado: true,
      })
    }
  }
  return servicios
}

const crearEstadoInicial = () => ({
  cliente_id: '',
  doctor_id: '',
  fecha_venta: getActualServerDatetime(),
})

const RegistrarVentaModal = ({
  onClose,
  onVentaGuardada,
  onAbonoRegistrado,
  onSaldoFavorRegistrado,
  doctores = [],
  servicios = [],
  clientes = [],
  onRecargarClientes,
  pagoPendienteInicial = null,
  modoSaldoFavorInicial = false,
}) => {
  const { cargando } = useServerDate()
  const [form, setForm] = useState(crearEstadoInicial)
  const fechaManualRef = useRef(false)

  // Inicializar fecha/hora con la del servidor una sola vez (luego es editable)
  useEffect(() => {
    if (cargando || fechaManualRef.current) return
    const fechaServidor = getActualServerDatetime()
    if (!fechaServidor) return
    setForm((prev) => (
      prev.fecha_venta === fechaServidor
        ? prev
        : { ...prev, fecha_venta: fechaServidor }
    ))
  }, [cargando])

  const [servicioSeleccionado, setServicioSeleccionado] = useState('')
  const [lineas, setLineas] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [exito, setExito] = useState(false)
  const [modalClienteAbierto, setModalClienteAbierto] = useState(false)
  const [descripcionCashea, setDescripcionCashea] = useState('')
  const [montoCashea, setMontoCashea] = useState('')
  const [montoCasheaEditado, setMontoCasheaEditado] = useState(false)

  // ── Montos editables del grupo en los cards del resumen (ónull = no editando) ──
  const [montoContadoInput, setMontoContadoInput] = useState(null)
  const [montoCasheaGrupoInput, setMontoCasheaGrupoInput] = useState(null)

  // ── Modo: 'venta' | 'abono'  (solo relevante cuando clienteTieneDeuda) ──
  const [modoAbono, setModoAbono] = useState(false)

  // ── Modo: Saldo a Favor (registrar saldo a favor sin tratamientos) ──
  const [modoSaldoFavor, setModoSaldoFavor] = useState(modoSaldoFavorInicial)
  const [montoSaldoFavor, setMontoSaldoFavor] = useState('')
  const [conceptoSaldoFavor, setConceptoSaldoFavor] = useState('')
  const [aplicarSaldoFavor, setAplicarSaldoFavor] = useState(false)

  // ── Estado de deuda Cashea del cliente seleccionado ──
  const [deudaInfo, setDeudaInfo] = useState(null)  // null | { deuda_total, saldo_pendiente_pago, deuda_financiada, ventas_cashea }
  const [loadingDeuda, setLoadingDeuda] = useState(false)
  // ── Formulario de pago de deuda ──
  const [montoAbono, setMontoAbono] = useState('')
  const [descripcionAbono, setDescripcionAbono] = useState('')
  const [loadingAbono, setLoadingAbono] = useState(false)
  const [exitoAbono, setExitoAbono] = useState(false)
  const [errorAbono, setErrorAbono] = useState('')
  const [ventaAbonoId, setVentaAbonoId] = useState('')  // venta_id elegida para el abono

  // ── Saldo a favor (tratamientos pendientes del cliente) ──
  const [mostrarTratamientosFavor, setMostrarTratamientosFavor] = useState(false)
  const [tratamientosFavor, setTratamientosFavor] = useState([])
  const [loadingTratamientosFavor, setLoadingTratamientosFavor] = useState(false)

  const primerCampoRef = useRef(null)
  const casheaSectionRef = useRef(null)
  const deudaSectionRef = useRef(null)
  const descripcionRef = useRef(null)
  const pagoPendienteRef = useRef(pagoPendienteInicial)

  const esPagoPendiente = !!pagoPendienteInicial

  useEffect(() => {
    pagoPendienteRef.current = pagoPendienteInicial
    if (!pagoPendienteInicial) return

    const p = pagoPendienteInicial
    setModoAbono(false)
    setDeudaInfo(null)
    setMontoAbono('')
    setDescripcionAbono('')
    setVentaAbonoId('')
    setErrorAbono('')
    setExitoAbono(false)
    setForm((prev) => ({
      ...prev,
      cliente_id: String(p.cliente_id),
      doctor_id: p.doctor_id ? String(p.doctor_id) : '',
    }))
    setLineas([{
      key: `pendiente-${p.detalle_id}`,
      servicio_id: p.servicio_id,
      nombre: p.nombre,
      precio: p.precio,
      precio_catalogo: p.precio,
      precio_servicio: p.precio,
      realizado: true,
      cashea: false,
      es_pago_pendiente: true,
    }])
    setDescripcionCashea(
      `Pago saldo pendiente – venta #${p.venta_id} – ${p.nombre}`,
    )
    setModoAbono(false)
    setError('')
  }, [pagoPendienteInicial])

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
    () => lineas.reduce((sum, l) => sum + precioTotalLinea(l), 0),
    [lineas],
  )

  const totalCashea = useMemo(
    () => lineas.filter((l) => l.cashea).reduce((sum, l) => sum + l.precio, 0),
    [lineas],
  )

  const totalContado = useMemo(
    () => Math.round(
      lineas.filter((l) => !l.cashea).reduce((sum, l) => sum + l.precio, 0) * 100,
    ) / 100,
    [lineas],
  )

  // Suma de precios de catálogo (precio máximo) por grupo
  const totalContadoCatalogo = useMemo(
    () => Math.round(
      lineas.filter((l) => !l.cashea).reduce((sum, l) => sum + precioTotalLinea(l), 0) * 100,
    ) / 100,
    [lineas],
  )

  const totalCasheaCatalogo = useMemo(
    () => Math.round(
      lineas.filter((l) => l.cashea).reduce((sum, l) => sum + precioTotalLinea(l), 0) * 100,
    ) / 100,
    [lineas],
  )

  const totalPendiente = useMemo(
    () => lineas.reduce((sum, l) => sum + montoPendienteLinea(l), 0),
    [lineas],
  )

  const tieneCashea = lineas.some((l) => l.cashea)

  const todosCashea = lineas.length > 0 && lineas.every((l) => l.cashea)

  const montoInicialCashea = useMemo(() => {
    if (!tieneCashea) return 0
    const monto = parseFloat(montoCashea)
    return Number.isFinite(monto) ? monto : 0
  }, [tieneCashea, montoCashea])

  const montoCaja = useMemo(() => {
    if (!tieneCashea) return totalContado
    return Math.round((totalContado + montoInicialCashea) * 100) / 100
  }, [tieneCashea, totalContado, montoInicialCashea])

  const montoSugeridoCashea = useMemo(
    () => (totalCashea > 0 ? calcularMontoCajaCashea(totalCashea) : 0),
    [totalCashea],
  )

  const deudaCashea = useMemo(
    () => (tieneCashea
      ? Math.max(0, Math.round((totalCashea - montoInicialCashea) * 100) / 100)
      : 0),
    [tieneCashea, totalCashea, montoInicialCashea],
  )

  const deudaEstimada = useMemo(
    () => Math.round((totalPendiente + deudaCashea) * 100) / 100,
    [totalPendiente, deudaCashea],
  )

  // Cliente seleccionado con su info de deuda
  const clienteSeleccionado = useMemo(
    () => clientes.find((c) => String(c.id) === form.cliente_id) ?? null,
    [clientes, form.cliente_id],
  )

  const doctorSeleccionado = useMemo(
    () => doctores.find((d) => String(d.id) === form.doctor_id) ?? null,
    [doctores, form.doctor_id],
  )

  const doctorPagoPendiente = useMemo(() => {
    if (!esPagoPendiente) return null
    return doctorSeleccionado?.nombre ?? pagoPendienteInicial?.doctor_nombre ?? null
  }, [esPagoPendiente, doctorSeleccionado, pagoPendienteInicial])

  const clienteTieneDeuda = clienteSeleccionado?.tiene_deuda_cashea === true
  const clienteTieneSaldoPendienteCobro = clienteSeleccionado?.tiene_saldo_pendiente_cobro === true
  const clienteTieneTratamientosPendientes = clienteSeleccionado?.tiene_tratamientos_pendientes === true

  const clienteSaldoFavor = clienteSeleccionado?.saldo_a_favor ?? 0
  const clienteTieneSaldoFavor = clienteSeleccionado?.tiene_saldo_a_favor === true
    || clienteSaldoFavor > 0.001
  const saldoPendienteCobro = clienteSeleccionado?.saldo_pendiente_cobro ?? 0

  const saldoPendientePagoCashea = deudaInfo?.saldo_pendiente_pago ?? 0
  const deudaCasheaPendiente = deudaInfo?.deuda_financiada ?? 0
  const saldoAFavorPrepagado = Math.max(0, clienteSaldoFavor - saldoPendientePagoCashea)
  // Solo ventas con deuda Cashea financiada (no saldo pendiente de tratamientos al contado)
  const ventasConDeudaCashea = useMemo(
    () => (deudaInfo?.ventas_cashea ?? []).filter(
      (v) => (v.deuda_financiada ?? Math.max(0, (v.deuda_restante ?? 0) - (v.saldo_pendiente_pago ?? 0))) > 0.001,
    ),
    [deudaInfo],
  )
  // Abono únicamente si existe deuda Cashea registrada
  const puedeAbonar = clienteTieneDeuda
    || deudaCasheaPendiente > 0.001
    || ventasConDeudaCashea.length > 0

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

  const montoDescuentoSaldoFavor = useMemo(() => {
    if (!aplicarSaldoFavor || !clienteTieneSaldoFavor || montoCaja <= 0.001) return 0
    return Math.round(Math.min(clienteSaldoFavor, montoCaja) * 100) / 100
  }, [aplicarSaldoFavor, clienteTieneSaldoFavor, clienteSaldoFavor, montoCaja])

  const montoCajaFinal = useMemo(
    () => Math.round(Math.max(0, montoCaja - montoDescuentoSaldoFavor) * 100) / 100,
    [montoCaja, montoDescuentoSaldoFavor],
  )

  const puedeAplicarSaldoFavor = Boolean(
    form.cliente_id
    && clienteTieneSaldoFavor
    && clienteSaldoFavor > 0.001
    && lineas.length > 0
    && montoCaja > 0.001
    && !modoSaldoFavor
    && !modoAbono
    && !esPagoPendiente,
  )

  const modoSaldoFavorRef = useRef(modoSaldoFavor)
  useEffect(() => {
    modoSaldoFavorRef.current = modoSaldoFavor
  }, [modoSaldoFavor])

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
      const ventasAbonables = (data.ventas_cashea ?? []).filter(
        (v) => (v.deuda_financiada ?? Math.max(0, (v.deuda_restante ?? 0) - (v.saldo_pendiente_pago ?? 0))) > 0.001,
      )
      if (ventasAbonables.length > 0) {
        setVentaAbonoId(String(ventasAbonables[0].id))
      } else {
        setModoAbono(false)
      }
      // Solo abrir abono si hay deuda Cashea financiada (no saldo pendiente al contado)
      if (!modoSaldoFavorRef.current && (data.deuda_financiada ?? 0) > 0.001) {
        setModoAbono(true)
        setTimeout(() => {
          deudaSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
        }, 200)
      }
    } catch (err) {
      console.error('Error al cargar deuda Cashea:', err)
      setDeudaInfo(null)
    } finally {
      setLoadingDeuda(false)
    }
  }, [])

  useEffect(() => {
    if (esPagoPendiente) return
    if (form.cliente_id && clienteTieneDeuda) {
      cargarDeuda(form.cliente_id)
    } else {
      setModoAbono(false)
      setDeudaInfo(null)
      setMontoAbono('')
      setDescripcionAbono('')
      setVentaAbonoId('')
      setErrorAbono('')
      setExitoAbono(false)
    }
  }, [form.cliente_id, clienteTieneDeuda, cargarDeuda, esPagoPendiente])

  // Al cambiar de cliente, ocultar el detalle de tratamientos pendientes
  useEffect(() => {
    setMostrarTratamientosFavor(false)
    setTratamientosFavor([])
    setAplicarSaldoFavor(false)
  }, [form.cliente_id])

  useEffect(() => {
    if (!puedeAplicarSaldoFavor && aplicarSaldoFavor) {
      setAplicarSaldoFavor(false)
    }
  }, [puedeAplicarSaldoFavor, aplicarSaldoFavor])

  const handleVerTratamientosFavor = async () => {
    if (mostrarTratamientosFavor) {
      setMostrarTratamientosFavor(false)
      return
    }
    if (!form.cliente_id) return
    setMostrarTratamientosFavor(true)
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

  const formatearFechaEnvio = (fechaLocal) => {
    if (!fechaLocal) return ''
    if (fechaLocal.includes('T')) {
      const base = fechaLocal.replace('T', ' ')
      return base.length === 16 ? `${base}:00` : base
    }
    return fechaLocal.length === 16 ? `${fechaLocal}:00` : fechaLocal
  }

  const handleChange = (e) => {
    const { name, value } = e.target
    if (name === 'fecha_venta') {
      fechaManualRef.current = true
    }
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
        precio_catalogo: parseFloat(servicio.precio),
        precio_servicio: parseFloat(servicio.precio),
        realizado: true, // marcado "Hoy" = realizado hoy; desmarcado = tratamientos pendientes
        cashea: false,   // contado por defecto; se marca para financiar
      },
    ])
    setServicioSeleccionado('')
  }

  const handleToggleRealizado = (key) => {
    setError('')
    setLineas((prev) =>
      prev.map((l) => {
        if (l.key !== key) return l
        if (montoPendienteLinea(l) > 0.001) return l
        // Marcado "Hoy" = realizado; desmarcado = pendiente de realizar
        return { ...l, realizado: l.realizado === false ? true : false }
      }),
    )
  }

  const handleCambioPrecioLinea = (key, rawValue) => {
    setError('')
    setMontoCasheaEditado(false)
    setLineas((prev) =>
      prev.map((l) => {
        if (l.key !== key) return l
        const trimmed = rawValue.trim()

        if (trimmed === '' || trimmed === '.') {
          return { ...l, precio_input: rawValue, precio: 0 }
        }

        const monto = parseFloat(trimmed)
        if (!Number.isFinite(monto) || monto < 0) {
          return { ...l, precio_input: rawValue }
        }

        return aplicarMontoLinea(l, monto, rawValue)
      }),
    )
  }

  const handleBlurPrecioLinea = (key) => {
    setLineas((prev) =>
      prev.map((l) => {
        if (l.key !== key || l.precio_input === undefined) return l
        const trimmed = l.precio_input.trim()

        if (trimmed === '' || trimmed === '.') {
          return { ...l, precio_input: undefined, precio: 0 }
        }

        const monto = parseFloat(trimmed)
        if (!Number.isFinite(monto) || monto <= 0) {
          const totalServicio = l.precio_servicio ?? l.precio_catalogo ?? l.precio
          return {
            ...l,
            precio_input: undefined,
            precio: totalServicio,
            precio_servicio: totalServicio,
            precio_catalogo: totalServicio,
            realizado: l.realizado === false ? false : true,
          }
        }

        return aplicarMontoLinea(l, monto, l.precio_input, true)
      }),
    )
  }

  const handleToggleCasheaLinea = (key) => {
    setError('')
    setMontoCasheaEditado(false)
    setLineas((prev) =>
      prev.map((l) => {
        if (l.key !== key) return l
        const totalLinea = l.precio_servicio ?? l.precio_catalogo ?? l.precio
        if (l.cashea) {
          const montoActual = l.precio
          const tienePendiente = totalLinea - montoActual > 0.001
          return {
            ...l,
            cashea: false,
            precio_servicio: totalLinea,
            precio_catalogo: totalLinea,
            precio: montoActual,
            realizado: l.realizado === false ? false : !tienePendiente,
            precio_input: undefined,
          }
        }
        return {
          ...l,
          cashea: true,
          precio_servicio: totalLinea,
          precio_catalogo: totalLinea,
          precio: l.precio,
          realizado: l.realizado === false
            ? false
            : montoPendienteLinea({
              ...l,
              cashea: true,
              precio_servicio: totalLinea,
              precio_catalogo: totalLinea,
            }) <= 0.001,
          precio_input: undefined,
        }
      }),
    )
  }

  const handleToggleTodosCashea = () => {
    setError('')
    setMontoCasheaEditado(false)
    const activar = !todosCashea
    setLineas((prev) =>
      prev.map((l) => {
        const totalLinea = l.precio_servicio ?? l.precio_catalogo ?? l.precio
        if (activar) {
          return {
            ...l,
            cashea: true,
            precio_servicio: totalLinea,
            precio_catalogo: totalLinea,
            precio: l.precio,
            realizado: montoPendienteLinea({
              ...l,
              cashea: true,
              precio_servicio: totalLinea,
              precio_catalogo: totalLinea,
            }) <= 0.001,
            precio_input: undefined,
          }
        }
        const tienePendiente = totalLinea - l.precio > 0.001
        return {
          ...l,
          cashea: false,
          precio_servicio: totalLinea,
          precio_catalogo: totalLinea,
          precio: l.precio,
          realizado: !tienePendiente,
          precio_input: undefined,
        }
      }),
    )
  }

  const handleQuitarLinea = (key) => {
    setError('')
    setMontoCasheaEditado(false)
    setMontoContadoInput(null)
    setMontoCasheaGrupoInput(null)
    setLineas((prev) => prev.filter((l) => l.key !== key))
  }

  /**
   * Distribuye el monto `nuevoTotal` proporcionalmente entre las líneas del grupo `esCashea`.
   * Si el monto es menor al catálogo, `aplicarMontoLinea` marca cada línea como pendiente.
   */
  const distribuirMontoGrupo = (nuevoTotal, esCashea) => {
    setError('')
    setLineas((prev) => {
      const grupo = prev.filter((l) => !!l.cashea === esCashea)
      const totalCatalogo = grupo.reduce((s, l) => s + precioTotalLinea(l), 0)
      if (totalCatalogo <= 0) return prev

      // Distribuir el monto proporcionalmente
      let restante = Math.round(nuevoTotal * 100) / 100
      const montosPorKey = {}
      grupo.forEach((l, idx) => {
        const catalogo = precioTotalLinea(l)
        if (idx === grupo.length - 1) {
          // Último elemento absorbe el residuo
          montosPorKey[l.key] = Math.max(0, restante)
        } else {
          const proporcion = catalogo / totalCatalogo
          const asignado = Math.min(
            catalogo,
            Math.round(nuevoTotal * proporcion * 100) / 100,
          )
          montosPorKey[l.key] = asignado
          restante -= asignado
        }
      })

      return prev.map((l) => {
        if (!!l.cashea !== esCashea || montosPorKey[l.key] === undefined) return l
        const monto = montosPorKey[l.key]
        return aplicarMontoLinea(l, monto, undefined, true)
      })
    })
  }

  const handleBlurContadoInput = () => {
    const val = parseFloat(montoContadoInput)
    if (montoContadoInput === null || !Number.isFinite(val) || val <= 0) {
      setMontoContadoInput(null) // restaurar a mostrar totalContado
      return
    }
    const clamped = Math.min(val, totalContadoCatalogo)
    distribuirMontoGrupo(clamped, false)
    setMontoContadoInput(null)
  }

  const handleBlurCasheaGrupoInput = () => {
    const val = parseFloat(montoCasheaGrupoInput)
    if (montoCasheaGrupoInput === null || !Number.isFinite(val) || val <= 0) {
      setMontoCasheaGrupoInput(null)
      return
    }
    const clamped = Math.min(val, totalCasheaCatalogo)
    distribuirMontoGrupo(clamped, true)
    setMontoCasheaGrupoInput(null)
  }

  const validar = () => {
    if (!form.cliente_id) return 'Por favor, selecciona un cliente.'
    if (!form.doctor_id) return 'Por favor, selecciona un doctor.'
    if (lineas.length === 0) return 'Agrega al menos un tratamiento a la venta.'
    if (total <= 0) return 'El monto debe ser mayor a $0.'
    if (tieneCashea) {
      const monto = parseFloat(montoCashea)
      if (!montoCashea || !Number.isFinite(monto) || monto <= 0) {
        return 'Indica el monto inicial de Cashea que ingresa a caja.'
      }
      if (monto > totalCashea + 0.001) {
        return 'El monto inicial de Cashea no puede ser mayor al total financiado.'
      }
      const lineaCasheaInvalida = lineas.find((l) => {
        if (!l.cashea) return false
        const totalLinea = precioTotalLinea(l)
        return l.precio <= 0 || l.precio > totalLinea + 0.001
      })
      if (lineaCasheaInvalida) {
        return `${lineaCasheaInvalida.nombre}: el monto Cashea debe ser mayor a $0 y no superar el total del tratamiento.`
      }
      if (descripcionCashea.trim().length > 500) {
        return 'La descripción no puede superar 500 caracteres.'
      }
    }
    const precioInvalido = lineas.find((l) => {
      if (!Number.isFinite(l.precio) || l.precio <= 0) return true
      const totalLinea = precioTotalLinea(l)
      return l.precio > totalLinea + 0.001
    })
    if (precioInvalido) {
      return `${precioInvalido.nombre}: indica un monto válido mayor a $0 y no mayor al total del tratamiento.`
    }
    return ''
  }

  const handleSubmit = async (e) => {
    e.preventDefault()

    if (modoSaldoFavor) {
      if (!form.cliente_id) {
        setError('Por favor, selecciona un cliente.');
        return;
      }
      if (!form.doctor_id) {
        setError('Por favor, selecciona un doctor.');
        return;
      }
      if (!servicioSeleccionado) {
        setError('Selecciona el tratamiento que deseas pagar con el saldo a favor.');
        return;
      }
      const montoNum = parseFloat(montoSaldoFavor);
      if (!montoSaldoFavor || !Number.isFinite(montoNum) || montoNum <= 0) {
        setError('Indica un monto válido mayor a $0.');
        return;
      }
      setLoading(true);
      setError('');

      try {
        const fechaFormateada = (fechaManualRef.current && form.fecha_venta) ? formatearFechaEnvio(form.fecha_venta) : '';

        await registrarSaldoFavor({
          cliente_id: parseInt(form.cliente_id, 10),
          doctor_id: parseInt(form.doctor_id, 10),
          servicio_id: parseInt(servicioSeleccionado, 10),
          monto: montoNum,
          fecha: fechaFormateada,
          concepto: conceptoSaldoFavor.trim() || 'Saldo a favor registrado',
        });

        if (onRecargarClientes) await onRecargarClientes();
        setExito(true);

        setTimeout(() => {
          setExito(false);
          setMontoSaldoFavor('');
          setConceptoSaldoFavor('');
          setServicioSeleccionado(null);
          setModoSaldoFavor(false);
          onClose();
        }, 1200);
      } catch (err) {
        setError(err.message || 'No se pudo registrar el saldo a favor.');
      } finally {
        setLoading(false);
      }
      return;
    }

    const errorValidacion = validar()
    if (errorValidacion) {
      setError(errorValidacion)
      return
    }

    setLoading(true)
    setError('')

    try {
      const fechaFormateada = (fechaManualRef.current && form.fecha_venta) ? formatearFechaEnvio(form.fecha_venta) : ''

      const serviciosExpandidos = expandirLineasParaEnvio(lineas)

      const res = await registrarVenta({
        cliente_id: parseInt(form.cliente_id),
        doctor_id: parseInt(form.doctor_id),
        fecha_venta: fechaFormateada,
        total,
        cashea: tieneCashea,
        monto_caja: montoCajaFinal,
        monto_caja_cashea: tieneCashea ? montoInicialCashea : null,
        saldo_favor_aplicado: montoDescuentoSaldoFavor > 0.001 ? montoDescuentoSaldoFavor : null,
        descripcion_cashea: tieneCashea && descripcionCashea.trim()
          ? descripcionCashea.trim()
          : null,
        servicios: serviciosExpandidos,
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
        monto_caja: montoCajaFinal,
        saldo_favor_aplicado: montoDescuentoSaldoFavor,
        servicios: serviciosExpandidos.map((s, i) => ({
          nombre: lineas.find((l) => l.servicio_id === s.servicio_id)?.nombre
            ?? `Tratamiento ${i + 1}`,
          precio: s.precio,
          cashea: !!s.cashea,
          realizado: s.realizado !== false,
        })),
        estado: 'completada',
      }

      const detallePendienteId = pagoPendienteRef.current?.detalle_id ?? null
      const fuePagoPendiente = !!detallePendienteId
      if (detallePendienteId) {
        await marcarTratamientoRealizado(detallePendienteId)
        pagoPendienteRef.current = null
      }

      if (onRecargarClientes && montoDescuentoSaldoFavor > 0.001) {
        await onRecargarClientes()
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
          setDescripcionCashea('')
          setMontoCashea('')
          setMontoCasheaEditado(false)
          setMontoContadoInput(null)
          setMontoCasheaGrupoInput(null)
          setAplicarSaldoFavor(false)
        }
        setExito(false)
        resetForm()
        onVentaGuardada({
          ...ventaRegistrada,
          es_pago_pendiente: fuePagoPendiente,
        })
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
    const deudaCasheaVenta = ventaSeleccionada
      ? (ventaSeleccionada.deuda_financiada
        ?? Math.max(0, (ventaSeleccionada.deuda_restante ?? 0) - (ventaSeleccionada.saldo_pendiente_pago ?? 0)))
      : 0
    if (!ventaSeleccionada || deudaCasheaVenta <= 0.001) {
      setErrorAbono('Solo se pueden registrar abonos sobre deuda Cashea.')
      return
    }
    if (monto > deudaCasheaVenta + 0.001) {
      setErrorAbono(`El abono no puede superar la deuda Cashea de esa venta ($${deudaCasheaVenta.toFixed(2)}).`)
      return
    }

    setLoadingAbono(true)
    try {
      const desc = descripcionAbono.trim()
      await registrarAbonoVenta({
        venta_id: parseInt(ventaAbonoId, 10),
        monto,
        descripcion: desc || undefined,
        fecha_ingreso: (fechaManualRef.current && form.fecha_venta) ? formatearFechaEnvio(form.fecha_venta) : '',
      })
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

  const mostrarFormularioVenta = !modoSaldoFavor && (esPagoPendiente || !puedeAbonar || !modoAbono)

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
              <h2 className="text-xl font-bold text-slate-800">
                {esPagoPendiente ? 'Registrar pago pendiente' : 'Registrar Venta'}
              </h2>
              <p className="text-sm text-slate-500 mt-0.5">
                {esPagoPendiente
                  ? 'Cobra el saldo pendiente del tratamiento'
                  : 'Agrega uno o más tratamientos'}
              </p>
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
                  <span className="font-semibold text-sm">
                    {esPagoPendiente ? '¡Pago registrado con éxito!' : '¡Venta registrada con éxito!'}
                  </span>
                </div>
              )}

              {error && (
                <div className="flex items-start gap-3 bg-red-50 border border-red-200
                            text-red-700 rounded-xl p-4 animate-slide-up">
                  <X size={18} className="flex-shrink-0 mt-0.5" />
                  <span className="text-sm">{error}</span>
                </div>
              )}

              {/* ── Selector de Modo: Nueva Venta vs Abonar Cashea ── */}
              {!esPagoPendiente && form.cliente_id && puedeAbonar && (
                <div className="flex items-center gap-1.5 bg-slate-100 p-1 rounded-2xl">
                  <button
                    type="button"
                    onClick={() => {
                      setError('')
                      setModoSaldoFavor(false)
                      setModoAbono(false)
                    }}
                    className={`flex-1 py-2 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${!modoAbono
                      ? 'bg-white text-slate-800 shadow-sm'
                      : 'text-slate-500 hover:text-slate-700'
                      }`}
                  >
                    <Stethoscope size={14} className={!modoAbono ? 'text-pink-600' : ''} />
                    <span>Nueva Venta</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setError('')
                      setModoSaldoFavor(false)
                      setModoAbono(true)
                    }}
                    className={`flex-1 py-2 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${modoAbono
                      ? 'bg-amber-600 text-white shadow-sm'
                      : 'text-slate-500 hover:text-slate-700'
                      }`}
                  >
                    <Banknote size={14} />
                    <span>Abonar Cashea</span>
                  </button>
                </div>
              )}

              {/* ── Cliente + Doctor ── */}
              <div className={`grid grid-cols-1 gap-4 ${(mostrarFormularioVenta || modoSaldoFavor) ? 'sm:grid-cols-2' : ''
                }`}>
                <div className="min-w-0">
                  <label htmlFor="cliente_id" className="form-label">
                    <Contact size={14} className="inline mr-1.5 text-pink-500" />
                    Cliente
                  </label>
                  {esPagoPendiente ? (
                    <input
                      id="cliente_id"
                      type="text"
                      readOnly
                      tabIndex={-1}
                      value={
                        clienteSeleccionado
                          ? `${clienteSeleccionado.cedula} — ${clienteSeleccionado.nombre}`
                          : '—'
                      }
                      className="form-input bg-slate-50 text-slate-700 cursor-default"
                    />
                  ) : (
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
                  )}
                </div>

                {(mostrarFormularioVenta || modoSaldoFavor) && (
                  <div className="min-w-0">
                    <label htmlFor="doctor_id" className="form-label">
                      <User size={14} className="inline mr-1.5 text-pink-500" />
                      Doctor
                    </label>
                    {esPagoPendiente ? (
                      <input
                        id="doctor_id"
                        type="text"
                        readOnly
                        tabIndex={-1}
                        value={doctorPagoPendiente ?? '—'}
                        className="form-input bg-slate-50 text-slate-700 cursor-default"
                      />
                    ) : (
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
                    )}
                  </div>
                )}
              </div>

              {/* ── Campos de Saldo a Favor (Modo Saldo a Favor activo) ── */}
              {modoSaldoFavor && (
                <div className="space-y-4 bg-emerald-50/70 border border-emerald-200/80 p-4.5 rounded-2xl animate-fade-in">
                  <div className="flex items-center gap-2 text-emerald-900 text-sm font-bold">
                    <Sparkles size={16} className="text-emerald-600 flex-shrink-0" />
                    <span>Registrar Saldo a Favor</span>
                  </div>

                  <div>
                    <label htmlFor="monto_saldo_favor" className="form-label text-xs font-semibold text-slate-700">
                      <DollarSign size={13} className="inline mr-1 text-slate-500" />
                      Monto a Favor ($)
                    </label>
                    <div className="relative mt-0.5">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm font-bold">$</span>
                      <input
                        id="monto_saldo_favor"
                        type="text"
                        inputMode="decimal"
                        value={montoSaldoFavor}
                        onChange={(e) => {
                          setError('');
                          setMontoSaldoFavor(e.target.value);
                        }}
                        placeholder="0.00"
                        className="form-input pl-7 py-2 text-base font-bold text-slate-800 bg-white"
                        required
                      />
                    </div>
                  </div>

                  <div>
                    <label htmlFor="servicio_saldo_favor" className="form-label text-xs font-semibold text-slate-700">
                      <BadgeCheck size={13} className="inline mr-1 text-slate-500" />
                      Tratamiento a pagar
                    </label>
                    <ServicioSelect
                      id="servicio_saldo_favor"
                      servicios={servicios}
                      value={servicioSeleccionado}
                      onChange={(val) => {
                        setError('');
                        setServicioSeleccionado(val);
                      }}
                      placeholder="Selecciona un tratamiento…"
                    />
                  </div>

                  <div>
                    <label htmlFor="fecha_saldo_favor" className="form-label text-xs font-semibold text-slate-700">
                      <Calendar size={13} className="inline mr-1 text-slate-500" />
                      Fecha y Hora
                    </label>
                    <input
                      id="fecha_saldo_favor"
                      type="datetime-local"
                      name="fecha_venta"
                      value={form.fecha_venta}
                      onChange={handleChange}
                      className="form-input text-xs bg-white"
                    />
                  </div>

                  <div>
                    <label htmlFor="concepto_saldo_favor" className="form-label text-xs font-semibold text-slate-700">
                      <FileText size={13} className="inline mr-1 text-slate-500" />
                      Concepto / Notas <span className="text-slate-400 font-normal">(opcional)</span>
                    </label>
                    <input
                      id="concepto_saldo_favor"
                      type="text"
                      value={conceptoSaldoFavor}
                      onChange={(e) => setConceptoSaldoFavor(e.target.value)}
                      placeholder="Ej. Abono a cuenta, pago anticipado…"
                      className="form-input text-xs bg-white"
                    />
                  </div>
                </div>
              )}

              {/* ── Indicador de saldo a favor / pendiente del cliente ── */}
              {!modoSaldoFavor && form.cliente_id && (clienteTieneSaldoFavor || clienteSaldoFavor > 0.001 || clienteTieneSaldoPendienteCobro || saldoPendientePagoCashea > 0.001) && (
                <div className="space-y-2 animate-slide-up">
                  <div className="flex items-center justify-between gap-3 px-3 py-2.5
                              bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-800">
                    <span className="flex items-center gap-2 min-w-0">
                      <Sparkles size={14} className="flex-shrink-0 text-emerald-600" />
                      <span className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
                        {(clienteTieneSaldoFavor || clienteSaldoFavor > 0.001) && (
                          <span className="font-semibold text-emerald-900">
                            Saldo a favor: <span className="font-bold">${clienteSaldoFavor.toFixed(2)}</span>
                          </span>
                        )}
                        {saldoPendientePagoCashea > 0.001 ? (
                          <span className="text-emerald-800">
                            · Pendiente: <span className="font-semibold text-amber-800">${saldoPendientePagoCashea.toFixed(2)}</span>
                          </span>
                        ) : clienteTieneSaldoPendienteCobro && saldoPendienteCobro > 0.001 ? (
                          <span className="text-emerald-800">
                            · Pendiente: <span className="font-semibold text-amber-800">${saldoPendienteCobro.toFixed(2)}</span>
                          </span>
                        ) : null}
                      </span>
                    </span>
                    <div className="flex flex-shrink-0 items-center gap-2">
                      {puedeAplicarSaldoFavor && (
                        <button
                          type="button"
                          onClick={() => {
                            setError('')
                            setAplicarSaldoFavor((prev) => !prev)
                          }}
                          className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-colors ${aplicarSaldoFavor
                            ? 'bg-emerald-600 text-white shadow-sm'
                            : 'bg-white border border-emerald-300 text-emerald-800 hover:bg-emerald-100'
                            }`}
                        >
                          {aplicarSaldoFavor ? 'Quitar descuento' : 'Aplicar saldo a favor'}
                        </button>
                      )}
                      {/* Solo si hay tratamientos pendientes; saldo a favor puro no tiene lista */}
                      {clienteTieneTratamientosPendientes && (
                        <button
                          type="button"
                          onClick={handleVerTratamientosFavor}
                          className="text-emerald-700 font-semibold hover:text-emerald-900
                                 underline underline-offset-2 transition-colors"
                        >
                          {mostrarTratamientosFavor ? 'Ocultar' : 'Ver tratamientos'}
                        </button>
                      )}
                    </div>
                  </div>

                  {aplicarSaldoFavor && montoDescuentoSaldoFavor > 0.001 && (
                    <div className="flex items-center justify-between gap-3 px-3 py-2
                                bg-emerald-100/80 border border-emerald-300 rounded-xl text-xs text-emerald-900">
                      <span className="font-medium">
                        Descuento por saldo a favor aplicado
                      </span>
                      <span className="font-bold">
                        −${montoDescuentoSaldoFavor.toFixed(2)}
                      </span>
                    </div>
                  )}

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
                                <p className="text-slate-400 mt-0.5">
                                  {formatearDMAa(t.fecha)}
                                  {t.pagado === false && (
                                    <span className="text-amber-700 font-medium"> · Pendiente de pago</span>
                                  )}
                                  {t.pagado !== false && (
                                    <span className="text-emerald-700 font-medium"> · Saldo a favor</span>
                                  )}
                                </p>
                              </div>
                              <span className={`font-semibold whitespace-nowrap ${t.pagado === false ? 'text-amber-700' : 'text-emerald-700'}`}>
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

              {/* ── Aviso + toggle de modo (sólo si cliente tiene deuda Cashea) ── */}
              {!modoSaldoFavor && form.cliente_id && puedeAbonar && !esPagoPendiente && (
                <div className="flex items-center justify-between gap-3 px-3 py-2.5
                            bg-orange-50 border border-orange-200 rounded-xl animate-slide-up">
                  <span className="text-xs text-orange-700 flex flex-col gap-0.5 min-w-0">
                    <span className="flex items-center gap-1.5">
                      <AlertTriangle size={13} className="flex-shrink-0" />
                      {deudaInfo ? (
                        deudaCasheaPendiente > 0.001 ? (
                          <>
                            Pendiente de Cashea:{' '}
                            <span className="font-semibold">${deudaCasheaPendiente.toFixed(2)}</span>
                          </>
                        ) : (
                          <>Sin deuda Cashea pendiente</>
                        )
                      ) : (
                        <>Cliente con deuda Cashea</>
                      )}
                    </span>
                  </span>
                  <div className="flex items-center gap-1 bg-white border border-slate-200 rounded-lg p-0.5">
                    <button
                      type="button"
                      onClick={() => setModoAbono(false)}
                      className={`px-2.5 py-1 rounded-md text-xs font-medium transition-all duration-150
                    ${!modoAbono ? 'bg-slate-800 text-white' : 'text-slate-500 hover:text-slate-700'}`}
                    >
                      Nueva venta
                    </button>
                    <button
                      type="button"
                      onClick={() => setModoAbono(true)}
                      className={`px-2.5 py-1 rounded-md text-xs font-medium transition-all duration-150
                    ${modoAbono ? 'bg-slate-800 text-white' : 'text-slate-500 hover:text-slate-700'}`}
                    >
                      Abono
                    </button>
                  </div>
                </div>
              )}

              {/* ── Panel de deuda — sólo en modo abono ── */}
              {!modoSaldoFavor && form.cliente_id && puedeAbonar && modoAbono && !esPagoPendiente && (
                <div ref={deudaSectionRef} className="space-y-3 animate-slide-up">
                  {loadingDeuda && (
                    <div className="flex items-center gap-2 text-slate-400 text-xs py-1">
                      <Loader2 size={12} className="animate-spin" />
                      <span>Cargando deuda…</span>
                    </div>
                  )}

                  {!loadingDeuda && deudaInfo && ventasConDeudaCashea.length > 0 && (
                    <>
                      <div>
                        <label className="form-label">Aplicar abono a</label>
                        <select
                          value={ventaAbonoId}
                          onChange={(e) => { setErrorAbono(''); setVentaAbonoId(e.target.value) }}
                          className="form-input"
                        >
                          {ventasConDeudaCashea.map((v) => {
                            const deudaCashea = v.deuda_financiada
                              ?? Math.max(0, (v.deuda_restante ?? 0) - (v.saldo_pendiente_pago ?? 0))
                            return (
                              <option key={v.id} value={String(v.id)}>
                                {formatearDMAa(v.fecha)} — ${deudaCashea.toFixed(2)} deuda Cashea
                              </option>
                            )
                          })}
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
                              Deuda Cashea:{' '}
                              <span className="font-semibold">
                                ${(
                                  ventaAbonoSeleccionada.deuda_financiada
                                  ?? Math.max(
                                    0,
                                    (ventaAbonoSeleccionada.deuda_restante ?? 0)
                                    - (ventaAbonoSeleccionada.saldo_pendiente_pago ?? 0),
                                  )
                                ).toFixed(2)}
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
                        <p className="text-[10px] text-slate-500 mt-1">
                          Solo se aplica a la deuda Cashea financiada de la venta.
                        </p>
                      </div>

                      <div>
                        <label htmlFor="fecha_abono" className="form-label">
                          <Calendar size={14} className="inline mr-1.5 text-pink-500" />
                          Fecha y Hora
                        </label>
                        <input
                          id="fecha_abono"
                          type="datetime-local"
                          name="fecha_venta"
                          value={form.fecha_venta}
                          onChange={(e) => {
                            setErrorAbono('')
                            handleChange(e)
                          }}
                          className="form-input"
                        />
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

                  {!loadingDeuda && (!deudaInfo || ventasConDeudaCashea.length === 0) && (
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
              {mostrarFormularioVenta && (
                <>

                  {/* ── Tratamientos (selector en una sola fila) ── */}
                  <div>
                    <label htmlFor="servicio_add" className="form-label">
                      <Stethoscope size={14} className="inline mr-1.5 text-pink-500" />
                      Tratamientos
                    </label>
                    {!esPagoPendiente && (
                      <div className="flex gap-2 items-stretch">
                        <div className="flex-1 min-w-0">
                          <ServicioSelect
                            id="servicio_add"
                            servicios={servicios}
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
                    )}

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
                                  : montoPendienteLinea(linea) > 0.001
                                    ? 'bg-emerald-50/70 border-emerald-200'
                                    : linea.realizado === false
                                      ? 'bg-emerald-50/70 border-emerald-200'
                                      : 'bg-slate-50 border-slate-100'}`}
                            >
                              <div className="flex flex-col min-w-0 flex-1 gap-0.5">
                                <span className="text-sm text-slate-700 leading-tight truncate">
                                  {linea.nombre}
                                </span>
                                {montoPendienteLinea(linea) > 0.001 && (
                                  <span className="text-[10px] text-slate-500">
                                    Total tratamiento: ${precioTotalLinea(linea).toFixed(2)}
                                  </span>
                                )}
                              </div>
                              <div className="flex flex-col items-end gap-0.5 flex-shrink-0">
                                <div className="flex items-center gap-0.5">
                                  <span className="text-slate-400 text-xs font-semibold">$</span>
                                  <span className="text-sm font-semibold text-slate-800">
                                    {linea.precio > 0 ? linea.precio.toFixed(2) : '0.00'}
                                  </span>
                                </div>
                                {montoPendienteLinea(linea) > 0.001 ? (
                                  <span className="text-[10px] font-medium text-emerald-700 whitespace-nowrap">
                                    Pendiente ${montoPendienteLinea(linea).toFixed(2)}
                                  </span>
                                ) : !linea.cashea && linea.realizado === false && (
                                  <span className="text-[10px] font-medium text-emerald-700 whitespace-nowrap">
                                    Saldo a favor
                                  </span>
                                )}
                              </div>

                              {!linea.es_pago_pendiente && (
                                <>
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

                                  <label
                                    className={`flex items-center gap-1.5 text-xs text-slate-600 whitespace-nowrap select-none ${montoPendienteLinea(linea) > 0.001
                                      ? 'cursor-default'
                                      : 'cursor-pointer'
                                      }`}
                                    title={
                                      montoPendienteLinea(linea) > 0.001
                                        ? linea.cashea
                                          ? `Inicial Cashea $${linea.precio.toFixed(2)} · Pendiente $${montoPendienteLinea(linea).toFixed(2)} en tratamientos`
                                          : `Pagado $${linea.precio.toFixed(2)} · Pendiente $${montoPendienteLinea(linea).toFixed(2)} en tratamientos`
                                        : linea.realizado === false
                                          ? 'Desmarcado: el tratamiento quedará en pendientes'
                                          : 'Marcado: el tratamiento se realiza hoy'
                                    }
                                  >
                                    <input
                                      type="checkbox"
                                      checked={linea.realizado !== false}
                                      disabled={montoPendienteLinea(linea) > 0.001}
                                      onChange={() => handleToggleRealizado(linea.key)}
                                      className="w-4 h-4 rounded border-slate-300 text-pink-600
                                     focus:ring-pink-500 cursor-pointer
                                     disabled:opacity-60 disabled:cursor-default"
                                    />
                                    <span className={linea.realizado !== false ? 'text-pink-700 font-medium' : ''}>
                                      Hoy
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
                                </>
                              )}
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
                      aria-label="Fecha y hora de la venta"
                    />
                    <p className="text-xs text-slate-500 mt-1">
                      {cargando && !form.fecha_venta
                        ? 'Sincronizando hora con el servidor…'
                        : 'Puedes ajustar la fecha y hora del registro'}
                    </p>
                  </div>

                  {/* ── Contado / Cashea / Total ── */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-3">
                      <p className="text-xs font-semibold uppercase tracking-wide text-slate-400 mb-1">
                        Contado
                      </p>
                      {totalContadoCatalogo > 0 ? (
                        <>
                          <div className="relative mt-0.5 w-full">
                            <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 text-xs font-semibold">$</span>
                            <input
                              type="text"
                              inputMode="decimal"
                              value={montoContadoInput !== null ? montoContadoInput : totalContado.toFixed(2)}
                              onChange={(e) => { setError(''); setMontoContadoInput(e.target.value) }}
                              onBlur={handleBlurContadoInput}
                              onFocus={(e) => { setMontoContadoInput(totalContado.toFixed(2)); setTimeout(() => e.target.select(), 0) }}
                              className="form-input pl-6 py-1.5 text-lg font-bold text-slate-800 w-full"
                              aria-label="Monto contado"
                            />
                          </div>
                          <p className="text-[10px] text-slate-500 mt-1">
                            Máx: ${totalContadoCatalogo.toFixed(2)}
                            {totalContadoCatalogo - totalContado > 0.001 && (
                              <span className="ml-1 text-emerald-700 font-medium">
                                · Pend: ${(totalContadoCatalogo - totalContado).toFixed(2)}
                              </span>
                            )}
                          </p>
                        </>
                      ) : (
                        <>
                          <p className="text-lg font-bold text-slate-800">$0.00</p>
                          <p className="text-[11px] text-slate-500 mt-1">Entra completo a caja</p>
                        </>
                      )}
                    </div>

                    <div
                      ref={casheaSectionRef}
                      className={`rounded-xl border px-3 py-3 ${tieneCashea
                        ? 'border-amber-200 bg-amber-50'
                        : 'border-slate-200 bg-slate-50'
                        }`}
                    >
                      <p className={`text-xs font-semibold uppercase tracking-wide mb-1 ${tieneCashea ? 'text-amber-700' : 'text-slate-400'
                        }`}>
                        Cashea
                      </p>
                      {tieneCashea && totalCasheaCatalogo > 0 ? (
                        <div className="relative mt-0.5 w-full mb-2">
                          <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-amber-500 text-xs font-semibold">$</span>
                          <input
                            type="text"
                            inputMode="decimal"
                            value={montoCasheaGrupoInput !== null ? montoCasheaGrupoInput : totalCashea.toFixed(2)}
                            onChange={(e) => { setError(''); setMontoCasheaGrupoInput(e.target.value) }}
                            onBlur={handleBlurCasheaGrupoInput}
                            onFocus={(e) => { setMontoCasheaGrupoInput(totalCashea.toFixed(2)); setTimeout(() => e.target.select(), 0) }}
                            className="form-input pl-6 py-1.5 text-lg font-bold text-amber-800 bg-white w-full"
                            aria-label="Monto Cashea"
                          />
                          {totalCasheaCatalogo - totalCashea > 0.001 && (
                            <p className="text-[10px] text-amber-700 mt-0.5">
                              Máx: ${totalCasheaCatalogo.toFixed(2)}
                              <span className="ml-1 text-emerald-700 font-medium">
                                · Pend: ${(totalCasheaCatalogo - totalCashea).toFixed(2)}
                              </span>
                            </p>
                          )}
                        </div>
                      ) : (
                        <p className={`text-lg font-bold ${tieneCashea ? 'text-amber-800' : 'text-slate-400'}`}>
                          ${totalCashea.toFixed(2)}
                        </p>
                      )}
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
                                type="text"
                                inputMode="decimal"
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
                          <p className="text-[11px] text-orange-700 space-y-0.5">
                            {totalPendiente > 0.001 && (
                              <span className="block">
                                Pendiente: <span className="font-semibold">${totalPendiente.toFixed(2)}</span>
                              </span>
                            )}
                            {deudaCashea > 0.001 && (
                              <span className="block">
                                Deuda Cashea: <span className="font-semibold">${deudaCashea.toFixed(2)}</span>
                              </span>
                            )}
                            <span className="block font-medium">
                              Total adeudado: <span className="font-semibold">${deudaEstimada.toFixed(2)}</span>
                            </span>
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
                      {tieneCashea || totalPendiente > 0.001 || montoDescuentoSaldoFavor > 0.001 ? (
                        <div className="text-[11px] text-pink-700 mt-1 font-medium space-y-0.5">
                          {montoDescuentoSaldoFavor > 0.001 && (
                            <p className="text-emerald-700">
                              Saldo aplicado: −${montoDescuentoSaldoFavor.toFixed(2)}
                            </p>
                          )}
                          <p>Caja hoy: ${montoCajaFinal.toFixed(2)}</p>
                          {totalPendiente > 0.001 && !tieneCashea && (
                            <p>Pendiente: ${totalPendiente.toFixed(2)}</p>
                          )}
                        </div>
                      ) : (
                        <p className="text-[11px] text-slate-500 mt-1">Pago completo</p>
                      )}
                    </div>
                  </div>

                </>
              )}

            </div>

            <div className="flex-shrink-0 px-7 py-4 border-t border-slate-100 bg-white rounded-b-3xl flex gap-3">
              <button type="button" onClick={onClose} className="btn-secondary flex-1">
                Cancelar
              </button>
              {modoSaldoFavor ? (
                <button
                  disabled={loading || exito || !form.cliente_id || !form.doctor_id || !servicioSeleccionado || !montoSaldoFavor}
                  className="btn-primary flex-1 flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-700 border-emerald-600"
                >
                  {loading ? (
                    <>
                      <Loader2 size={16} className="animate-spin" />
                      Guardando...
                    </>
                  ) : (
                    <>
                      <Sparkles size={16} />
                      Guardar Saldo a Favor
                    </>
                  )}
                </button>
              ) : mostrarFormularioVenta ? (
                <button
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
                      {esPagoPendiente ? 'Registrar Pago' : 'Registrar Venta'}
                    </>
                  )}
                </button>
              ) : null}
            </div>
          </form>
        </div>
      </div>
    </>
  )
}

export default RegistrarVentaModal
