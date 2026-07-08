<?php
// =============================================================================
// persona_validacion.php — Validación compartida de cédula y nombre
// =============================================================================

function validarCedulaNombre(string $cedula, string $nombre): ?string
{
    $cedula = preg_replace('/\D/', '', trim($cedula));
    $nombre = trim($nombre);

    if ($cedula === '') {
        return 'La cédula es requerida.';
    }
    if (!preg_match('/^\d+$/', $cedula)) {
        return 'La cédula solo debe contener números.';
    }
    if (strlen($cedula) < 6) {
        return 'La cédula debe tener al menos 6 dígitos.';
    }

    if ($nombre === '') {
        return 'El nombre es requerido.';
    }
    if (!preg_match('/^[\p{L}\s]+$/u', $nombre)) {
        return 'El nombre solo debe contener letras.';
    }
    if (mb_strlen($nombre) < 3) {
        return 'El nombre debe tener al menos 3 letras.';
    }

    return null;
}

function normalizarCedulaNombre(string $cedula, string $nombre): array
{
    return [
        'cedula' => preg_replace('/\D/', '', trim($cedula)),
        'nombre' => preg_replace('/[^\p{L}\s]/u', '', trim($nombre)),
    ];
}

function especialidadesDoctorValidas(): array
{
    return [
        'Odontología General',
        'Ortodoncia',
        'Endodoncia',
        'Periodoncia',
        'Cirugía Oral y Maxilofacial',
        'Odontopediatría',
        'Prostodoncia',
        'Implantología',
        'Estética Dental',
    ];
}

function validarDatosCliente(string $cedula, string $nombre, string $telefono): ?string
{
    $error = validarCedulaNombre($cedula, $nombre);
    if ($error !== null) {
        return $error;
    }

    $telefono = preg_replace('/\D/', '', trim($telefono));

    if ($telefono !== '' && !preg_match('/^\d+$/', $telefono)) {
        return 'El teléfono solo debe contener números.';
    }
    if ($telefono !== '' && strlen($telefono) < 10) {
        return 'El teléfono debe tener al menos 10 dígitos.';
    }

    return null;
}

function normalizarDatosCliente(string $cedula, string $nombre, string $telefono): array
{
    $base = normalizarCedulaNombre($cedula, $nombre);
    $telefono = preg_replace('/\D/', '', trim($telefono));

    return [
        ...$base,
        'telefono' => $telefono !== '' ? $telefono : null,
    ];
}

function validarDatosDoctor(string $cedula, string $nombre, string $especialidad): ?string
{
    $error = validarCedulaNombre($cedula, $nombre);
    if ($error !== null) {
        return $error;
    }

    $especialidad = trim($especialidad);
    if ($especialidad === '') {
        return 'La especialidad es requerida.';
    }
    if (!in_array($especialidad, especialidadesDoctorValidas(), true)) {
        return 'Selecciona una especialidad válida.';
    }

    return null;
}

function normalizarDatosDoctor(string $cedula, string $nombre, string $especialidad): array
{
    return [
        ...normalizarCedulaNombre($cedula, $nombre),
        'especialidad' => trim($especialidad),
    ];
}
