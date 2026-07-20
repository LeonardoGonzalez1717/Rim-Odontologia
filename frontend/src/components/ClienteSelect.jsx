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

// Renderizador de opciones con badges de deuda / saldo a favor (le debemos)
const formatOptionLabel = (opcion, { context }) => {
  const texto = `${opcion.cedula} — ${opcion.nombre}`
  const badges = []

  if (opcion.tieneDeuda) {
    badges.push({
      key: 'deuda',
      label: context === 'value' ? 'DEUDA' : 'DEUDA CASHEA',
      color: '#b45309',
      bg: '#fffbeb',
      border: '#fde68a',
    })
  }
  if (opcion.tieneSaldoFavor) {
    badges.push({
      key: 'saldo',
      label: 'SALDO A FAVOR',
      color: '#047857',
      bg: '#ecfdf5',
      border: '#a7f3d0',
    })
  }

  if (badges.length === 0) {
    return <span>{texto}</span>
  }

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, width: '100%' }}>
      <span style={{ flex: 1, minWidth: 0 }}>{texto}</span>
      <span style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
        {badges.map((b) => (
          <span
            key={b.key}
            style={{
              fontSize: 10,
              fontWeight: 700,
              color: b.color,
              backgroundColor: b.bg,
              border: `1px solid ${b.border}`,
              borderRadius: 6,
              padding: '1px 6px',
              letterSpacing: '0.03em',
              whiteSpace: 'nowrap',
            }}
          >
            {b.label}
          </span>
        ))}
      </span>
    </div>
  )
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
        tieneSaldoFavor: c.tiene_saldo_a_favor === true
          || (Number(c.saldo_a_favor) > 0.001)
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
