import Link from 'next/link'
import { Crown } from 'lucide-react'
import { formatDOP } from '@/lib/utils'
import { Card, CardHeader } from '@/components/ui/Card'
import { EmptyState } from '@/components/dashboard/EmptyState'
import type { TopClient } from '@/lib/finanzas/types'

export function TopClientsCard({ clients }: { clients: TopClient[] }) {
  return (
    <Card>
      <CardHeader title="Mejores clientes" subtitle="Por total pagado" action={<Crown className="h-4 w-4 text-gold-brand" />} />
      {clients.length === 0 ? (
        <EmptyState icon={Crown} title="Sin clientes aún" subtitle="Cuando cobres, aquí verás quién compra más." />
      ) : (
        <ul className="space-y-2">
          {clients.map((c, i) => {
            const row = (
              <div className="flex items-center gap-3 rounded-xl px-2 py-1.5 transition-colors hover:bg-muted/30">
                <span className="grid h-7 w-7 shrink-0 place-items-center rounded-lg bg-gold-gradient-soft text-xs font-bold text-gold-brand">{i + 1}</span>
                <span className="min-w-0 flex-1 truncate text-sm font-medium">{c.name}</span>
                <span className="tnum shrink-0 text-sm font-semibold">{formatDOP(c.total)}</span>
              </div>
            )
            return (
              <li key={c.clientId ?? c.name}>
                {c.clientId ? <Link href={`/clientes/${c.clientId}`}>{row}</Link> : row}
              </li>
            )
          })}
        </ul>
      )}
    </Card>
  )
}
