import { ClipboardList } from 'lucide-react'
import { requireAuth } from '@/lib/auth/guards'
import { ModulePlaceholder } from '@/components/ModulePlaceholder'

export const dynamic = 'force-dynamic'

export default async function MisOrdenesPage() {
  await requireAuth()
  return (
    <ModulePlaceholder
      title="Mis Órdenes"
      description="Las órdenes asignadas a ti."
      icon={ClipboardList}
      scope="empleado"
    />
  )
}
