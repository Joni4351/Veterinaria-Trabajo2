import { describe, expect, it } from 'vitest';
import { citaSchema } from '../schemas/citasSchema';
import { clienteSchema, validarRutChileno } from '../schemas/clienteSchema';
import { pacienteSchema } from '../schemas/pacienteSchema';
import { facturaSchema } from '../schemas/facturaSchema';
import { recetaMedicaSchema } from '../schemas/consultaSchema';
import { dateTimeInputValue } from '../schemas/dateValidation';

describe('Validaciones del negocio clínico', () => {
  const appointment = { pacienteId: 1, usuarioId: 2, especialidadId: 1, fechaHora: '2030-05-20T10:00', estado: 'Pendiente' };
  it.each(['En Curso', 'Completada', 'Atendida'])('acepta el estado %s que ofrece la agenda', estado => {
    expect(citaSchema.safeParse({ ...appointment, estado }).success).toBe(true);
  });
  it('rechaza fechas inexistentes, identificadores fraccionarios y estados desconocidos', () => {
    expect(citaSchema.safeParse({ ...appointment, fechaHora: '2030-02-31T10:00' }).success).toBe(false);
    expect(citaSchema.safeParse({ ...appointment, pacienteId: 1.5 }).success).toBe(false);
    expect(citaSchema.safeParse({ ...appointment, estado: 'Inventado' }).success).toBe(false);
  });
  it('conserva la hora local al volver a editar una cita', () => {
    expect(dateTimeInputValue('2026-05-20T10:30:00')).toBe('2026-05-20T10:30');
    expect(dateTimeInputValue('fecha inválida')).toBe('');
  });
  it('exige un peso positivo y conserva los límites del backend', () => {
    const patient = { clienteId: 1, nombre: 'Luna', especie: 'Gato', peso: 4 };
    expect(pacienteSchema.safeParse(patient).success).toBe(true);
    for (const peso of ['', null, 0, -1, 301]) expect(pacienteSchema.safeParse({ ...patient, peso }).success).toBe(false);
  });
  it('no acepta separadores como teléfono ni un RUT compuesto de ceros', () => {
    const client = { documentoIdentidad: '12.345.678-5', nombreCompleto: 'Ana Pérez', email: 'ana@example.com' };
    expect(validarRutChileno('00.000.000-0')).toBe(false);
    for (const telefono of ['--------', '++++++++', '12+345678', '1234567890123456'])
      expect(clienteSchema.safeParse({ ...client, telefono }).success).toBe(false);
    expect(clienteSchema.safeParse({ ...client, telefono: '+56 9 1234 5678' }).success).toBe(true);
  });
  it('valida fechas de recetas e impuestos que no superen el total', () => {
    const prescription = { fechaEmision: '2026-05-20', validaHasta: '2026-05-19', insumoId: 1, dosis: 'Una dosis', duracionDias: 5 };
    expect(recetaMedicaSchema.safeParse(prescription).success).toBe(false);
    expect(recetaMedicaSchema.safeParse({ ...prescription, validaHasta: '2026-05-20' }).success).toBe(true);
    expect(facturaSchema.safeParse({ clienteId: 1, fechaEmision: '2026-05-20', montoTotal: 100, montoImpuestos: 101 }).success).toBe(false);
    expect(facturaSchema.safeParse({ clienteId: 1, fechaEmision: '2026-02-31', montoTotal: 100, montoImpuestos: 19 }).success).toBe(false);
  });
});
