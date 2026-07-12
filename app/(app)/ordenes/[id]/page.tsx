import { notFound } from 'next/navigation'
import { requireRole } from '@/lib/auth/guards'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { getOrder, listAssignableUsers } from '@/lib/ordenes/data'
import { listPayments, listStageHistory, listAttachments } from '@/lib/ordenes/finance'
import { OrderDetail } from '@/components/ordenes/OrderDetail'

export const dynamic = 'force-dynamic'

async function getClientWhatsapp(clientId: string | null): Promise<string | null> {
  if (!clientId) return null
  const supabase = createSupabaseServerClient()
  const { data } = await supabase
    .from('clients')
    .select('whatsapp, phone')
    .eq('id', clientId)
    .single()
  return (data?.whatsapp || data?.phone) ?? null
}

export default async function OrderDetailPage({ params }: { params: { id: string } }) {
  await requireRole('super_admin')
  const [data, employees, payments, stageHistory, attachments] = await Promise.all([
    getOrder(params.id),
    listAssignableUsers(),
    listPayments(params.id),
    listStageHistory(params.id),
    listAttachments(params.id),
  ])
  if (!data) notFound()
  const clientWhatsapp = await getClientWhatsapp(data.order.client_id)

  return (
    <OrderDetail
      order={data.order}
      items={data.items}
      employees={employees}
      payments={payments}
      stageHistory={stageHistory}
      attachments={attachments}
      clientWhatsapp={clientWhatsapp}
    />
  )
}
