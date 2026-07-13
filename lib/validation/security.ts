import { z } from 'zod'

export const pinCode = z.string().regex(/^\d{4}$/, 'El PIN debe ser 4 dígitos')

export const setPinSchema = z
  .object({ pin: pinCode, confirm: pinCode })
  .refine((v) => v.pin === v.confirm, { message: 'Los PIN no coinciden', path: ['confirm'] })

/** Changing an existing PIN requires the admin password. */
export const changePinSchema = z
  .object({
    password: z.string().min(1, 'Ingresa tu contraseña'),
    pin: pinCode,
    confirm: pinCode,
  })
  .refine((v) => v.pin === v.confirm, { message: 'Los PIN no coinciden', path: ['confirm'] })

export const deleteEmployeeSchema = z.object({
  id: z.string().uuid(),
  pin: pinCode,
})
