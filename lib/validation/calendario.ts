import { z } from 'zod'

const dateStr = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Fecha inválida')
const money = z.coerce.number().finite().min(0).max(100_000_000)

export const rescheduleSchema = z.object({
  orderId: z.string().uuid(),
  deliveryDate: dateStr,
})

export const noteSchema = z
  .object({
    noteDate: dateStr,
    kind: z.enum(['nota', 'tarea', 'pago', 'evento', 'feriado']),
    title: z.string().trim().min(2, 'Escribe un título').max(120),
    body: z.string().trim().max(500).optional().or(z.literal('')),
    amount: z.union([z.literal(''), money]).transform((v) => (v === '' ? null : v)),
    recurrence: z.enum(['once', 'weekly', 'monthly']).default('once'),
    recurrenceEnd: z.union([z.literal(''), dateStr]).transform((v) => (v === '' ? null : v)),
  })
  .refine((v) => v.kind !== 'pago' || (v.amount != null && v.amount > 0), {
    message: 'El recordatorio de pago necesita un monto',
    path: ['amount'],
  })
  .refine((v) => !v.recurrenceEnd || v.recurrence === 'monthly', {
    message: 'La fecha de fin es solo para recurrencia mensual',
    path: ['recurrenceEnd'],
  })

export const editNoteSchema = z.object({
  id: z.coerce.number().int().positive(),
  noteDate: dateStr,
  kind: z.enum(['nota', 'tarea', 'pago', 'evento', 'feriado']),
  title: z.string().trim().min(2, 'Escribe un título').max(120),
  body: z.string().trim().max(500).optional().or(z.literal('')),
  amount: z.union([z.literal(''), money]).transform((v) => (v === '' ? null : v)),
  recurrence: z.enum(['once', 'weekly', 'monthly']).default('once'),
  recurrenceEnd: z.union([z.literal(''), dateStr]).transform((v) => (v === '' ? null : v)),
})

/** Per-occurrence actions. */
export const occurrenceSchema = z.object({
  noteId: z.coerce.number().int().positive(),
  occurrenceDate: dateStr,
})

export const payReminderSchema = z.object({
  noteId: z.coerce.number().int().positive(),
  occurrenceDate: dateStr,
  amount: money.refine((n) => n > 0, 'Monto inválido'),
  categoryId: z.string().uuid('Elige una categoría'),
  method: z.enum(['efectivo', 'transferencia', 'debito', 'credito']),
})
