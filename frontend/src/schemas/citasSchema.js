import { z } from 'zod';
import { isCalendarDate } from './dateValidation';

export const citaSchema = z.object({
  pacienteId: z.coerce.number({
    required_error: 'Debe seleccionar un paciente',
    invalid_type_error: 'Debe seleccionar un paciente válido'
  }).int('Seleccione un identificador entero válido').min(1, 'Debe seleccionar un paciente'),

  usuarioId: z.coerce.number({
    required_error: 'Debe seleccionar un profesional veterinario',
    invalid_type_error: 'Debe seleccionar un profesional válido'
  }).int('Seleccione un identificador entero válido').min(1, 'Debe seleccionar un profesional'),

  especialidadId: z.coerce.number({
    required_error: 'Debe seleccionar una especialidad',
    invalid_type_error: 'Debe seleccionar una especialidad válida'
  }).int('Seleccione un identificador entero válido').min(1, 'Debe seleccionar una especialidad'),

  fechaHora: z.string({
    required_error: 'La fecha y hora son obligatorias'
  }).min(1, 'La fecha y hora son obligatorias').refine(value => isCalendarDate(value.slice(0, 10)) && value.includes('T') && Number.isFinite(new Date(value).getTime()), 'Indique una fecha y hora válidas'),

  estado: z.enum(['Pendiente', 'Confirmada', 'En Curso', 'Completada', 'Atendida', 'Cancelada'], {
    error: 'Seleccione un estado de cita válido'
  }).default('Pendiente')
});

