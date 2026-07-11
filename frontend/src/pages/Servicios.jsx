// =============================================================================
// pages/Servicios.jsx
// Página de gestión de servicios/tratamientos: lista, crear, editar, activar/desactivar
// =============================================================================
import React, { useState, useEffect, useCallback } from 'react'
import {
  PlusCircle, Pencil, Power, PowerOff, Loader2,
  CheckCircle2, XCircle, Search, X, Save, Stethoscope, DollarSign,
} from 'lucide-react'
import ConfirmPinModal from '../components/ConfirmPinModal'
import Paginacion from '../components/Paginacion'
import { usePaginacion } from '../hooks/usePaginacion'
import {
  getServicios, crearServicio, actualizarServicio, toggleServicio,
} from '../api/api'

// Formateador de moneda
const fmt = (v) => new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'USD' }).format(v)

// ─────────────────────────────────────────────────────────────────────────────
// Modal Crear / Editar Servicio
// ─────────────────────────────────────────────────────────────────────────────
const ServicioModal = ({ servicio, onClose, onGuardado }) => {
  const esEdicion = !!servicio

  const [form, setForm]     = useState({
    nombre_servicio: servicio?.nombre_servicio ?? '',
    precio:          servicio?.precio          ?? '',
  })
  const [loading, setLoading] = useState(false)
  const [error,   setError]   = useState('')

  // Cerrar con Escape
  useEffect(() => {
    const fn = (e) => { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', fn)
    return () => document.removeEventListener('keydown', fn)
  }, [onClose])

  const handleChange = (e) => {
    setError('')
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!form.nombre_servicio.trim()) { setError('El nombre es requerido.'); return }
    if (form.precio === '' || parseFloat(form.precio) < 0) {
      setError('El precio debe ser mayor o igual a 0.'); return
    }

    setLoading(true)
    setError('')
    try {
      const payload = {
        nombre_servicio: form.nombre_servicio.trim(),
        precio: parseFloat(form.precio),
      }
      if (esEdicion) {
        await actualizarServicio({ id: servicio.id, ...payload })
      } else {
        await crearServicio(payload)
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
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md animate-scale-in">
        {/* Header */}
        <div className="flex items-center justify-between px-7 pt-6 pb-4 border-b border-slate-100">
          <div>
            <h2 className="text-xl font-bold text-slate-800">
              {esEdicion ? 'Editar Tratamiento' : 'Nuevo Tratamiento'}
            </h2>
            <p className="text-sm text-slate-500 mt-0.5">
              {esEdicion ? 'Modifica los datos del servicio' : 'Ingresa los datos del nuevo tratamiento'}
            </p>
          </div>
          <button onClick={onClose}
            className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200
                       flex items-center justify-center text-slate-500 transition-all">
            <X size={16} />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="px-7 py-6 space-y-4">
          {error && (
            <div className="flex items-center gap-2 bg-red-50 border border-red-200
                            text-red-700 rounded-xl p-3 text-sm animate-slide-up">
              <X size={15} /> {error}
            </div>
          )}

          {/* Nombre del servicio */}
          <div>
            <label htmlFor="nombre_servicio" className="form-label">
              <Stethoscope size={14} className="inline mr-1.5 text-pink-500" />
              Nombre del tratamiento
            </label>
            <input
              id="nombre_servicio" name="nombre_servicio" type="text"
              value={form.nombre_servicio} onChange={handleChange}
              placeholder="Ej: Limpieza Dental (Profilaxis)"
              className="form-input" autoFocus required
            />
          </div>

          {/* Precio */}
          <div>
            <label htmlFor="precio" className="form-label">
              <DollarSign size={14} className="inline mr-1.5 text-pink-500" />
              Precio ($)
            </label>
            <div className="relative">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 font-semibold text-sm">$</span>
              <input
                id="precio" name="precio" type="number"
                value={form.precio} onChange={handleChange}
                min="0" step="0.01" placeholder="0.00"
                className="form-input pl-8" required
              />
            </div>
          </div>

          {/* Botones */}
          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose} className="btn-secondary flex-1">
              Cancelar
            </button>
            <button type="submit" disabled={loading}
              className="btn-primary flex-1 flex items-center justify-center gap-2">
              {loading
                ? <><Loader2 size={15} className="animate-spin" /> Guardando…</>
                : <><Save size={15} /> {esEdicion ? 'Actualizar' : 'Crear Tratamiento'}</>
              }
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Página principal de Servicios
// ─────────────────────────────────────────────────────────────────────────────
const Servicios = ({ onToast }) => {
  const [servicios,  setServicios]  = useState([])
  const [loading,    setLoading]    = useState(true)
  const [error,      setError]      = useState('')
  const [busqueda,   setBusqueda]   = useState('')
  const [modal,      setModal]      = useState(null)
  const [pinConfirm, setPinConfirm] = useState(null)
  const [toggling,   setToggling]   = useState(null)

  // Filtro por búsqueda
  const serviciosFiltrados = servicios.filter((s) =>
    s.nombre_servicio.toLowerCase().includes(busqueda.toLowerCase())
  )

  const {
    itemsPaginados: serviciosPagina,
    pagina,
    setPagina,
    totalPaginas,
    total,
    indiceInicio,
    indiceFin,
  } = usePaginacion(serviciosFiltrados, 10, [busqueda])

  // Conteo de activos
  const activos = servicios.filter((s) => s.estado === 'activo').length

  // Cargar servicios
  const cargar = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const res = await getServicios()
      setServicios(res.servicios ?? [])
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { cargar() }, [cargar])

  // Toggle estado
  const handleToggle = async (servicio) => {
    setToggling(servicio.id)
    try {
      const res = await toggleServicio(servicio.id)
      onToast({ mensaje: res.message, tipo: 'success' })
      await cargar()
    } catch (err) {
      onToast({ mensaje: err.message, tipo: 'error' })
    } finally {
      setToggling(null)
    }
  }

  // Al guardar desde modal
  const handleGuardado = async () => {
    setModal(null)
    onToast({ mensaje: 'Tratamiento guardado correctamente.', tipo: 'success' })
    await cargar()
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {pinConfirm && (
        <ConfirmPinModal {...pinConfirm} onClose={() => setPinConfirm(null)} />
      )}

      {/* Modal */}
      {modal !== null && (
        <ServicioModal
          servicio={modal === 'nuevo' ? null : modal}
          onClose={() => setModal(null)}
          onGuardado={handleGuardado}
        />
      )}

      {/* Encabezado */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-800">Tratamientos</h2>
          <p className="text-slate-500 text-sm mt-1">
            {servicios.length} tratamientos registrados · {activos} activos
          </p>
        </div>
        <button
          onClick={() => setPinConfirm({
            titulo: 'Autorizar creación',
            descripcion: 'Registrar nuevo tratamiento',
            detalle: 'Se requiere PIN de administrador.',
            textoConfirmar: 'Continuar',
            variante: 'warning',
            onConfirm: () => setModal('nuevo'),
          })}
          className="btn-primary flex items-center gap-2 self-start sm:self-auto"
        >
          <PlusCircle size={16} /> Nuevo Tratamiento
        </button>
      </div>

      {/* Buscador */}
      <div className="relative max-w-sm">
        <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
        <input
          type="text"
          placeholder="Buscar tratamiento…"
          value={busqueda}
          onChange={(e) => setBusqueda(e.target.value)}
          className="form-input pl-9 py-2.5 text-sm"
        />
        {busqueda && (
          <button onClick={() => setBusqueda('')}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
            <X size={14} />
          </button>
        )}
      </div>

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
            <span className="text-sm">Cargando tratamientos…</span>
          </div>
        ) : serviciosFiltrados.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-slate-400">
            <Stethoscope size={36} strokeWidth={1.5} className="mb-2 text-slate-300" />
            <p className="text-sm">
              {busqueda ? 'Sin resultados para esa búsqueda.' : 'No hay tratamientos registrados.'}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-slate-50 border-b border-slate-100">
                <tr>
                  {['#', 'Tratamiento / Servicio', 'Precio', 'Estado', 'Acciones'].map((h) => (
                    <th key={h}
                      className="text-left text-xs font-semibold text-slate-400 uppercase
                                 tracking-wider px-6 py-4">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {serviciosPagina.map((svc, index) => (
                  <tr key={svc.id}
                    className={`transition-colors duration-150 hover:bg-slate-50/70
                                ${svc.estado === 'inactivo' ? 'opacity-60' : ''}`}>
                    <td className="px-6 py-4 text-sm text-slate-400 font-mono">{indiceInicio + index}</td>

                    {/* Nombre */}
                    <td className="px-6 py-4">
                      <span className="text-sm font-semibold text-slate-800">
                        {svc.nombre_servicio}
                      </span>
                    </td>

                    {/* Precio */}
                    <td className="px-6 py-4">
                      <span className="text-sm font-bold text-pink-700 bg-pink-50
                                       px-2.5 py-1 rounded-lg border border-pink-100">
                        {fmt(svc.precio)}
                      </span>
                    </td>

                    {/* Estado */}
                    <td className="px-6 py-4">
                      {svc.estado === 'activo'
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
                      <div className="flex items-center gap-2">
                        {/* Editar */}
                        <button
                          onClick={() => setPinConfirm({
                            titulo: 'Autorizar edición',
                            descripcion: `Editar "${svc.nombre_servicio}"`,
                            detalle: 'Se requiere PIN de administrador.',
                            textoConfirmar: 'Continuar',
                            variante: 'warning',
                            onConfirm: () => setModal(svc),
                          })}
                          className="flex items-center gap-1.5 text-xs font-semibold
                                     text-pink-600 bg-pink-50 hover:bg-pink-100
                                     border border-pink-200 px-3 py-1.5 rounded-lg
                                     transition-all duration-200"
                        >
                          <Pencil size={12} /> Editar
                        </button>

                        {/* Toggle estado */}
                        <button
                          onClick={() => setPinConfirm({
                            titulo: svc.estado === 'activo' ? 'Desactivar tratamiento' : 'Activar tratamiento',
                            descripcion: svc.nombre_servicio,
                            detalle: 'Se requiere PIN de administrador.',
                            textoConfirmar: svc.estado === 'activo' ? 'Desactivar' : 'Activar',
                            variante: 'warning',
                            onConfirm: () => handleToggle(svc),
                          })}
                          disabled={toggling === svc.id}
                          className={`flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg
                                      border transition-all duration-200 disabled:opacity-50
                                      ${svc.estado === 'activo'
                                        ? 'text-amber-700 bg-amber-50 hover:bg-amber-100 border-amber-200'
                                        : 'text-slate-700 bg-slate-100 hover:bg-slate-200 border-slate-300'
                                      }`}
                        >
                          {toggling === svc.id
                            ? <Loader2 size={12} className="animate-spin" />
                            : svc.estado === 'activo'
                              ? <><PowerOff size={12} /> Desactivar</>
                              : <><Power size={12} /> Activar</>
                          }
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div className="px-6 pb-4">
              <Paginacion
                pagina={pagina}
                totalPaginas={totalPaginas}
                total={total}
                onPaginaChange={setPagina}
                indiceInicio={indiceInicio}
                indiceFin={indiceFin}
                etiquetaSingular="tratamiento"
                etiquetaPlural="tratamientos"
              />
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default Servicios
