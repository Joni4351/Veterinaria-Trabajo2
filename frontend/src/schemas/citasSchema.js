import { z } from 'zod';

export const citaSchema = z.object({
  pacienteId: z.coerce.number({
    required_error: 'Debe seleccionar un paciente',
    invalid_type_error: 'Debe seleccionar un paciente válido'
  }).min(1, 'Debe seleccionar un paciente'),

  usuarioId: z.coerce.number({
    required_error: 'Debe seleccionar un profesional veterinario',
    invalid_type_error: 'Debe seleccionar un profesional válido'
  }).min(1, 'Debe seleccionar un profesional'),

  especialidadId: z.coerce.number({
    required_error: 'Debe seleccionar una especialidad',
    invalid_type_error: 'Debe seleccionar una especialidad válida'
  }).min(1, 'Debe seleccionar una especialidad'),

  fechaHora: z.string({
    required_error: 'La fecha y hora son obligatorias'
  }).min(1, 'La fecha y hora son obligatorias'),

  estado: z.enum(['Pendiente', 'Confirmada', 'Atendida', 'Cancelada'], {
    errorMap: () => ({ message: 'El estado debe ser Pendiente, Confirmada, Atendida o Cancelada' })
  }).default('Pendiente')
});

