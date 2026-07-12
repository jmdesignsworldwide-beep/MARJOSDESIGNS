'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useFormState, useFormStatus } from 'react-dom'
import { Receipt as ReceiptIcon, Ban, Filter } from 'lucide-react'
import { cn, formatDOP } from '@/lib/utils'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { Modal } from '@/components/ui/Modal'
import { Textarea } from '@/components/ui/Field'
import { useToast } from '@/components/ui/Toast'
import { EmptyState } from '@/components/dashboard/EmptyState'
import { methodLabel } from '@/lib/caja/format'
import { voidSale, type PosState } from '@/lib/pos/actions'
import type { PosSale } from '@/lib/pos/data'

const initial: PosState = {}

function saleCode(n: number) {
  return `POS-${String(n).padStart(4, '0')}`
}
function fmtDateTime(d: string) {
  return new Date(d).toLocaleString('es-DO', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })
}

function VoidBtn() {
  const { pending } = useFormStatus()
  return <Button type="submit" variant="danger" loading={pending}>Anular venta</Button>
}

export function SalesHistory({
  sales,
  products,
  filters,
}: {
  sales: PosSale[]
  products: { id: string; name: string }[]
  filters: { date: string; product: string }
}) {
  const router = useRouter()
  const [voiding, setVoiding] = useState<PosSale | null>(null)
  const [state, action] = useFormState(voidSale, initial)
  const { toast } = useToast()

  useEffect(() => {
    if (state.ok) { toast({ title: 'Venta anulada', variant: 'success' }); setVoiding(null) }
    if (state.error) toast({ title: state.error, variant: 'error' })
  }, [state, toast])

  function setFilter(patch: Partial<{ date: string; product: string }>) {
    const next = { ...filters, ...patch }
    const q = new URLSearchParams()
    if (next.date) q.set('date', next.date)
    if (next.product) q.set('product', next.product)
    router.push(`/pos/historial${q.toString() ? `?${q}` : ''}`)
  }

  return (
    <div className="space-y-4">
      {/* Filters */}
      <Card className="flex flex-wrap items-center gap-3">
        <Filter className="h-4 w-4 text-muted-foreground" />
        <input
          type="date"
          value={filters.date}
          onChange={(e) => setFilter({ date: e.target.value })}
          className="tnum h-10 rounded-xl border border-border bg-input/5 px-3 text-sm outline-none focus:border-gold-mid"
        />
        <select
          value={filters.product}
          onChange={(e) => setFilter({ product: e.target.value })}
          className="h-10 rounded-xl border border-border bg-input/5 px-3 text-sm outline-none focus:border-gold-mid"
        >
          <option value="">Todos los productos</option>
          {products.map((p) => (
            <option key={p.id} value={p.id}>{p.name}</option>
          ))}
        </select>
        {(filters.date || filters.product) && (
          <button type="button" onClick={() => router.push('/pos/historial')} className="text-sm text-muted-foreground hover:text-foreground">
            Limpiar
          </button>
        )}
      </Card>

      {sales.length === 0 ? (
        <EmptyState icon={ReceiptIcon} title="Sin ventas" subtitle="No hay ventas rápidas con estos filtros." />
      ) : (
        <div className="space-y-2">
          {sales.map((s) => {
            const anulada = s.status === 'anulada'
            return (
              <Card key={s.id} className={cn('flex flex-wrap items-center justify-between gap-4', anulada && 'opacity-70')}>
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="tnum font-semibold">{saleCode(s.number)}</span>
                    {anulada ? <Badge status="overdue">Anulada</Badge> : <Badge status="ready">Completada</Badge>}
                  </div>
                  <p className="mt-0.5 truncate text-xs text-muted-foreground">
                    {fmtDateTime(s.created_at)} · {methodLabel[s.method]}
                    {s.client_name ? ` · ${s.client_name}` : ''}
                    {s.sold_by_name ? ` · ${s.sold_by_name}` : ''}
                  </p>
                  {anulada && s.void_reason && (
                    <p className="mt-0.5 text-xs text-status-overdue">Motivo: {s.void_reason}</p>
                  )}
                </div>
                <div className="flex items-center gap-3">
                  <span className={cn('tnum text-lg font-bold', anulada && 'line-through')}>{formatDOP(s.total)}</span>
                  {!anulada && (
                    <button
                      type="button"
                      onClick={() => setVoiding(s)}
                      className="inline-flex items-center gap-1 text-xs font-medium text-muted-foreground hover:text-status-overdue"
                    >
                      <Ban className="h-3.5 w-3.5" />
                      Anular
                    </button>
                  )}
                </div>
              </Card>
            )
          })}
        </div>
      )}

      <Modal
        open={!!voiding}
        onClose={() => setVoiding(null)}
        title={`Anular ${voiding ? saleCode(voiding.number) : ''}`}
        description="Queda registrada como anulada (no se borra) y revierte en la caja si aún está abierta."
      >
        <form action={action} className="space-y-4">
          <input type="hidden" name="saleId" value={voiding?.id ?? ''} />
          <Textarea id="void-reason" name="reason" label="Motivo de anulación" placeholder="¿Por qué se anula?" error={state.error} required rows={2} />
          <div className="flex justify-end gap-3">
            <Button type="button" variant="ghost" onClick={() => setVoiding(null)}>Volver</Button>
            <VoidBtn />
          </div>
        </form>
      </Modal>
    </div>
  )
}
