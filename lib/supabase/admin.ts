import 'server-only'
import { createClient, type SupabaseClient } from '@supabase/supabase-js'

/**
 * Server-only admin client using the SERVICE_ROLE key (bypasses RLS).
 *
 * `server-only` makes importing this from a Client Component a build error,
 * so the secret can never reach the browser bundle. The key must be set as a
 * Sensitive, server-only env var in Vercel (NEVER prefixed NEXT_PUBLIC_).
 *
 * Use ONLY for privileged server operations that legitimately need to bypass
 * RLS: writing append-only audit rows, creating/editing users, and reading
 * failed-login counts for rate limiting. Never expose its results wholesale
 * to a non-admin user.
 */
export function createSupabaseAdminClient(): SupabaseClient {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!url || !serviceRoleKey) {
    throw new Error(
      'Admin client requires NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY.',
    )
  }

  return createClient(url, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  })
}
