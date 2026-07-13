'use server'

import { revalidatePath } from 'next/cache'
import { requireRole } from '@/lib/auth/guards'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { createSupabaseAdminClient } from '@/lib/supabase/admin'
import { logAudit } from '@/lib/auth/audit'
import { businessSchema, alertsSchema, prefsSchema, changePasswordSchema } from '@/lib/validation/settings'

export interface SettingsState {
  error?: string
  fieldErrors?: Record<string, string>
  success?: string
}

/** Pages whose documents/headers read the business identity. */
function revalidateDocs() {
  revalidatePath('/ajustes')
  revalidatePath('/cotizador', 'layout')
  revalidatePath('/ordenes', 'layout')
  revalidatePath('/calendario')
  revalidatePath('/dashboard')
}

function nullify(v?: string) {
  return v && v.trim() !== '' ? v.trim() : null
}

/** Business identity — the single source printed on documents/PDFs. */
export async function updateBusinessData(_prev: SettingsState, formData: FormData): Promise<SettingsState> {
  const admin = await requireRole('super_admin')
  const parsed = businessSchema.safeParse({
    businessName: formData.get('businessName'),
    legalName: formData.get('legalName') ?? '',
    rnc: formData.get('rnc') ?? '',
    address: formData.get('address') ?? '',
    phone: formData.get('phone') ?? '',
    whatsapp: formData.get('whatsapp') ?? '',
    email: formData.get('email') ?? '',
    instagram: formData.get('instagram') ?? '',
  })
  if (!parsed.success) {
    const fe: Record<string, string> = {}
    for (const i of parsed.error.issues) fe[String(i.path[0])] = i.message
    return { error: 'Revisa los campos.', fieldErrors: fe }
  }
  const v = parsed.data

  const supabase = createSupabaseServerClient()
  const { error } = await supabase
    .from('app_settings')
    .update({
      business_name: v.businessName.trim(),
      legal_name: nullify(v.legalName),
      rnc: nullify(v.rnc),
      address: nullify(v.address),
      phone: nullify(v.phone),
      whatsapp: nullify(v.whatsapp),
      email: nullify(v.email),
      instagram: nullify(v.instagram),
      updated_by: admin.id,
    })
    .eq('id', 1)
  if (error) return { error: 'No se pudo guardar los datos del negocio.' }

  await logAudit({ actorId: admin.id, action: 'settings.business', targetType: 'app_settings', targetId: '1', details: { businessName: v.businessName } })
  revalidateDocs()
  return { success: 'Datos del negocio guardados. Ya aparecen en tus documentos.' }
}

/** Delivery-notice days + calendar overload thresholds. */
export async function updateAlerts(_prev: SettingsState, formData: FormData): Promise<SettingsState> {
  const admin = await requireRole('super_admin')
  const rawDays = formData.getAll('notifyDays').map((d) => String(d))
  const parsed = alertsSchema.safeParse({
    notifyDays: rawDays,
    overloadWarn: formData.get('overloadWarn'),
    overloadHeavy: formData.get('overloadHeavy'),
  })
  if (!parsed.success) {
    const fe: Record<string, string> = {}
    for (const i of parsed.error.issues) fe[String(i.path[0])] = i.message
    return { error: parsed.error.issues[0]?.message ?? 'Revisa los campos.', fieldErrors: fe }
  }
  const v = parsed.data
  // Unique, sorted descending (3,1,0) so the horizon is the largest.
  const days = Array.from(new Set(v.notifyDays)).sort((a, b) => b - a)

  const supabase = createSupabaseServerClient()
  const { error } = await supabase
    .from('app_settings')
    .update({ notify_days: days, overload_warn: v.overloadWarn, overload_heavy: v.overloadHeavy, updated_by: admin.id })
    .eq('id', 1)
  if (error) return { error: 'No se pudo guardar las alertas.' }

  await logAudit({ actorId: admin.id, action: 'settings.alerts', targetType: 'app_settings', targetId: '1', details: { notifyDays: days, overloadWarn: v.overloadWarn, overloadHeavy: v.overloadHeavy } })
  revalidateDocs()
  return { success: 'Alertas actualizadas. El sistema ya las usa.' }
}

export async function updatePreferences(_prev: SettingsState, formData: FormData): Promise<SettingsState> {
  const admin = await requireRole('super_admin')
  const parsed = prefsSchema.safeParse({ defaultTheme: formData.get('defaultTheme') })
  if (!parsed.success) return { error: 'Preferencia inválida.' }

  const supabase = createSupabaseServerClient()
  const { error } = await supabase.from('app_settings').update({ default_theme: parsed.data.defaultTheme, updated_by: admin.id }).eq('id', 1)
  if (error) return { error: 'No se pudo guardar la preferencia.' }

  await logAudit({ actorId: admin.id, action: 'settings.prefs', targetType: 'app_settings', targetId: '1', details: { defaultTheme: parsed.data.defaultTheme } })
  revalidatePath('/ajustes')
  return { success: 'Preferencia guardada.' }
}

/** Change Marjos's own password. Server-side, hashed by Supabase Auth; the
 *  plaintext is never logged or persisted anywhere by us. */
export async function changeAdminPassword(_prev: SettingsState, formData: FormData): Promise<SettingsState> {
  const admin = await requireRole('super_admin')
  const parsed = changePasswordSchema.safeParse({
    password: formData.get('password'),
    confirm: formData.get('confirm'),
  })
  if (!parsed.success) {
    const fe: Record<string, string> = {}
    for (const i of parsed.error.issues) fe[String(i.path[0])] = i.message
    return { error: parsed.error.issues[0]?.message ?? 'Revisa los campos.', fieldErrors: fe }
  }

  const supabase = createSupabaseAdminClient()
  const { error } = await supabase.auth.admin.updateUserById(admin.id, { password: parsed.data.password })
  if (error) return { error: 'No se pudo cambiar la contraseña.' }

  // Audit the EVENT only — never the password itself.
  await logAudit({ actorId: admin.id, action: 'settings.password_change', targetType: 'profile', targetId: admin.id })
  return { success: 'Contraseña actualizada. Úsala la próxima vez que inicies sesión.' }
}
