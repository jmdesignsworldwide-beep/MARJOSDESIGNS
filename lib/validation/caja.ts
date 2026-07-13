import { z } from 'zod'

const money = z.coerce
  .number({ invalid_type_error: 'Monto inválido' })
  .finite('Monto inválido')
  .min(0, 'No puede ser negativo')
  .max(100_000_000, 'Monto demasiado grande')

export const openRegisterSchema = z.object({
  openingFloat: money,
})

export const closeRegisterSchema = z.object({
  registerId: z.string().uuid(),
  countedCash: money,
  note: z.string().trim().max(300).optional().or(z.literal('')),
})

export const cashMethod = z.enum(['efectivo', 'transferencia', 'debito', 'credito'])

export const manualMovementSchema = z.object({
  direction: z.enum(['entrada', 'salida']),
  amount: money.refine((n) => n > 0, 'El monto debe ser mayor que 0'),
  method: cashMethod,
  concept: z.string().trim().min(2, 'Describe el concepto').max(160),
  // A REGISTERED client (or none). No loose free text — the name is resolved
  // server-side from this id.
  clientId: z.string().uuid().optional().or(z.literal('')),
  reference: z.string().trim().max(120).optional().or(z.literal('')),
})
