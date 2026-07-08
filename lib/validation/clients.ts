import { z } from 'zod'

export const clientType = z.enum(['persona', 'empresa'])
export const clientStatus = z.enum(['activo', 'inactivo'])

const optionalText = (max: number) =>
  z.string().trim().max(max).optional().or(z.literal('')).transform((v) => v || undefined)

/** Phone-ish: digits, spaces, dashes, parens, leading +. Kept lenient. */
const phone = z
  .string()
  .trim()
  .max(40)
  .regex(/^[0-9+()\-\s]*$/, 'Teléfono inválido')
  .optional()
  .or(z.literal(''))
  .transform((v) => v || undefined)

export const clientBaseSchema = z.object({
  type: clientType,
  name: z.string().trim().min(2, 'Nombre muy corto').max(160),
  phone,
  whatsapp: phone,
  email: z
    .string()
    .trim()
    .max(254)
    .email('Correo inválido')
    .optional()
    .or(z.literal(''))
    .transform((v) => v || undefined),
  address: optionalText(300),
  notes: optionalText(2000),
  cedula: optionalText(20),
  rnc: optionalText(20),
  contact_person: optionalText(160),
})

export const createClientSchema = clientBaseSchema
export type CreateClientInput = z.infer<typeof createClientSchema>

export const updateClientSchema = clientBaseSchema.extend({
  id: z.string().uuid(),
})
export type UpdateClientInput = z.infer<typeof updateClientSchema>
