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

export const createExpenseSchema = z.object({
  categoryId: z.string().uuid('Elige una categoría'),
  description: z.string().trim().min(2, 'Describe el gasto').max(160),
  amount: money,
  expenseDate: dateStr,
  method: expenseMethod,
  vendor: z.string().trim().max(120).optional().or(z.literal('')),
  notes: z.string().trim().max(300).optional().or(z.literal('')),
  isRecurring: z.coerce.boolean().optional(),
  deductFromCaja: z.coerce.boolean().optional(),
  productId: z.string().uuid().optional().or(z.literal('')),
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
