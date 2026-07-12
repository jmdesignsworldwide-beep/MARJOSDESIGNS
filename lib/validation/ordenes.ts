import { z } from 'zod'
import { quoteLineSchema } from './cotizador'

/** Create-order input. Reuses the exact line schema from the Cotizador so
 *  the math and validation are identical. Totals are recomputed server-side. */
export const createOrderSchema = z.object({
  clientId: z.string().uuid().nullable().optional(),
  clientName: z.string().trim().max(160).optional().or(z.literal('')),
  assignedTo: z.string().uuid().nullable().optional(),
  deliveryDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'Fecha inválida')
    .optional()
    .or(z.literal(''))
    .transform((v) => v || undefined),
  notes: z.string().trim().max(1000).optional().or(z.literal('')),
  discountType: z.enum(['none', 'amount', 'percent']),
  discountValue: z.coerce.number().finite().min(0).max(100_000_000).default(0),
  items: z.array(quoteLineSchema).min(1, 'Agrega al menos un ítem').max(100),
})
export type CreateOrderInput = z.infer<typeof createOrderSchema>
