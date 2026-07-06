import { Package } from 'lucide-react'
import { requireRole } from '@/lib/auth/guards'
import { ModulePlaceholder } from '@/components/ModulePlaceholder'

export const dynamic = 'force-dynamic'

export default async function InventarioPage() {
  await requireRole('super_admin')
  return (
    <ModulePlaceholder
      title="Inventario"
      description="Materiales y existencias."
      icon={Package}
      scope="admin"
    />
  )
}
