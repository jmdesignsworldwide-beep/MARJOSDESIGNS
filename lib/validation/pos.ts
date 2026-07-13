import { z } from 'zod'
import { cashMethod } from './caja'

const money = z.coerce.number().finite().min(0).max(100_000_000)
const dim = z.coerce.number().finite().min(0).max(100_000)

export const posItemSchema = z
  .object({
    productId: z.string().uuid().nullable().optional(),
    description: z.string().trim().min(1, 'Falta la descripción').max(160),
    calcType: z.enum(['area', 'quantity']).default('quantity'),
    quantity: z.coerce.number().finite().min(0).max(1_000_000).default(1),
    unitPrice: money,
    // Dimensions are ALWAYS in inches by the time they reach the server.
    widthIn: dim.optional(),
    heightIn: dim.optional(),
  })
  .refine((v) => v.calcType !== 'quantity' || v.quantity > 0, {
    message: 'Cantidad inválida',
    path: ['quantity'],
  })
  .refine((v) => v.calcType !== 'area' || ((v.widthIn ?? 0) > 0 && (v.heightIn ?? 0) > 0), {
    message: 'Falta ancho o alto',
    path: ['widthIn'],
  })

export const createSaleSchema = z.object({
  items: z.array(posItemSchema).min(1, 'Agrega al menos un producto'),
  discountType: z.enum(['none', 'amount', 'percent']).default('none'),
  discountValue: z.coerce.number().finite().min(0).default(0),
  method: cashMethod,
  reference: z.string().trim().max(120).optional().or(z.literal('')),
  cashReceived: z.coerce.number().finite().min(0).max(100_000_000).optional(),
  // A REGISTERED client (or none). The name is resolved server-side from this id.
  clientId: z.string().uuid().optional().or(z.literal('')),
})
export type CreateSaleInput = z.infer<typeof createSaleSchema>

export const voidSaleSchema = z.object({
  saleId: z.string().uuid(),
  reason: z.string().trim().min(3, 'El motivo es obligatorio').max(300),
})
