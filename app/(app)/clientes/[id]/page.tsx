import { notFound } from 'next/navigation'
import { requireRole } from '@/lib/auth/guards'
import { getClient, getClientStats } from '@/lib/clients/data'
import { ClientProfile } from '@/components/clientes/ClientProfile'

export const dynamic = 'force-dynamic'

export default async function ClientDetailPage({
  params,
}: {
  params: { id: string }
}) {
  await requireRole('super_admin')

  const client = await getClient(params.id)
  if (!client) notFound()

  const stats = await getClientStats(params.id)
  return <ClientProfile client={client} stats={stats} />
}
