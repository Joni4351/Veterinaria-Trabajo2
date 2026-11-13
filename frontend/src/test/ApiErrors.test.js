import { expect, it } from 'vitest';
import { getApiErrorMessage, normalizeFieldErrors } from '../services/apiErrors';

it.each([
  [401, 'Inicie sesión'], [403, 'no tiene permisos'], [404, 'ya no está disponible'],
  [409, 'ya existe'], [413, 'más pequeño'], [429, 'Espere un minuto'], [503, 'contacte al administrador']
])('explica el error HTTP %s sin revelar detalles técnicos', (status, expected) => {
  const result = getApiErrorMessage({ response: { status, data: { detalle: 'password=secret' } } });
  expect(result).toContain(expected); expect(result).not.toContain('secret');
});
it('no presenta mensajes internos del servidor como instrucciones para el usuario', () => {
  expect(getApiErrorMessage({ response: { status: 500, data: { message: 'Internal secret host', errors: { db: ['password'] } } } })).not.toMatch(/secret|host|password/);
});
it('distingue fallos de conexión y espera agotada', () => {
  expect(getApiErrorMessage({})).toContain('Revise su conexión');
  expect(getApiErrorMessage({ code: 'ECONNABORTED' })).toContain('tardó demasiado');
});
it('conserva errores de validación y normaliza los nombres de campos del backend', () => {
  expect(getApiErrorMessage({ response: { status: 400, data: { errors: { Email: ['Correo inválido.'] } } } })).toBe('Correo inválido.');
  expect(normalizeFieldErrors({ Email: ['Ya existe.'], NombreCompleto: ['Dato requerido.'] })).toEqual({ email: 'Ya existe.', nombreCompleto: 'Dato requerido.' });
});
