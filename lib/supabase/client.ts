import { createClient, type SupabaseClient } from '@supabase/supabase-js'

/**
 * Browser-safe Supabase client. Uses ONLY public env vars
 * (URL + anon key). Never import the service-role key here.
 *
 * Returns a memoized singleton, or null if env is not configured
 * yet (this Tanda has no data/auth wired up — it just proves the
 * connection is ready). Guard usage with the returned value.
 */
let browserClient: SupabaseClient | null = null

export function getSupabaseBrowserClient(): SupabaseClient | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (!url || !anonKey) return null
  if (browserClient) return browserClient

  browserClient = createClient(url, anonKey, {
    auth: { persistSession: true, autoRefreshToken: true },
  })
  return browserClient
}
