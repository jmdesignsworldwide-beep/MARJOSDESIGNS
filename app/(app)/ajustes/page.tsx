import { Settings } from 'lucide-react'
import { requireRole } from '@/lib/auth/guards'
import { ModulePlaceholder } from '@/components/ModulePlaceholder'

export const dynamic = 'force-dynamic'

export default async function AjustesPage() {
  await requireRole('super_admin')
  return (
    <ModulePlaceholder
      title="Ajustes"
      description="Configuración del sistema."
      icon={Settings}
      scope="admin"
    />
  )
}
