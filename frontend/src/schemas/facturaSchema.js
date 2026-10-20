import { z } from 'zod';

export const facturaSchema = z.object({
  clienteId: z.coerce
    .number({
      required_error: 'Debe seleccionar un cliente',
      invalid_type_error: 'Debe seleccionar un cliente válido'
    })
    .min(1, 'Debe seleccionar un cliente'),

  fechaEmision: z
    .string({ required_error: 'La fecha de emisión es obligatoria' })
    .min(1, 'La fecha de emisión es obligatoria'),

  montoImpuestos: z.coerce
    .number({
      invalid_type_error: 'El monto de impuestos debe ser numérico'
    })
    .min(0, 'El monto de impuestos no puede ser negativo')
    .max(10000000, 'El monto no puede superar 10.000.000'),

  montoTotal: z.coerce
    .number({
      required_error: 'El monto total es obligatorio',
      invalid_type_error: 'El monto total debe ser numérico'
    })
    .min(0.01, 'El monto total debe ser mayor a 0')
    .max(10000000, 'El monto no puede superar 10.000.000')
});

export const detalleFacturaSchema = z.object({
  tipo: z.enum(['consulta', 'insumo'], {
    required_error: 'Debe seleccionar un tipo de ítem'
  }),
  consultaId: z.string().optional(),
  insumoId: z.string().optional(),
  subtotal: z.coerce
    .number({
      required_error: 'El subtotal es obligatorio',
      invalid_type_error: 'El subtotal debe ser un número válido'
    })
    .min(0.01, 'El subtotal debe ser mayor a 0')
    .max(10000000, 'El subtotal no puede superar 10.000.000')
}).refine(
  (data) => {
    if (data.tipo === 'consulta') return Boolean(data.consultaId && Number(data.consultaId) > 0);
    if (data.tipo === 'insumo') return Boolean(data.insumoId && Number(data.insumoId) > 0);
    return false;
  },
  {
    message: 'Debe seleccionar una consulta o un insumo específico para agregar',
    path: ['tipo']
  }
);

