import { afterEach, expect, it, vi } from 'vitest';
import { todayInChile } from '../schemas/dateValidation';
import { recetaMedicaSchema } from '../schemas/consultaSchema';
import { facturaSchema } from '../schemas/facturaSchema';

afterEach(() => vi.useRealTimers());
it('usa el día de Chile aun cuando UTC ya corresponde al día siguiente', () => {
  vi.useFakeTimers(); vi.setSystemTime(new Date('2026-11-12T01:00:00Z'));
  expect(todayInChile()).toBe('2026-11-11');
  const receta = { fechaEmision: '2026-11-11', validaHasta: '2026-11-11', insumoId: 1, dosis: 'Una dosis', duracionDias: 1 };
  const factura = { clienteId: 1, fechaEmision: '2026-11-11', montoTotal: 100, montoImpuestos: 19 };
  expect(recetaMedicaSchema.safeParse(receta).success).toBe(true);
  expect(facturaSchema.safeParse(factura).success).toBe(true);
  for (const fechaEmision of ['', '2026-11-10', '2026-11-12', '2026-02-31']) {
    expect(recetaMedicaSchema.safeParse({ ...receta, fechaEmision }).success).toBe(false);
    expect(facturaSchema.safeParse({ ...factura, fechaEmision }).success).toBe(false);
  }
  expect(recetaMedicaSchema.safeParse({ ...receta, validaHasta: '2026-11-10' }).success).toBe(false);
  expect(recetaMedicaSchema.safeParse({ ...receta, validaHasta: '2026-11-12' }).success).toBe(true);
  vi.setSystemTime(new Date('2026-11-12T04:00:00Z'));
  expect(todayInChile()).toBe('2026-11-12');
  expect(facturaSchema.safeParse(factura).success).toBe(false);
});
