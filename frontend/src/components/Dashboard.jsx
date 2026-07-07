import React from 'react'
import { DollarSign, Activity, RefreshCw, TrendingUp, FileBarChart2 } from 'lucide-react'
import MetricCard from './MetricCard'
import VentasPorDoctor from './VentasPorDoctor'
import VentasRecientes from './VentasRecientes'
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

      {/* ── Fila de botones adicionales (Reporte Diario) ── */}
      <div className="flex justify-end">
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
      {/* ── Fila 1: Métricas principales ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-2 gap-5">
        {/* Ingresos del día */}
        <MetricCard
          title={esHoy(fechaVentas) ? 'Ingresos del Día' : 'Ingresos del Día Seleccionado'}
          value={formatCurrency(datos.ingresos_dia)}
          icon={DollarSign}
          color="pink"
          subtitle={esHoy(fechaVentas) ? 'Solo ventas completadas' : formatearFechaCorta(fechaVentas)}
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

      {/* ── Fila 2: Ventas por Doctor + Ventas Recientes (Uno debajo del otro) ── */}
      <div className="grid grid-cols-1 gap-5">
        {/* Ventas por Doctor */}
        <div>
          <VentasPorDoctor datos={datos.ventas_por_doctor ?? []} />
        </div>

        {/* Ventas Recientes */}
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
