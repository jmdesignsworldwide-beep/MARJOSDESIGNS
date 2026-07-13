'use server'

import { createClient } from '@supabase/supabase-js'
import { requireRole } from '@/lib/auth/guards'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { logAudit } from '@/lib/auth/audit'
import { hashPin, getPinStatus } from './pin'
import { setPinSchema, changePinSchema } from '@/lib/validation/security'

export interface PinActionState {
  error?: string
  fieldErrors?: Record<string, string>
  success?: string
}

/** Verify the admin's password WITHOUT touching the session (ephemeral client). */
async function verifyPassword(email: string, password: string): Promise<boolean> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  if (!url || !anon) return false
  const check = createClient(url, anon, { auth: { persistSession: false, autoRefreshToken: false } })
  const { error } = await check.auth.signInWithPassword({ email, password })
  return !error
}

/**
 * Set the PIN for the first time, or change it. Changing an existing PIN
 * requires the admin password. The PIN is hashed server-side; the plaintext is
 * never stored or logged.
 */
export async function setOrChangePin(_prev: PinActionState, formData: FormData): Promise<PinActionState> {
  const admin = await requireRole('super_admin')
  const { isSet } = await getPinStatus()

  if (isSet) {
    const parsed = changePinSchema.safeParse({
      password: formData.get('password'),
      pin: formData.get('pin'),
      confirm: formData.get('confirm'),
    })
    if (!parsed.success) {
      const fe: Record<string, string> = {}
      for (const i of parsed.error.issues) fe[String(i.path[0])] = i.message
      return { error: 'Revisa los campos.', fieldErrors: fe }
    }
    const okPass = await verifyPassword(admin.email, parsed.data.password)
    if (!okPass) return { error: 'Contraseña incorrecta.', fieldErrors: { password: 'Contraseña incorrecta.' } }

    await persistPin(parsed.data.pin, admin.id)
    await logAudit({ actorId: admin.id, action: 'settings.pin_change', targetType: 'app_settings', targetId: '1' })
    return { success: 'PIN actualizado.' }
  }

  const parsed = setPinSchema.safeParse({ pin: formData.get('pin'), confirm: formData.get('confirm') })
  if (!parsed.success) {
    const fe: Record<string, string> = {}
    for (const i of parsed.error.issues) fe[String(i.path[0])] = i.message
    return { error: 'Revisa los campos.', fieldErrors: fe }
  }
  await persistPin(parsed.data.pin, admin.id)
  await logAudit({ actorId: admin.id, action: 'settings.pin_set', targetType: 'app_settings', targetId: '1' })
  return { success: 'PIN configurado. Ya puedes usarlo para acciones sensibles.' }
}

async function persistPin(pin: string, adminId: string): Promise<void> {
  const supabase = createSupabaseServerClient()
  await supabase
    .from('app_settings')
    .update({ pin_hash: hashPin(pin), pin_set_at: new Date().toISOString(), pin_failed_attempts: 0, pin_locked_until: null, updated_by: adminId })
    .eq('id', 1)
}
