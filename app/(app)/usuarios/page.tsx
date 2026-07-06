import { requireRole } from '@/lib/auth/guards'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import type { Profile } from '@/lib/auth/guards'
import { UsuariosManager } from './UsuariosManager'
import { AccessHistory, type AccessRow } from './AccessHistory'

export const dynamic = 'force-dynamic'

export default async function UsuariosPage() {
  const me = await requireRole('super_admin')
  const supabase = createSupabaseServerClient()

  // super_admin RLS allows reading all profiles + the access history.
  const [{ data: users }, { data: history }] = await Promise.all([
    supabase
      .from('profiles')
      .select('id, email, full_name, role, position, status, phone, hire_date')
      .order('created_at', { ascending: true }),
    supabase
      .from('access_history')
      .select('id, user_id, email_attempted, event_type, ip, created_at')
      .order('created_at', { ascending: false })
      .limit(40),
  ])

  return (
    <div className="space-y-8">
      <UsuariosManager
        users={(users as Profile[]) ?? []}
        currentUserId={me.id}
      />
      <AccessHistory rows={(history as AccessRow[]) ?? []} />
    </div>
  )
}
