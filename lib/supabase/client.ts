'use client'

import { createBrowserClient } from '@supabase/ssr'

/**
 * Browser Supabase client. Uses ONLY public env (URL + anon key).
 * Never import the service-role key here — it would ship to the client.
 */
export function createSupabaseBrowserClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  )
}
