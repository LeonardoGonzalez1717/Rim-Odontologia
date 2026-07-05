import React from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'

const Paginacion = ({
  pagina = 1,
  totalPaginas = 1,
  total = 0,
  onPaginaChange,
  loading = false,
}) => {
  if (totalPaginas <= 1) return null

  const irA = (nueva) => {
    if (loading || nueva < 1 || nueva > totalPaginas || nueva === pagina) return
    onPaginaChange(nueva)
  }

  return (
    <div className="flex items-center justify-between pt-4 mt-4 border-t border-slate-100">
      <p className="text-xs text-slate-400">
        Página {pagina} de {totalPaginas} · {total} {total === 1 ? 'venta' : 'ventas'}
      </p>
      <div className="flex items-center gap-1">
        <button
          type="button"
          onClick={() => irA(pagina - 1)}
          disabled={loading || pagina <= 1}
          className="w-8 h-8 rounded-lg flex items-center justify-center
                     text-slate-500 hover:bg-slate-100 disabled:opacity-40
                     disabled:cursor-not-allowed transition-colors"
          aria-label="Página anterior"
        >
          <ChevronLeft size={16} />
        </button>
        <button
          type="button"
          onClick={() => irA(pagina + 1)}
          disabled={loading || pagina >= totalPaginas}
          className="w-8 h-8 rounded-lg flex items-center justify-center
                     text-slate-500 hover:bg-slate-100 disabled:opacity-40
                     disabled:cursor-not-allowed transition-colors"
          aria-label="Página siguiente"
        >
          <ChevronRight size={16} />
        </button>
      </div>
    </div>
  )
}

export default Paginacion
