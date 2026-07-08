// =============================================================================
// components/ClienteSelect.jsx
// Select con búsqueda para elegir cliente por cédula o nombre (react-select)
// =============================================================================
import { useEffect, useMemo, useRef } from 'react'
import Select from 'react-select'

const normalizar = (texto) =>
  String(texto || '').toLowerCase().replace(/[\s.-]/g, '')

const filtrarPorCedula = (opcion, input) => {
  if (!input) return true
  const term = normalizar(input)
  return (
    normalizar(opcion.data.cedula).includes(term) ||
    normalizar(opcion.data.nombre).includes(term)
  )
}

const estilos = {
  control: (base, { isFocused }) => ({
    ...base,
    minHeight: 46,
    borderRadius: 12,
    backgroundColor: '#f8fafc',
    borderColor: isFocused ? '#ec4899' : '#cbd5e1',
    boxShadow: isFocused ? '0 0 0 2px rgba(236, 72, 153, 0.5)' : 'none',
    fontSize: 14,
    '&:hover': {
      borderColor: isFocused ? '#ec4899' : '#cbd5e1',
    },
  }),
  placeholder: (base) => ({
    ...base,
    color: '#94a3b8',
  }),
  singleValue: (base) => ({
    ...base,
    color: '#1e293b',
  }),
  menu: (base) => ({
    ...base,
    borderRadius: 12,
    overflow: 'hidden',
    boxShadow: '0 10px 25px rgba(0,0,0,0.1)',
    zIndex: 9999,
  }),
  menuPortal: (base) => ({
    ...base,
    zIndex: 9999,
  }),
  option: (base, { isFocused, isSelected }) => ({
    ...base,
    fontSize: 14,
    backgroundColor: isSelected ? '#db2777' : isFocused ? '#fce7f3' : undefined,
    color: isSelected ? '#fff' : '#1e293b',
    cursor: 'pointer',
  }),
  input: (base) => ({
    ...base,
    color: '#1e293b',
  }),
  indicatorSeparator: () => ({ display: 'none' }),
}

const ClienteSelect = ({
  id = 'cliente_id',
  clientes = [],
  value,
  onChange,
  placeholder = 'Buscar por cédula o nombre…',
  inputRef = null,
}) => {
  const selectRef = useRef(null)

  const opciones = useMemo(
    () =>
      clientes.map((c) => ({
        value: String(c.id),
        label: `${c.cedula} — ${c.nombre}`,
        cedula: c.cedula,
        nombre: c.nombre,
      })),
    [clientes],
  )

  const seleccionado = useMemo(
    () => opciones.find((o) => o.value === String(value)) ?? null,
    [opciones, value],
  )

  useEffect(() => {
    if (!inputRef) return

    inputRef.current = {
      focus: () => selectRef.current?.focus(),
    }
  }, [inputRef])

  return (
    <Select
      ref={selectRef}
      inputId={id}
      options={opciones}
      value={seleccionado}
      onChange={(opcion) => onChange(opcion?.value ?? '')}
      placeholder={placeholder}
      isClearable
      isSearchable
      filterOption={filtrarPorCedula}
      noOptionsMessage={() => 'No se encontró ningún cliente'}
      loadingMessage={() => 'Buscando…'}
      styles={estilos}
      menuPortalTarget={typeof document !== 'undefined' ? document.body : null}
      menuPosition="fixed"
      classNamePrefix="cliente-select"
    />
  )
}

export default ClienteSelect
