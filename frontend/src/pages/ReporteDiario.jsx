// =============================================================================
// pages/ReporteDiario.jsx
// Página de Reporte Diario: muestra un resumen del día y permite
// generar un reporte completo imprimible en una ventana separada.
// =============================================================================
import React, { useState, useEffect, useCallback } from 'react'
import {
  FileBarChart2, Loader2, Printer, ExternalLink, XCircle,
  DollarSign, Activity, TrendingUp, Users,
} from 'lucide-react'
import { getDashboard } from '../api/api'
import Paginacion from '../components/Paginacion'
import { usePaginacion } from '../hooks/usePaginacion'
import { abrirReporteDiario, fmt } from '../utils/reportesPrint'

// ─────────────────────────────────────────────────────────────────────────────
// Página principal del Reporte Diario
// ─────────────────────────────────────────────────────────────────────────────
const ReporteDiario = ({ onToast }) => {
  const [datos,   setDatos]   = useState(null)
  const [loading, setLoading] = useState(true)
  const [error,   setError]   = useState('')

  const cargar = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const res = await getDashboard()
      setDatos(res)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { cargar() }, [cargar])

  const ventasCompletadas = (datos?.ventas_recientes ?? []).filter(v => v.estado === 'completada')
  const ventasCanceladas = (datos?.ventas_recientes ?? []).filter(v => v.estado === 'cancelada')
  const ventasPorDoctor = datos?.ventas_por_doctor ?? []

  const {
    itemsPaginados: doctoresPagina,
    pagina,
    setPagina,
    totalPaginas,
    total,
    indiceInicio,
    indiceFin,
  } = usePaginacion(ventasPorDoctor, 10)

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Encabezado */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-800">Reporte Diario</h2>
          <p className="text-slate-500 text-sm mt-1">
            Resumen completo de las ventas del día — genera el reporte en ventana aparte
          </p>
        </div>
        {datos && (
          <button
            onClick={() => abrirReporteDiario(datos)}
            className="btn-primary flex items-center gap-2 self-start sm:self-auto"
          >
            <ExternalLink size={16} /> Generar Reporte
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

      {/* Loading */}
      {loading ? (
        <div className="card flex items-center justify-center py-16 gap-2 text-slate-400">
          <Loader2 size={20} className="animate-spin" />
          <span className="text-sm">Cargando datos del día…</span>
        </div>
      ) : datos ? (
        <>
          {/* Métricas rápidas */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="card flex items-center gap-4">
              <div className="w-11 h-11 bg-pink-50 rounded-xl flex items-center justify-center text-pink-600">
                <DollarSign size={20} />
              </div>
              <div>
                <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Ingresos</p>
                <p className="text-xl font-bold text-slate-800">{fmt(datos.ingresos_dia)}</p>
              </div>
            </div>

            <div className="card flex items-center gap-4">
              <div className="w-11 h-11 bg-slate-100 rounded-xl flex items-center justify-center text-slate-600">
                <Activity size={20} />
              </div>
              <div>
                <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Tratamientos</p>
                <p className="text-xl font-bold text-slate-800">{datos.total_tratamientos}</p>
              </div>
            </div>

            <div className="card flex items-center gap-4">
              <div className="w-11 h-11 bg-pink-50 rounded-xl flex items-center justify-center text-pink-600">
                <TrendingUp size={20} />
              </div>
              <div>
                <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Promedio</p>
                <p className="text-xl font-bold text-slate-800">
                  {datos.total_tratamientos > 0
                    ? fmt(datos.ingresos_dia / datos.total_tratamientos)
                    : '$0.00'}
                </p>
              </div>
            </div>

            <div className="card flex items-center gap-4">
              <div className="w-11 h-11 bg-amber-50 rounded-xl flex items-center justify-center text-amber-600">
                <Users size={20} />
              </div>
              <div>
                <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Doctores</p>
                <p className="text-xl font-bold text-slate-800">{ventasPorDoctor.length}</p>
              </div>
            </div>
          </div>

          {/* Resumen de ventas por doctor */}
          <div className="card p-0 overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center gap-2">
              <Users size={16} className="text-pink-600" />
              <h3 className="text-sm font-bold text-slate-700">Ventas por Doctor</h3>
            </div>
            {(ventasPorDoctor).length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-slate-400">
                <Users size={32} strokeWidth={1.5} className="mb-2 text-slate-300" />
                <p className="text-sm">Sin datos de ventas por doctor</p>
              </div>
            ) : (
              <>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-slate-50 border-b border-slate-100">
                      <tr>
                        {['Doctor', 'Especialidad', 'Cantidad', 'Total'].map((h) => (
                          <th key={h}
                            className="text-left text-xs font-semibold text-slate-400 uppercase
                                       tracking-wider px-6 py-3">
                            {h}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50">
                      {(doctoresPagina).map((d, i) => (
                        <tr key={indiceInicio + i} className="hover:bg-slate-50/70 transition-colors">
                          <td className="px-6 py-3 text-sm font-semibold text-slate-800">{d.doctor}</td>
                          <td className="px-6 py-3 text-sm text-slate-500">{d.especialidad}</td>
                          <td className="px-6 py-3 text-sm text-slate-600">{d.cantidad}</td>
                          <td className="px-6 py-3">
                            <span className="text-sm font-bold text-pink-700 bg-pink-50
                                             px-2.5 py-1 rounded-lg border border-pink-100">
                              {fmt(d.total)}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <div className="px-6 pb-4">
                  <Paginacion
                    pagina={pagina}
                    totalPaginas={totalPaginas}
                    total={total}
                    onPaginaChange={setPagina}
                    indiceInicio={indiceInicio}
                    indiceFin={indiceFin}
                    etiquetaSingular="doctor"
                    etiquetaPlural="doctores"
                  />
                </div>
              </>
            )}
          </div>

          {/* Resumen rápido */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="card text-center">
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">
                Ventas Completadas
              </p>
              <p className="text-3xl font-bold text-slate-600">{ventasCompletadas.length}</p>
            </div>
            <div className="card text-center">
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">
                Ventas Canceladas
              </p>
              <p className="text-3xl font-bold text-red-500">{ventasCanceladas.length}</p>
            </div>
            <div className="card text-center bg-gradient-to-br from-pink-50 to-pink-100 border-pink-200">
              <p className="text-xs font-semibold text-pink-500 uppercase tracking-wider mb-1">
                Total Neto del Día
              </p>
              <p className="text-3xl font-bold text-pink-700">{fmt(datos.ingresos_dia)}</p>
            </div>
          </div>
        </>
      ) : null}
    </div>
  )
}

export default ReporteDiario
