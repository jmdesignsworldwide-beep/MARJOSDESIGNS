'use client'

import { useState } from 'react'
import Link from 'next/link'
import {
  ArrowLeft, Pencil, User, CalendarClock, CalendarPlus, ExternalLink, Printer,
  Paperclip, History as HistoryIcon,
} from 'lucide-react'
import { formatDOP } from '@/lib/utils'
import { Card, CardHeader } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Modal } from '@/components/ui/Modal'
import { formatSqft } from '@/lib/cotizador/calc'
import { orderCode, stageMeta } from '@/lib/ordenes/format'
import { updateOrderMeta } from '@/app/(app)/ordenes/actions'
import { StageStepper } from './StageStepper'
import { PaymentPanel } from './PaymentPanel'
import { AttachmentsPanel } from './AttachmentsPanel'
import { OrderTimeline } from './OrderTimeline'
import { WhatsAppButton } from '@/components/clientes/WhatsAppButton'
import type { Order, OrderItem } from '@/lib/ordenes/data'
import type { Payment, StageEvent, Attachment } from '@/lib/ordenes/finance'

function itemBreakdown(it: OrderItem) {
  if (it.calc_type === 'area') return `${it.width_in ?? 0} × ${it.height_in ?? 0} pulg (${formatSqft(it.sqft)} pie²) × ${formatDOP(it.unit_price)}`
  return `${it.quantity ?? 0} × ${formatDOP(it.unit_price)}`
}
function fmt(d: string | null, y = false) {
  if (!d) return '—'
  const date = d.length === 10 ? new Date(d + 'T00:00:00') : new Date(d)
  return date.toLocaleDateString('es-DO', { day: '2-digit', month: 'long', ...(y ? { year: 'numeric' } : {}) })
}

