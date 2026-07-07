import { requireRole } from '@/lib/auth/guards'
import { listClients, getClientIntelligence } from '@/lib/clients/data'
import { ClientesList } from '@/components/clientes/ClientesList'
import { ClientIntelligence } from '@/components/clientes/ClientIntelligence'

export const dynamic = 'force-dynamic'

/** Clientes / CRM — super_admin only (server-enforced; employees bounce). */
export default async function ClientesPage() {
  await requireRole('super_admin')
  const [clients, intel] = await Promise.all([listClients(), getClientIntelligence()])

  return (
    <div>
      <ClientesList clients={clients} />
      <ClientIntelligence intel={intel} />
    </div>
  )
}
