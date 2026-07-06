import type { NextRequest } from 'next/server'
import { updateSession } from '@/lib/supabase/middleware'

export async function middleware(request: NextRequest) {
  return updateSession(request)
}

export const config = {
  matcher: [
    /*
     * Run on all paths except static assets and image files. Auth/role
     * gating for pages is enforced here (session) and in server layouts (role).
     */
    '/((?!_next/static|_next/image|favicon.ico|marjos-logo.jpeg|.*\\.(?:png|jpg|jpeg|svg|webp|ico)$).*)',
  ],
}
