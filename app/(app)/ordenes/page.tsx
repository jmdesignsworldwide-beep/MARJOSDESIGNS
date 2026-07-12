import { requireRole } from '@/lib/auth/guards'
import { listOrders, listAssignableUsers } from '@/lib/ordenes/data'
import { OrdersList } from '@/components/ordenes/OrdersList'

export const dynamic = 'force-dynamic'

export default async function OrdenesPage() {
  await requireRole('super_admin')
  const [orders, employees] = await Promise.all([listOrders(), listAssignableUsers()])
  return <OrdersList orders={orders} employees={employees} />
}
