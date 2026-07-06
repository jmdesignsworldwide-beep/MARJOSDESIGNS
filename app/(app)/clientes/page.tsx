import { Users } from 'lucide-react'
import { requireRole } from '@/lib/auth/guards'
import { ModulePlaceholder } from '@/components/ModulePlaceholder'

export const dynamic = 'force-dynamic'

export default async function ClientesPage() {
  await requireRole('super_admin')
  return (
    <ModulePlaceholder
      title="Clientes"
      description="Directorio de clientes."
      icon={Users}
      scope="admin"
    />
  )
}
