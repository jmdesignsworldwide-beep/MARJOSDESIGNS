import { BarChart3 } from 'lucide-react'
import { requireRole } from '@/lib/auth/guards'
import { ModulePlaceholder } from '@/components/ModulePlaceholder'

export const dynamic = 'force-dynamic'

export default async function ReportesPage() {
  await requireRole('super_admin')
  return (
    <ModulePlaceholder
      title="Reportes"
      description="Métricas y finanzas del negocio."
      icon={BarChart3}
      scope="admin"
    />
  )
}
