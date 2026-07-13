// =============================================================================
// App.jsx — Componente raíz de la SPA
// Maneja:
//   - Estado global: datos del dashboard, formulario, carga
//   - Navegación por estado: 'dashboard' | 'doctores' | 'servicios' | 'notas' | 'reporte'
//   - Sidebar lateral fijo con navegación premium
// =============================================================================
import React, { useState, useEffect, useCallback, useRef } from 'react'
import {
  Plus, Loader2, AlertCircle, X,
  LayoutDashboard, UserCog, Stethoscope, Menu,
  ChevronRight, LogOut, UserCircle, Users, Contact, CreditCard,
} from 'lucide-react'

import Dashboard           from './components/Dashboard'
import RegistrarVentaModal from './components/RegistrarVentaModal'
import Doctores            from './pages/Doctores'
import Servicios           from './pages/Servicios'
import Clientes            from './pages/Clientes'
import Usuarios            from './pages/Usuarios'
import AjusteCashea        from './pages/AjusteCashea'
import Login               from './pages/Login'
import AsistenteVenta      from './pages/AsistenteVenta'
import Logo                from './components/Logo'
import BackendLoader       from './components/BackendLoader'
import { useAuth }         from './context/AuthContext'
import {
  getDashboard, getDatos, getVentas, cancelarVenta, iniciarKeepaliveBackend,
} from './api/api'
import { hoyISO, etiquetaVentas, mensajeVacioVentas } from './utils/fechas'

const VENTAS_POR_PAGINA = 10

// Definición de las páginas del navbar
const PAGES = [
  { id: 'dashboard', label: 'Dashboard',     icon: LayoutDashboard,  section: 'Principal'        },
  { id: 'doctores',  label: 'Doctores',      icon: UserCog,          section: 'Gestión'          },
  { id: 'clientes',  label: 'Clientes',      icon: Contact,          section: 'Gestión'          },
  { id: 'servicios', label: 'Tratamientos',  icon: Stethoscope,      section: 'Gestión'          },
  { id: 'ajuste-cashea', label: 'Ajuste Cashea', icon: CreditCard,      section: 'Administración'   },
  { id: 'usuarios',  label: 'Perfiles',      icon: Users,            section: 'Administración'   },
]

// Agrupar páginas por sección
const secciones = PAGES.reduce((acc, page) => {
  if (!acc[page.section]) acc[page.section] = []
  acc[page.section].push(page)
  return acc
}, {})

// =============================================================================
// Toast de notificación global
// =============================================================================
const Toast = ({ mensaje, tipo = 'success', onClose }) => {
  useEffect(() => {
    const t = setTimeout(onClose, 4000)
    return () => clearTimeout(t)
  }, [onClose])

  const esError = tipo === 'error'

  return (
    <div className={`fixed bottom-6 right-6 z-50 flex items-center gap-3
                     rounded-2xl px-5 py-4 shadow-xl animate-slide-up max-w-sm
                     ${esError ? 'bg-red-600 text-white' : 'bg-pink-600 text-white'}`}>
      {esError
        ? <AlertCircle size={18} className="flex-shrink-0" />
        : <span className="text-lg">✓</span>
      }
      <span className="text-sm font-medium flex-1">{mensaje}</span>
      <button onClick={onClose}
        className="ml-2 opacity-70 hover:opacity-100 transition-opacity"
        aria-label="Cerrar notificación">
        <X size={14} />
      </button>
    </div>
  )
}

// =============================================================================
// Sidebar Component
// =============================================================================
const Sidebar = ({ paginaActual, onNavegar, abierto, onCerrar, user, onLogout }) => {
  return (
    <>
      {/* Overlay para móvil */}
      {abierto && (
        <div className="sidebar-overlay md:hidden" onClick={onCerrar} />
      )}

      {/* Sidebar */}
      <aside className={`sidebar ${abierto ? 'sidebar-open' : ''}`}>
        {/* ── Logo ── */}
        <div className="sidebar-logo">
          <Logo size="md" />
          <div className="sidebar-logo-text">
            <h1>Rim Challouf</h1>
            <p>Odontología · Ventas</p>
          </div>
        </div>

        {/* ── Navegación ── */}
        <nav className="sidebar-nav" aria-label="Navegación principal">
          {Object.entries(secciones).map(([seccion, paginas]) => (
            <div key={seccion}>
              <p className="sidebar-section-title">{seccion}</p>
              {paginas.map(({ id, label, icon: Icon }) => {
                const activo = paginaActual === id
                return (
                  <button
                    key={id}
                    onClick={() => onNavegar(id)}
                    className={`sidebar-link ${activo ? 'active' : ''}`}
                    aria-current={activo ? 'page' : undefined}
                  >
                    <Icon size={18} className="sidebar-link-icon" />
                    <span className="flex-1">{label}</span>
                    {activo && (
                      <ChevronRight size={14} className="text-pink-400" />
                    )}
                  </button>
                )
              })}
            </div>
          ))}
        </nav>

        {/* ── Footer del sidebar ── */}
        <div className="sidebar-footer">
          {user && (
            <div className="flex items-center gap-2 px-1 mb-3 pb-3 border-b border-slate-700/50">
              <UserCircle size={16} className="text-pink-400 flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-xs font-semibold text-slate-300 truncate">{user.nombre}</p>
                <p className="text-[10px] text-slate-500 capitalize">{user.rol}</p>
              </div>
            </div>
          )}
          <button
            onClick={onLogout}
            className="sidebar-link w-full mb-2 text-red-400 hover:text-red-300 hover:bg-red-500/10"
          >
            <LogOut size={18} className="sidebar-link-icon" />
            <span>Cerrar sesión</span>
          </button>
          <div className="flex items-center gap-2 px-1">
            <div className="w-2 h-2 rounded-full bg-pink-400 animate-pulse" />
            <span className="text-xs text-slate-500">Sistema activo</span>
          </div>
          <p className="text-[10px] text-slate-600 mt-2 px-1">
            © {new Date().getFullYear()} Rim Challouf
          </p>
        </div>
      </aside>
    </>
  )
}

