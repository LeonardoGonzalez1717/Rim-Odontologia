// =============================================================================
// pages/AsistenteVenta.jsx — Vista para asistentes: registrar ventas y ver listado
// =============================================================================
import React, { useState, useEffect, useCallback, useRef } from 'react'
import { Plus, LogOut, Loader2, RefreshCw, UserCircle } from 'lucide-react'
import RegistrarVentaModal from '../components/RegistrarVentaModal'
import VentasRecientes from '../components/VentasRecientes'
import { getDatos, getVentas } from '../api/api'
import { useAuth } from '../context/AuthContext'
import Logo from '../components/Logo'
import {
  hoyISO, etiquetaVentas, mensajeVacioVentas, formatearDMA, esHoy,
} from '../utils/fechas'

const INTERVALO_RECARGA = 60_000
const VENTAS_POR_PAGINA = 10

const Toast = ({ mensaje, onClose }) => {
  useEffect(() => {
    const t = setTimeout(onClose, 4000)
    return () => clearTimeout(t)
  }, [onClose])

  return (
    <div className="fixed bottom-6 right-6 z-50 flex items-center gap-3
                     bg-pink-600 text-white rounded-2xl px-5 py-4 shadow-xl
                     animate-slide-up max-w-sm">
      <span className="text-lg">✓</span>
      <span className="text-sm font-medium flex-1">{mensaje}</span>
    </div>
  )
}

const AsistenteVenta = () => {
  const { user, logout } = useAuth()
  const [doctores, setDoctores] = useState([])
  const [servicios, setServicios] = useState([])
  const [ventas, setVentas] = useState([])
  const [paginacion, setPaginacion] = useState(null)
  const [pagina, setPagina] = useState(1)
  const [fechaVentas, setFechaVentas] = useState(hoyISO)
  const [loading, setLoading] = useState(true)
  const [loadingVentas, setLoadingVentas] = useState(true)
  const [modalAbierto, setModalAbierto] = useState(false)
  const [toast, setToast] = useState(null)

  const paginaRef = useRef(pagina)
  const fechaVentasRef = useRef(fechaVentas)
  paginaRef.current = pagina
  fechaVentasRef.current = fechaVentas

  const cargarVentas = useCallback(async (paginaActual = 1, fecha = fechaVentasRef.current) => {
    setLoadingVentas(true)
    try {
      const data = await getVentas({
        fecha,
        pagina: paginaActual,
        por_pagina: VENTAS_POR_PAGINA,
      })
      setVentas(data.ventas ?? [])
      setPaginacion(data.paginacion ?? null)
      setPagina(data.paginacion?.pagina ?? paginaActual)
    } catch (err) {
      console.error('Error al cargar ventas:', err)
    } finally {
      setLoadingVentas(false)
    }
  }, [])

  const handlePaginaChange = (nuevaPagina) => {
    setPagina(nuevaPagina)
    cargarVentas(nuevaPagina, fechaVentas)
  }

  const handleFechaChange = (fecha) => {
    setFechaVentas(fecha)
    setPagina(1)
    cargarVentas(1, fecha)
  }

  const cargarDatos = useCallback(async () => {
    setLoading(true)
    try {
      const data = await getDatos()
      setDoctores(data.doctores ?? [])
      setServicios(data.servicios ?? [])
    } catch (err) {
      console.error('Error al cargar datos:', err)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    cargarDatos()
    cargarVentas(1, hoyISO())
    const intervalo = setInterval(
      () => cargarVentas(paginaRef.current, fechaVentasRef.current),
      INTERVALO_RECARGA,
    )
    return () => clearInterval(intervalo)
  }, [cargarDatos, cargarVentas])

  const handleVentaGuardada = () => {
    setModalAbierto(false)
    setToast({ mensaje: '¡Venta registrada exitosamente!' })
    const hoy = hoyISO()
    setFechaVentas(hoy)
    setPagina(1)
    cargarVentas(1, hoy)
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      <header className="bg-white border-b border-slate-200 px-6 py-4
                         flex items-center justify-between sticky top-0 z-20">
        <div className="flex items-center gap-3">
          <Logo size="md" />
          <div>
            <h1 className="text-base font-bold text-slate-800">Rim Challouf</h1>
            <p className="text-xs text-slate-400">Registro de ventas</p>
          </div>
        </div>

        <div className="flex items-center gap-2 sm:gap-3">
          <button
            onClick={() => cargarVentas(pagina, fechaVentas)}
            disabled={loadingVentas}
            className="w-9 h-9 rounded-xl bg-slate-100 hover:bg-slate-200
                       flex items-center justify-center text-slate-500
                       transition-all duration-200 disabled:opacity-50"
            title="Actualizar ventas"
            aria-label="Actualizar ventas"
          >
            {/* <RefreshCw size={15} className={loadingVentas ? 'animate-spin' : ''} /> */}
          </button>

          <button
            onClick={() => setModalAbierto(true)}
            disabled={loading}
            className="btn-primary flex items-center gap-2 text-sm py-2 px-3 sm:px-4"
          >
            <Plus size={16} />
            <span className="hidden sm:inline">Nueva Venta</span>
          </button>

          <div className="hidden sm:flex items-center gap-2 text-sm text-slate-600
                          bg-slate-100 px-3 py-1.5 rounded-xl">
            <UserCircle size={16} className="text-pink-500" />
            <span className="font-medium">{user?.nombre}</span>
          </div>

          <button
            onClick={logout}
            className="btn-secondary flex items-center gap-2 text-sm py-2 px-3"
            title="Cerrar sesión"
          >
            <LogOut size={15} />
            <span className="hidden sm:inline">Salir</span>
          </button>
        </div>
      </header>

      <main className="flex-1 px-4 sm:px-6 lg:px-8 py-6 lg:py-8 max-w-5xl mx-auto w-full">
        <div className="mb-6 animate-fade-in">
          <h2 className="text-xl font-bold text-slate-800">
            Hola, {user?.nombre?.split(' ')[0]}
          </h2>
          <p className="text-sm text-slate-500 mt-0.5">
            {esHoy(fechaVentas)
              ? `Hoy · ${formatearDMA(fechaVentas)}`
              : `Consultando · ${formatearDMA(fechaVentas)}`}
          </p>
        </div>

        {loadingVentas && ventas.length === 0 ? (
          <div className="card flex items-center justify-center gap-2 text-pink-500 py-12">
            <Loader2 size={20} className="animate-spin" />
            <span className="text-sm">Cargando ventas…</span>
          </div>
        ) : (
          <VentasRecientes
            ventas={ventas}
            paginacion={paginacion}
            onPaginaChange={handlePaginaChange}
            loadingPagina={loadingVentas}
            soloLectura
            fechaFiltro={fechaVentas}
            onFechaChange={handleFechaChange}
            titulo={etiquetaVentas(fechaVentas)}
            mensajeVacio={mensajeVacioVentas(fechaVentas)}
          />
        )}
      </main>

      {modalAbierto && (
        <RegistrarVentaModal
          onClose={() => setModalAbierto(false)}
          onVentaGuardada={handleVentaGuardada}
          doctores={doctores}
          servicios={servicios}
        />
      )}

      {toast && (
        <Toast mensaje={toast.mensaje} onClose={() => setToast(null)} />
      )}
    </div>
  )
}

export default AsistenteVenta
