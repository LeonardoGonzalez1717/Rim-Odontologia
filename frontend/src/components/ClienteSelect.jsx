// =============================================================================
// components/ClienteSelect.jsx
// Select con búsqueda para elegir cliente por cédula o nombre (react-select)
// Props adicionales:
//   - clientesConDeuda {Set<string>} — Set de IDs (string) con deuda Cashea activa
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
  singleValue: (base, { data }) => ({
    ...base,
    color: data?.tieneDeuda ? '#b91c1c' : '#1e293b',
    fontWeight: data?.tieneDeuda ? 600 : 'normal',
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
  option: (base, { isFocused, isSelected, data }) => ({
    ...base,
    fontSize: 14,
    backgroundColor: isSelected
      ? (data?.tieneDeuda ? '#991b1b' : '#db2777')
      : isFocused
        ? (data?.tieneDeuda ? '#fee2e2' : '#fce7f3')
        : undefined,
    color: isSelected ? '#fff' : (data?.tieneDeuda ? '#991b1b' : '#1e293b'),
    cursor: 'pointer',
    fontWeight: data?.tieneDeuda && !isSelected ? 600 : 'normal',
  }),
  input: (base) => ({
    ...base,
    color: '#1e293b',
  }),
  indicatorSeparator: () => ({ display: 'none' }),
}

// Renderizador de opciones con badge de deuda
const formatOptionLabel = (opcion) => {
  if (opcion.tieneDeuda) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <span style={{ color: '#dc2626', fontSize: 12, lineHeight: 1 }}>⚠️</span>
        <span style={{ color: '#991b1b', fontWeight: 600 }}>
          {opcion.cedula} — {opcion.nombre}
        </span>
        <span style={{
          marginLeft: 'auto',
          fontSize: 10,
          fontWeight: 700,
          color: '#fff',
          backgroundColor: '#dc2626',
          borderRadius: 6,
          padding: '1px 6px',
          letterSpacing: '0.03em',
          whiteSpace: 'nowrap',
        }}>
          DEUDA CASHEA
        </span>
      </div>
    )
  }
  return <span>{opcion.cedula} — {opcion.nombre}</span>
}

const ClienteSelect = ({
  id = 'cliente_id',
  clientes = [],
  value,
  onChange,
  placeholder = 'Buscar por cédula o nombre…',
  inputRef = null,
  clientesConDeuda = null, // Set<string> o null
}) => {
  const selectRef = useRef(null)

  const opciones = useMemo(
    () =>
      clientes.map((c) => ({
        value: String(c.id),
        label: `${c.cedula} — ${c.nombre}`,
        cedula: c.cedula,
        nombre: c.nombre,
        // Si viene flag del backend úsalo; si viene Set úsalo; si no, false
        tieneDeuda: c.tiene_deuda_cashea === true
          || (clientesConDeuda instanceof Set && clientesConDeuda.has(String(c.id)))
          || false,
      })),
    [clientes, clientesConDeuda],
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
      formatOptionLabel={formatOptionLabel}
      menuPortalTarget={typeof document !== 'undefined' ? document.body : null}
      menuPosition="fixed"
      classNamePrefix="cliente-select"
    />
  )
}

export default ClienteSelect
