import React from 'react'
import { DollarSign, Activity, RefreshCw, TrendingUp, FileBarChart2, Users } from 'lucide-react'
import MetricCard from './MetricCard'
import VentasPorDoctor from './VentasPorDoctor'
import VentasRecientes from './VentasRecientes'
import CuotasCashea from './CuotasCashea'
import FiltroFechaVentas from './FiltroFechaVentas'
import { abrirReporteDiario } from '../utils/reportesPrint'
import { getVentas } from '../api/api'
import { esHoy, formatearFechaCorta } from '../utils/fechas'

/**
 * Formatea un número como moneda USD.
 */
const formatCurrency = (value) =>
  new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'USD' }).format(value ?? 0)

// -----------------------------------------------------------------------------
// Skeleton de carga — Placeholder mientras se obtienen los datos
// -----------------------------------------------------------------------------
const Skeleton = ({ className = '' }) => (
  <div className={`bg-slate-200 rounded-xl animate-pulse ${className}`} />
)

const DashboardSkeleton = () => (
  <div className="space-y-6">
    {/* Métricas skeleton */}
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
      {[1, 2, 3].map((i) => (
        <div key={i} className="card">
          <Skeleton className="h-4 w-28 mb-3" />
          <Skeleton className="h-8 w-40 mb-2" />
          <Skeleton className="h-3 w-20" />
        </div>
      ))}
    </div>
    {/* Fila inferior skeleton */}
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
      <div className="card"><Skeleton className="h-40" /></div>
      <div className="card lg:col-span-2"><Skeleton className="h-40" /></div>
    </div>
  </div>
)

