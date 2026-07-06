import { CalendarDays } from 'lucide-react'
import { requireAuth } from '@/lib/auth/guards'
import { ModulePlaceholder } from '@/components/ModulePlaceholder'

export const dynamic = 'force-dynamic'

export default async function MiCalendarioPage() {
  await requireAuth()
  return (
    <ModulePlaceholder
      title="Mi Calendario"
      description="Tus entregas y pendientes."
      icon={CalendarDays}
      scope="empleado"
    />
  )
}
