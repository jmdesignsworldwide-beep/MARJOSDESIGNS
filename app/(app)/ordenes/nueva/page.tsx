import { requireRole } from '@/lib/auth/guards'
import { listProducts } from '@/lib/cotizador/data'
import { listClients } from '@/lib/clients/data'
import { listAssignableUsers } from '@/lib/ordenes/data'
import { OrderBuilder } from '@/components/ordenes/OrderBuilder'

export const dynamic = 'force-dynamic'

export default async function NuevaOrdenPage() {
  const admin = await requireRole('super_admin')
  const [products, clients, employees] = await Promise.all([
    listProducts(),
    listClients(),
    listAssignableUsers(),
  ])

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">Nueva orden</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Arma la orden desde cero — mismo cálculo exacto del cotizador.
        </p>
      </div>
      <OrderBuilder
        products={products}
        clients={clients.filter((c) => c.status === 'activo').map((c) => ({ id: c.id, name: c.name }))}
        employees={employees}
        defaultAssignee={admin.id}
      />
    </div>
  )
}
