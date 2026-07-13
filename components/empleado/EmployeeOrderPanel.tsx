'use client'

import { useEffect } from 'react'
import { useFormState, useFormStatus } from 'react-dom'
import { User, CalendarClock, ChevronRight, PartyPopper } from 'lucide-react'
import { Modal } from '@/components/ui/Modal'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { useToast } from '@/components/ui/Toast'
import { orderCode, stageMeta, STAGE_FLOW, type OrderStage } from '@/lib/ordenes/format'
import { employeeAdvanceStage, type EmpState } from '@/lib/empleado/actions'
import { dayFull } from '@/lib/calendario/dates'
import type { CalendarOrder } from '@/lib/calendario/types'

const initial: EmpState = {}
const ALLOWED: OrderStage[] = ['en_diseno', 'en_produccion', 'lista']
function nextStage(stage: OrderStage): OrderStage | null {
  const i = STAGE_FLOW.indexOf(stage)
  const n = i >= 0 && i < STAGE_FLOW.length - 1 ? STAGE_FLOW[i + 1] : null
  return n && ALLOWED.includes(n) ? n : null
}
function AdvanceBtn({ label }: { label: string }) {
  const { pending } = useFormStatus()
  return <Button type="submit" loading={pending} className="w-full"><ChevronRight className="h-4 w-4" />{label}</Button>
}

export function EmployeeOrderPanel({ order, onClose }: { order: CalendarOrder | null; onClose: () => void }) {
  const [state, action] = useFormState(employeeAdvanceStage, initial)
  const { toast } = useToast()
  useEffect(() => {
    if (state.ok) { toast({ title: '¡Orden actualizada!', variant: 'success' }); onClose() }
    if (state.error) toast({ title: state.error, variant: 'error' })
  }, [state, toast, onClose])

  if (!order) return null
  const m = stageMeta[order.stage]
  const next = nextStage(order.stage)

  return (
    <Modal open={!!order} onClose={onClose} title={orderCode(order.number)} description={order.summary}>
      <div className="space-y-4">
        <Badge status={m.status}>{m.label}</Badge>
        <div className="grid grid-cols-1 gap-2 text-sm">
          <div className="flex items-center gap-2"><User className="h-4 w-4 text-muted-foreground" /><span className="text-muted-foreground">Cliente:</span><span className="font-medium">{order.clientName ?? 'Sin cliente'}</span></div>
          <div className="flex items-center gap-2"><CalendarClock className="h-4 w-4 text-muted-foreground" /><span className="text-muted-foreground">Entrega:</span><span className="font-medium capitalize">{dayFull(order.deliveryDate)}</span></div>
        </div>
        {order.stage === 'lista' ? (
          <div className="inline-flex items-center gap-1.5 rounded-lg bg-status-ready/10 px-2.5 py-1.5 text-sm font-semibold text-status-ready"><PartyPopper className="h-4 w-4" />Lista para entrega</div>
        ) : next ? (
          <form action={action}>
            <input type="hidden" name="orderId" value={order.id} />
            <input type="hidden" name="stage" value={next} />
            <AdvanceBtn label={`Marcar como ${stageMeta[next].label.toLowerCase()}`} />
          </form>
        ) : null}
      </div>
    </Modal>
  )
}
