'use client'

import { useRef, useState } from 'react'
import Link from 'next/link'
import { useInView } from 'framer-motion'
import {
  ArrowLeft, Pencil, User, CalendarClock, CalendarPlus, ExternalLink,
  CreditCard, Workflow, Paperclip, Bell,
} from 'lucide-react'
import { formatDOP } from '@/lib/utils'
import { useCountUp } from '@/lib/hooks/useCountUp'
import { Card, CardHeader } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Modal } from '@/components/ui/Modal'
import { formatSqft } from '@/lib/cotizador/calc'
import { orderCode, stageMeta } from '@/lib/ordenes/format'
import { updateOrderMeta } from '@/app/(app)/ordenes/actions'
import type { Order, OrderItem } from '@/lib/ordenes/data'

function itemBreakdown(it: OrderItem) {
  if (it.calc_type === 'area') {
    return `${it.width_in ?? 0} × ${it.height_in ?? 0} pulg (${formatSqft(it.sqft)} pie²) × ${formatDOP(it.unit_price)}`
  }
  return `${it.quantity ?? 0} × ${formatDOP(it.unit_price)}`
}

function fmt(d: string | null, withYear = false) {
  if (!d) return '—'
  const date = d.length === 10 ? new Date(d + 'T00:00:00') : new Date(d)
  return date.toLocaleDateString('es-DO', { day: '2-digit', month: 'long', ...(withYear ? { year: 'numeric' } : {}) })
}

