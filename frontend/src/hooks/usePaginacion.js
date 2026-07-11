import { useState, useEffect, useMemo } from 'react'

export const POR_PAGINA_DEFAULT = 10

/**
 * Paginación en el cliente sobre un arreglo ya cargado.
 * @param {Array} items — Lista completa (o filtrada) a paginar
 * @param {number} porPagina — Registros por página
 * @param {Array} resetDeps — Dependencias que reinician a la página 1 (ej. búsqueda)
 */
export function usePaginacion(items = [], porPagina = POR_PAGINA_DEFAULT, resetDeps = []) {
  const [pagina, setPagina] = useState(1)

  const total = items.length
  const totalPaginas = Math.max(1, Math.ceil(total / porPagina) || 1)

  useEffect(() => {
    setPagina(1)
  }, resetDeps) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (pagina > totalPaginas) {
      setPagina(totalPaginas)
    }
  }, [pagina, totalPaginas])

  const itemsPaginados = useMemo(() => {
    if (total === 0) return []
    const inicio = (pagina - 1) * porPagina
    return items.slice(inicio, inicio + porPagina)
  }, [items, pagina, porPagina, total])

  const indiceInicio = total === 0 ? 0 : (pagina - 1) * porPagina + 1
  const indiceFin = Math.min(pagina * porPagina, total)

  return {
    pagina,
    setPagina,
    totalPaginas,
    total,
    porPagina,
    itemsPaginados,
    indiceInicio,
    indiceFin,
  }
}