// =============================================================================
// AdminApp — Panel completo para administradores
// =============================================================================
function AdminApp() {
  const { user, logout } = useAuth()
  // ── Página activa ──
  const [paginaActual, setPaginaActual] = useState('dashboard')
  // ── Sidebar móvil ──
  const [sidebarAbierto, setSidebarAbierto] = useState(false)

  // ── Dashboard ──
  const [dashboardData, setDashboardData] = useState(null)
  const [loadingDash,   setLoadingDash]   = useState(true)
  const [errorDash,     setErrorDash]     = useState('')

  // ── Ventas paginadas ──
  const [ventas,           setVentas]           = useState([])
  const [paginacionVentas, setPaginacionVentas] = useState(null)
  const [paginaVentas,     setPaginaVentas]     = useState(1)
  const [fechaVentas,      setFechaVentas]      = useState(hoyISO)
  const [loadingVentas,    setLoadingVentas]    = useState(true)
  const paginaVentasRef = useRef(1)
  const fechaVentasRef = useRef(fechaVentas)
  const cargaInicialHecha = useRef(false)
  paginaVentasRef.current = paginaVentas
  fechaVentasRef.current = fechaVentas

  // ── Datos del formulario de registro ──
  const [doctores,  setDoctores]  = useState([])
  const [servicios, setServicios] = useState([])
  const [clientes,  setClientes]  = useState([])

  // ── UI ──
  const [modalAbierto, setModalAbierto] = useState(false)
  const [cancelando,   setCancelando]   = useState(null)
  const [toast,        setToast]        = useState(null)

  // ─────────────────────────────────────────────────────────────────
  // Cargar ventas por fecha (paginadas)
  // ─────────────────────────────────────────────────────────────────
  const cargarVentas = useCallback(async (pagina = 1, fecha = fechaVentasRef.current) => {
    setLoadingVentas(true)
    try {
      const data = await getVentas({ fecha, pagina, por_pagina: VENTAS_POR_PAGINA })
      setVentas(data.ventas ?? [])
      setPaginacionVentas(data.paginacion ?? null)
      setPaginaVentas(data.paginacion?.pagina ?? pagina)
    } catch (err) {
      console.error('Error al cargar ventas:', err)
    } finally {
      setLoadingVentas(false)
    }
  }, [])

  const handlePaginaVentasChange = (pagina) => {
    setPaginaVentas(pagina)
    cargarVentas(pagina, fechaVentas)
  }

  const handleFechaVentasChange = (fecha) => {
    setFechaVentas(fecha)
    setPaginaVentas(1)
    cargarDashboardSecuencial(fecha, 1)
  }

  // ─────────────────────────────────────────────────────────────────
  // Cargar doctores y servicios activos (para el modal de venta)
  // ─────────────────────────────────────────────────────────────────
  const cargarFormData = useCallback(async () => {
    try {
      const data = await getDatos()
      setDoctores(data.doctores  ?? [])
      setServicios(data.servicios ?? [])
      setClientes(data.clientes  ?? [])
    } catch (err) {
      console.error('Error al cargar datos del formulario:', err)
    }
  }, [])

  // Carga secuencial para no saturar el hosting gratuito (3 peticiones en paralelo)
  const cargarDashboardSecuencial = useCallback(async (
    fecha = fechaVentasRef.current,
    pagina = paginaVentasRef.current,
  ) => {
    setLoadingDash(true)
    setLoadingVentas(true)
    setErrorDash('')
    try {
      const dash = await getDashboard(fecha)
      setDashboardData(dash)

      const ventasData = await getVentas({ fecha, pagina, por_pagina: VENTAS_POR_PAGINA })
      setVentas(ventasData.ventas ?? [])
      setPaginacionVentas(ventasData.paginacion ?? null)
      setPaginaVentas(ventasData.paginacion?.pagina ?? pagina)

      const form = await getDatos()
      setDoctores(form.doctores ?? [])
      setServicios(form.servicios ?? [])
      setClientes(form.clientes ?? [])
    } catch (err) {
      setErrorDash(err.message || 'No se pudo conectar con el servidor.')
      console.error('Error al cargar dashboard:', err)
    } finally {
      setLoadingDash(false)
      setLoadingVentas(false)
    }
  }, [])

  // ─────────────────────────────────────────────────────────────────
  // Carga inicial
  // ─────────────────────────────────────────────────────────────────
  useEffect(() => {
    cargarDashboardSecuencial(fechaVentasRef.current, 1)
  }, [cargarDashboardSecuencial])

  // Al volver al dashboard desde otra sección, recargar sin duplicar la carga inicial
  useEffect(() => {
    if (paginaActual !== 'dashboard') return
    if (!cargaInicialHecha.current) {
      cargaInicialHecha.current = true
      return
    }
    cargarDashboardSecuencial(fechaVentas, paginaVentas)
  }, [paginaActual]) // eslint-disable-line

  // ─────────────────────────────────────────────────────────────────
  // Cancelar una venta
  // ─────────────────────────────────────────────────────────────────
  const handleCancelarVenta = async (id) => {
    setCancelando(id)
    try {
      const res = await cancelarVenta(id)
      setToast({ mensaje: res.message || 'Venta cancelada.', tipo: 'success' })
      await cargarDashboardSecuencial(fechaVentas, paginaVentas)
    } catch (err) {
      setToast({ mensaje: err.message || 'Error al cancelar la venta.', tipo: 'error' })
    } finally {
      setCancelando(null)
    }
  }

  // ─────────────────────────────────────────────────────────────────
  // Al guardar una venta desde el modal
  // ─────────────────────────────────────────────────────────────────
  const handleVentaGuardada = () => {
    setModalAbierto(false)
    setToast({ mensaje: '¡Venta registrada exitosamente!', tipo: 'success' })
    setPaginaVentas(1)
    cargarDashboardSecuencial(fechaVentas, 1)
  }

  // ─────────────────────────────────────────────────────────────────
  // Navegar a una página y cerrar sidebar móvil
  // ─────────────────────────────────────────────────────────────────
  const navegarA = (pagina) => {
    setPaginaActual(pagina)
    setSidebarAbierto(false)
  }

  // Obtener título de la página actual
  const paginaInfo = PAGES.find(p => p.id === paginaActual)

  // ─────────────────────────────────────────────────────────────────
  // Render
  // ─────────────────────────────────────────────────────────────────
  return (
    <div className="app-layout">

      {/* ═══════════════════════════════════════════════════════════
          SIDEBAR LATERAL
      ═══════════════════════════════════════════════════════════ */}
      <Sidebar
        paginaActual={paginaActual}
        onNavegar={navegarA}
        abierto={sidebarAbierto}
        onCerrar={() => setSidebarAbierto(false)}
        user={user}
        onLogout={logout}
      />

      {/* ═══════════════════════════════════════════════════════════
          CONTENIDO PRINCIPAL
      ═══════════════════════════════════════════════════════════ */}
      <div className="main-content">

        {/* ── Top bar móvil ── */}
        <div className="mobile-topbar">
          <button
            onClick={() => setSidebarAbierto(true)}
            className="w-9 h-9 rounded-xl bg-slate-100 hover:bg-slate-200
                       flex items-center justify-center text-slate-600
                       transition-all duration-200"
            aria-label="Abrir menú"
          >
            <Menu size={18} />
          </button>
          <div className="flex items-center gap-2">
            <Logo size="sm" />
            <span className="text-sm font-bold text-slate-800">Rim Challouf</span>
          </div>
          <button
            onClick={() => setModalAbierto(true)}
            className="w-9 h-9 rounded-xl bg-pink-600 hover:bg-pink-700
                       flex items-center justify-center text-white shadow-md
                       transition-all duration-200"
            aria-label="Nueva venta"
          >
            <Plus size={16} />
          </button>
        </div>

        {/* ── Header de página ── */}
        <header className="hidden md:flex items-center justify-between
                           bg-white/70 backdrop-blur-xl border-b border-slate-200
                           sticky top-0 z-20 px-8 py-4">
          <div className="flex items-center gap-3">
            {paginaInfo && (
              <div className="w-9 h-9 bg-pink-50 rounded-xl flex items-center
                              justify-center text-pink-600">
                <paginaInfo.icon size={18} />
              </div>
            )}
            <div>
              <h2 className="text-lg font-bold text-slate-800">
                {paginaInfo?.label || 'Dashboard'}
              </h2>
              {paginaActual === 'dashboard' && (
                <p className="text-xs text-slate-400 mt-0.5">
                  {new Date().toLocaleDateString('es-MX', {
                    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
                  })}
                </p>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Botón: Nueva Venta */}
            <button
              onClick={() => setModalAbierto(true)}
              className="btn-primary flex items-center gap-2 text-sm"
              aria-label="Abrir formulario de registro de venta"
            >
              <Plus size={16} />
              Nueva Venta
            </button>
          </div>
        </header>

        {/* ── Contenido de la página ── */}
        <main className="px-4 sm:px-6 lg:px-8 py-6 lg:py-8">

          {/* ── Vista: Dashboard ── */}
          {paginaActual === 'dashboard' && (
            <>
              {/* Indicador de carga */}
              {loadingDash && (
                <div className="mb-6 flex items-center gap-2 text-pink-500 text-sm bg-pink-50
                                px-4 py-2 rounded-xl border border-pink-100 w-fit animate-fade-in">
                  <Loader2 size={14} className="animate-spin" />
                  <span>Actualizando datos…</span>
                </div>
              )}

              {errorDash && !loadingDash && (
                <div className="mb-6 flex items-start gap-3 bg-red-50 border border-red-200
                                text-red-700 rounded-2xl p-5 animate-slide-up">
                  <AlertCircle size={20} className="flex-shrink-0 mt-0.5 text-red-500" />
                  <div>
                    <p className="font-semibold text-sm">Error al conectar con el servidor</p>
                    <p className="text-sm opacity-80 mt-0.5">{errorDash}</p>
                    <button onClick={() => cargarDashboardSecuencial(fechaVentas, paginaVentas)}
                      className="mt-2 text-sm text-red-600 underline hover:no-underline font-medium">
                      Reintentar
                    </button>
                  </div>
                </div>
              )}

              <Dashboard
                datos={dashboardData}
                loading={loadingDash}
                ventas={ventas}
                paginacionVentas={paginacionVentas}
                onPaginaVentasChange={handlePaginaVentasChange}
                loadingVentas={loadingVentas}
                onCancelar={handleCancelarVenta}
                cancelando={cancelando}
                fechaVentas={fechaVentas}
                onFechaVentasChange={handleFechaVentasChange}
                tituloVentas={etiquetaVentas(fechaVentas)}
                mensajeVacioVentas={mensajeVacioVentas(fechaVentas)}
              />
            </>
          )}

          {/* ── Vista: Doctores ── */}
          {paginaActual === 'doctores' && (
            <Doctores onToast={setToast} />
          )}

          {paginaActual === 'clientes' && (
            <Clientes onToast={setToast} />
          )}

          {/* ── Vista: Servicios/Tratamientos ── */}
          {paginaActual === 'servicios' && (
            <Servicios onToast={setToast} />
          )}

          {paginaActual === 'ajuste-cashea' && (
            <AjusteCashea onToast={setToast} />
          )}

          {/* ── Vista: Usuarios ── */}
          {paginaActual === 'usuarios' && (
            <Usuarios onToast={setToast} />
          )}
        </main>

        {/* ── Footer ── */}
        <footer className="mt-8 border-t border-slate-200 py-6 text-center">
          <p className="text-xs text-slate-400">
            © {new Date().getFullYear()} Rim Challouf Odontología · Sistema de Control de Ventas
          </p>
        </footer>
      </div>

      {/* ── Modal de Registro de Venta ── */}
      {modalAbierto && (
        <RegistrarVentaModal
          onClose={() => setModalAbierto(false)}
          onVentaGuardada={handleVentaGuardada}
          doctores={doctores}
          servicios={servicios}
          clientes={clientes}
          onRecargarClientes={cargarFormData}
        />
      )}

      {/* ── Toast de notificación ── */}
      {toast && (
        <Toast
          mensaje={toast.mensaje}
          tipo={toast.tipo}
          onClose={() => setToast(null)}
        />
      )}
    </div>
  )
}

// =============================================================================
// App — Enrutamiento según autenticación y rol
// =============================================================================
function App() {
  const { user, isAsistente } = useAuth()

  // Renovar cookies anti-bot de InfinityFree mientras hay sesión activa
  useEffect(() => {
    if (!user) return undefined
    return iniciarKeepaliveBackend()
  }, [user])

  if (!user) return <Login />
  if (isAsistente) return (
    <>
      <BackendLoader />
      <AsistenteVenta />
    </>
  )

  return (
    <>
      <BackendLoader />
      <AdminApp />
    </>
  )
}

export default App
