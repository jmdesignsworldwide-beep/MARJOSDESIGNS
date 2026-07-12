import { z } from 'zod'
import { cashMethod } from './caja'

const money = z.coerce.number().finite().min(0).max(100_000_000)

export const posItemSchema = z.object({
  productId: z.string().uuid().nullable().optional(),
  description: z.string().trim().min(1, 'Falta la descripción').max(160),
  quantity: z.coerce.number().finite().gt(0, 'Cantidad inválida').max(1_000_000),
  unitPrice: money,
})

export const createSaleSchema = z.object({
  items: z.array(posItemSchema).min(1, 'Agrega al menos un producto'),
  discountType: z.enum(['none', 'amount', 'percent']).default('none'),
  discountValue: z.coerce.number().finite().min(0).default(0),
  method: cashMethod,
  reference: z.string().trim().max(120).optional().or(z.literal('')),
  cashReceived: z.coerce.number().finite().min(0).max(100_000_000).optional(),
  clientName: z.string().trim().max(120).optional().or(z.literal('')),
})
export type CreateSaleInput = z.infer<typeof createSaleSchema>

export const voidSaleSchema = z.object({
  saleId: z.string().uuid(),
  reason: z.string().trim().min(3, 'El motivo es obligatorio').max(300),
})
