import { z } from 'zod';

export const insumoSchema = z.object({
  nombreProducto: z.string({
    required_error: 'El nombre del producto es obligatorio'
  })
    .trim()
    .min(2, 'El nombre debe tener al menos 2 caracteres')
    .max(100, 'El nombre no puede superar 100 caracteres'),

  tipo: z.string({
    required_error: 'El tipo de insumo es obligatorio'
  })
    .trim()
    .min(2, 'El tipo de insumo es obligatorio')
    .max(50, 'Máximo 50 caracteres'),

  stockActual: z.coerce.number({
    required_error: 'El stock actual es obligatorio',
    invalid_type_error: 'El stock debe ser un número entero'
  })
    .int('El stock debe ser un número entero')
    .min(0, 'El stock no puede ser negativo'),

  precioUnitario: z.coerce.number({
    required_error: 'El precio unitario es obligatorio',
    invalid_type_error: 'El precio debe ser un número válido'
  })
    .positive('El precio unitario debe ser mayor a 0')
    .max(10000000, 'El precio excede el límite permitido')
});

