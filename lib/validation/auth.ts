import { z } from 'zod'

/** Login input — validated on the SERVER before touching Supabase. */
export const loginSchema = z.object({
  email: z
    .string()
    .trim()
    .min(1, 'Ingresa tu correo')
    .email('Correo inválido')
    .max(254)
    .transform((v) => v.toLowerCase()),
  password: z.string().min(1, 'Ingresa tu contraseña').max(128),
})
export type LoginInput = z.infer<typeof loginSchema>

export const userRole = z.enum(['super_admin', 'empleado'])
export const userStatus = z.enum(['activo', 'inactivo'])

/** Create-user input (super_admin only). */
export const createUserSchema = z.object({
  email: z.string().trim().email('Correo inválido').max(254).transform((v) => v.toLowerCase()),
  full_name: z.string().trim().min(2, 'Nombre muy corto').max(120),
  password: z.string().min(8, 'Mínimo 8 caracteres').max(128),
  role: userRole,
  position: z.string().trim().max(120).optional().or(z.literal('')),
  phone: z.string().trim().max(40).optional().or(z.literal('')),
  status: userStatus.default('activo'),
})
export type CreateUserInput = z.infer<typeof createUserSchema>

/** Edit-user input (super_admin only). Password is not edited here. */
export const updateUserSchema = z.object({
  id: z.string().uuid(),
  full_name: z.string().trim().min(2, 'Nombre muy corto').max(120),
  role: userRole,
  position: z.string().trim().max(120).optional().or(z.literal('')),
  phone: z.string().trim().max(40).optional().or(z.literal('')),
  status: userStatus,
})
export type UpdateUserInput = z.infer<typeof updateUserSchema>
