'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useFormState, useFormStatus } from 'react-dom'
import { User, CalendarClock, ExternalLink, CheckCircle2, PackageCheck, CalendarDays } from 'lucide-react'
import { cn, formatDOP } from '@/lib/utils'
import { Modal } from '@/components/ui/Modal'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { useToast } from '@/components/ui/Toast'
import { orderCode, stageMeta } from '@/lib/ordenes/format'
import { advanceStage } from '@/app/(app)/ordenes/manage-actions'
import { rescheduleOrder, type CalState } from '@/lib/calendario/actions'
import { orderCalState, calStateMeta, type CalendarOrder } from '@/lib/calendario/types'
import { dayFull } from '@/lib/calendario/dates'

const initial: CalState = {}

function StageBtn({ label, icon: Icon }: { label: string; icon: typeof CheckCircle2 }) {
  const { pending } = useFormStatus()
  return <Button type="submit" loading={pending} className="w-full"><Icon className="h-4 w-4" />{label}</Button>
}
function RescheduleBtn() {
  const { pending } = useFormStatus()
  return <Button type="submit" variant="secondary" loading={pending}><CalendarDays className="h-4 w-4" />Reprogramar</Button>
}

export function OrderPanel({ order, todayISO, onClose }: { order: CalendarOrder | null; todayISO: string; onClose: () => void }) {
  const [reschedOpen, setReschedOpen] = useState(false)
  const [newDate, setNewDate] = useState('')
  const [rs, rescheduleAction] = useFormState(rescheduleOrder, initial)
  const { toast } = useToast()

  useEffect(() => {
    if (order) { setReschedOpen(false); setNewDate(order.deliveryDate) }
  }, [order])
  useEffect(() => {
    if (rs.ok) { toast({ title: 'Entrega reprogramada', variant: 'success' }); onClose() }
    if (rs.error) toast({ title: rs.error, variant: 'error' })
  }, [rs, toast, onClose])

  if (!order) return null
  const state = orderCalState(order.stage, order.deliveryDate, todayISO)
  const meta = stageMeta[order.stage]

  return (
    <Modal open={!!order} onClose={onClose} title={orderCode(order.number)} description={order.summary}>
      <div className="space-y-4">
        <div className="flex flex-wrap items-center gap-2">
          <Badge status={meta.status}>{meta.label}</Badge>
          {state === 'vencida' && <span className="inline-flex items-center gap-1 rounded-full bg-status-overdue/10 px-2 py-0.5 text-xs font-semibold text-status-overdue"><span className="h-1.5 w-1.5 animate-pulse rounded-full bg-status-overdue" />Vencida</span>}
        </div>

        <div className="grid grid-cols-1 gap-2 text-sm sm:grid-cols-2">
          <Meta icon={User} label="Cliente">
            {order.clientId ? (
              <Link href={`/clientes/${order.clientId}`} className="font-medium text-foreground hover:text-gold-brand">{order.clientName ?? 'Cliente'}</Link>
            ) : <span className="font-medium">{order.clientName ?? 'Sin cliente'}</span>}
          </Meta>
          <Meta icon={User} label="Empleada"><span className="font-medium">{order.assignedName ?? '—'}</span></Meta>
          <Meta icon={CalendarClock} label="Entrega"><span className="font-medium capitalize">{dayFull(order.deliveryDate)}</span></Meta>
        </div>

        {/* Money on the calendar */}
        <div className={cn('flex items-center justify-between rounded-xl border px-3.5 py-2.5', order.balance > 0 ? 'border-status-overdue/30 bg-status-overdue/10' : 'border-status-ready/30 bg-status-ready/10')}>
          <span className="text-sm font-medium text-muted-foreground">{order.balance > 0 ? 'Balance por cobrar' : 'Pagada'}</span>
          <span className={cn('tnum font-bold', order.balance > 0 ? 'text-status-overdue' : 'text-status-ready')}>
            {order.balance > 0 ? formatDOP(order.balance) : '✓ ' + formatDOP(order.total)}
          </span>
        </div>

        {/* Stage actions */}
        {order.stage !== 'entregada' && (
          <div className="space-y-2">
            {(order.stage === 'recibida' || order.stage === 'en_diseno' || order.stage === 'en_produccion') && (
              <form action={advanceStage} onSubmit={onClose}>
                <input type="hidden" name="orderId" value={order.id} />
                <input type="hidden" name="stage" value="lista" />
                <StageBtn label="Marcar lista para entrega" icon={CheckCircle2} />
              </form>
            )}
            {order.stage === 'lista' && (
              <form action={advanceStage} onSubmit={onClose}>
                <input type="hidden" name="orderId" value={order.id} />
                <input type="hidden" name="stage" value="entregada" />
                <StageBtn label="Marcar entregada y pagada" icon={PackageCheck} />
              </form>
            )}
          </div>
        )}

        {/* Reschedule + link */}
        {!reschedOpen ? (
          <div className="flex flex-wrap gap-2">
            <Button variant="secondary" onClick={() => setReschedOpen(true)}><CalendarDays className="h-4 w-4" />Reprogramar entrega</Button>
            <Link href={`/ordenes/${order.id}`} className="inline-flex"><Button variant="ghost">Ver orden completa<ExternalLink className="h-4 w-4" /></Button></Link>
          </div>
        ) : (
          <form action={rescheduleAction} className="flex flex-wrap items-end gap-2 rounded-xl border border-border p-3 dark:border-white/[0.08]">
            <input type="hidden" name="orderId" value={order.id} />
            <div className="flex-1">
              <label className="mb-1 block text-xs font-medium text-muted-foreground">Nueva fecha de entrega</label>
              <input type="date" name="deliveryDate" value={newDate} onChange={(e) => setNewDate(e.target.value)} className="tnum h-10 w-full rounded-xl border border-border bg-input/5 px-3 text-sm outline-none focus:border-gold-mid" required />
            </div>
            <RescheduleBtn />
            <Button type="button" variant="ghost" onClick={() => setReschedOpen(false)}>Cancelar</Button>
          </form>
        )}
      </div>
    </Modal>
  )
}

function Meta({ icon: Icon, label, children }: { icon: typeof User; label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-2">
      <Icon className="h-4 w-4 shrink-0 text-muted-foreground" />
      <span className="text-muted-foreground">{label}:</span>
      {children}
    </div>
  )
}
