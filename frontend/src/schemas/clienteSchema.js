import { z } from 'zod';

export const clienteSchema = z.object({
  documentoIdentidad: z.string({
    required_error: 'El documento de identidad es obligatorio'
  }).trim().min(5, 'El documento debe tener al menos 5 caracteres').max(20, 'Máximo 20 caracteres'),
  nombreCompleto: z.string({
    required_error: 'El nombre completo es obligatorio'
  }).trim().min(3, 'El nombre debe tener al menos 3 caracteres').max(150, 'Máximo 150 caracteres'),
  telefono: z.string().trim().max(20, 'Máximo 20 caracteres').optional().or(z.literal('')),
  email: z.string().trim().email('Formato de correo inválido').max(150, 'Máximo 150 caracteres').optional().or(z.literal(''))
});
