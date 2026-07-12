import Link from 'next/link'
import { HandCoins, ExternalLink } from 'lucide-react'
import { formatDOP } from '@/lib/utils'
import { Card, CardHeader } from '@/components/ui/Card'
import { EmptyState } from '@/components/dashboard/EmptyState'
import { WhatsAppButton } from '@/components/clientes/WhatsAppButton'
import type { Receivable } from '@/lib/finanzas/types'

export function ReceivablesCard({ total, rows }: { total: number; rows: Receivable[] }) {
  return (
    <Card>
      <CardHeader title="Por cobrar" subtitle="Balances pendientes — plata que te falta entrar" action={<HandCoins className="h-4 w-4 text-status-overdue" />} />
      {rows.length === 0 ? (
        <EmptyState icon={HandCoins} title="Todo cobrado ✓" subtitle="No hay balances pendientes." tone="positive" />
      ) : (
        <>
          <p className="tnum mb-3 text-2xl font-bold text-status-overdue">{formatDOP(total)}</p>
          <ul className="space-y-2">
            {rows.slice(0, 8).map((r) => (
              <li key={r.orderId} className="flex items-center gap-2 rounded-xl border border-border px-3 py-2 dark:border-white/[0.08]">
                <Link href={`/ordenes/${r.orderId}`} className="min-w-0 flex-1">
                  <p className="flex items-center gap-1 truncate text-sm font-medium">
                    #{String(r.number).padStart(4, '0')} · {r.clientName ?? 'Sin cliente'}
                    <ExternalLink className="h-3 w-3 shrink-0 text-muted-foreground" />
                  </p>
                  <p className="tnum text-xs text-status-overdue">Debe {formatDOP(r.balance)}</p>
                </Link>
                <WhatsAppButton
                  phone={r.whatsapp}
                  size="sm"
                  label="Cobrar"
                  message={`Hola${r.clientName ? ' ' + r.clientName.split(' ')[0] : ''} 👋, te escribo de Marjos Designs por el balance pendiente de tu pedido #${String(r.number).padStart(4, '0')} (${formatDOP(r.balance)}). ¡Gracias!`}
                />
              </li>
            ))}
          </ul>
        </>
      )}
    </Card>
  )
}
