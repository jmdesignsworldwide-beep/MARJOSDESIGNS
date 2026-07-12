import { z } from 'zod'

export const paymentMethod = z.enum(['efectivo', 'transferencia', 'debito', 'credito'])

const money = z.coerce
  .number({ invalid_type_error: 'Monto inválido' })
  .finite('Monto inválido')
  .gt(0, 'El monto debe ser mayor que 0')
  .max(100_000_000, 'Monto demasiado grande')

export const registerPaymentSchema = z.object({
  orderId: z.string().uuid(),
  amount: money,
  method: paymentMethod,
  reference: z.string().trim().max(120).optional().or(z.literal('')),
})
export type RegisterPaymentInput = z.infer<typeof registerPaymentSchema>

export const reversoSchema = z.object({
  orderId: z.string().uuid(),
  amount: money,
  reason: z.string().trim().min(3, 'Explica el motivo').max(300),
})

export const stageValues = z.enum([
  'recibida',
  'en_diseno',
  'en_produccion',
  'lista',
  'entregada',
])

export const cancelSchema = z.object({
  orderId: z.string().uuid(),
  reason: z.string().trim().min(3, 'El motivo es obligatorio').max(300),
})
