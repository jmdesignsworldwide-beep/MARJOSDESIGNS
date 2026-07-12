import { z } from 'zod'

const dateStr = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Fecha inválida')

export const rescheduleSchema = z.object({
  orderId: z.string().uuid(),
  deliveryDate: dateStr,
})

export const noteSchema = z.object({
  noteDate: dateStr,
  kind: z.enum(['nota', 'evento', 'feriado']),
  title: z.string().trim().min(2, 'Escribe un título').max(120),
  body: z.string().trim().max(500).optional().or(z.literal('')),
})

export const editNoteSchema = noteSchema.extend({
  id: z.coerce.number().int().positive(),
})
