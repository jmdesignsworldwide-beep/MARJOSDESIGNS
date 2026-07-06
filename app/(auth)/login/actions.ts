'use server'

import { redirect } from 'next/navigation'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { loginSchema } from '@/lib/validation/auth'
import { logAccess, recentFailedLoginCount } from '@/lib/auth/audit'

const MAX_FAILED = 5
const WINDOW_MINUTES = 15
// Deliberately generic — never reveal whether the email or the password was wrong.
const GENERIC_ERROR = 'Credenciales inválidas.'

export interface LoginState {
  error?: string
}

/** Only allow internal, single-slash redirect targets. */
function safeRedirect(target: unknown): string {
  if (typeof target === 'string' && target.startsWith('/') && !target.startsWith('//')) {
    return target
  }
  return '/dashboard'
}

export async function login(
  _prev: LoginState,
  formData: FormData,
): Promise<LoginState> {
  const parsed = loginSchema.safeParse({
    email: formData.get('email'),
    password: formData.get('password'),
  })
  if (!parsed.success) {
    return { error: GENERIC_ERROR }
  }
  const { email, password } = parsed.data
  const redirectTo = safeRedirect(formData.get('redirect'))

  // Per-user throttle (email-based; IP is Vercel's, so IP limits are useless).
  const failures = await recentFailedLoginCount(email, WINDOW_MINUTES)
  if (failures >= MAX_FAILED) {
    return {
      error: 'Demasiados intentos fallidos. Espera unos minutos e intenta de nuevo.',
    }
  }

  const supabase = createSupabaseServerClient()
  const { data, error } = await supabase.auth.signInWithPassword({ email, password })

  if (error || !data.user) {
    await logAccess({ event: 'login_failed', emailAttempted: email })
    return { error: GENERIC_ERROR }
  }

  // Credentials are valid — now enforce account status on the SERVER.
  const { data: profile } = await supabase
    .from('profiles')
    .select('status')
    .eq('id', data.user.id)
    .single()

  if (!profile || profile.status !== 'activo') {
    await supabase.auth.signOut()
    await logAccess({
      event: 'login_blocked_inactive',
      userId: data.user.id,
      emailAttempted: email,
    })
    return { error: 'Tu cuenta está inactiva. Contacta al administrador.' }
  }

  await logAccess({ event: 'login_success', userId: data.user.id, emailAttempted: email })

  // redirect() throws NEXT_REDIRECT — keep it outside any try/catch.
  redirect(redirectTo)
}
