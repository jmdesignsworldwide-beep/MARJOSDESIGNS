import { z } from 'zod'

export const calcType = z.enum(['area', 'quantity'])
export const discountType = z.enum(['none', 'amount', 'percent'])

const money = z.coerce
  .number({ invalid_type_error: 'Número inválido' })
  .finite('Número inválido')
  .min(0, 'No puede ser negativo')
  .max(100_000_000, 'Valor demasiado grande')

const dimension = z.coerce
  .number({ invalid_type_error: 'Número inválido' })
  .finite('Número inválido')
  .gt(0, 'Debe ser mayor que 0')
  .max(100_000, 'Valor demasiado grande')

/** One line of a quote (server validates before recalculating). */
export const quoteLineSchema = z
  .object({
    productId: z.string().uuid().nullable().optional(),
    description: z.string().trim().min(1, 'Falta el producto').max(200),
    calcType,
    widthIn: z.coerce.number().finite().min(0).max(100_000).optional(),
    heightIn: z.coerce.number().finite().min(0).max(100_000).optional(),
    quantity: z.coerce.number().finite().min(0).max(1_000_000).optional(),
    unitPrice: money,
  })
  .superRefine((v, ctx) => {
    if (v.calcType === 'area') {
      if (!v.widthIn || v.widthIn <= 0)
        ctx.addIssue({ code: 'custom', path: ['widthIn'], message: 'Ancho requerido' })
      if (!v.heightIn || v.heightIn <= 0)
        ctx.addIssue({ code: 'custom', path: ['heightIn'], message: 'Alto requerido' })
    } else {
      if (!v.quantity || v.quantity <= 0)
        ctx.addIssue({ code: 'custom', path: ['quantity'], message: 'Cantidad requerida' })
    }
  })

export const saveQuoteSchema = z.object({
  clientId: z.string().uuid().nullable().optional(),
  clientName: z.string().trim().max(160).optional().or(z.literal('')),
  notes: z.string().trim().max(1000).optional().or(z.literal('')),
  discountType,
  discountValue: money.default(0),
  lines: z.array(quoteLineSchema).min(1, 'Agrega al menos un producto').max(100),
})
export type SaveQuoteInput = z.infer<typeof saveQuoteSchema>

/** Panel de precios */
export const productCreateSchema = z.object({
  name: z.string().trim().min(2, 'Nombre muy corto').max(120),
  calcType,
  basePrice: money,
})
export type ProductCreateInput = z.infer<typeof productCreateSchema>

export const productPriceSchema = z.object({
  id: z.string().uuid(),
  basePrice: money,
})

// dimension is exported for potential reuse in the client
export { money as moneySchema, dimension as dimensionSchema }
