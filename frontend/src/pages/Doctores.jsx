// =============================================================================
// pages/Doctores.jsx
// Página de gestión de doctores: lista, crear, editar, activar/desactivar
// =============================================================================
import React, { useState, useEffect, useCallback } from 'react'
import {
  UserPlus, Pencil, Power, PowerOff, Loader2,
  CheckCircle2, XCircle, Search, X, Save, Stethoscope,
} from 'lucide-react'
import ConfirmPinModal from '../components/ConfirmPinModal'
import {
  getDoctores, crearDoctor, actualizarDoctor, toggleDoctor,
} from '../api/api'

// ─────────────────────────────────────────────────────────────────────────────
// Modal de Crear / Editar Doctor
// ─────────────────────────────────────────────────────────────────────────────
const ESPECIALIDADES = [
  'Odontología General',
  'Ortodoncia',
  'Endodoncia',
  'Periodoncia',
  'Cirugía Oral y Maxilofacial',
  'Odontopediatría',
  'Prostodoncia',
  'Implantología',
  'Estética Dental',
]

const DoctorModal = ({ doctor, onClose, onGuardado }) => {
  const esEdicion = !!doctor

  const [form, setForm]     = useState({
    cedula:       doctor?.cedula       ?? '',
    nombre:       doctor?.nombre       ?? '',
    especialidad: doctor?.especialidad ?? 'Odontología General',
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
    if (!form.cedula.trim()) { setError('La cédula es requerida.'); return }
    if (!form.nombre.trim()) { setError('El nombre es requerido.'); return }

    setLoading(true)
    setError('')
    try {
      if (esEdicion) {
        await actualizarDoctor({ id: doctor.id, ...form })
      } else {
        await crearDoctor(form)
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
              {esEdicion ? 'Editar Doctor' : 'Nuevo Doctor'}
            </h2>
            <p className="text-sm text-slate-500 mt-0.5">
              {esEdicion ? 'Modifica los datos del doctor' : 'Completa los datos del nuevo doctor'}
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

          {/* Cédula */}
          <div>
            <label htmlFor="cedula" className="form-label">Cédula</label>
            <input
              id="cedula" name="cedula" type="text"
              value={form.cedula} onChange={handleChange}
              placeholder="Ej: V-12345678"
              className="form-input" autoFocus required
            />
          </div>

          {/* Nombre */}
          <div>
            <label htmlFor="nombre" className="form-label">Nombre completo</label>
            <input
              id="nombre" name="nombre" type="text"
              value={form.nombre} onChange={handleChange}
              placeholder="Ej: Dr. Carlos Mendoza"
              className="form-input" required
            />
          </div>

          {/* Especialidad */}
          <div>
            <label htmlFor="especialidad" className="form-label">Especialidad</label>
            <select
              id="especialidad" name="especialidad"
              value={form.especialidad} onChange={handleChange}
              className="form-input"
            >
              {ESPECIALIDADES.map((e) => (
                <option key={e} value={e}>{e}</option>
              ))}
            </select>
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
                : <><Save size={15} /> {esEdicion ? 'Actualizar' : 'Crear Doctor'}</>
              }
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Página principal de Doctores
// ─────────────────────────────────────────────────────────────────────────────
const Doctores = ({ onToast }) => {
  const [doctores,  setDoctores]  = useState([])
  const [loading,   setLoading]   = useState(true)
  const [error,     setError]     = useState('')
  const [busqueda,  setBusqueda]  = useState('')
  const [modal,      setModal]      = useState(null)
  const [pinConfirm, setPinConfirm] = useState(null)
  const [toggling,  setToggling]  = useState(null)

  // Filtro por búsqueda
  const doctoresFiltrados = doctores.filter((d) =>
    d.nombre.toLowerCase().includes(busqueda.toLowerCase()) ||
    d.cedula?.toLowerCase().includes(busqueda.toLowerCase()) ||
    d.especialidad.toLowerCase().includes(busqueda.toLowerCase())
  )

  // Cargar doctores
  const cargar = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const res = await getDoctores()
      setDoctores(res.doctores ?? [])
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { cargar() }, [cargar])

  // Toggle estado activo/inactivo
  const handleToggle = async (doctor) => {
    setToggling(doctor.id)
    try {
      const res = await toggleDoctor(doctor.id)
      onToast({ mensaje: res.message, tipo: 'success' })
      await cargar()
    } catch (err) {
      onToast({ mensaje: err.message, tipo: 'error' })
    } finally {
      setToggling(null)
    }
  }

  // Callback al guardar desde el modal
  const handleGuardado = async () => {
    setModal(null)
    onToast({ mensaje: 'Doctor guardado correctamente.', tipo: 'success' })
    await cargar()
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {pinConfirm && (
        <ConfirmPinModal {...pinConfirm} onClose={() => setPinConfirm(null)} />
      )}

      {/* Modal */}
      {modal !== null && (
        <DoctorModal
          doctor={modal === 'nuevo' ? null : modal}
          onClose={() => setModal(null)}
          onGuardado={handleGuardado}
        />
      )}

      {/* Encabezado */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-800">Doctores</h2>
          <p className="text-slate-500 text-sm mt-1">
            {doctores.length} doctor{doctores.length !== 1 ? 'es' : ''} registrados
          </p>
        </div>
        <button
          onClick={() => setPinConfirm({
            titulo: 'Autorizar creación',
            descripcion: 'Registrar nuevo doctor',
            detalle: 'Se requiere PIN de administrador.',
            textoConfirmar: 'Continuar',
            variante: 'warning',
            onConfirm: () => setModal('nuevo'),
          })}
          className="btn-primary flex items-center gap-2 self-start sm:self-auto"
        >
          <UserPlus size={16} /> Nuevo Doctor
        </button>
      </div>

      {/* Buscador */}
      <div className="relative max-w-sm">
        <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
        <input
          type="text"
          placeholder="Buscar por cédula, nombre o especialidad…"
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
            <span className="text-sm">Cargando doctores…</span>
          </div>
        ) : doctoresFiltrados.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-slate-400">
            <Stethoscope size={36} strokeWidth={1.5} className="mb-2 text-slate-300" />
            <p className="text-sm">
              {busqueda ? 'Sin resultados para esa búsqueda.' : 'No hay doctores registrados.'}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-slate-50 border-b border-slate-100">
                <tr>
                  {['#', 'Cédula', 'Nombre', 'Especialidad', 'Estado', 'Acciones'].map((h) => (
                    <th key={h}
                      className="text-left text-xs font-semibold text-slate-400 uppercase
                                 tracking-wider px-6 py-4 first:pl-6">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {doctoresFiltrados.map((doc, index) => (
                  <tr key={doc.id}
                    className={`transition-colors duration-150 hover:bg-slate-50/70
                                ${doc.estado === 'inactivo' ? 'opacity-60' : ''}`}>
                    <td className="px-6 py-4 text-sm text-slate-400 font-mono">
                      {index + 1}
                    </td>
                    {/* Cédula */}
                    <td className="px-6 py-4">
                      <span className="text-sm text-slate-600 font-mono">{doc.cedula || '—'}</span>
                    </td>
                    {/* Nombre */}
                    <td className="px-6 py-4">
                      <span className="text-sm font-semibold text-slate-800">{doc.nombre}</span>
                    </td>
                    {/* Especialidad */}
                    <td className="px-6 py-4">
                      <span className="text-sm text-slate-600">{doc.especialidad}</span>
                    </td>
                    {/* Estado */}
                    <td className="px-6 py-4">
                      {doc.estado === 'activo'
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
                            descripcion: `Editar "${doc.nombre}"`,
                            detalle: 'Se requiere PIN de administrador.',
                            textoConfirmar: 'Continuar',
                            variante: 'warning',
                            onConfirm: () => setModal(doc),
                          })}
                          className="flex items-center gap-1.5 text-xs font-semibold
                                     text-pink-600 bg-pink-50 hover:bg-pink-100
                                     border border-pink-200 px-3 py-1.5 rounded-lg
                                     transition-all duration-200"
                          title="Editar doctor"
                        >
                          <Pencil size={12} /> Editar
                        </button>

                        {/* Toggle activo/inactivo */}
                        <button
                          onClick={() => setPinConfirm({
                            titulo: doc.estado === 'activo' ? 'Desactivar doctor' : 'Activar doctor',
                            descripcion: doc.nombre,
                            detalle: 'Se requiere PIN de administrador.',
                            textoConfirmar: doc.estado === 'activo' ? 'Desactivar' : 'Activar',
                            variante: 'warning',
                            onConfirm: () => handleToggle(doc),
                          })}
                          disabled={toggling === doc.id}
                          className={`flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg
                                      border transition-all duration-200 disabled:opacity-50
                                      ${doc.estado === 'activo'
                                        ? 'text-amber-700 bg-amber-50 hover:bg-amber-100 border-amber-200'
                                        : 'text-slate-700 bg-slate-100 hover:bg-slate-200 border-slate-300'
                                      }`}
                          title={doc.estado === 'activo' ? 'Desactivar' : 'Activar'}
                        >
                          {toggling === doc.id
                            ? <Loader2 size={12} className="animate-spin" />
                            : doc.estado === 'activo'
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
          </div>
        )}
      </div>
    </div>
  )
}

export default Doctores
