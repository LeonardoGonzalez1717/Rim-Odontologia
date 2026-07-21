// =============================================================================
// components/DoctorSelect.jsx
// Select con búsqueda para elegir doctor por nombre o especialidad (react-select)
// =============================================================================
import { useMemo } from 'react'
import Select from 'react-select'

const normalizar = (texto) =>
  String(texto || '').toLowerCase().replace(/[\s.-]/g, '')

const filtrarDoctor = (opcion, input) => {
  if (!input) return true
  const term = normalizar(input)
  return (
    normalizar(opcion.data.nombre).includes(term) ||
    normalizar(opcion.data.especialidad).includes(term)
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

const DoctorSelect = ({
  id = 'doctor_id',
  doctores = [],
  value,
  onChange,
  placeholder = 'Buscar doctor…',
}) => {
  const opciones = useMemo(
    () =>
      doctores.map((d) => ({
        value: String(d.id),
        label: `${d.nombre} · ${d.especialidad}`,
        nombre: d.nombre,
        especialidad: d.especialidad,
      })),
    [doctores],
  )

  const seleccionado = useMemo(
    () => opciones.find((o) => o.value === String(value)) ?? null,
    [opciones, value],
  )

  return (
    <Select
      inputId={id}
      options={opciones}
      value={seleccionado}
      onChange={(opcion) => onChange(opcion?.value ?? '')}
      placeholder={placeholder}
      isClearable
      isSearchable
      filterOption={filtrarDoctor}
      noOptionsMessage={() => 'No se encontró ningún doctor'}
      loadingMessage={() => 'Buscando…'}
      styles={estilos}
      menuPortalTarget={typeof document !== 'undefined' ? document.body : null}
      menuPosition="fixed"
      classNamePrefix="doctor-select"
    />
  )
}

export default DoctorSelect
