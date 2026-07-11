// =============================================================================
// pages/NotaEntrega.jsx
// Página de Notas de Entrega: lista ventas del día y permite generar
// una nota de entrega imprimible en ventana separada para cada venta.
// =============================================================================
import React, { useState, useEffect, useCallback } from 'react'
import {
  FileText, Loader2, Printer, Search, X, Clock,
  CheckCircle2, XCircle, ExternalLink, Stethoscope,
} from 'lucide-react'
import { getDashboard } from '../api/api'
import Paginacion from '../components/Paginacion'
import { usePaginacion } from '../hooks/usePaginacion'
import { abrirNotaEntrega, fmt } from '../utils/reportesPrint'

// ─────────────────────────────────────────────────────────────────────────────
// Página principal de Notas de Entrega
// ─────────────────────────────────────────────────────────────────────────────
const NotaEntrega = ({ onToast }) => {
  const [ventas,   setVentas]   = useState([])
  const [loading,  setLoading]  = useState(true)
  const [error,    setError]    = useState('')
  const [busqueda, setBusqueda] = useState('')

  const cargar = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const res = await getDashboard()
      setVentas(res.ventas_recientes ?? [])
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { cargar() }, [cargar])

  // Filtro por búsqueda
  const ventasFiltradas = ventas.filter((v) => {
    const textoServicios = v.servicios?.length
      ? v.servicios.map((s) => s.nombre).join(' ')
      : v.servicio
    const q = busqueda.toLowerCase()
    return (
      v.doctor.toLowerCase().includes(q) ||
      textoServicios.toLowerCase().includes(q) ||
      String(v.id).includes(busqueda)
    )
  })

  const {
    itemsPaginados: ventasPagina,
    pagina,
    setPagina,
    totalPaginas,
    total,
    indiceInicio,
    indiceFin,
  } = usePaginacion(ventasFiltradas, 10, [busqueda])

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Encabezado */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-800">Notas de Entrega</h2>
          <p className="text-slate-500 text-sm mt-1">
            Selecciona una venta para generar su nota de entrega en ventana aparte
          </p>
        </div>
      </div>

      {/* Buscador */}
      <div className="relative max-w-sm">
        <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
        <input
          type="text"
          placeholder="Buscar por doctor, servicio o ID…"
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
            <span className="text-sm">Cargando ventas del día…</span>
          </div>
        ) : ventasFiltradas.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-slate-400">
            <FileText size={36} strokeWidth={1.5} className="mb-2 text-slate-300" />
            <p className="text-sm">
              {busqueda ? 'Sin resultados para esa búsqueda.' : 'No hay ventas registradas hoy.'}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-slate-50 border-b border-slate-100">
                <tr>
                  {['#', 'Hora', 'Doctor', 'Servicio', 'Monto', 'Estado', 'Nota'].map((h) => (
                    <th key={h}
                      className="text-left text-xs font-semibold text-slate-400 uppercase
                                 tracking-wider px-6 py-4">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {ventasPagina.map((venta) => (
                  <tr key={venta.id}
                    className={`transition-colors duration-150 hover:bg-slate-50/70
                                ${venta.estado === 'cancelada' ? 'opacity-60' : ''}`}>
                    <td className="px-6 py-4 text-sm text-slate-400 font-mono">
                      #{venta.id}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-1.5 text-slate-500">
                        <Clock size={13} />
                        <span className="text-sm font-medium">{venta.hora}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-sm font-semibold text-slate-800">{venta.doctor}</span>
                    </td>
                    <td className="px-6 py-4">
                      {venta.servicios?.length > 1 ? (
                        <ul className="text-sm text-slate-600 space-y-0.5">
                          {venta.servicios.map((s) => (
                            <li key={s.id}>{s.nombre}</li>
                          ))}
                        </ul>
                      ) : (
                        <span className="text-sm text-slate-600">{venta.servicio}</span>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-sm font-bold text-pink-700 bg-pink-50
                                       px-2.5 py-1 rounded-lg border border-pink-100">
                        {fmt(venta.total)}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      {venta.estado === 'completada'
                        ? <span className="badge badge-completada gap-1">
                            <CheckCircle2 size={11} /> Completada
                          </span>
                        : <span className="badge badge-cancelada gap-1">
                            <XCircle size={11} /> Cancelada
                          </span>
                      }
                    </td>
                    <td className="px-6 py-4">
                      <button
                        onClick={() => abrirNotaEntrega(venta)}
                        className="flex items-center gap-1.5 text-xs font-semibold
                                   text-pink-600 bg-pink-50 hover:bg-pink-100
                                   border border-pink-200 px-3 py-1.5 rounded-lg
                                   transition-all duration-200"
                        title="Generar nota de entrega"
                      >
                        <ExternalLink size={12} /> Generar Nota
                      </button>
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
                etiquetaSingular="venta"
                etiquetaPlural="ventas"
              />
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default NotaEntrega
