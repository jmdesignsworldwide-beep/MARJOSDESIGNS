import { z } from 'zod'

const money = z.coerce
  .number({ invalid_type_error: 'Monto inválido' })
  .finite('Monto inválido')
  .gt(0, 'El monto debe ser mayor que 0')
  .max(100_000_000, 'Monto demasiado grande')

export const expenseMethod = z.enum(['efectivo', 'transferencia', 'debito', 'credito'])
export const expenseGroup = z.enum(['produccion', 'negocio', 'personal'])

const dateStr = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, 'Fecha inválida')

const optNum = z.union([z.literal(''), z.coerce.number().finite().min(0).max(100_000_000)])
  .transform((v) => (v === '' ? null : v))

/** One transcribed receipt line (from the vision OCR — the server never trusts
 *  the browser for money; these are stored for the consumption history only). */
export const receiptItemSchema = z.object({
  name: z.string().trim().min(1).max(200),
  quantity: z.union([z.null(), z.coerce.number().finite().min(0).max(1_000_000)]).optional().nullable(),
  unitPrice: z.union([z.null(), z.coerce.number().finite().min(0).max(100_000_000)]).optional().nullable(),
  lineTotal: z.union([z.null(), z.coerce.number().finite().min(0).max(100_000_000)]).optional().nullable(),
})
export const receiptItemsSchema = z.array(receiptItemSchema).max(200)

export const createExpenseSchema = z.object({
  categoryId: z.string().uuid('Elige una subcategoría'),
  description: z.string().trim().min(2, 'Describe el gasto').max(160),
  amount: money,
  expenseDate: dateStr,
  method: expenseMethod,
  vendor: z.string().trim().max(120).optional().or(z.literal('')),
  notes: z.string().trim().max(300).optional().or(z.literal('')),
  isRecurring: z.coerce.boolean().optional(),
  deductFromCaja: z.coerce.boolean().optional(),
  productId: z.string().uuid().optional().or(z.literal('')),
  // OCR: total transcribed from the receipt (the transcribed items travel in a
  // separate JSON field parsed by the action).
  receiptTotal: optNum.optional(),
})

export const editExpenseSchema = createExpenseSchema.extend({
  id: z.coerce.number().int().positive(),
})

export const voidExpenseSchema = z.object({
  id: z.coerce.number().int().positive(),
  reason: z.string().trim().min(3, 'El motivo es obligatorio').max(300),
})

export const addCategorySchema = z.object({
  name: z.string().trim().min(2, 'Nombre muy corto').max(60),
  grp: expenseGroup,
})

export const toggleCategorySchema = z.object({
  id: z.string().uuid(),
  status: z.enum(['activo', 'inactivo']),
})
