'use client'

import { useEffect } from 'react'
import { useFormState, useFormStatus } from 'react-dom'
import { motion } from 'framer-motion'
import { ClipboardList, CheckCircle2, ChevronRight, PartyPopper, CalendarClock } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { EmptyState } from '@/components/dashboard/EmptyState'
import { useToast } from '@/components/ui/Toast'
import { orderCode, stageMeta, STAGE_FLOW, type OrderStage } from '@/lib/ordenes/format'
import { employeeAdvanceStage, type EmpState } from '@/lib/empleado/actions'
import type { EmployeeOrder } from '@/lib/empleado/types'

const initial: EmpState = {}
const ALLOWED: OrderStage[] = ['en_diseno', 'en_produccion', 'lista']

function nextStage(stage: OrderStage): OrderStage | null {
  const i = STAGE_FLOW.indexOf(stage)
  const n = i >= 0 && i < STAGE_FLOW.length - 1 ? STAGE_FLOW[i + 1] : null
  return n && ALLOWED.includes(n) ? n : null
}
function fmtDate(d: string | null) {
  if (!d) return 'Sin fecha'
  return new Date(d + 'T00:00:00').toLocaleDateString('es-DO', { weekday: 'short', day: '2-digit', month: 'short' })
}

function AdvanceBtn({ label }: { label: string }) {
  const { pending } = useFormStatus()
  return <Button type="submit" size="sm" loading={pending}><ChevronRight className="h-4 w-4" />{label}</Button>
}

function OrderRow({ order, todayISO }: { order: EmployeeOrder; todayISO: string }) {
  const [state, action] = useFormState(employeeAdvanceStage, initial)
  const { toast } = useToast()
  const next = nextStage(order.stage)
  const m = stageMeta[order.stage]
  const overdue = order.deliveryDate && order.deliveryDate < todayISO && order.stage !== 'entregada'
  const ready = order.stage === 'lista'

  useEffect(() => {
    if (state.ok) toast({ title: '¡Orden actualizada!', variant: 'success' })
    if (state.error) toast({ title: state.error, variant: 'error' })
  }, [state, toast])

  return (
    <Card className={cn('flex flex-col gap-3', ready && 'border-status-ready/30 bg-status-ready/[0.04]')}>
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <span className="tnum text-sm font-bold">{orderCode(order.number)}</span>
            <Badge status={m.status}>{m.label}</Badge>
            {overdue && <span className="inline-flex items-center gap-1 text-xs font-semibold text-status-overdue"><span className="h-1.5 w-1.5 animate-pulse rounded-full bg-status-overdue" />Vencida</span>}
          </div>
          <p className="mt-1 truncate text-sm font-medium">{order.clientName ?? 'Sin cliente'}</p>
          <p className="truncate text-xs text-muted-foreground">{order.summary}</p>
        </div>
        <div className="flex shrink-0 items-center gap-1 text-xs text-muted-foreground">
          <CalendarClock className="h-3.5 w-3.5" />{fmtDate(order.deliveryDate)}
        </div>
      </div>

      {ready ? (
        <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="inline-flex items-center gap-1.5 self-start rounded-lg bg-status-ready/10 px-2.5 py-1 text-xs font-semibold text-status-ready">
          <PartyPopper className="h-3.5 w-3.5" />Lista para entrega
        </motion.div>
      ) : next ? (
        <form action={action} className="self-start">
          <input type="hidden" name="orderId" value={order.id} />
          <input type="hidden" name="stage" value={next} />
          <AdvanceBtn label={`Marcar como ${stageMeta[next].label.toLowerCase()}`} />
        </form>
      ) : null}
    </Card>
  )
}

export function MisOrdenes({ orders, todayISO }: { orders: EmployeeOrder[]; todayISO: string }) {
  const active = orders.filter((o) => o.stage !== 'entregada')
  const today = active.filter((o) => o.deliveryDate === todayISO)
  const week = active.filter((o) => o.deliveryDate && o.deliveryDate > todayISO && o.deliveryDate <= addDays(todayISO, 6))
  const rest = active.filter((o) => !today.includes(o) && !week.includes(o))
  const done = orders.filter((o) => o.stage === 'entregada')

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">Mis Órdenes</h1>
        <p className="mt-1 text-sm text-muted-foreground">Lo que tienes que sacar. Marca cada orden según avances.</p>
      </div>

      {active.length === 0 ? (
        <EmptyState icon={CheckCircle2} title="Todo al día ✓" subtitle="No tienes órdenes pendientes ahora mismo." tone="positive" />
      ) : (
        <>
          <Section title="Para hoy" orders={today} todayISO={todayISO} accent />
          <Section title="Esta semana" orders={week} todayISO={todayISO} />
          <Section title="Más adelante" orders={rest} todayISO={todayISO} />
        </>
      )}

      {done.length > 0 && (
        <details className="rounded-2xl border border-border p-4 dark:border-white/[0.08]">
          <summary className="cursor-pointer text-sm font-medium text-muted-foreground">Entregadas ({done.length})</summary>
          <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
            {done.map((o) => <OrderRow key={o.id} order={o} todayISO={todayISO} />)}
          </div>
        </details>
      )}
    </div>
  )
}

function Section({ title, orders, todayISO, accent }: { title: string; orders: EmployeeOrder[]; todayISO: string; accent?: boolean }) {
  if (orders.length === 0) return null
  return (
    <div>
      <div className="mb-2 flex items-center gap-2">
        <ClipboardList className={cn('h-4 w-4', accent ? 'text-gold-brand' : 'text-muted-foreground')} />
        <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">{title}</h2>
        <span className="tnum text-xs text-muted-foreground">({orders.length})</span>
      </div>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {orders.map((o) => <OrderRow key={o.id} order={o} todayISO={todayISO} />)}
      </div>
    </div>
  )
}

function addDays(iso: string, n: number): string {
  const d = new Date(iso + 'T00:00:00.000Z')
  d.setUTCDate(d.getUTCDate() + n)
  return d.toISOString().slice(0, 10)
}
