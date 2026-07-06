import 'server-only'
import { headers } from 'next/headers'
import { createSupabaseAdminClient } from '@/lib/supabase/admin'

type AccessEvent =
  | 'login_success'
  | 'login_failed'
  | 'logout'
  | 'login_blocked_inactive'

/** Best-effort request context for audit rows. */
export function requestContext() {
  const h = headers()
  const ip =
    h.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    h.get('x-real-ip') ||
    null
  const userAgent = h.get('user-agent') || null
  return { ip, userAgent }
}

/**
 * Append a login-audit row. Uses the service-role client (RLS-bypassing)
 * because failed logins have no session yet, and the table is otherwise
 * unreadable/unwritable by clients. Append-only is enforced at the DB level.
 */
export async function logAccess(params: {
  event: AccessEvent
  userId?: string | null
  emailAttempted?: string | null
}) {
  const { ip, userAgent } = requestContext()
  try {
    const admin = createSupabaseAdminClient()
    await admin.from('access_history').insert({
      user_id: params.userId ?? null,
      email_attempted: params.emailAttempted ?? null,
      event_type: params.event,
      ip,
      user_agent: userAgent,
    })
  } catch {
    // Never let audit logging break the auth flow.
  }
}

/** Append a "who did what" row (user create / edit / deactivate, ...). */
export async function logAudit(params: {
  actorId: string | null
  action: string
  targetType?: string
  targetId?: string
  details?: Record<string, unknown>
}) {
  try {
    const admin = createSupabaseAdminClient()
    await admin.from('audit_log').insert({
      actor_id: params.actorId,
      action: params.action,
      target_type: params.targetType ?? null,
      target_id: params.targetId ?? null,
      details: params.details ?? null,
    })
  } catch {
    // swallow
  }
}

/**
 * Per-USER (email-based) failed-login count within a window. IP-based limits
 * are useless here because Supabase only sees Vercel's IP — so we throttle by
 * the email being attempted.
 */
export async function recentFailedLoginCount(
  email: string,
  windowMinutes = 15,
): Promise<number> {
  try {
    const admin = createSupabaseAdminClient()
    const since = new Date(Date.now() - windowMinutes * 60_000).toISOString()
    const { count } = await admin
      .from('access_history')
      .select('id', { count: 'exact', head: true })
      .eq('event_type', 'login_failed')
      .eq('email_attempted', email.toLowerCase())
      .gte('created_at', since)
    return count ?? 0
  } catch {
    // Fail open would defeat the limiter; fail closed-ish by returning a high
    // number only if we can positively read failures. On error, return 0 so a
    // transient DB blip doesn't lock out a legit user.
    return 0
  }
}
