import 'server-only'
import { scryptSync, randomBytes, timingSafeEqual } from 'crypto'
import { createSupabaseServerClient } from '@/lib/supabase/server'

/**
 * PIN de seguridad de 4 dígitos — reusable para CUALQUIER acción destructiva
 * (borrar empleados hoy; borrar/editar cajas mañana). El PIN se guarda HASHEADO
 * (scrypt + salt) en app_settings, nunca en texto plano, nunca en el cliente,
 * nunca en logs. Con protección contra fuerza bruta (bloqueo temporal).
 *
 * Para proteger una acción nueva: `const gate = await requirePin(pin); if
 * (!gate.ok) return { error: gate.error }` al inicio del server action. Nada más.
 */

const MAX_ATTEMPTS = 5
const LOCK_MINUTES = 15

export function hashPin(pin: string): string {
  const salt = randomBytes(16)
  const derived = scryptSync(pin, salt, 32)
  return `${salt.toString('hex')}:${derived.toString('hex')}`
}

function verifyHash(pin: string, stored: string): boolean {
  const [saltHex, hashHex] = stored.split(':')
  if (!saltHex || !hashHex) return false
  const salt = Buffer.from(saltHex, 'hex')
  const expected = Buffer.from(hashHex, 'hex')
  const actual = scryptSync(pin, salt, 32)
  return actual.length === expected.length && timingSafeEqual(actual, expected)
}

export async function getPinStatus(): Promise<{ isSet: boolean }> {
  const supabase = createSupabaseServerClient()
  const { data } = await supabase.from('app_settings').select('pin_hash').eq('id', 1).maybeSingle()
  return { isSet: !!(data as { pin_hash: string | null } | null)?.pin_hash }
}

export type RequirePinResult = { ok: true } | { ok: false; error: string }

/**
 * Validate a 4-digit PIN with brute-force protection. SERVER-ONLY. Resets the
 * failure counter on success; locks for LOCK_MINUTES after MAX_ATTEMPTS fails.
 */
export async function requirePin(pin: string): Promise<RequirePinResult> {
  const supabase = createSupabaseServerClient()
  const { data } = await supabase
    .from('app_settings')
    .select('pin_hash, pin_failed_attempts, pin_locked_until')
    .eq('id', 1)
    .maybeSingle()
  const row = data as { pin_hash: string | null; pin_failed_attempts: number; pin_locked_until: string | null } | null
  if (!row?.pin_hash) return { ok: false, error: 'Configura tu PIN de seguridad en Ajustes primero.' }

  const now = Date.now()
  if (row.pin_locked_until && new Date(row.pin_locked_until).getTime() > now) {
    const mins = Math.max(1, Math.ceil((new Date(row.pin_locked_until).getTime() - now) / 60000))
    return { ok: false, error: `Demasiados intentos. Intenta de nuevo en ${mins} min.` }
  }

  if (verifyHash(pin, row.pin_hash)) {
    if (row.pin_failed_attempts > 0 || row.pin_locked_until) {
      await supabase.from('app_settings').update({ pin_failed_attempts: 0, pin_locked_until: null }).eq('id', 1)
    }
    return { ok: true }
  }

  const attempts = (row.pin_failed_attempts ?? 0) + 1
  if (attempts >= MAX_ATTEMPTS) {
    const until = new Date(now + LOCK_MINUTES * 60_000).toISOString()
    await supabase.from('app_settings').update({ pin_failed_attempts: 0, pin_locked_until: until }).eq('id', 1)
    return { ok: false, error: `PIN incorrecto. Por seguridad se bloqueó ${LOCK_MINUTES} minutos.` }
  }
  await supabase.from('app_settings').update({ pin_failed_attempts: attempts }).eq('id', 1)
  return { ok: false, error: `PIN incorrecto. Te queda${MAX_ATTEMPTS - attempts === 1 ? '' : 'n'} ${MAX_ATTEMPTS - attempts} intento(s).` }
}
