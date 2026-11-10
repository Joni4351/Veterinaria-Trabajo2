import { expect, it } from 'vitest';
import { especialidadSchema } from '../schemas/adminSchema';
import { insumoSchema } from '../schemas/insumoSchema';

it.each(['', null])('rechaza costo obligatorio vacío (%s) y permite un costo explícito de cero', value => {
  expect(especialidadSchema.safeParse({ nombre: 'Medicina General', costoBase: value }).success).toBe(false);
  expect(especialidadSchema.safeParse({ nombre: 'Medicina General', costoBase: 0 }).success).toBe(true);
});
it.each(['', null])('rechaza stock obligatorio vacío (%s) y permite existencias explícitas de cero', value => {
  const base = { nombreProducto: 'Insumo de prueba', tipo: 'Medicamento', precioUnitario: 1000 };
  expect(insumoSchema.safeParse({ ...base, stockActual: value }).success).toBe(false);
  expect(insumoSchema.safeParse({ ...base, stockActual: 0 }).success).toBe(true);
});
