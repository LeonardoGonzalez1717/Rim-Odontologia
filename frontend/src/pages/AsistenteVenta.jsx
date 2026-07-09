// =============================================================================
// pages/AsistenteVenta.jsx — Vista principal para asistentes
// =============================================================================
import React, { useState, useEffect, useCallback } from 'react'
import {
  Plus, LogOut, Loader2, UserCircle, UserPlus, Contact,
  Stethoscope, ChevronLeft, Search, X, DollarSign,
} from 'lucide-react'
import RegistrarVentaModal from '../components/RegistrarVentaModal'
import ClienteModal from '../components/ClienteModal'
import VentasAsistente from '../components/VentasAsistente'
import { getDatos, getClientes, getVentas } from '../api/api'
import { useAuth } from '../context/AuthContext'
import Logo from '../components/Logo'
import { hoyISO, formatearDMA } from '../utils/fechas'

const fmt = (v) =>
  new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'USD' }).format(v)

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

const TarjetaOpcion = ({ icono: Icono, titulo, descripcion, onClick, destacada = false }) => (
  <button
    type="button"
    onClick={onClick}
    className={`card text-left w-full group transition-all duration-200
                hover:shadow-card-hover hover:-translate-y-0.5
                focus:outline-none focus:ring-2 focus:ring-pink-500 focus:ring-offset-2
                ${destacada ? 'border-pink-200 bg-gradient-to-br from-pink-50 to-white' : ''}`}
  >
    <div className={`w-12 h-12 rounded-2xl flex items-center justify-center mb-4
                     ${destacada
                       ? 'bg-pink-600 text-white shadow-md shadow-pink-200'
                       : 'bg-slate-100 text-slate-600 group-hover:bg-pink-50 group-hover:text-pink-600'
                     }`}>
      <Icono size={22} />
    </div>
    <h3 className="text-base font-bold text-slate-800 mb-1">{titulo}</h3>
    <p className="text-sm text-slate-500 leading-relaxed">{descripcion}</p>
  </button>
)

