import { Calculator } from 'lucide-react'
import { requireRole } from '@/lib/auth/guards'
import { ModulePlaceholder } from '@/components/ModulePlaceholder'

export const dynamic = 'force-dynamic'

export default async function CotizadorPage() {
  await requireRole('super_admin')
  return (
    <ModulePlaceholder
      title="Cotizador"
      description="Genera cotizaciones para clientes."
      icon={Calculator}
      scope="admin"
    />
  )
}
