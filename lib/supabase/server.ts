import 'server-only'
import { createClient, type SupabaseClient } from '@supabase/supabase-js'

/**
 * Server-only Supabase admin client.
 *
 * Uses the SERVICE_ROLE key — full access, bypasses RLS. This module
 * is marked `server-only`: importing it from a Client Component is a
 * build error, so the secret can never reach the browser bundle.
 *
 * The key must be set as a Sensitive, server-only env var in Vercel
 * (NEVER prefixed with NEXT_PUBLIC_).
 */
export function getSupabaseAdminClient(): SupabaseClient {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!url || !serviceRoleKey) {
    throw new Error(
      'Supabase admin client requires NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY.',
    )
  }

  return createClient(url, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  })
}
