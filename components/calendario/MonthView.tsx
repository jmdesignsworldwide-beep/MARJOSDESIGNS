'use client'

import { cn } from '@/lib/utils'
import { monthGrid, weekdayLabels, dayNum, sameMonth } from '@/lib/calendario/dates'
import { orderCalState, calStateMeta, noteKindMeta, OVERLOAD_WARN, type CalendarOrder, type CalendarOccurrence } from '@/lib/calendario/types'

export function MonthView({
  anchor,
  todayISO,
  overloadWarn = OVERLOAD_WARN,
  ordersByDate,
  notesByDate,
  onSelectOrder,
  onSelectNote,
  onDayClick,
  onDropOrder,
  canDrag,
}: {
  anchor: string
  todayISO: string
  overloadWarn?: number
  ordersByDate: Map<string, CalendarOrder[]>
  notesByDate: Map<string, CalendarOccurrence[]>
  onSelectOrder: (o: CalendarOrder) => void
  onSelectNote: (o: CalendarOccurrence) => void
  onDayClick: (iso: string) => void
  onDropOrder: (orderId: string, dateISO: string) => void
  canDrag: boolean
}) {
  const weeks = monthGrid(anchor)

  return (
    <div className="overflow-hidden rounded-2xl border border-border dark:border-white/[0.08]">
      <div className="grid grid-cols-7 border-b border-border bg-card/50 dark:border-white/[0.08]">
        {weekdayLabels.map((d) => (
          <div key={d} className="py-2 text-center text-xs font-semibold uppercase tracking-wider text-muted-foreground">{d}</div>
        ))}
      </div>
      <div className="grid grid-cols-7">
        {weeks.flat().map((iso) => {
          const inMonth = sameMonth(iso, anchor)
          const isToday = iso === todayISO
          const orders = ordersByDate.get(iso) ?? []
          const notes = notesByDate.get(iso) ?? []
          const active = orders.filter((o) => o.stage !== 'entregada')
          const overloaded = active.length >= overloadWarn
          return (
            <div
              key={iso}
              onClick={() => onDayClick(iso)}
              onDragOver={(e) => { if (canDrag) e.preventDefault() }}
              onDrop={(e) => {
                if (!canDrag) return
                e.preventDefault()
                const id = e.dataTransfer.getData('text/order')
                if (id) onDropOrder(id, iso)
              }}
              className={cn(
                'group relative min-h-[92px] cursor-pointer border-b border-r border-border p-1.5 transition-colors last:border-r-0 hover:bg-muted/30 dark:border-white/[0.06] sm:min-h-[110px]',
                !inMonth && 'bg-muted/20 text-muted-foreground/50',
              )}
            >
              <div className="flex items-center justify-between">
                <span className={cn('grid h-6 w-6 place-items-center rounded-full text-xs font-medium', isToday && 'bg-gold-gradient font-bold text-charcoal-900')}>
                  {dayNum(iso)}
                </span>
                {overloaded && (
                  <span className="rounded-full bg-status-overdue/10 px-1.5 text-[10px] font-bold text-status-overdue" title={`${active.length} entregas`}>
                    {active.length}⚡
                  </span>
                )}
              </div>

              <div className="mt-1 space-y-1">
                {orders.slice(0, 3).map((o) => {
                  const st = orderCalState(o.stage, o.deliveryDate, todayISO)
                  const m = calStateMeta[st]
                  return (
                    <button
                      key={o.id}
                      draggable={canDrag}
                      onDragStart={(e) => { e.dataTransfer.setData('text/order', o.id); e.dataTransfer.effectAllowed = 'move' }}
                      onClick={(e) => { e.stopPropagation(); onSelectOrder(o) }}
                      className={cn('flex w-full items-center gap-1 truncate rounded-md border px-1.5 py-0.5 text-left text-[11px] font-medium transition-transform hover:scale-[1.02]', m.chip)}
                      title={`${o.clientName ?? 'Cliente'} · ${o.summary}`}
                    >
                      <span className={cn('h-1.5 w-1.5 shrink-0 rounded-full', m.dot, m.pulse && 'animate-pulse')} />
                      <span className="truncate">{o.clientName ?? `#${o.number}`}</span>
                      {o.balance > 0 && <span className="ml-auto shrink-0 text-[9px]">💰</span>}
                    </button>
                  )
                })}
                {orders.length > 3 && <p className="pl-1 text-[10px] text-muted-foreground">+{orders.length - 3} más</p>}
                {notes.slice(0, 2).map((n) => (
                  <button
                    key={`${n.noteId}-${n.date}`}
                    onClick={(e) => { e.stopPropagation(); onSelectNote(n) }}
                    className={cn('flex w-full items-center gap-1 truncate rounded-md border border-dashed px-1.5 py-0.5 text-left text-[11px] transition-transform hover:scale-[1.02]', noteKindMeta[n.kind].chip, n.done && 'opacity-60')}
                    title={n.title}
                  >
                    <span className="shrink-0">{noteKindMeta[n.kind].emoji}</span>
                    <span className={cn('truncate', n.done && 'line-through')}>{n.title}</span>
                  </button>
                ))}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
