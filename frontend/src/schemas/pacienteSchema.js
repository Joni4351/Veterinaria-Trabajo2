import { z } from 'zod';

export const pacienteSchema = z.object({
  clienteId: z.coerce.number({
    required_error: 'Debe seleccionar un cliente/dueño',
    invalid_type_error: 'Debe seleccionar un dueño válido'
  }).min(1, 'Debe seleccionar un dueño asociado'),
  nombre: z.string({
    required_error: 'El nombre del paciente es obligatorio'
  }).trim().min(1, 'El nombre del paciente es obligatorio').min(2, 'El nombre debe tener al menos 2 caracteres').max(100, 'El nombre no puede exceder 100 caracteres'),
  especie: z.string({
    required_error: 'La especie es obligatoria'
  }).trim().min(2, 'La especie es requerida').max(50, 'Máximo 50 caracteres'),
  raza: z.string().trim().max(50, 'La raza no puede exceder 50 caracteres').optional().or(z.literal('')),
  peso: z.coerce.number({
    invalid_type_error: 'El peso debe ser un número válido'
  }).positive('El peso debe ser un valor positivo').max(300, 'El peso no puede exceder los 300 kg').optional().nullable().or(z.literal('')),
  alergias: z.string().trim().max(500, 'Las notas de alergias no pueden exceder 500 caracteres').optional().or(z.literal(''))
});
