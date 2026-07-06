import { ClipboardList } from 'lucide-react'
import { requireRole } from '@/lib/auth/guards'
import { ModulePlaceholder } from '@/components/ModulePlaceholder'

export const dynamic = 'force-dynamic'

export default async function OrdenesPage() {
  await requireRole('super_admin')
  return (
    <ModulePlaceholder
      title="Órdenes"
      description="Todas las órdenes del taller."
      icon={ClipboardList}
      scope="admin"
    />
  )
}
