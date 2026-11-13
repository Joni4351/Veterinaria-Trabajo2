import { z } from 'zod';

export const loginSchema = z.object({
  email: z.string({
    required_error: 'El correo electrónico es requerido'
  }).trim().min(1, 'El correo electrónico es requerido').email('Ingrese un correo electrónico válido'),
  password: z.string({
    required_error: 'La contraseña es requerida'
  }).trim().min(1, 'La contraseña es requerida').min(6, 'La contraseña debe contener al menos 6 caracteres')
});

export const registerSchema = z.object({
  nombreCompleto: z.string({
    required_error: 'El nombre completo es obligatorio'
  }).trim().min(3, 'El nombre debe tener al menos 3 caracteres').max(100, 'Máximo 100 caracteres'),
  email: z.string({
    required_error: 'El correo electrónico es requerido'
  }).trim().min(1, 'El correo electrónico es requerido').email('Ingrese un correo electrónico válido'),
  password: z.string({
    required_error: 'La contraseña es requerida'
  }).min(1, 'La contraseña es requerida').min(6, 'La contraseña debe contener al menos 6 caracteres'),
  rolId: z.coerce.number().int().min(1, 'Seleccione un rol válido')
});

