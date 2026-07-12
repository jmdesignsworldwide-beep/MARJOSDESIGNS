import { notFound } from 'next/navigation'
import { requireRole } from '@/lib/auth/guards'
import { getOrder, listAssignableUsers } from '@/lib/ordenes/data'
import { OrderDetail } from '@/components/ordenes/OrderDetail'

export const dynamic = 'force-dynamic'

export default async function OrderDetailPage({ params }: { params: { id: string } }) {
  await requireRole('super_admin')
  const [data, employees] = await Promise.all([getOrder(params.id), listAssignableUsers()])
  if (!data) notFound()
  return <OrderDetail order={data.order} items={data.items} employees={employees} />
}
