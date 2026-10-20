import { z } from 'zod';

export const consultaSchema = z.object({
  pacienteId: z.coerce
    .number({
      required_error: 'Debe seleccionar un paciente',
      invalid_type_error: 'Debe seleccionar un paciente válido'
    })
    .min(1, 'Debe seleccionar un paciente'),

  citaId: z.preprocess(
    (val) => (val === '' || val === null || val === undefined ? null : Number(val)),
    z.number().positive().nullable().optional()
  ),

  motivo: z
    .string({
      required_error: 'El motivo de la consulta es obligatorio'
    })
    .trim()
    .min(3, 'El motivo debe tener al menos 3 caracteres')
    .max(250, 'El motivo no puede exceder 250 caracteres'),

  diagnostico: z
    .string({
      required_error: 'El diagnóstico es obligatorio'
    })
    .trim()
    .min(3, 'El diagnóstico debe tener al menos 3 caracteres')
    .max(1000, 'El diagnóstico no puede exceder 1000 caracteres')
});

export const recetaMedicaSchema = z.object({
  fechaEmision: z
    .string({ required_error: 'La fecha de emisión es obligatoria' })
    .min(1, 'La fecha de emisión es obligatoria'),

  validaHasta: z
    .string({ required_error: 'La fecha de validez es obligatoria' })
    .min(1, 'La fecha de validez es obligatoria'),

  insumoId: z.coerce
    .number({
      required_error: 'Debe seleccionar un insumo o medicamento',
      invalid_type_error: 'Debe seleccionar un insumo válido'
    })
    .min(1, 'Debe seleccionar un insumo o medicamento'),

  dosis: z
    .string({ required_error: 'La dosis es obligatoria' })
    .trim()
    .min(2, 'La dosis debe tener al menos 2 caracteres')
    .max(100, 'La dosis no puede exceder 100 caracteres'),

  duracionDias: z.coerce
    .number({
      required_error: 'La duración en días es obligatoria',
      invalid_type_error: 'La duración debe ser un número entero'
    })
    .int('La duración debe ser en días enteros')
    .min(1, 'La duración mínima es de 1 día')
    .max(365, 'La duración no puede superar 365 días')
}).refine(
  (data) => new Date(data.validaHasta) >= new Date(data.fechaEmision),
  {
    message: 'La fecha de validez no puede ser anterior a la fecha de emisión',
    path: ['validaHasta']
  }
);

