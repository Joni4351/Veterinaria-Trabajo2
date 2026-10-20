import { z } from 'zod';

/**
 * Validador oficial de RUT Chileno usando el algoritmo Módulo 11.
 * @param {string} rut - Cadena del RUT (con o sin puntos, con o sin guion).
 * @returns {boolean} - true si el RUT es matemáticamente válido.
 */
export function validarRutChileno(rut) {
  if (!rut || typeof rut !== 'string') return false;

  // Limpiar puntos, guiones y espacios, normalizar a mayúsculas
  const limpio = rut.replace(/[\.\-\s]/g, '').toUpperCase();

  // Debe tener entre 8 y 9 caracteres (7 u 8 dígitos + 1 dígito verificador)
  if (limpio.length < 8 || limpio.length > 9) return false;

  const cuerpo = limpio.slice(0, -1);
  const dvIngresado = limpio.slice(-1);

  // El cuerpo debe ser estrictamente numérico
  if (!/^\d+$/.test(cuerpo)) return false;

  // Algoritmo Módulo 11
  let suma = 0;
  let multiplo = 2;

  for (let i = cuerpo.length - 1; i >= 0; i--) {
    suma += parseInt(cuerpo.charAt(i), 10) * multiplo;
    multiplo = multiplo === 7 ? 2 : multiplo + 1;
  }

  const resto = suma % 11;
  const digitoEsperado = 11 - resto;

  let dvCalculado = '0';
  if (digitoEsperado === 11) {
    dvCalculado = '0';
  } else if (digitoEsperado === 10) {
    dvCalculado = 'K';
  } else {
    dvCalculado = digitoEsperado.toString();
  }

  return dvIngresado === dvCalculado;
}

/**
 * Formatea un RUT al estándar chileno: 12.345.678-K
 * @param {string} rut 
 * @returns {string} RUT con formato
 */
export function formatearRut(rut) {
  if (!rut) return '';
  const limpio = rut.replace(/[^0-9kK]/g, '').toUpperCase();
  if (limpio.length <= 1) return limpio;

  const cuerpo = limpio.slice(0, -1);
  const dv = limpio.slice(-1);
  const cuerpoFormateado = cuerpo.replace(/\B(?=(\d{3})+(?!\d))/g, '.');

  return `${cuerpoFormateado}-${dv}`;
}

export const clienteSchema = z.object({
  documentoIdentidad: z
    .string({
      required_error: 'El RUT es obligatorio'
    })
    .trim()
    .min(1, 'El RUT es obligatorio')
    .refine((val) => validarRutChileno(val), {
      message: 'El RUT ingresado no es válido (ej: 12.345.678-5 o 12345678-K)'
    }),

  nombreCompleto: z
    .string({
      required_error: 'El nombre completo es obligatorio'
    })
    .trim()
    .min(3, 'El nombre debe tener al menos 3 caracteres')
    .max(100, 'El nombre no puede superar 100 caracteres'),

  telefono: z
    .string({
      required_error: 'El teléfono es obligatorio'
    })
    .trim()
    .min(8, 'El teléfono debe tener al menos 8 dígitos')
    .max(20, 'Máximo 20 caracteres')
    .regex(/^[0-9+() -]{8,20}$/, 'Formato de teléfono no válido (ej: +56912345678)'),

  email: z
    .string({
      required_error: 'El correo electrónico es obligatorio'
    })
    .trim()
    .email('Formato de correo electrónico no válido')
    .max(150, 'El correo no puede superar 150 caracteres')
});
