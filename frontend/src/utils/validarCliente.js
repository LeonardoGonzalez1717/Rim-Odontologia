// =============================================================================
// utils/validarCliente.js — Validación de campos de cliente
// =============================================================================
import {
  filtrarCedula,
  filtrarNombre,
  filtrarTelefono,
  validarCedulaNombre,
} from './validarPersona'

export { filtrarCedula, filtrarNombre, filtrarTelefono }

export const validarCliente = ({ cedula, nombre, telefono }) => {
  const base = validarCedulaNombre(cedula, nombre)
  if (!base.ok) return base

  const telefonoLimpio = filtrarTelefono(telefono).trim()

  if (telefonoLimpio && !/^\d+$/.test(telefonoLimpio)) {
    return { ok: false, mensaje: 'El teléfono solo debe contener números.' }
  }
  if (telefonoLimpio && telefonoLimpio.length < 10) {
    return { ok: false, mensaje: 'El teléfono debe tener al menos 10 dígitos.' }
  }

  return {
    ok: true,
    datos: {
      ...base.datos,
      telefono: telefonoLimpio || null,
    },
  }
}
