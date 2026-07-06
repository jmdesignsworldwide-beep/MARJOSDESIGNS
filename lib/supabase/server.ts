import 'server-only'
import { cookies } from 'next/headers'
import { createServerClient, type CookieOptions } from '@supabase/ssr'

type CookieToSet = { name: string; value: string; options: CookieOptions }

/**
 * Server Supabase client bound to the request cookies. Use inside Server
 * Components, Route Handlers and Server Actions. Runs as the signed-in
 * user (anon key + their JWT) so RLS applies — this is the least-privilege
 * client and should be the default everywhere.
 *
 * Cookie writes throw when called from a Server Component render (you can
 * only set cookies in an Action or Route Handler); we swallow that case so
 * read-only usage in components keeps working. Session refresh happens in
 * middleware.
 */
export function createSupabaseServerClient() {
  const cookieStore = cookies()

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet: CookieToSet[]) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options),
            )
          } catch {
            // Called from a Server Component render — ignore; middleware refreshes.
          }
        },
      },
    },
  )
}
