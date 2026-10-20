import { describe, it, expect } from 'vitest';
import { validarRutChileno, formatearRut, clienteSchema } from '../schemas/clienteSchema';

describe('Validación de RUT Chileno (Módulo 11) y clienteSchema', () => {
  it('debe validar correctamente RUTs chilenos matemáticamente válidos', () => {
    expect(validarRutChileno('11.111.111-1')).toBe(true);
    expect(validarRutChileno('11111111-1')).toBe(true);
    expect(validarRutChileno('12.345.678-5')).toBe(true);
    expect(validarRutChileno('12345678-5')).toBe(true);
    expect(validarRutChileno('7.654.321-6')).toBe(true);
    expect(validarRutChileno('18.765.432-7')).toBe(true);
    expect(validarRutChileno('19.876.543-0')).toBe(true);
  });

  it('debe rechazar RUTs con dígito verificador incorrecto o formato inválido', () => {
    expect(validarRutChileno('11.111.111-2')).toBe(false);
    expect(validarRutChileno('12.345.678-9')).toBe(false);
    expect(validarRutChileno('12345')).toBe(false);
    expect(validarRutChileno('abcdef-1')).toBe(false);
    expect(validarRutChileno('')).toBe(false);
    expect(validarRutChileno(null)).toBe(false);
  });

  it('debe formatear adecuadamente un RUT con puntos y guion', () => {
    expect(formatearRut('123456785')).toBe('12.345.678-5');
    expect(formatearRut('111111111')).toBe('11.111.111-1');
  });

  it('clienteSchema debe validar un cliente completo con RUT válido', () => {
    const validClient = {
      documentoIdentidad: '12.345.678-5',
      nombreCompleto: 'Juan Antonio Pérez',
      telefono: '+56912345678',
      email: 'juan.perez@example.com'
    };

    const result = clienteSchema.safeParse(validClient);
    expect(result.success).toBe(true);
  });

  it('clienteSchema debe rechazar si el RUT es inválido', () => {
    const invalidClient = {
      documentoIdentidad: '11.111.111-9', // DV erróneo
      nombreCompleto: 'Juan Pérez',
      telefono: '+56912345678',
      email: 'juan.perez@example.com'
    };

    const result = clienteSchema.safeParse(invalidClient);
    expect(result.success).toBe(false);
    expect(result.error.flatten().fieldErrors.documentoIdentidad).toBeDefined();
  });
});

