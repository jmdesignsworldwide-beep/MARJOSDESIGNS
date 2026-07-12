'use client'

import Link from 'next/link'
import { ArrowDownLeft, ArrowUpRight, ExternalLink, Wallet } from 'lucide-react'
import { cn, formatDOP } from '@/lib/utils'
import { EmptyState } from '@/components/dashboard/EmptyState'
import type { CashMovement } from '@/lib/caja/types'
import { methodLabel, sourceLabel, fmtTime } from '@/lib/caja/format'

export function MovementsList({ movements }: { movements: CashMovement[] }) {
  if (movements.length === 0) {
    return (
      <EmptyState
        icon={Wallet}
        title="Sin movimientos todavía"
        subtitle="Cobra una orden o haz una venta rápida — aparecerá aquí al instante."
      />
    )
  }

  return (
    <ul className="divide-y divide-border">
      {movements.map((m) => {
        const out = m.direction === 'salida'
        return (
          <li key={m.id} className="flex items-center gap-3 py-3">
            <span
              className={cn(
                'grid h-9 w-9 shrink-0 place-items-center rounded-xl',
                out ? 'bg-status-overdue/10 text-status-overdue' : 'bg-status-ready/10 text-status-ready',
              )}
            >
              {out ? <ArrowUpRight className="h-4 w-4" /> : <ArrowDownLeft className="h-4 w-4" />}
            </span>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1.5">
                <p className="truncate text-sm font-medium text-foreground">
                  {m.client_name || m.concept || sourceLabel[m.source] || 'Movimiento'}
                </p>
                {m.order_id && m.order_number && (
                  <Link
                    href={`/ordenes/${m.order_id}`}
                    className="inline-flex items-center gap-0.5 text-xs text-gold-brand hover:underline"
                  >
                    #{String(m.order_number).padStart(4, '0')}
                    <ExternalLink className="h-3 w-3" />
                  </Link>
                )}
              </div>
              <p className="truncate text-xs text-muted-foreground">
                {sourceLabel[m.source] ?? m.source} · {methodLabel[m.method]}
                {m.reference ? ` · ${m.reference}` : ''} · {fmtTime(m.created_at)}
              </p>
            </div>
            <p className={cn('tnum shrink-0 text-sm font-semibold', out ? 'text-status-overdue' : 'text-foreground')}>
              {out ? '− ' : ''}
              {formatDOP(m.amount)}
            </p>
          </li>
        )
      })}
    </ul>
  )
}