// -----------------------------------------------------------------------------
// Dashboard — Componente principal
// -----------------------------------------------------------------------------
const Dashboard = ({
  datos,
  loading,
  ventas = [],
  paginacionVentas = null,
  onPaginaVentasChange,
  loadingVentas = false,
  onCancelar,
  cancelando,
  fechaVentas,
  onFechaVentasChange,
  tituloVentas,
  mensajeVacioVentas,
  // ── Filtro por asistente ──
  asistentes = [],
  asistenteSeleccionado = null,
  onAsistenteChange,
}) => {
  // Mientras carga, mostrar skeleton
  if (loading && !datos) {
    return <DashboardSkeleton />
  }

  // Si hay un error o no hay datos
  if (!datos) {
    return (
      <div className="card flex flex-col items-center justify-center py-16 text-slate-400">
        <TrendingUp size={40} strokeWidth={1.5} className="mb-3 text-slate-300" />
        <p className="text-sm">No se pudieron cargar los datos del dashboard.</p>
      </div>
    )
  }

  const ingresosVentas = datos.ingresos_ventas ?? datos.ingresos_dia ?? 0
  const ingresosCashea = datos.ingresos_cuotas_cashea ?? 0
  const subtituloIngresos = ingresosCashea > 0
    ? `${formatCurrency(ingresosVentas)} ventas · ${formatCurrency(ingresosCashea)} Cashea`
    : esHoy(fechaVentas)
      ? 'Monto en caja · ventas completadas'
      : formatearFechaCorta(fechaVentas)

  return (
    <div className="space-y-6">
      {/* ── Filtro de fecha (métricas + ventas) ── */}
      <div className="card p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <p className="text-sm font-semibold text-slate-700">Consultar por fecha</p>
          <p className="text-xs text-slate-400 mt-0.5">
            Métricas, desglose por doctor y ventas del día seleccionado
          </p>
        </div>
        <FiltroFechaVentas fecha={fechaVentas} onChange={onFechaVentasChange} />
      </div>

      {/* ── Fila de botones adicionales: Filtros (Izquierda) + Reporte Diario (Derecha) ── */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        {/* Filtros por asistente */}
        {asistentes.length > 0 ? (
          <div className="flex flex-col gap-1.5">
            <div className="flex flex-wrap items-center gap-2">
              {/* Botón "Todos" */}
              <button
                onClick={() => onAsistenteChange?.(null)}
                className={`inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg
                            border transition-all duration-200
                            ${
                              asistenteSeleccionado === null
                                ? 'bg-slate-700 text-white border-slate-700 shadow-sm'
                                : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                            }`}
              >
                Todos
              </button>

              {/* Un botón por cada asistente */}
              {asistentes.map((a) => (
                <button
                  key={a.id}
                  onClick={() => onAsistenteChange?.(a.id)}
                  title={`Ver ventas registradas por ${a.nombre}`}
                  className={`inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg
                              border transition-all duration-200
                              ${
                                asistenteSeleccionado === a.id
                                  ? 'bg-pink-600 text-white border-pink-600 shadow-sm'
                                  : 'bg-white text-slate-600 border-slate-200 hover:bg-pink-50 hover:border-pink-300 hover:text-pink-700'
                              }`}
                >
                  {a.nombre}
                </button>
              ))}
            </div>
            <p className="text-[11px] font-medium text-slate-400 italic">
              * Al seleccionar un asistente cambiarán las estadísticas totales, tratamientos y desglose por doctor.
            </p>
          </div>
        ) : (
          <div></div>
        )}

        {/* Botón: Generar Reporte Diario */}
        <div className="flex-shrink-0 lg:self-start">
          <button
            onClick={async () => {
              try {
                const res = await getVentas({
                  fecha: fechaVentas,
                  pagina: 1,
                  por_pagina: 50,
                })
                abrirReporteDiario({ ...datos, ventas_recientes: res.ventas ?? [] })
              } catch {
                abrirReporteDiario(datos)
              }
            }}
            className="flex items-center gap-2 text-xs font-semibold
                       text-pink-600 bg-pink-50 hover:bg-pink-100
                       border border-pink-200 px-4 py-2.5 rounded-xl
                       transition-all duration-200 shadow-sm"
            title="Generar reporte del día seleccionado"
          >
            <FileBarChart2 size={15} />
            {esHoy(fechaVentas)
              ? 'Generar Reporte del Día'
              : `Reporte del ${formatearFechaCorta(fechaVentas)}`}
          </button>
        </div>
      </div>

      {/* ── Fila 1: Métricas principales ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-2 gap-5">
        {/* Ingresos del día */}
        <MetricCard
          title={esHoy(fechaVentas) ? 'Ingresos del Día' : 'Ingresos del Día Seleccionado'}
          value={formatCurrency(datos.ingresos_dia)}
          icon={DollarSign}
          color="pink"
          subtitle={subtituloIngresos}
        />

        {/* Tratamientos del día */}
        <MetricCard
          title={esHoy(fechaVentas) ? 'Tratamientos Hoy' : 'Tratamientos del Día'}
          value={datos.total_tratamientos ?? 0}
          icon={Activity}
          color="slate"
          subtitle="Procedimientos completados"
        />

        {/* Promedio por tratamiento
        <MetricCard
          title="Promedio por Tratamiento"
          value={
            datos.total_tratamientos > 0
              ? formatCurrency(datos.ingresos_dia / datos.total_tratamientos)
              : '$0.00'
          }
          icon={TrendingUp}
          color="rose"
          subtitle={esHoy(fechaVentas) ? 'Ingreso promedio del día' : formatearFechaCorta(fechaVentas)}
        /> */}
      </div>

      {/* ── Fila 2: Ventas por Doctor + Ventas Recientes + Cuotas Cashea ── */}
      <div className="grid grid-cols-1 gap-5">
        <div>
          <VentasPorDoctor
            datos={datos.ventas_por_doctor ?? []}
            fecha={fechaVentas}
            asistentes={asistentes}
            asistenteSeleccionado={asistenteSeleccionado}
          />
        </div>

        <div>
          <VentasRecientes
            ventas={ventas}
            paginacion={paginacionVentas}
            onPaginaChange={onPaginaVentasChange}
            loadingPagina={loadingVentas}
            onCancelar={onCancelar}
            cancelando={cancelando}
            ocultarFiltro
            titulo={tituloVentas}
            mensajeVacio={mensajeVacioVentas}
            asistentes={asistentes}
            asistenteSeleccionado={asistenteSeleccionado}
            onAsistenteChange={onAsistenteChange}
          />
        </div>

        <div>
          <CuotasCashea
            datos={datos.cuotas_cashea ?? []}
            total={ingresosCashea}
          />
        </div>
      </div>

      {/* Indicador de actualización en curso */}
      {/* {loading && datos && (
            <div className="flex items-center justify-center gap-2 text-slate-400 text-sm py-2">
              <RefreshCw size={14} className="animate-spin" />
              Actualizando datos...
            </div>
          )} */}
    </div>
  )
}

export default Dashboard
