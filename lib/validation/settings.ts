import { z } from 'zod'

const optText = (max: number) => z.string().trim().max(max).optional().or(z.literal(''))

export const businessSchema = z.object({
  businessName: z.string().trim().min(2, 'El nombre del negocio es obligatorio').max(120),
  legalName: optText(160),
  rnc: optText(40),
  address: optText(240),
  phone: optText(40),
  whatsapp: optText(40),
  email: z.union([z.literal(''), z.string().trim().email('Correo inválido').max(254)]),
  instagram: optText(80),
})
export type BusinessInput = z.infer<typeof businessSchema>

/** Alerts: delivery-notice days (0..30) + calendar overload thresholds. */
export const alertsSchema = z
  .object({
    notifyDays: z
      .array(z.coerce.number().int().min(0).max(30))
      .min(1, 'Elige al menos un día de anticipación')
      .max(6),
    overloadWarn: z.coerce.number().int().min(1, 'Mínimo 1').max(50),
    overloadHeavy: z.coerce.number().int().min(1).max(50),
  })
  .refine((v) => v.overloadHeavy >= v.overloadWarn, {
    message: 'El umbral alto debe ser mayor o igual al de aviso',
    path: ['overloadHeavy'],
  })
export type AlertsInput = z.infer<typeof alertsSchema>

export const prefsSchema = z.object({
  defaultTheme: z.enum(['light', 'dark', 'system']),
})

export const changePasswordSchema = z
  .object({
    password: z.string().min(8, 'Mínimo 8 caracteres').max(128),
    confirm: z.string().min(1, 'Confirma la contraseña'),
  })
  .refine((v) => v.password === v.confirm, {
    message: 'Las contraseñas no coinciden',
    path: ['confirm'],
  })
