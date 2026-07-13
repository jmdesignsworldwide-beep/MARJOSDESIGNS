import { requireAuth } from '@/lib/auth/guards'
import { getMyOrders, todayDR } from '@/lib/empleado/data'
import { MisOrdenes } from '@/components/empleado/MisOrdenes'

export const dynamic = 'force-dynamic'

export default async function MisOrdenesPage() {
  await requireAuth()
  const orders = await getMyOrders()
  return <MisOrdenes orders={orders} todayISO={todayDR()} />
}
