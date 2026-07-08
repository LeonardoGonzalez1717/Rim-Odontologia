// =============================================================================
// components/ClienteModal.jsx — Crear o editar un cliente
// =============================================================================
import React, { useState, useEffect } from 'react'
import { X, Save, Loader2, Phone } from 'lucide-react'
import { crearCliente, actualizarCliente } from '../api/api'

const ClienteModal = ({ cliente, onClose, onGuardado }) => {
  const esEdicion = !!cliente

  const [form, setForm] = useState({
    cedula:   cliente?.cedula   ?? '',
    nombre:   cliente?.nombre   ?? '',
    telefono: cliente?.telefono ?? '',
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    const fn = (e) => { if (e.key === 'Escape' && !loading) onClose() }
    document.addEventListener('keydown', fn)
    return () => document.removeEventListener('keydown', fn)
  }, [onClose, loading])

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
        await actualizarCliente({ id: cliente.id, ...form })
        onGuardado()
      } else {
        const res = await crearCliente(form)
        onGuardado({
          id: res.id,
          cedula: form.cedula.trim(),
          nombre: form.nombre.trim(),
          telefono: form.telefono.trim() || null,
        })
      }
    } catch (err) {
      setError(err.message || 'Error al guardar.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-fade-in"
      onClick={(e) => e.target === e.currentTarget && !loading && onClose()}
    >
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md animate-scale-in">
        <div className="flex items-center justify-between px-7 pt-6 pb-4 border-b border-slate-100">
          <div>
            <h2 className="text-xl font-bold text-slate-800">
              {esEdicion ? 'Editar Cliente' : 'Nuevo Cliente'}
            </h2>
            <p className="text-sm text-slate-500 mt-0.5">
              {esEdicion ? 'Modifica los datos del cliente' : 'Completa los datos del nuevo cliente'}
            </p>
          </div>
          <button onClick={onClose} disabled={loading}
            className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200
                       flex items-center justify-center text-slate-500 transition-all
                       disabled:opacity-50">
            <X size={16} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="px-7 py-6 space-y-4">
          {error && (
            <div className="flex items-center gap-2 bg-red-50 border border-red-200
                            text-red-700 rounded-xl p-3 text-sm animate-slide-up">
              <X size={15} /> {error}
            </div>
          )}

          <div>
            <label htmlFor="cliente-cedula" className="form-label">Cédula</label>
            <input
              id="cliente-cedula" name="cedula" type="text"
              value={form.cedula} onChange={handleChange}
              placeholder="Ej: V-12345678"
              className="form-input" autoFocus required
            />
          </div>

          <div>
            <label htmlFor="cliente-nombre" className="form-label">Nombre completo</label>
            <input
              id="cliente-nombre" name="nombre" type="text"
              value={form.nombre} onChange={handleChange}
              placeholder="Ej: María González"
              className="form-input" required
            />
          </div>

          <div>
            <label htmlFor="cliente-telefono" className="form-label">
              <Phone size={14} className="inline mr-1 text-pink-500" />
              Teléfono
            </label>
            <input
              id="cliente-telefono" name="telefono" type="tel"
              value={form.telefono} onChange={handleChange}
              placeholder="Ej: 0414-1234567"
              className="form-input"
            />
          </div>

          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose} disabled={loading} className="btn-secondary flex-1">
              Cancelar
            </button>
            <button type="submit" disabled={loading}
              className="btn-primary flex-1 flex items-center justify-center gap-2">
              {loading
                ? <><Loader2 size={15} className="animate-spin" /> Guardando…</>
                : <><Save size={15} /> {esEdicion ? 'Actualizar' : 'Crear Cliente'}</>
              }
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default ClienteModal
