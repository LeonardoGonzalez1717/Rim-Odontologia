// =============================================================================
// components/VentasRecientes.jsx
// Tabla de las últimas 10 ventas del día con opción de cancelación
// Props:
//   - ventas        {Array}    Lista de ventas del dashboard
//   - onCancelar    {Function} Callback(id) para cancelar una venta
//   - cancelando    {number|null} ID de la venta que se está cancelando (spinner)
// =============================================================================
import React, { useState } from 'react'
import { Clock, XCircle, CheckCircle2, Loader2, Receipt, FileText } from 'lucide-react'
import ConfirmPinModal from './ConfirmPinModal'
import Paginacion from './Paginacion'
import FiltroFechaVentas from './FiltroFechaVentas'
import { abrirNotaEntrega, fmt as formatCurrency } from '../utils/reportesPrint'

// -----------------------------------------------------------------------------
// VentasRecientes — Componente principal
// -----------------------------------------------------------------------------
const VentasRecientes = ({
  ventas = [],
  onCancelar,
  cancelando,
  soloLectura = false,
  titulo = 'Ventas Recientes del Día',
  mensajeVacio = 'No hay ventas registradas',
  mostrarFecha = false,
  paginacion = null,
  onPaginaChange,
  loadingPagina = false,
  fechaFiltro,
  onFechaChange,
  ocultarFiltro = false,
}) => {
  // ID de la venta para la cual se muestra el diálogo de confirmación
  const [confirmandoId, setConfirmandoId] = useState(null)

  // La venta que se está por confirmar (para el diálogo)
  const ventaAConfirmar = ventas.find((v) => v.id === confirmandoId)

  /**
   * El usuario presiona el botón "Cancelar Venta" → mostrar diálogo
   */
  const handleSolicitarCancelacion = (id) => {
    setConfirmandoId(id)
  }

  /**
   * El usuario confirma la cancelación → llamar al callback del padre
   */
  const handleConfirmarCancelacion = async () => {
    await onCancelar(confirmandoId)
  }

  return (
    <>
      {confirmandoId && ventaAConfirmar && (
        <ConfirmPinModal
          titulo="¿Cancelar esta venta?"
          descripcion={`${ventaAConfirmar.servicio} · ${ventaAConfirmar.doctor}`}
          detalle="Esta acción no se puede deshacer."
          textoConfirmar="Sí, cancelar"
          variante="danger"
          onConfirm={handleConfirmarCancelacion}
          onClose={() => setConfirmandoId(null)}
        />
      )}

      <div className="card animate-slide-up">
        {/* Encabezado */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-5">
          <div className="flex items-center gap-2">
            <Receipt size={18} className="text-pink-600" />
            <h2 className="font-bold text-slate-700 text-base">{titulo}</h2>
          </div>
          <div className="flex flex-col sm:flex-row sm:items-center gap-3">
            {fechaFiltro && onFechaChange && !ocultarFiltro && (
              <FiltroFechaVentas fecha={fechaFiltro} onChange={onFechaChange} />
            )}
            <span className="text-xs text-slate-400 bg-slate-100 px-2 py-1 rounded-full font-medium self-start sm:self-auto">
              {paginacion?.total ?? ventas.length}{' '}
              {(paginacion?.total ?? ventas.length) === 1 ? 'venta' : 'ventas'}
            </span>
          </div>
        </div>

        {/* Estado vacío */}
        {ventas.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-10 text-slate-400">
            <Receipt size={36} strokeWidth={1.5} className="mb-2 text-slate-300" />
            <p className="text-sm">{mensajeVacio}</p>
          </div>
        ) : (
          /* Tabla responsiva con scroll horizontal en móvil */
          <div className="overflow-x-auto -mx-6 px-6">
            <table className="w-full min-w-[600px]">
              <thead>
                <tr className="border-b border-slate-100">
                  {mostrarFecha && (
                    <th className="text-left text-xs font-semibold text-slate-400 uppercase tracking-wider pb-3">
                      Fecha
                    </th>
                  )}
                  <th className="text-left text-xs font-semibold text-slate-400 uppercase tracking-wider pb-3">
                    Hora
                  </th>
                  <th className="text-left text-xs font-semibold text-slate-400 uppercase tracking-wider pb-3">
                    Doctor
                  </th>
                  <th className="text-left text-xs font-semibold text-slate-400 uppercase tracking-wider pb-3">
                    Servicio
                  </th>
                  <th className="text-right text-xs font-semibold text-slate-400 uppercase tracking-wider pb-3">
                    Monto
                  </th>
                  <th className="text-center text-xs font-semibold text-slate-400 uppercase tracking-wider pb-3">
                    Estado
                  </th>
                  {!soloLectura && (
                    <th className="text-right text-xs font-semibold text-slate-400 uppercase tracking-wider pb-3">
                      Acción
                    </th>
                  )}
                  {soloLectura && (
                    <th className="text-right text-xs font-semibold text-slate-400 uppercase tracking-wider pb-3">
                      Nota
                    </th>
                  )}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {ventas.map((venta) => {
                  const estaCancelando = cancelando === venta.id
                  const esCancelada   = venta.estado === 'cancelada'

                  return (
                    <tr
                      key={venta.id}
                      className={`transition-colors duration-150 ${
                        esCancelada ? 'opacity-60' : 'hover:bg-slate-50/70'
                      }`}
                    >
                      {mostrarFecha && (
                        <td className="py-3.5 pr-4">
                          <span className="text-sm text-slate-600 whitespace-nowrap">
                            {new Date(`${venta.fecha}T12:00:00`).toLocaleDateString('es-MX', {
                              day: '2-digit', month: 'short', year: 'numeric',
                            })}
                          </span>
                        </td>
                      )}
                      {/* Hora */}
                      <td className="py-3.5 pr-4">
                        <div className="flex items-center gap-1.5 text-slate-500">
                          <Clock size={13} className="flex-shrink-0" />
                          <span className="text-sm font-medium">{venta.hora}</span>
                        </div>
                      </td>

                      {/* Doctor */}
                      <td className="py-3.5 pr-4">
                        <span className="text-sm font-semibold text-slate-700">
                          {venta.doctor}
                        </span>
                      </td>

                      {/* Servicio(s) */}
                      <td className="py-3.5 pr-4">
                        {venta.servicios?.length > 1 ? (
                          <ul className="text-sm text-slate-600 leading-tight space-y-0.5">
                            {venta.servicios.map((s) => (
                              <li key={s.id}>{s.nombre}</li>
                            ))}
                          </ul>
                        ) : (
                          <span className="text-sm text-slate-600 leading-tight">
                            {venta.servicio}
                          </span>
                        )}
                      </td>

                      {/* Monto */}
                      <td className="py-3.5 pr-4 text-right">
                        <span className={`text-sm font-bold ${esCancelada ? 'line-through text-slate-400' : 'text-slate-800'}`}>
                          {formatCurrency(venta.total)}
                        </span>
                      </td>

                      {/* Estado badge */}
                      <td className="py-3.5 pr-4 text-center">
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

                      {/* Acción: nota y opcionalmente cancelar */}
                      <td className="py-3.5 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => abrirNotaEntrega(venta)}
                            className="flex items-center gap-1 text-xs font-semibold
                                       text-pink-600 bg-pink-50 hover:bg-pink-100
                                       border border-pink-200 px-2.5 py-1.5 rounded-lg
                                       transition-all duration-200"
                            title="Ver Nota de Entrega"
                          >
                            <FileText size={13} />
                            Nota
                          </button>

                          {!soloLectura && (
                            estaCancelando ? (
                              <Loader2 size={16} className="text-pink-500 animate-spin" />
                            ) : (
                              <button
                                onClick={() => handleSolicitarCancelacion(venta.id)}
                                disabled={esCancelada || !!cancelando}
                                className="btn-danger"
                                title={esCancelada ? 'Venta ya cancelada' : 'Cancelar esta venta'}
                                aria-label={`Cancelar venta ${venta.id}`}
                              >
                                <XCircle size={13} className="inline mr-1" />
                                Cancelar
                              </button>
                            )
                          )}
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}

        {paginacion && onPaginaChange && (
          <Paginacion
            pagina={paginacion.pagina}
            totalPaginas={paginacion.total_paginas}
            total={paginacion.total}
            onPaginaChange={onPaginaChange}
            loading={loadingPagina}
          />
        )}
      </div>
    </>
  )
}

export default VentasRecientes
