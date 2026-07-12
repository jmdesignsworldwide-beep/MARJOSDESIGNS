import { requireRole } from '@/lib/auth/guards'
import { listCalendarOrders, listCalendarNotes, todayDR } from '@/lib/calendario/data'
import { CalendarBoard } from '@/components/calendario/CalendarBoard'

export const dynamic = 'force-dynamic'

export default async function CalendarioPage() {
  await requireRole('super_admin')
  const [orders, notes] = await Promise.all([listCalendarOrders(), listCalendarNotes()])
  return <CalendarBoard orders={orders} notes={notes} todayISO={todayDR()} />
}
