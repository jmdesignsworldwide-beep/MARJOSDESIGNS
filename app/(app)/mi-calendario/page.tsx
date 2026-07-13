import { requireAuth } from '@/lib/auth/guards'
import { getMyCalendarOrders, todayDR } from '@/lib/empleado/data'
import { EmployeeCalendar } from '@/components/empleado/EmployeeCalendar'

export const dynamic = 'force-dynamic'

export default async function MiCalendarioPage() {
  await requireAuth()
  const orders = await getMyCalendarOrders()
  return <EmployeeCalendar orders={orders} todayISO={todayDR()} />
}
