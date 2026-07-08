// =============================================================================
// utils/validarPersona.js — Validación compartida de cédula y nombre
// =============================================================================

const SOLO_NUMEROS = /\D/g
const SOLO_LETRAS = /[^a-zA-ZáéíóúÁÉÍÓÚñÑüÜ\s]/g

export const filtrarCedula = (valor) => String(valor ?? '').replace(SOLO_NUMEROS, '')

export const filtrarNombre = (valor) => String(valor ?? '').replace(SOLO_LETRAS, '')

export const filtrarTelefono = (valor) => String(valor ?? '').replace(SOLO_NUMEROS, '')

export const validarCedulaNombre = (cedula, nombre) => {
  const cedulaLimpia = filtrarCedula(cedula).trim()
  const nombreLimpio = filtrarNombre(nombre).trim()

  if (!cedulaLimpia) {
    return { ok: false, mensaje: 'La cédula es requerida.' }
  }
  if (!/^\d+$/.test(cedulaLimpia)) {
    return { ok: false, mensaje: 'La cédula solo debe contener números.' }
  }
  if (cedulaLimpia.length < 6) {
    return { ok: false, mensaje: 'La cédula debe tener al menos 6 dígitos.' }
  }

  if (!nombreLimpio) {
    return { ok: false, mensaje: 'El nombre es requerido.' }
  }
  if (!/^[a-zA-ZáéíóúÁÉÍÓÚñÑüÜ\s]+$/.test(nombreLimpio)) {
    return { ok: false, mensaje: 'El nombre solo debe contener letras.' }
  }
  if (nombreLimpio.length < 3) {
    return { ok: false, mensaje: 'El nombre debe tener al menos 3 letras.' }
  }

  return {
    ok: true,
    datos: { cedula: cedulaLimpia, nombre: nombreLimpio },
  }
}

export const ESPECIALIDADES_DOCTOR = [
  'Odontología General',
  'Ortodoncia',
  'Endodoncia',
  'Periodoncia',
  'Cirugía Oral y Maxilofacial',
  'Odontopediatría',
  'Prostodoncia',
  'Implantología',
  'Estética Dental',
]

export const validarDoctor = ({ cedula, nombre, especialidad }) => {
  const base = validarCedulaNombre(cedula, nombre)
  if (!base.ok) return base

  const esp = String(especialidad ?? '').trim()
  if (!ESPECIALIDADES_DOCTOR.includes(esp)) {
    return { ok: false, mensaje: 'Selecciona una especialidad válida.' }
  }

  return {
    ok: true,
    datos: { ...base.datos, especialidad: esp },
  }
}
