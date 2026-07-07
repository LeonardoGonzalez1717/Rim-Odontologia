// =============================================================================
// pages/Usuarios.jsx
// CRUD de perfiles: crear, editar y eliminar usuarios, contraseñas y PIN admin
// =============================================================================
import React, { useState, useEffect, useCallback } from 'react'
import {
  UserPlus, Pencil, Trash2, Loader2, Search, X, Save, Users,
  Shield, UserCheck, XCircle, Lock, User, KeyRound,
} from 'lucide-react'
import ConfirmPinModal from '../components/ConfirmPinModal'
import { useAuth } from '../context/AuthContext'
import { getUsuarios, crearUsuario, actualizarUsuario, eliminarUsuario } from '../api/api'

const ROLES = [
  { value: 'admin', label: 'Administrador', desc: 'Acceso completo + PIN para acciones sensibles' },
  { value: 'asistente', label: 'Asistente', desc: 'Solo registrar y consultar ventas' },
]

const UsuarioModal = ({ usuario, onClose, onGuardado }) => {
  const esEdicion = !!usuario

  const [form, setForm] = useState({
    username: usuario?.username ?? '',
    nombre:   usuario?.nombre   ?? '',
    rol:      usuario?.rol      ?? 'asistente',
    password: '',
    pin:      '',
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

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

    if (!form.username.trim() || !form.nombre.trim()) {
      setError('Usuario y nombre son requeridos.')
      return
    }

    if (!esEdicion && !form.password) {
      setError('La contraseña es requerida para usuarios nuevos.')
      return
    }

    if (form.rol === 'admin') {
      const necesitaPin = !esEdicion || !usuario?.tiene_pin
      if (necesitaPin && !form.pin) {
        setError('El PIN es requerido para administradores.')
        return
      }
      if (form.pin && !/^\d{4,6}$/.test(form.pin)) {
        setError('El PIN debe tener entre 4 y 6 dígitos.')
        return
      }
    }

    setLoading(true)
    setError('')
    try {
      const payload = {
        username: form.username.trim(),
        nombre:   form.nombre.trim(),
        rol:      form.rol,
      }

      if (form.rol === 'admin' && form.pin) {
        payload.pin = form.pin
      }

      if (esEdicion) {
        await actualizarUsuario({
          id: usuario.id,
          ...payload,
          ...(form.password ? { password: form.password } : {}),
        })
      } else {
        await crearUsuario({ ...payload, password: form.password })
      }
      onGuardado(esEdicion ? usuario.id : null, {
        username: payload.username,
        nombre: payload.nombre,
        rol: payload.rol,
      })
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
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md animate-scale-in max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between px-7 pt-6 pb-4 border-b border-slate-100">
          <div>
            <h2 className="text-xl font-bold text-slate-800">
              {esEdicion ? 'Editar Perfil' : 'Nuevo Perfil'}
            </h2>
            <p className="text-sm text-slate-500 mt-0.5">
              {esEdicion
                ? 'Actualiza datos, contraseña, rol o PIN'
                : 'Crea una cuenta con contraseña y rol'}
            </p>
          </div>
          <button onClick={onClose}
            className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200
                       flex items-center justify-center text-slate-500 transition-all">
            <X size={16} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="px-7 py-6 space-y-4">
          {error && (
            <div className="flex items-center gap-2 bg-red-50 border border-red-200
                            text-red-700 rounded-xl p-3 text-sm animate-slide-up">
              <XCircle size={15} /> {error}
            </div>
          )}

          <div>
            <label htmlFor="nombre" className="form-label">
              <User size={14} className="inline mr-1.5 text-pink-500" />
              Nombre completo
            </label>
            <input
              id="nombre" name="nombre" type="text"
              value={form.nombre} onChange={handleChange}
              placeholder="Ej: María López"
              className="form-input" autoFocus required
            />
          </div>

          <div>
            <label htmlFor="username" className="form-label">
              Nombre de usuario (login)
            </label>
            <input
              id="username" name="username" type="text"
              value={form.username} onChange={handleChange}
              placeholder="Ej: mlopez"
              className="form-input" autoComplete="off" required
            />
          </div>

          <div>
            <label htmlFor="rol" className="form-label">
              <Shield size={14} className="inline mr-1.5 text-pink-500" />
              Rol
            </label>
            <select
              id="rol" name="rol"
              value={form.rol} onChange={handleChange}
              className="form-input"
            >
              {ROLES.map((r) => (
                <option key={r.value} value={r.value}>{r.label}</option>
              ))}
            </select>
            <p className="text-xs text-slate-400 mt-1.5">
              {ROLES.find((r) => r.value === form.rol)?.desc}
            </p>
          </div>

          <div>
            <label htmlFor="password" className="form-label">
              <Lock size={14} className="inline mr-1.5 text-pink-500" />
              {esEdicion ? 'Nueva contraseña' : 'Contraseña'}
            </label>
            <input
              id="password" name="password" type="password"
              value={form.password} onChange={handleChange}
              placeholder={esEdicion ? 'Dejar vacío para no cambiar' : 'Mínimo 4 caracteres'}
              className="form-input" autoComplete="new-password"
              required={!esEdicion}
            />
          </div>

          {form.rol === 'admin' && (
            <div>
              <label htmlFor="pin" className="form-label">
                <KeyRound size={14} className="inline mr-1.5 text-pink-500" />
                PIN de administrador
              </label>
              <input
                id="pin" name="pin" type="password"
                inputMode="numeric"
                maxLength={6}
                value={form.pin}
                onChange={(e) => {
                  setError('')
                  setForm((prev) => ({
                    ...prev,
                    pin: e.target.value.replace(/\D/g, '').slice(0, 6),
                  }))
                }}
                placeholder={
                  esEdicion && usuario?.tiene_pin
                    ? 'Dejar vacío para no cambiar'
                    : '4 a 6 dígitos numéricos'
                }
                className="form-input font-mono tracking-widest"
                autoComplete="off"
                required={!esEdicion || !usuario?.tiene_pin}
              />
              <p className="text-xs text-slate-400 mt-1.5">
                Se solicita para confirmar acciones sensibles (cancelar ventas, editar, eliminar, etc.)
              </p>
            </div>
          )}

          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose} className="btn-secondary flex-1">
              Cancelar
            </button>
            <button type="submit" disabled={loading}
              className="btn-primary flex-1 flex items-center justify-center gap-2">
              {loading
                ? <><Loader2 size={15} className="animate-spin" /> Guardando…</>
                : <><Save size={15} /> {esEdicion ? 'Actualizar' : 'Crear Perfil'}</>
              }
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

const Usuarios = ({ onToast }) => {
  const { user: sesion, updateUser } = useAuth()
  const [usuarios, setUsuarios] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [busqueda, setBusqueda] = useState('')
  const [modal, setModal] = useState(null)
  const [pinConfirm, setPinConfirm] = useState(null)
  const [eliminando, setEliminando] = useState(null)

  const esSesionActual = (u) =>
    (sesion?.id && u.id === sesion.id) ||
    (!sesion?.id && sesion?.username === u.username)

  const usuariosFiltrados = usuarios.filter((u) =>
    u.nombre.toLowerCase().includes(busqueda.toLowerCase()) ||
    u.username.toLowerCase().includes(busqueda.toLowerCase()) ||
    u.rol.toLowerCase().includes(busqueda.toLowerCase())
  )

  const cargar = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const res = await getUsuarios()
      setUsuarios(res.usuarios ?? [])
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { cargar() }, [cargar])

  const actualizarSesionLocal = (idEditado, datos) => {
    if (!sesion || !idEditado || !datos) return
    const esMismo = sesion.id
      ? sesion.id === idEditado
      : sesion.username === datos.username
    if (esMismo) {
      updateUser({ ...datos, id: idEditado })
    }
  }

  const handleGuardado = async (idEditado, datos) => {
    setModal(null)
    onToast({ mensaje: 'Perfil guardado correctamente.', tipo: 'success' })
    if (idEditado && datos) {
      actualizarSesionLocal(idEditado, datos)
    }
    await cargar()
  }

  const handleEliminar = async (u) => {
    setEliminando(u.id)
    try {
      const res = await eliminarUsuario(u.id)
      onToast({ mensaje: res.message || 'Usuario eliminado.', tipo: 'success' })
      await cargar()
    } catch (err) {
      onToast({ mensaje: err.message || 'Error al eliminar.', tipo: 'error' })
    } finally {
      setEliminando(null)
    }
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {pinConfirm && (
        <ConfirmPinModal {...pinConfirm} onClose={() => setPinConfirm(null)} />
      )}

      {modal !== null && (
        <UsuarioModal
          usuario={modal === 'nuevo' ? null : modal}
          onClose={() => setModal(null)}
          onGuardado={handleGuardado}
        />
      )}

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-800">Perfiles de Usuario</h2>
          <p className="text-slate-500 text-sm mt-1">
            Gestiona cuentas, contraseñas y PIN de administrador
          </p>
        </div>
        <button
          onClick={() => setPinConfirm({
            titulo: 'Autorizar creación',
            descripcion: 'Registrar nuevo perfil',
            detalle: 'Se requiere PIN de administrador.',
            textoConfirmar: 'Continuar',
            variante: 'warning',
            onConfirm: () => setModal('nuevo'),
          })}
          className="btn-primary flex items-center gap-2 self-start sm:self-auto"
        >
          <UserPlus size={16} /> Nuevo Perfil
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="card p-4 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-pink-50 flex items-center justify-center text-pink-600">
            <Users size={18} />
          </div>
          <div>
            <p className="text-2xl font-bold text-slate-800">{usuarios.length}</p>
            <p className="text-xs text-slate-500">Perfiles totales</p>
          </div>
        </div>
        <div className="card p-4 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center text-slate-600">
            <Shield size={18} />
          </div>
          <div>
            <p className="text-2xl font-bold text-slate-800">
              {usuarios.filter((u) => u.rol === 'admin').length}
            </p>
            <p className="text-xs text-slate-500">Administradores</p>
          </div>
        </div>
        <div className="card p-4 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-amber-50 flex items-center justify-center text-amber-600">
            <KeyRound size={18} />
          </div>
          <div>
            <p className="text-2xl font-bold text-slate-800">
              {usuarios.filter((u) => u.tiene_pin).length}
            </p>
            <p className="text-xs text-slate-500">PIN configurados</p>
          </div>
        </div>
      </div>

      <div className="relative max-w-sm">
        <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
        <input
          type="text"
          placeholder="Buscar por nombre, usuario o rol…"
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

      {error && (
        <div className="flex items-center gap-2 bg-red-50 border border-red-200
                        text-red-700 rounded-2xl p-4 text-sm">
          <XCircle size={16} /> {error}
        </div>
      )}

      <div className="card p-0 overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-16 gap-2 text-slate-400">
            <Loader2 size={20} className="animate-spin" />
            <span className="text-sm">Cargando perfiles…</span>
          </div>
        ) : usuariosFiltrados.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-slate-400">
            <Users size={36} strokeWidth={1.5} className="mb-2 text-slate-300" />
            <p className="text-sm">
              {busqueda ? 'Sin resultados para esa búsqueda.' : 'No hay perfiles registrados.'}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-slate-50 border-b border-slate-100">
                <tr>
                  {['#', 'Nombre', 'Usuario', 'Rol', 'PIN', 'Registro', 'Acciones'].map((h) => (
                    <th key={h}
                      className="text-left text-xs font-semibold text-slate-400 uppercase
                                 tracking-wider px-6 py-4">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {usuariosFiltrados.map((u, index) => (
                  <tr key={u.id}
                    className={`transition-colors duration-150 hover:bg-slate-50/70
                      ${esSesionActual(u) ? 'bg-pink-50/40' : ''}`}>
                    <td className="px-6 py-4 text-sm text-slate-400 font-mono">{index + 1}</td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-semibold text-slate-800">{u.nombre}</span>
                        {esSesionActual(u) && (
                          <span className="text-[10px] font-semibold uppercase tracking-wide
                                           bg-pink-100 text-pink-700 px-1.5 py-0.5 rounded-md">
                            Tú
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-sm text-slate-600 font-mono">{u.username}</span>
                    </td>
                    <td className="px-6 py-4">
                      {u.rol === 'admin' ? (
                        <span className="badge bg-slate-100 text-slate-700 border border-slate-300 gap-1">
                          <Shield size={11} /> Admin
                        </span>
                      ) : (
                        <span className="badge bg-pink-50 text-pink-700 border border-pink-200 gap-1">
                          <UserCheck size={11} /> Asistente
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      {u.rol === 'admin' ? (
                        u.tiene_pin ? (
                          <span className="badge bg-emerald-50 text-emerald-700 border border-emerald-200 gap-1">
                            <KeyRound size={11} /> Configurado
                          </span>
                        ) : (
                          <span className="badge bg-amber-50 text-amber-700 border border-amber-200 gap-1">
                            <KeyRound size={11} /> Sin PIN
                          </span>
                        )
                      ) : (
                        <span className="text-xs text-slate-400">—</span>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-sm text-slate-500">
                        {new Date(u.created_at).toLocaleDateString('es-MX', {
                          day: '2-digit', month: 'short', year: 'numeric',
                        })}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => setPinConfirm({
                            titulo: 'Autorizar edición de perfil',
                            descripcion: u.nombre,
                            detalle: 'Se requiere PIN de administrador.',
                            textoConfirmar: 'Continuar',
                            variante: 'warning',
                            onConfirm: () => setModal(u),
                          })}
                          className="flex items-center gap-1.5 text-xs font-semibold
                                     text-pink-600 bg-pink-50 hover:bg-pink-100
                                     border border-pink-200 px-3 py-1.5 rounded-lg
                                     transition-all duration-200"
                          title="Editar perfil"
                        >
                          <Pencil size={12} /> Editar
                        </button>

                        {!esSesionActual(u) && (
                          <button
                            onClick={() => setPinConfirm({
                              titulo: 'Eliminar perfil',
                              descripcion: u.nombre,
                              detalle: `Se eliminará la cuenta "${u.username}". Esta acción no se puede deshacer.`,
                              textoConfirmar: 'Eliminar',
                              variante: 'danger',
                              onConfirm: () => handleEliminar(u),
                            })}
                            disabled={eliminando === u.id}
                            className="flex items-center gap-1.5 text-xs font-semibold
                                       text-red-600 bg-red-50 hover:bg-red-100
                                       border border-red-200 px-3 py-1.5 rounded-lg
                                       transition-all duration-200 disabled:opacity-50"
                            title="Eliminar perfil"
                          >
                            {eliminando === u.id
                              ? <Loader2 size={12} className="animate-spin" />
                              : <><Trash2 size={12} /> Eliminar</>
                            }
                          </button>
                        )}
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

export default Usuarios