export function OrderDetail({
  order, items, employees, payments, stageHistory, attachments, clientWhatsapp,
}: {
  order: Order
  items: OrderItem[]
  employees: { id: string; name: string }[]
  payments: Payment[]
  stageHistory: StageEvent[]
  attachments: Attachment[]
  clientWhatsapp: string | null
}) {
  const [editing, setEditing] = useState(false)
  const m = stageMeta[order.stage]
  const balance = Math.max(0, order.total - order.amount_paid)

  return (
    <div className="space-y-6">
      <div className="no-print flex flex-wrap items-center justify-between gap-3">
        <Link href="/ordenes" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-4 w-4" />Volver a órdenes
        </Link>
        <div className="flex gap-2">
          {order.stage === 'lista' && (
            <WhatsAppButton phone={clientWhatsapp} label="Avisar que está lista" message={`Hola${order.client_name ? ' ' + order.client_name.split(' ')[0] : ''} 👋, tu pedido ${orderCode(order.number)} de Marjos Designs ya está listo para entrega. 🎉`} />
          )}
          <Button variant="secondary" onClick={() => window.print()}><Printer className="h-4 w-4" />Imprimir</Button>
          <Button variant="secondary" onClick={() => setEditing(true)}><Pencil className="h-4 w-4" />Editar</Button>
        </div>
      </div>

      {/* Printable order/recibo */}
      <Card className="print-area">
        <div className="flex flex-wrap items-start justify-between gap-4 border-b border-border pb-4">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="tnum text-2xl font-bold tracking-tight">{orderCode(order.number)}</h1>
              <Badge status={m.status}>{m.label}</Badge>
              {order.source === 'cotizacion' && <span className="rounded-full border border-gold-mid/30 bg-gold-gradient-soft px-2 py-0.5 text-xs text-gold-brand">Desde cotización</span>}
            </div>
            <div className="mt-3 grid grid-cols-1 gap-x-8 gap-y-2 text-sm sm:grid-cols-2">
              <Meta icon={User} label="Cliente">
                {order.client_id ? (
                  <Link href={`/clientes/${order.client_id}`} className="inline-flex items-center gap-1 font-medium text-foreground hover:text-gold-brand">{order.client_name ?? 'Cliente'}<ExternalLink className="h-3 w-3" /></Link>
                ) : <span className="font-medium">{order.client_name ?? 'Sin cliente'}</span>}
              </Meta>
              <Meta icon={User} label="Empleada"><span className="font-medium">{order.assigned_name ?? '—'}</span></Meta>
              <Meta icon={CalendarPlus} label="Creada"><span className="font-medium">{fmt(order.created_at, true)}</span></Meta>
              <Meta icon={CalendarClock} label="Entrega"><span className="font-medium">{fmt(order.delivery_date, true)}</span></Meta>
            </div>
          </div>
          <div className="text-right">
            <p className="text-xs text-muted-foreground">Marjos Designs S.R.L.</p>
            <p className="text-[11px] text-muted-foreground">Comprobante interno (no fiscal)</p>
          </div>
        </div>

        <div className="mt-4 overflow-x-auto">
          <table className="w-full min-w-[460px] border-collapse text-sm">
            <thead>
              <tr className="border-b border-border text-left text-xs uppercase tracking-wider text-muted-foreground">
                <th className="py-2 pr-3 font-semibold">Ítem</th><th className="py-2 px-3 font-semibold">Desglose</th><th className="py-2 pl-3 text-right font-semibold">Subtotal</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {items.map((it) => (
                <tr key={it.id}><td className="py-2.5 pr-3 font-medium">{it.description}</td><td className="tnum py-2.5 px-3 text-muted-foreground">{itemBreakdown(it)}</td><td className="tnum py-2.5 pl-3 text-right font-medium">{formatDOP(it.subtotal)}</td></tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="mt-4 flex flex-col items-end gap-1 text-sm">
          <div className="flex w-full max-w-xs justify-between"><span className="text-muted-foreground">Subtotal</span><span className="tnum font-medium">{formatDOP(order.subtotal)}</span></div>
          {order.discount_type !== 'none' && order.discount_amount > 0 && (
            <div className="flex w-full max-w-xs justify-between"><span className="text-muted-foreground">Descuento{order.discount_type === 'percent' ? ` (${order.discount_value}%)` : ''}</span><span className="tnum font-medium text-status-overdue">− {formatDOP(order.discount_amount)}</span></div>
          )}
          <div className="mt-1 flex w-full max-w-xs items-center justify-between border-t border-border pt-2"><span className="font-semibold">Total</span><span className="tnum text-xl font-bold text-gold-gradient">{formatDOP(order.total)}</span></div>
          <div className="flex w-full max-w-xs justify-between text-status-ready"><span>Pagado</span><span className="tnum font-medium">{formatDOP(order.amount_paid)}</span></div>
          <div className="flex w-full max-w-xs justify-between"><span className="text-muted-foreground">Balance</span><span className="tnum font-semibold">{formatDOP(balance)}</span></div>
        </div>

        {order.notes && (<div className="mt-4 border-t border-border pt-3 text-sm"><p className="text-xs text-muted-foreground">Notas</p><p className="mt-1 whitespace-pre-wrap">{order.notes}</p></div>)}
        {order.stage === 'cancelada' && order.cancel_reason && (<div className="mt-4 rounded-lg border border-status-overdue/30 bg-status-overdue/10 px-3 py-2 text-sm text-status-overdue">Cancelada: {order.cancel_reason}</div>)}
      </Card>

      {/* Interactive (not printed) */}
      <div className="no-print grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <Card><CardHeader title="Etapa de producción" subtitle="Avanza la orden por su ciclo" /><StageStepper orderId={order.id} stage={order.stage} /></Card>
          <Card><CardHeader title="Adjuntos de diseño" subtitle="Privados · solo con enlace firmado" action={<Paperclip className="h-4 w-4 text-muted-foreground" />} /><AttachmentsPanel orderId={order.id} attachments={attachments} /></Card>
          <Card><CardHeader title="Historial de la orden" subtitle="Permanente e inviolable" action={<HistoryIcon className="h-4 w-4 text-muted-foreground" />} /><OrderTimeline order={order} stageHistory={stageHistory} payments={payments} /></Card>
        </div>
        <div className="lg:col-span-1">
          <div className="sticky top-24">
            <Card><CardHeader title="Pago" /><PaymentPanel orderId={order.id} total={order.total} amountPaid={order.amount_paid} payments={payments} /></Card>
          </div>
        </div>
      </div>

      {/* Edit meta modal */}
      <Modal open={editing} onClose={() => setEditing(false)} title="Editar orden" description="Asignación y fecha de entrega. Los montos no se editan — las correcciones de pago quedan auditadas.">
        <form action={updateOrderMeta} className="space-y-4">
          <input type="hidden" name="id" value={order.id} />
          <div className="space-y-1.5"><label className="text-sm font-medium">Empleada asignada</label>
            <select name="assignedTo" defaultValue={order.assigned_to ?? ''} className="h-11 w-full appearance-none rounded-xl border border-border bg-input/5 px-3.5 text-sm outline-none focus:border-gold-mid">{employees.map((e) => <option key={e.id} value={e.id}>{e.name}</option>)}</select>
          </div>
          <div className="space-y-1.5"><label className="text-sm font-medium">Fecha de entrega</label>
            <input type="date" name="deliveryDate" defaultValue={order.delivery_date ?? ''} className="tnum h-11 w-full rounded-xl border border-border bg-input/5 px-3.5 text-sm outline-none focus:border-gold-mid" />
          </div>
          <div className="flex justify-end gap-3 pt-1"><Button type="button" variant="ghost" onClick={() => setEditing(false)}>Cancelar</Button><Button type="submit" onClick={() => setEditing(false)}>Guardar</Button></div>
        </form>
      </Modal>
    </div>
  )
}

function Meta({ icon: Icon, label, children }: { icon: typeof User; label: string; children: React.ReactNode }) {
  return (<div className="flex items-center gap-2"><Icon className="h-4 w-4 shrink-0 text-muted-foreground" /><span className="text-muted-foreground">{label}:</span>{children}</div>)
}
