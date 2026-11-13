import { z } from 'zod';
import { plainNumberInput } from './numberValidation';
import { emissionDateSchema } from './dateValidation';

export const facturaSchema = z.object({
  clienteId: z.coerce
    .number({
      required_error: 'Debe seleccionar un cliente',
      invalid_type_error: 'Debe seleccionar un cliente válido'
    })
    .int('Seleccione un identificador entero válido')
    .min(1, 'Debe seleccionar un cliente'),

  fechaEmision: emissionDateSchema(),

  montoImpuestos: z.preprocess(plainNumberInput, z.coerce
    .number({
      invalid_type_error: 'El monto de impuestos debe ser numérico'
    })
    .min(0, 'El monto de impuestos no puede ser negativo')
    .max(10000000, 'El monto no puede superar 10.000.000')),

  montoTotal: z.preprocess(plainNumberInput, z.coerce
    .number({
      required_error: 'El monto total es obligatorio',
      invalid_type_error: 'El monto total debe ser numérico'
    })
    .min(0.01, 'El monto total debe ser mayor a 0')
    .max(10000000, 'El monto no puede superar 10.000.000'))
}).refine(data => data.montoImpuestos <= data.montoTotal, {
  message: 'Los impuestos no pueden superar el total de la factura', path: ['montoImpuestos']
});

export const detalleFacturaSchema = z.object({
  cantidad: z.preprocess(plainNumberInput, z.coerce.number().int('La cantidad debe ser entera').min(1, 'La cantidad debe ser positiva').max(1000000, 'Máximo 1.000.000 unidades')).default(1),
  tipo: z.enum(['consulta', 'insumo'], {
    required_error: 'Debe seleccionar un tipo de ítem'
  }),
  consultaId: z.string().optional(),
  insumoId: z.string().optional(),
  subtotal: z.preprocess(plainNumberInput, z.coerce
    .number({
      required_error: 'El subtotal es obligatorio',
      invalid_type_error: 'El subtotal debe ser un número válido'
    })
    .min(0.01, 'El subtotal debe ser mayor a 0')
    .max(10000000, 'El subtotal no puede superar 10.000.000'))
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