export function OrderDetail({
  order,
  items,
  employees,
}: {
  order: Order
  items: OrderItem[]
  employees: { id: string; name: string }[]
}) {
  const [editing, setEditing] = useState(false)
  const ref = useRef<HTMLSpanElement>(null)
  const inView = useInView(ref, { once: true, amount: 0.5 })
  const total = useCountUp({ to: order.total, start: inView })
  const m = stageMeta[order.stage]

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Link href="/ordenes" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-4 w-4" />
          Volver a órdenes
        </Link>
        <Button variant="secondary" onClick={() => setEditing(true)}>
          <Pencil className="h-4 w-4" />
          Editar
        </Button>
      </div>

      {/* Header */}
      <Card>
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-3">
              <h1 className="tnum text-2xl font-bold tracking-tight">{orderCode(order.number)}</h1>
              <Badge status={m.status}>{m.label}</Badge>
              {order.source === 'cotizacion' && (
                <span className="rounded-full border border-gold-mid/30 bg-gold-gradient-soft px-2 py-0.5 text-xs text-gold-brand">
                  Desde cotización
                </span>
              )}
            </div>
            <div className="mt-3 grid grid-cols-1 gap-x-8 gap-y-2 text-sm sm:grid-cols-2">
              <Meta icon={User} label="Cliente">
                {order.client_id ? (
                  <Link href={`/clientes/${order.client_id}`} className="inline-flex items-center gap-1 font-medium text-foreground hover:text-gold-brand">
                    {order.client_name ?? 'Cliente'}
                    <ExternalLink className="h-3 w-3" />
                  </Link>
                ) : (
                  <span className="font-medium">{order.client_name ?? 'Sin cliente'}</span>
                )}
              </Meta>
              <Meta icon={User} label="Empleada asignada"><span className="font-medium">{order.assigned_name ?? '—'}</span></Meta>
              <Meta icon={CalendarPlus} label="Creada"><span className="font-medium">{fmt(order.created_at, true)}</span></Meta>
              <Meta icon={CalendarClock} label="Entrega prometida"><span className="font-medium">{fmt(order.delivery_date, true)}</span></Meta>
            </div>
          </div>
        </div>
      </Card>

      {/* Items */}
      <Card>
        <CardHeader title="Ítems" subtitle="Desglose del trabajo" />
        <div className="overflow-x-auto">
          <table className="w-full min-w-[480px] border-collapse text-sm">
            <thead>
              <tr className="border-y border-border text-left text-xs uppercase tracking-wider text-muted-foreground">
                <th className="py-2 pr-3 font-semibold">Ítem</th>
                <th className="py-2 px-3 font-semibold">Desglose</th>
                <th className="py-2 pl-3 text-right font-semibold">Subtotal</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {items.map((it) => (
                <tr key={it.id}>
                  <td className="py-3 pr-3 font-medium">{it.description}</td>
                  <td className="tnum py-3 px-3 text-muted-foreground">{itemBreakdown(it)}</td>
                  <td className="tnum py-3 pl-3 text-right font-medium">{formatDOP(it.subtotal)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="mt-5 flex flex-col items-end gap-1.5 text-sm">
          <div className="flex w-full max-w-xs justify-between"><span className="text-muted-foreground">Subtotal</span><span className="tnum font-medium">{formatDOP(order.subtotal)}</span></div>
          {order.discount_type !== 'none' && order.discount_amount > 0 && (
            <div className="flex w-full max-w-xs justify-between">
              <span className="text-muted-foreground">Descuento{order.discount_type === 'percent' ? ` (${order.discount_value}%)` : ''}</span>
              <span className="tnum font-medium text-status-overdue">− {formatDOP(order.discount_amount)}</span>
            </div>
          )}
          <div className="mt-1 flex w-full max-w-xs items-center justify-between border-t border-border pt-2">
            <span className="font-semibold">Total</span>
            <span ref={ref} className="tnum text-2xl font-bold text-gold-gradient">{formatDOP(Math.round(total))}</span>
          </div>
          <div className="flex w-full max-w-xs justify-between rounded-lg bg-muted/50 px-3 py-2"><span className="text-muted-foreground">50% inicial (adelanto)</span><span className="tnum font-semibold">{formatDOP(order.deposit)}</span></div>
        </div>

        {order.notes && (
          <div className="mt-5 border-t border-border pt-4 text-sm">
            <p className="text-xs text-muted-foreground">Notas / descripción</p>
            <p className="mt-1 whitespace-pre-wrap">{order.notes}</p>
          </div>
        )}
      </Card>

      {/* Prepared for 5B */}
      <Card>
        <CardHeader title="Producción, pagos y entrega" subtitle="Disponible en el siguiente bloque (5B)" />
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {[
            { icon: Workflow, label: 'Avanzar etapa' },
            { icon: CreditCard, label: 'Registrar pago' },
            { icon: Paperclip, label: 'Adjuntar diseño' },
            { icon: Bell, label: 'Avisar al cliente' },
          ].map((f) => {
            const Icon = f.icon
            return (
              <div key={f.label} className="flex items-center gap-2 rounded-xl border border-dashed border-border bg-card/40 px-3 py-2.5 text-sm text-muted-foreground dark:border-white/[0.08]">
                <Icon className="h-4 w-4 text-gold-brand" />
                {f.label}
              </div>
            )
          })}
        </div>
      </Card>

      {/* Edit modal */}
      <Modal open={editing} onClose={() => setEditing(false)} title="Editar orden" description="Asignación y fecha de entrega.">
        <form action={updateOrderMeta} className="space-y-4">
          <input type="hidden" name="id" value={order.id} />
          <div className="space-y-1.5">
            <label className="text-sm font-medium">Empleada asignada</label>
            <select name="assignedTo" defaultValue={order.assigned_to ?? ''} className="h-11 w-full appearance-none rounded-xl border border-border bg-input/5 px-3.5 text-sm outline-none focus:border-gold-mid">
              {employees.map((e) => <option key={e.id} value={e.id}>{e.name}</option>)}
            </select>
          </div>
          <div className="space-y-1.5">
            <label className="text-sm font-medium">Fecha de entrega</label>
            <input type="date" name="deliveryDate" defaultValue={order.delivery_date ?? ''} className="tnum h-11 w-full rounded-xl border border-border bg-input/5 px-3.5 text-sm outline-none focus:border-gold-mid" />
          </div>
          <div className="flex justify-end gap-3 pt-1">
            <Button type="button" variant="ghost" onClick={() => setEditing(false)}>Cancelar</Button>
            <Button type="submit" onClick={() => setEditing(false)}>Guardar</Button>
          </div>
        </form>
      </Modal>
    </div>
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
