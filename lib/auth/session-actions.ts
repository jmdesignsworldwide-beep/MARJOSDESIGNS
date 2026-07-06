'use server'

import { redirect } from 'next/navigation'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { logAccess } from '@/lib/auth/audit'

/** Sign out, record the logout, and return to the login screen. */
export async function logout() {
  const supabase = createSupabaseServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (user) {
    await logAccess({ event: 'logout', userId: user.id, emailAttempted: user.email })
  }
  await supabase.auth.signOut()
  redirect('/login')
}
