import Link from 'next/link'
import { History } from 'lucide-react'
import { requireRole } from '@/lib/auth/guards'
import { getTodayRegister, listMovements, summarize } from '@/lib/caja/data'
import { listClients } from '@/lib/clients/data'
import { CajaBoard } from '@/components/caja/CajaBoard'

export const dynamic = 'force-dynamic'

export default async function CajaPage() {
  await requireRole('super_admin')
  const register = await getTodayRegister()
  const [movements, clients] = await Promise.all([
    register ? listMovements(register.id) : Promise.resolve([]),
    listClients(),
  ])
  const summary = register ? summarize(register, movements) : null
  const clientOptions = clients.filter((c) => c.status === 'activo').map((c) => ({ id: c.id, name: c.name }))

  return (
    <div>
      <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">Caja</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            El dinero del día. Recoge los pagos de órdenes y las ventas rápidas automáticamente.
          </p>
        </div>
        <Link
          href="/caja/historial"
          className="inline-flex items-center gap-1.5 rounded-xl border border-border bg-card/60 px-3.5 py-2 text-sm font-medium text-muted-foreground transition-colors hover:border-gold-mid/50 hover:text-foreground"
        >
          <History className="h-4 w-4" />
          Historial de cajas
        </Link>
      </div>

      <CajaBoard register={register} summary={summary} movements={movements} clients={clientOptions} />
    </div>
  )
}
