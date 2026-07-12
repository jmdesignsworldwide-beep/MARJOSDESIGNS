import { z } from 'zod'

export const productCostSchema = z.object({
  productId: z.string().uuid(),
  unitCost: z
    .union([z.literal(''), z.coerce.number().finite().min(0).max(100_000_000)])
    .transform((v) => (v === '' ? null : v)),
})