const VistaClientes = ({ onVolver, onNuevoCliente, onToast }) => {
  const [clientes, setClientes] = useState([])
  const [loading, setLoading] = useState(true)
  const [busqueda, setBusqueda] = useState('')

  const cargar = useCallback(async () => {
    setLoading(true)
    try {
      const res = await getClientes()
      setClientes((res.clientes ?? []).filter((c) => c.estado === 'activo'))
    } catch (err) {
      console.error('Error al cargar clientes:', err)
      onToast?.('No se pudieron cargar los clientes.')
    } finally {
      setLoading(false)
    }
  }, [onToast])

  useEffect(() => { cargar() }, [cargar])

  const filtrados = clientes.filter((c) => {
    const q = busqueda.toLowerCase()
    return (
      c.nombre?.toLowerCase().includes(q) ||
      c.cedula?.toLowerCase().includes(q) ||
      c.telefono?.toLowerCase().includes(q)
    )
  })

  return (
    <div className="space-y-5 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={onVolver}
            className="w-9 h-9 rounded-xl bg-slate-100 hover:bg-slate-200
                       flex items-center justify-center text-slate-600 transition-colors"
            aria-label="Volver al inicio"
          >
            <ChevronLeft size={18} />
          </button>
          <div>
            <h2 className="text-xl font-bold text-slate-800">Consultar Clientes</h2>
            <p className="text-sm text-slate-500">
              {clientes.length} cliente{clientes.length !== 1 ? 's' : ''} activo{clientes.length !== 1 ? 's' : ''}
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={onNuevoCliente}
          className="btn-primary flex items-center gap-2 self-start sm:self-auto"
        >
          <UserPlus size={16} />
          Nuevo Cliente
        </button>
      </div>

      <div className="relative max-w-md">
        <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
        <input
          type="text"
          placeholder="Buscar por cédula, nombre o teléfono…"
          value={busqueda}
          onChange={(e) => setBusqueda(e.target.value)}
          className="form-input pl-9 py-2.5 text-sm"
        />
        {busqueda && (
          <button
            type="button"
            onClick={() => setBusqueda('')}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
          >
            <X size={14} />
          </button>
        )}
      </div>

      <div className="card p-0 overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-16 gap-2 text-pink-500">
            <Loader2 size={20} className="animate-spin" />
            <span className="text-sm">Cargando clientes…</span>
          </div>
        ) : filtrados.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-slate-400">
            <Contact size={36} strokeWidth={1.5} className="mb-2 text-slate-300" />
            <p className="text-sm">
              {busqueda ? 'Sin resultados para esa búsqueda.' : 'No hay clientes activos.'}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-slate-50 border-b border-slate-100">
                <tr>
                  {['Cédula', 'Nombre', 'Teléfono'].map((h) => (
                    <th
                      key={h}
                      className="text-left text-xs font-semibold text-slate-400 uppercase
                                 tracking-wider px-6 py-4"
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {filtrados.map((cli) => (
                  <tr key={cli.id} className="hover:bg-slate-50/70 transition-colors">
                    <td className="px-6 py-4 text-sm text-slate-600 font-mono">{cli.cedula || '—'}</td>
                    <td className="px-6 py-4 text-sm font-semibold text-slate-800">{cli.nombre}</td>
                    <td className="px-6 py-4 text-sm text-slate-600">{cli.telefono || '—'}</td>
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

const VistaTratamientos = ({ servicios, loading, onVolver }) => {
  const [busqueda, setBusqueda] = useState('')

  const filtrados = servicios.filter((s) =>
    s.nombre_servicio?.toLowerCase().includes(busqueda.toLowerCase()),
  )

  return (
    <div className="space-y-5 animate-fade-in">
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={onVolver}
          className="w-9 h-9 rounded-xl bg-slate-100 hover:bg-slate-200
                     flex items-center justify-center text-slate-600 transition-colors"
          aria-label="Volver al inicio"
        >
          <ChevronLeft size={18} />
        </button>
        <div>
          <h2 className="text-xl font-bold text-slate-800">Tratamientos</h2>
          <p className="text-sm text-slate-500">Lista de precios vigentes</p>
        </div>
      </div>

      <div className="relative max-w-md">
        <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
        <input
          type="text"
          placeholder="Buscar tratamiento…"
          value={busqueda}
          onChange={(e) => setBusqueda(e.target.value)}
          className="form-input pl-9 py-2.5 text-sm"
        />
        {busqueda && (
          <button
            type="button"
            onClick={() => setBusqueda('')}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
          >
            <X size={14} />
          </button>
        )}
      </div>

      <div className="card p-0 overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-16 gap-2 text-pink-500">
            <Loader2 size={20} className="animate-spin" />
            <span className="text-sm">Cargando tratamientos…</span>
          </div>
        ) : filtrados.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-slate-400">
            <Stethoscope size={36} strokeWidth={1.5} className="mb-2 text-slate-300" />
            <p className="text-sm">
              {busqueda ? 'Sin resultados para esa búsqueda.' : 'No hay tratamientos activos.'}
            </p>
          </div>
        ) : (
          <ul className="divide-y divide-slate-100">
            {filtrados.map((s) => (
              <li
                key={s.id}
                className="flex items-center justify-between gap-4 px-6 py-4 hover:bg-slate-50/70 transition-colors"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-9 h-9 rounded-xl bg-pink-50 text-pink-600
                                  flex items-center justify-center flex-shrink-0">
                    <Stethoscope size={16} />
                  </div>
                  <span className="text-sm font-medium text-slate-800 truncate">
                    {s.nombre_servicio}
                  </span>
                </div>
                <span className="text-sm font-bold text-slate-800 whitespace-nowrap flex items-center gap-1">
                  <DollarSign size={14} className="text-pink-500" />
                  {fmt(parseFloat(s.precio))}
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}

const AsistenteVenta = () => {
  const { user, logout } = useAuth()
  const [vista, setVista] = useState('inicio')
  const [doctores, setDoctores] = useState([])
  const [servicios, setServicios] = useState([])
  const [clientes, setClientes] = useState([])
  const [loading, setLoading] = useState(true)
  const [modalAbierto, setModalAbierto] = useState(false)
  const [modalClienteAbierto, setModalClienteAbierto] = useState(false)
  const [toast, setToast] = useState(null)
  const [ventasHoy, setVentasHoy] = useState([])
  const [loadingVentas, setLoadingVentas] = useState(true)

  const cargarVentasHoy = useCallback(async () => {
    setLoadingVentas(true)
    try {
      const res = await getVentas({ fecha: hoyISO(), por_pagina: 50 })
      setVentasHoy(res.ventas ?? [])
    } catch (err) {
      console.error('Error al cargar ventas:', err)
    } finally {
      setLoadingVentas(false)
    }
  }, [])

  const cargarDatos = useCallback(async () => {
    setLoading(true)
    try {
      const data = await getDatos()
      setDoctores(data.doctores ?? [])
      setServicios(data.servicios ?? [])
      setClientes(data.clientes ?? [])
    } catch (err) {
      console.error('Error al cargar datos:', err)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    cargarDatos()
    cargarVentasHoy()
  }, [cargarDatos, cargarVentasHoy])

  const handleVentaGuardada = () => {
    setModalAbierto(false)
    setToast({ mensaje: '¡Venta registrada exitosamente!' })
    cargarVentasHoy()
  }

  const handleClienteGuardado = async () => {
    setModalClienteAbierto(false)
    setToast({ mensaje: 'Cliente registrado correctamente.' })
    await cargarDatos()
  }

  const abrirNuevoCliente = () => setModalClienteAbierto(true)

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      <header className="bg-white border-b border-slate-200 px-6 py-4
                         flex items-center justify-between sticky top-0 z-20">
        <div className="flex items-center gap-3">
          <Logo size="md" />
          <div>
            <h1 className="text-base font-bold text-slate-800">Rim Challouf</h1>
            <p className="text-xs text-slate-400">Asistente de ventas</p>
          </div>
        </div>

        <div className="flex items-center gap-2 sm:gap-3">
          {vista === 'inicio' && (
            <>
              <button
                type="button"
                onClick={abrirNuevoCliente}
                disabled={loading}
                className="btn-secondary flex items-center gap-2 text-sm py-2 px-3 sm:px-4"
              >
                <UserPlus size={16} />
                <span className="hidden sm:inline">Nuevo Cliente</span>
              </button>

              <button
                type="button"
                onClick={() => setModalAbierto(true)}
                disabled={loading}
                className="btn-primary flex items-center gap-2 text-sm py-2 px-3 sm:px-4"
              >
                <Plus size={16} />
                <span className="hidden sm:inline">Nueva Venta</span>
              </button>
            </>
          )}

          <div className="hidden sm:flex items-center gap-2 text-sm text-slate-600
                          bg-slate-100 px-3 py-1.5 rounded-xl">
            <UserCircle size={16} className="text-pink-500" />
            <span className="font-medium">{user?.nombre}</span>
          </div>

          <button
            type="button"
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
        {vista === 'inicio' && (
          <>
            <div className="mb-8 animate-fade-in">
              <h2 className="text-2xl font-bold text-slate-800">
                Hola, {user?.nombre?.split(' ')[0]}
              </h2>
              <p className="text-sm text-slate-500 mt-1">
                {formatearDMA(hoyISO())} · ¿Qué deseas hacer hoy?
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 animate-fade-in">
              <TarjetaOpcion
                icono={Plus}
                titulo="Nueva Venta"
                descripcion="Registra una venta con uno o más tratamientos para un cliente."
                onClick={() => setModalAbierto(true)}
                destacada
              />
              <TarjetaOpcion
                icono={UserPlus}
                titulo="Nuevo Cliente"
                descripcion="Agrega un paciente nuevo al sistema con su cédula y datos de contacto."
                onClick={abrirNuevoCliente}
              />
              <TarjetaOpcion
                icono={Contact}
                titulo="Consultar Clientes"
                descripcion="Busca pacientes por cédula, nombre o teléfono."
                onClick={() => setVista('clientes')}
              />
              <TarjetaOpcion
                icono={Stethoscope}
                titulo="Ver Tratamientos"
                descripcion="Consulta la lista de tratamientos disponibles y sus precios."
                onClick={() => setVista('tratamientos')}
              />
            </div>

            <VentasAsistente ventas={ventasHoy} loading={loadingVentas} />
          </>
        )}

        {vista === 'clientes' && (
          <VistaClientes
            onVolver={() => setVista('inicio')}
            onNuevoCliente={abrirNuevoCliente}
            onToast={(msg) => setToast({ mensaje: msg })}
          />
        )}

        {vista === 'tratamientos' && (
          <VistaTratamientos
            servicios={servicios}
            loading={loading}
            onVolver={() => setVista('inicio')}
          />
        )}
      </main>

      {modalAbierto && (
        <RegistrarVentaModal
          onClose={() => setModalAbierto(false)}
          onVentaGuardada={handleVentaGuardada}
          doctores={doctores}
          servicios={servicios}
          clientes={clientes}
          onRecargarClientes={cargarDatos}
        />
      )}

      {modalClienteAbierto && (
        <ClienteModal
          onClose={() => setModalClienteAbierto(false)}
          onGuardado={handleClienteGuardado}
        />
      )}

      {toast && (
        <Toast mensaje={toast.mensaje} onClose={() => setToast(null)} />
      )}
    </div>
  )
}

export default AsistenteVenta
