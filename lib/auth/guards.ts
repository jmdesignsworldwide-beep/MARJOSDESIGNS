import 'server-only'
import { redirect } from 'next/navigation'
import { cache } from 'react'
import { createSupabaseServerClient } from '@/lib/supabase/server'

export type UserRole = 'super_admin' | 'empleado'
export type UserStatus = 'activo' | 'inactivo'

export interface Profile {
  id: string
  email: string
  full_name: string
  role: UserRole
  position: string | null
  status: UserStatus
  phone: string | null
  hire_date: string | null
}

/**
 * The current user's profile, or null. Memoized per-request (React cache)
 * so multiple guards/components don't re-query. RLS guarantees the row can
 * only be the caller's own (or, for super_admin, anyone's — but here we
 * always filter by their own id).
 */
export const getCurrentProfile = cache(async (): Promise<Profile | null> => {
  const supabase = createSupabaseServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return null

  const { data: profile } = await supabase
    .from('profiles')
    .select('id, email, full_name, role, position, status, phone, hire_date')
    .eq('id', user.id)
    .single()

  return (profile as Profile) ?? null
})

/**
 * Require an authenticated, ACTIVE user. Redirects to /login otherwise.
 * A user whose status flipped to `inactivo` mid-session is bounced out too
 * (defense in depth — the login action also blocks inactive sign-ins).
 */
export async function requireAuth(): Promise<Profile> {
  const profile = await getCurrentProfile()
  if (!profile) redirect('/login')
  if (profile.status !== 'activo') redirect('/login?error=inactivo')
  return profile
}

/**
 * Require a specific role (server-side enforcement). An employee hitting an
 * admin-only route by typing the URL is redirected to their dashboard — the
 * page never renders for them.
 */
export async function requireRole(role: UserRole): Promise<Profile> {
  const profile = await requireAuth()
  if (profile.role !== role) redirect('/dashboard')
  return profile
}
