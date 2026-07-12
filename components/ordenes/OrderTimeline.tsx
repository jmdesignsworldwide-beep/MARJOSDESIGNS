import { PackagePlus, ArrowRight, CreditCard, RotateCcw, XCircle } from 'lucide-react'
import { formatDOP } from '@/lib/utils'
import { stageMeta, methodLabel } from '@/lib/ordenes/format'
import type { Payment, StageEvent } from '@/lib/ordenes/finance'
import type { Order } from '@/lib/ordenes/data'

interface Event {
  at: string
  icon: typeof ArrowRight
  cls: string
  text: string
  who: string | null
}

/** Permanent, inviolable lifecycle: creation + stage changes + payments. */
export function OrderTimeline({
  order,
  stageHistory,
  payments,
}: {
  order: Order
  stageHistory: StageEvent[]
  payments: Payment[]
}) {
  const events: Event[] = []

  events.push({
    at: order.created_at,
    icon: PackagePlus,
    cls: 'text-gold-brand',
    text: `Orden creada${order.source === 'cotizacion' ? ' desde cotización' : ''}`,
    who: order.assigned_name,
  })

  for (const s of stageHistory) {
    if (s.to_stage === 'cancelada') {
      events.push({ at: s.created_at, icon: XCircle, cls: 'text-status-overdue', text: `Cancelada${s.reason ? ` — ${s.reason}` : ''}`, who: s.actor })
    } else {
      events.push({ at: s.created_at, icon: ArrowRight, cls: 'text-status-process', text: `Pasó a "${stageMeta[s.to_stage].label}"`, who: s.actor })
    }
  }

  for (const p of payments) {
    events.push({
      at: p.created_at,
      icon: p.kind === 'reverso' ? RotateCcw : CreditCard,
      cls: p.kind === 'reverso' ? 'text-status-overdue' : 'text-status-ready',
      text: p.kind === 'reverso' ? `Corrección de pago − ${formatDOP(p.amount)}${p.note ? ` (${p.note})` : ''}` : `Pago ${formatDOP(p.amount)} · ${methodLabel[p.method] ?? p.method}`,
      who: p.actor,
    })
  }

  events.sort((a, b) => (a.at < b.at ? -1 : 1))

  return (
    <ol className="relative space-y-4 border-l border-border pl-5">
      {events.map((e, i) => {
        const Icon = e.icon
        return (
          <li key={i} className="relative">
            <span className="absolute -left-[27px] grid h-6 w-6 place-items-center rounded-full border border-border bg-card">
              <Icon className={`h-3 w-3 ${e.cls}`} />
            </span>
            <p className="text-sm text-foreground">{e.text}</p>
            <p className="text-xs text-muted-foreground">
              {new Date(e.at).toLocaleString('es-DO', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
              {e.who ? ` · ${e.who}` : ''}
            </p>
          </li>
        )
      })}
    </ol>
  )
}
