'use client'

import { cn, formatDOP } from '@/lib/utils'
import { Badge } from '@/components/ui/Badge'
import { EmptyState } from '@/components/dashboard/EmptyState'
import { CalendarCheck } from 'lucide-react'
import { dayFull } from '@/lib/calendario/dates'
import { orderCode, stageMeta } from '@/lib/ordenes/format'
import { orderCalState, calStateMeta, noteKindMeta, type CalendarOrder, type CalendarNote } from '@/lib/calendario/types'

export function DayView({
  anchor,
  todayISO,
  orders,
  notes,
  onSelectOrder,
  onEditNote,
}: {
  anchor: string
  todayISO: string
  orders: CalendarOrder[]
  notes: CalendarNote[]
  onSelectOrder: (o: CalendarOrder) => void
  onEditNote: (n: CalendarNote) => void
}) {
  return (
    <div className="space-y-4">
      <p className="text-sm capitalize text-muted-foreground">{dayFull(anchor)}</p>

      {notes.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {notes.map((n) => (
            <button key={n.id} onClick={() => onEditNote(n)} className={cn('rounded-xl border border-dashed px-3 py-1.5 text-sm', noteKindMeta[n.kind].chip)}>
              {noteKindMeta[n.kind].emoji} {n.title}
            </button>
          ))}
        </div>
      )}

      {orders.length === 0 ? (
        <EmptyState icon={CalendarCheck} title="Sin entregas este día" subtitle="Nada prometido para hoy — o ya está todo listo." tone="positive" />
      ) : (
        <ul className="space-y-2">
          {orders.map((o) => {
            const st = orderCalState(o.stage, o.deliveryDate, todayISO)
            const m = calStateMeta[st]
            const sm = stageMeta[o.stage]
            return (
              <li key={o.id}>
                <button onClick={() => onSelectOrder(o)} className="flex w-full items-center gap-3 rounded-2xl border border-border bg-card/60 p-3 text-left transition-colors hover:border-gold-mid/40 dark:border-white/[0.08]">
                  <span className={cn('h-10 w-1.5 shrink-0 rounded-full', m.dot, m.pulse && 'animate-pulse')} />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="tnum text-sm font-bold">{orderCode(o.number)}</span>
                      <Badge status={sm.status}>{sm.label}</Badge>
                      {st === 'vencida' && <span className="text-xs font-semibold text-status-overdue">Vencida</span>}
                    </div>
                    <p className="truncate text-sm">{o.clientName ?? 'Sin cliente'}</p>
                    <p className="truncate text-xs text-muted-foreground">{o.summary}{o.assignedName ? ` · ${o.assignedName}` : ''}</p>
                  </div>
                  <div className="shrink-0 text-right">
                    {o.balance > 0 ? (
                      <span className="tnum text-sm font-bold text-status-overdue">{formatDOP(o.balance)}</span>
                    ) : (
                      <span className="text-xs font-semibold text-status-ready">Pagada ✓</span>
                    )}
                  </div>
                </button>
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}
