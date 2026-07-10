// =============================================================================
// components/NotaEntregaModal.jsx
// Modal tras registrar una venta: imprimir o descargar la nota de entrega.
// =============================================================================
import React, { useEffect, useState } from 'react'
import { X, Printer, Download, CheckCircle2, FileText, Loader2 } from 'lucide-react'
import { abrirNotaEntrega, descargarNotaEntrega, fmt } from '../utils/reportesPrint'

const NotaEntregaModal = ({ venta, onClose }) => {
  const [descargando, setDescargando] = useState(false)
  const [errorDescarga, setErrorDescarga] = useState('')

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [onClose])

  if (!venta) return null

  const handleDescargar = async () => {
    setErrorDescarga('')
    setDescargando(true)
    try {
      await descargarNotaEntrega(venta)
    } catch (err) {
      setErrorDescarga(err.message || 'No se pudo descargar la nota de entrega.')
    } finally {
      setDescargando(false)
    }
  }

  const lineas = venta.servicios?.length
    ? venta.servicios
    : [{ nombre: venta.servicio, precio: venta.total }]

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4
                 bg-slate-900/50 backdrop-blur-sm animate-fade-in"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md animate-scale-in">
        <div className="flex items-center justify-between px-7 pt-6 pb-4 border-b border-slate-100">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-pink-50 text-pink-600
                            flex items-center justify-center">
              <FileText size={20} />
            </div>
            <div>
              <h2 className="text-xl font-bold text-slate-800">Nota de Entrega</h2>
              <p className="text-sm text-slate-500 mt-0.5">Venta #{venta.id} registrada</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200
                       flex items-center justify-center text-slate-500 hover:text-slate-700
                       transition-all duration-200"
            aria-label="Cerrar"
          >
            <X size={16} />
          </button>
        </div>

        <div className="px-7 py-6 space-y-5">
          <div className="flex items-center gap-3 bg-pink-50 border border-pink-200
                          text-pink-700 rounded-xl p-4">
            <CheckCircle2 size={20} className="flex-shrink-0" />
            <span className="font-semibold text-sm">¡Venta registrada con éxito!</span>
          </div>

          <div className="bg-slate-50 border border-slate-100 rounded-xl p-4 space-y-2">
            <p className="text-sm text-slate-600">
              <span className="font-semibold text-slate-700">Cliente:</span>{' '}
              {venta.cliente || '—'}
            </p>
            <p className="text-sm text-slate-600">
              <span className="font-semibold text-slate-700">Doctor:</span>{' '}
              {venta.doctor}
            </p>
            <ul className="text-sm text-slate-600 space-y-1 pt-1">
              {lineas.map((linea, i) => (
                <li key={`${linea.nombre}-${i}`} className="flex justify-between gap-3">
                  <span>{linea.nombre}</span>
                  <span className="font-medium text-slate-800 whitespace-nowrap">
                    {fmt(linea.precio)}
                  </span>
                </li>
              ))}
            </ul>
            <p className="text-sm font-bold text-pink-700 pt-2 border-t border-slate-200">
              Total: {fmt(venta.total)}
            </p>
          </div>

          <p className="text-sm text-slate-500 text-center">
            ¿Deseas generar la nota de entrega para el paciente?
          </p>

          {errorDescarga && (
            <p className="text-sm text-red-600 text-center">{errorDescarga}</p>
          )}
        </div>

        <div className="px-7 py-4 border-t border-slate-100 flex flex-col sm:flex-row gap-3">
          <button type="button" onClick={onClose} className="btn-secondary flex-1 order-3 sm:order-1">
            Cerrar
          </button>
          <button
            type="button"
            onClick={handleDescargar}
            disabled={descargando}
            className="btn-secondary flex-1 flex items-center justify-center gap-2 order-2"
          >
            {descargando ? (
              <>
                <Loader2 size={16} className="animate-spin" />
                Generando…
              </>
            ) : (
              <>
                <Download size={16} />
                Descargar
              </>
            )}
          </button>
          <button
            type="button"
            onClick={() => abrirNotaEntrega(venta)}
            className="btn-primary flex-1 flex items-center justify-center gap-2 order-1 sm:order-3"
          >
            <Printer size={16} />
            Imprimir
          </button>
        </div>
      </div>
    </div>
  )
}

export default NotaEntregaModal
