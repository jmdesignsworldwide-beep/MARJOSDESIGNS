import { z } from 'zod'

const money = z.coerce.number({ invalid_type_error: 'Monto inválido' }).finite().min(0).max(100_000_000)
const dateStr = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Fecha inválida')

export const setPayrollSchema = z.object({
  profileId: z.string().uuid(),
  weeklySalary: money,
  employmentType: z.enum(['fijo', 'pasante']),
})

export const payWeekSchema = z
  .object({
    profileId: z.string().uuid(),
    weekStart: dateStr,
    weekEnd: dateStr,
    amount: money.refine((n) => n > 0, 'El monto debe ser mayor que 0'),
    deduction: money.default(0),
    method: z.enum(['efectivo', 'transferencia', 'debito', 'credito']),
    note: z.string().trim().max(300).optional().or(z.literal('')),
  })
  .refine((v) => v.deduction <= v.amount, { message: 'La deducción no puede superar el monto', path: ['deduction'] })
  .refine((v) => v.weekEnd >= v.weekStart, { message: 'El fin de semana no puede ser antes del inicio', path: ['weekEnd'] })

export const vacationSchema = z
  .object({
    profileId: z.string().uuid(),
    startDate: dateStr,
    endDate: dateStr,
    note: z.string().trim().max(200).optional().or(z.literal('')),
  })
  .refine((v) => v.endDate >= v.startDate, { message: 'Fin antes del inicio', path: ['endDate'] })
