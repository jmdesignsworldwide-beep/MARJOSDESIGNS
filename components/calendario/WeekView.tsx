'use client'

import { cn, formatDOP } from '@/lib/utils'
import { weekDates, dayNum, weekdayLabels } from '@/lib/calendario/dates'
import { orderCalState, calStateMeta, noteKindMeta, OVERLOAD_WARN, type CalendarOrder, type CalendarOccurrence } from '@/lib/calendario/types'

export function WeekView({
  anchor,
  todayISO,
  overloadWarn = OVERLOAD_WARN,
  ordersByDate,
  notesByDate,
  onSelectOrder,
  onSelectNote,
  onAddNote,
}: {
  anchor: string
  todayISO: string
  overloadWarn?: number
  ordersByDate: Map<string, CalendarOrder[]>
  notesByDate: Map<string, CalendarOccurrence[]>
  onSelectOrder: (o: CalendarOrder) => void
  onSelectNote: (o: CalendarOccurrence) => void
  onAddNote: (iso: string) => void
}) {
  const days = weekDates(anchor)
  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-7">
      {days.map((iso, i) => {
        const orders = ordersByDate.get(iso) ?? []
        const notes = notesByDate.get(iso) ?? []
        const active = orders.filter((o) => o.stage !== 'entregada')
        const isToday = iso === todayISO
        return (
          <div key={iso} className={cn('flex flex-col rounded-2xl border p-2.5 dark:border-white/[0.08]', isToday ? 'border-gold-mid/40 bg-gold-gradient-soft' : 'border-border')}>
            <div className="mb-2 flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{weekdayLabels[i]}</p>
                <p className={cn('text-lg font-bold', isToday && 'text-gold-brand')}>{dayNum(iso)}</p>
              </div>
              <button type="button" onClick={() => onAddNote(iso)} className="grid h-6 w-6 place-items-center rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground" title="Agregar nota">+</button>
            </div>
            {active.length >= overloadWarn && (
              <p className="mb-1.5 rounded-lg bg-status-overdue/10 px-2 py-1 text-[11px] font-semibold text-status-overdue">⚡ {active.length} entregas</p>
            )}
            <div className="space-y-1.5">
              {orders.map((o) => {
                const m = calStateMeta[orderCalState(o.stage, o.deliveryDate, todayISO)]
                return (
                  <button key={o.id} onClick={() => onSelectOrder(o)} className={cn('block w-full rounded-lg border px-2 py-1.5 text-left transition-transform hover:scale-[1.02]', m.chip)}>
                    <div className="flex items-center gap-1.5">
                      <span className={cn('h-1.5 w-1.5 shrink-0 rounded-full', m.dot, m.pulse && 'animate-pulse')} />
                      <span className="truncate text-xs font-semibold">{o.clientName ?? `#${o.number}`}</span>
                    </div>
                    <p className="truncate text-[11px] text-muted-foreground">{o.summary}</p>
                    {o.balance > 0 && <p className="tnum text-[11px] font-medium text-status-overdue">💰 {formatDOP(o.balance)}</p>}
                  </button>
                )
              })}
              {notes.map((n) => (
                <button key={`${n.noteId}-${n.date}`} onClick={() => onSelectNote(n)} className={cn('block w-full truncate rounded-lg border border-dashed px-2 py-1 text-left text-[11px] transition-transform hover:scale-[1.02]', noteKindMeta[n.kind].chip, n.done && 'opacity-60')}>
                  {noteKindMeta[n.kind].emoji} <span className={cn(n.done && 'line-through')}>{n.title}</span>
                  {n.kind === 'pago' && n.amount != null && <span className="tnum ml-1 font-semibold">{formatDOP(n.amount)}</span>}
                </button>
              ))}
              {orders.length === 0 && notes.length === 0 && <p className="py-2 text-center text-[11px] text-muted-foreground/60">—</p>}
            </div>
          </div>
        )
      })}
    </div>
  )
}
