// =============================================================================
// components/VentasDoctorModal.jsx — Ventas de un doctor en el día seleccionado
// =============================================================================
import React, { useEffect, useState, useCallback } from 'react'
import {
  X, Loader2, Clock, Stethoscope,
  CheckCircle2, XCircle, User,
} from 'lucide-react'
import { getVentas } from '../api/api'
import Paginacion from './Paginacion'
import { usePaginacion } from '../hooks/usePaginacion'
import { fmt } from '../utils/reportesPrint'
import { formatearFechaLarga } from '../utils/fechas'

const VentasDoctorModal = ({ doctor, fecha, onClose }) => {
  const [ventas, setVentas] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const cargar = useCallback(async () => {
    if (!doctor || !fecha) return
    setLoading(true)
    setError('')
    try {
      const res = await getVentas({ fecha, pagina: 1, por_pagina: 50 })
      const delDoctor = (res.ventas ?? []).filter((v) => v.doctor === doctor.doctor)
      setVentas(delDoctor)
    } catch (err) {
      setError(err.message || 'No se pudieron cargar las ventas del doctor.')
    } finally {
      setLoading(false)
    }
  }, [doctor, fecha])

  useEffect(() => {
    cargar()
  }, [cargar])

  useEffect(() => {
    const fn = (e) => { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', fn)
    return () => document.removeEventListener('keydown', fn)
  }, [onClose])

  const completadas = ventas.filter((v) => v.estado === 'completada')
  const totalEnCaja = completadas.reduce((sum, v) => sum + (v.monto_caja ?? v.total), 0)

  const {
    itemsPaginados: ventasPagina,
    pagina,
    setPagina,
    totalPaginas,
    total,
    indiceInicio,
    indiceFin,
  } = usePaginacion(ventas, 10, [ventas.length])

  if (!doctor) return null

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4
                 bg-slate-900/50 backdrop-blur-sm animate-fade-in"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-2xl max-h-[90vh]
                      flex flex-col animate-scale-in">
        <div className="flex items-center justify-between px-7 pt-6 pb-4 border-b border-slate-100 flex-shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-2xl bg-pink-50 text-pink-600
                            flex items-center justify-center flex-shrink-0">
              <User size={20} />
            </div>
            <div className="min-w-0">
              <h2 className="text-xl font-bold text-slate-800 truncate">{doctor.doctor}</h2>
              <p className="text-sm text-slate-500 mt-0.5 truncate">
                {doctor.especialidad ? `${doctor.especialidad} · ` : ''}
                {formatearFechaLarga(fecha)}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200
                       flex items-center justify-center text-slate-500 hover:text-slate-700
                       transition-all duration-200 flex-shrink-0"
            aria-label="Cerrar"
          >
            <X size={16} />
          </button>
        </div>

        <div className="px-7 py-5 border-b border-slate-100 flex-shrink-0">
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            <div className="bg-slate-50 rounded-xl px-4 py-3 border border-slate-100">
              <p className="text-xs text-slate-400 font-medium">Ventas</p>
              <p className="text-lg font-bold text-slate-800">{ventas.length}</p>
            </div>
            <div className="bg-slate-50 rounded-xl px-4 py-3 border border-slate-100">
              <p className="text-xs text-slate-400 font-medium">Tratamientos</p>
              <p className="text-lg font-bold text-slate-800">{doctor.cantidad}</p>
            </div>
            <div className="bg-pink-50 rounded-xl px-4 py-3 border border-pink-100 col-span-2 sm:col-span-1">
              <p className="text-xs text-pink-600 font-medium">Total en caja</p>
              <p className="text-lg font-bold text-pink-700">{fmt(totalEnCaja)}</p>
            </div>
          </div>
        </div>

        <div className="px-7 py-6 overflow-y-auto flex-1 min-h-0">
          {loading ? (
            <div className="flex items-center justify-center py-16 gap-2 text-pink-500">
              <Loader2 size={20} className="animate-spin" />
              <span className="text-sm">Cargando ventas…</span>
            </div>
          ) : error ? (
            <div className="flex flex-col items-center justify-center py-12 text-red-600 text-sm gap-3">
              <p>{error}</p>
              <button type="button" onClick={cargar} className="btn-secondary text-sm">
                Reintentar
              </button>
            </div>
          ) : ventas.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-slate-400">
              <Stethoscope size={36} strokeWidth={1.5} className="mb-2 text-slate-300" />
              <p className="text-sm">No hay ventas registradas para este doctor en esta fecha.</p>
            </div>
          ) : (
            <>
              <div className="overflow-x-auto -mx-1">
                <table className="w-full min-w-[520px]">
                  <thead>
                    <tr className="border-b border-slate-100">
                      {['Hora', 'Cliente', 'Tratamiento', 'Monto', 'Estado'].map((h) => (
                        <th
                          key={h}
                          className="text-left text-xs font-semibold text-slate-400 uppercase
                                     tracking-wider pb-3 pr-3"
                        >
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {ventasPagina.map((venta) => {
                      const esCancelada = venta.estado === 'cancelada'
                      return (
                        <tr
                          key={venta.id}
                          className={esCancelada ? 'opacity-60' : 'hover:bg-slate-50/70'}
                        >
                          <td className="py-3.5 pr-3">
                            <div className="flex items-center gap-1.5 text-slate-500">
                              <Clock size={13} />
                              <span className="text-sm font-medium">{venta.hora}</span>
                            </div>
                          </td>
                          <td className="py-3.5 pr-3">
                            <span className="text-sm text-slate-700">{venta.cliente || '—'}</span>
                          </td>
                          <td className="py-3.5 pr-3">
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
                          <td className="py-3.5 pr-3">
                            <span className={`text-sm font-bold ${esCancelada ? 'line-through text-slate-400' : 'text-slate-800'}`}>
                              {fmt(venta.monto_caja ?? venta.total)}
                            </span>
                          </td>
                          <td className="py-3.5">
                            {esCancelada ? (
                              <span className="badge badge-cancelada gap-1">
                                <XCircle size={11} /> Cancelada
                              </span>
                            ) : (
                              <span className="badge badge-completada gap-1">
                                <CheckCircle2 size={11} /> Completada
                              </span>
                            )}
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
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
            </>
          )}
        </div>

        <div className="flex-shrink-0 px-7 py-4 border-t border-slate-100">
          <button type="button" onClick={onClose} className="btn-secondary w-full">
            Cerrar
          </button>
        </div>
      </div>
    </div>
  )
}

export default VentasDoctorModal
