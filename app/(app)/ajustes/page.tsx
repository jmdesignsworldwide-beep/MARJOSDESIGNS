import { requireRole } from '@/lib/auth/guards'
import { getSettings } from '@/lib/settings/data'
import { getPinStatus } from '@/lib/security/pin'
import { AjustesBoard } from '@/components/ajustes/AjustesBoard'

export const dynamic = 'force-dynamic'

export default async function AjustesPage() {
  // Doubly guarded: only super_admin reaches this page (employees bounce).
  await requireRole('super_admin')
  const [settings, pin] = await Promise.all([getSettings(), getPinStatus()])
  return <AjustesBoard settings={settings} pinIsSet={pin.isSet} />
}
