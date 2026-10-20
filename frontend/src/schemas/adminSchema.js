import { z } from 'zod';

export const especialidadSchema = z.object({
  nombre: z
    .string({ required_error: 'El nombre de la especialidad es obligatorio' })
    .trim()
    .min(3, 'El nombre debe tener al menos 3 caracteres')
    .max(100, 'El nombre no puede exceder 100 caracteres'),

  costoBase: z.coerce
    .number({
      required_error: 'El costo base es obligatorio',
      invalid_type_error: 'El costo base debe ser un número válido'
    })
    .min(0, 'El costo base debe ser mayor o igual a 0')
    .max(10000000, 'El costo no puede superar 10.000.000')
});

export const rolSchema = z.object({
  nombre: z
    .string({ required_error: 'El nombre del rol es obligatorio' })
    .trim()
    .min(2, 'El nombre del rol debe tener al menos 2 caracteres')
    .max(50, 'El nombre del rol no puede superar 50 caracteres'),

  permisosEscritura: z.boolean().default(false)
});

