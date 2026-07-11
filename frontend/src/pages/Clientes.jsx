// =============================================================================
// pages/Clientes.jsx
// Página de gestión de clientes: lista, crear, editar, activar/desactivar
// =============================================================================
import React, { useState, useEffect, useCallback } from 'react'
import {
  UserPlus, Pencil, Power, PowerOff, Loader2,
  CheckCircle2, XCircle, Search, X, Contact,
} from 'lucide-react'
import ConfirmPinModal from '../components/ConfirmPinModal'
import ClienteModal from '../components/ClienteModal'
import Paginacion from '../components/Paginacion'
import { usePaginacion } from '../hooks/usePaginacion'
import {
  getClientes, toggleCliente,
} from '../api/api'

const Clientes = ({ onToast }) => {
  const [clientes, setClientes] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [busqueda, setBusqueda] = useState('')
  const [modal, setModal] = useState(null)
  const [pinConfirm, setPinConfirm] = useState(null)
  const [toggling, setToggling] = useState(null)

  const clientesFiltrados = clientes.filter((c) =>
    c.nombre.toLowerCase().includes(busqueda.toLowerCase()) ||
    c.cedula?.toLowerCase().includes(busqueda.toLowerCase()) ||
    c.telefono?.toLowerCase().includes(busqueda.toLowerCase())
  )

  const {
    itemsPaginados: clientesPagina,
    pagina,
    setPagina,
    totalPaginas,
    total,
    indiceInicio,
    indiceFin,
  } = usePaginacion(clientesFiltrados, 10, [busqueda])

  const cargar = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const res = await getClientes()
      setClientes(res.clientes ?? [])
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { cargar() }, [cargar])

  const handleToggle = async (cliente) => {
    setToggling(cliente.id)
    try {
      const res = await toggleCliente(cliente.id)
      onToast({ mensaje: res.message, tipo: 'success' })
      await cargar()
    } catch (err) {
      onToast({ mensaje: err.message, tipo: 'error' })
    } finally {
      setToggling(null)
    }
  }

  const handleGuardado = async () => {
    setModal(null)
    onToast({ mensaje: 'Cliente guardado correctamente.', tipo: 'success' })
    await cargar()
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {pinConfirm && (
        <ConfirmPinModal {...pinConfirm} onClose={() => setPinConfirm(null)} />
      )}

      {modal !== null && (
        <ClienteModal
          cliente={modal === 'nuevo' ? null : modal}
          onClose={() => setModal(null)}
          onGuardado={handleGuardado}
        />
      )}

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-800">Clientes</h2>
          <p className="text-slate-500 text-sm mt-1">
            {clientes.length} cliente{clientes.length !== 1 ? 's' : ''} registrados
          </p>
        </div>
        <button
          onClick={() => setPinConfirm({
            titulo: 'Autorizar creación',
            descripcion: 'Registrar nuevo cliente',
            detalle: 'Se requiere PIN de administrador.',
            textoConfirmar: 'Continuar',
            variante: 'warning',
            onConfirm: () => setModal('nuevo'),
          })}
          className="btn-primary flex items-center gap-2 self-start sm:self-auto"
        >
          <UserPlus size={16} /> Nuevo Cliente
        </button>
      </div>

      <div className="relative max-w-sm">
        <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
        <input
          type="text"
          placeholder="Buscar por cédula, nombre o teléfono…"
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
            <span className="text-sm">Cargando clientes…</span>
          </div>
        ) : clientesFiltrados.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-slate-400">
            <Contact size={36} strokeWidth={1.5} className="mb-2 text-slate-300" />
            <p className="text-sm">
              {busqueda ? 'Sin resultados para esa búsqueda.' : 'No hay clientes registrados.'}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-slate-50 border-b border-slate-100">
                <tr>
                  {['#', 'Cédula', 'Nombre', 'Teléfono', 'Estado', 'Acciones'].map((h) => (
                    <th key={h}
                      className="text-left text-xs font-semibold text-slate-400 uppercase
                                 tracking-wider px-6 py-4 first:pl-6">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {clientesPagina.map((cli, index) => (
                  <tr key={cli.id}
                    className={`transition-colors duration-150 hover:bg-slate-50/70
                                ${cli.estado === 'inactivo' ? 'opacity-60' : ''}`}>
                    <td className="px-6 py-4 text-sm text-slate-400 font-mono">
                      {indiceInicio + index}
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-sm text-slate-600 font-mono">{cli.cedula || '—'}</span>
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-sm font-semibold text-slate-800">{cli.nombre}</span>
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-sm text-slate-600">{cli.telefono || '—'}</span>
                    </td>
                    <td className="px-6 py-4">
                      {cli.estado === 'activo'
                        ? <span className="badge badge-completada gap-1">
                            <CheckCircle2 size={11} /> Activo
                          </span>
                        : <span className="badge badge-cancelada gap-1">
                            <XCircle size={11} /> Inactivo
                          </span>
                      }
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => setPinConfirm({
                            titulo: 'Autorizar edición',
                            descripcion: `Editar "${cli.nombre}"`,
                            detalle: 'Se requiere PIN de administrador.',
                            textoConfirmar: 'Continuar',
                            variante: 'warning',
                            onConfirm: () => setModal(cli),
                          })}
                          className="flex items-center gap-1.5 text-xs font-semibold
                                     text-pink-600 bg-pink-50 hover:bg-pink-100
                                     border border-pink-200 px-3 py-1.5 rounded-lg
                                     transition-all duration-200"
                          title="Editar cliente"
                        >
                          <Pencil size={12} /> Editar
                        </button>

                        <button
                          onClick={() => setPinConfirm({
                            titulo: cli.estado === 'activo' ? 'Desactivar cliente' : 'Activar cliente',
                            descripcion: cli.nombre,
                            detalle: 'Se requiere PIN de administrador.',
                            textoConfirmar: cli.estado === 'activo' ? 'Desactivar' : 'Activar',
                            variante: 'warning',
                            onConfirm: () => handleToggle(cli),
                          })}
                          disabled={toggling === cli.id}
                          className={`flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg
                                      border transition-all duration-200 disabled:opacity-50
                                      ${cli.estado === 'activo'
                                        ? 'text-amber-700 bg-amber-50 hover:bg-amber-100 border-amber-200'
                                        : 'text-slate-700 bg-slate-100 hover:bg-slate-200 border-slate-300'
                                      }`}
                          title={cli.estado === 'activo' ? 'Desactivar' : 'Activar'}
                        >
                          {toggling === cli.id
                            ? <Loader2 size={12} className="animate-spin" />
                            : cli.estado === 'activo'
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
                etiquetaSingular="cliente"
                etiquetaPlural="clientes"
              />
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default Clientes
