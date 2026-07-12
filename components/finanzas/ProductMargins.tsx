'use client'

import { useEffect, useState } from 'react'
import { useFormState, useFormStatus } from 'react-dom'
import { Pencil, TrendingUp } from 'lucide-react'
import { cn, formatDOP } from '@/lib/utils'
import { Card, CardHeader } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Modal } from '@/components/ui/Modal'
import { Input } from '@/components/ui/Field'
import { EmptyState } from '@/components/dashboard/EmptyState'
import { useToast } from '@/components/ui/Toast'
import { setProductCost, type FinanzasState } from '@/lib/finanzas/actions'
import type { ProductMargin } from '@/lib/finanzas/types'

const initial: FinanzasState = {}

function SaveBtn() {
  const { pending } = useFormStatus()
  return <Button type="submit" loading={pending}>Guardar costo</Button>
}

function marginColor(pct: number) {
  if (pct >= 50) return 'text-status-ready'
  if (pct >= 25) return 'text-gold-brand'
  return 'text-status-overdue'
}

export function ProductMargins({ products }: { products: ProductMargin[] }) {
  const [editing, setEditing] = useState<ProductMargin | null>(null)
  const [state, action] = useFormState(setProductCost, initial)
  const { toast } = useToast()
  const maxBilled = Math.max(1, ...products.map((p) => p.billed))

  useEffect(() => {
    if (state.ok) { toast({ title: 'Costo guardado', variant: 'success' }); setEditing(null) }
    if (state.error) toast({ title: state.error, variant: 'error' })
  }, [state, toast])

  return (
    <Card>
      <CardHeader title="Margen por producto" subtitle="Qué te deja más plata (registra el costo para ver el margen real)" action={<TrendingUp className="h-4 w-4 text-muted-foreground" />} />
      {products.length === 0 ? (
        <EmptyState icon={TrendingUp} title="Sin ventas aún" subtitle="Cuando vendas productos, aquí verás su margen." />
      ) : (
        <ul className="space-y-3">
          {products.map((p) => (
            <li key={p.productId}>
              <div className="flex items-center justify-between gap-2 text-sm">
                <span className="min-w-0 flex-1 truncate font-medium">{p.name}</span>
                {p.marginPct != null ? (
                  <span className={cn('tnum shrink-0 font-bold', marginColor(p.marginPct))}>{p.marginPct}%</span>
                ) : (
                  <button type="button" onClick={() => setEditing(p)} className="shrink-0 text-xs text-gold-brand hover:underline">registrar costo</button>
                )}
                <button type="button" onClick={() => setEditing(p)} className="shrink-0 text-muted-foreground hover:text-foreground"><Pencil className="h-3.5 w-3.5" /></button>
              </div>
              <div className="mt-1 flex items-center gap-2">
                <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-muted/50">
                  <div className="h-full rounded-full bg-gold-mid" style={{ width: `${Math.max(3, Math.round((p.billed / maxBilled) * 100))}%` }} />
                </div>
                <span className="tnum shrink-0 text-xs text-muted-foreground">{formatDOP(p.billed)}</span>
              </div>
            </li>
          ))}
        </ul>
      )}

      <Modal open={!!editing} onClose={() => setEditing(null)} title={`Costo de ${editing?.name ?? ''}`} description="El costo por unidad (o por pie² en productos por área). Con esto calculamos el margen real.">
        <form action={action} className="space-y-4">
          <input type="hidden" name="productId" value={editing?.productId ?? ''} />
          <div className="rounded-xl border border-border bg-card/60 p-3 text-sm dark:border-white/[0.08]">
            <div className="flex justify-between"><span className="text-muted-foreground">Precio de venta</span><span className="tnum font-medium">{formatDOP(editing?.basePrice ?? 0)} / {editing?.unitLabel}</span></div>
          </div>
          <Input id="unit-cost" name="unitCost" label="Costo por unidad (RD$)" type="number" inputMode="decimal" step="1" min="0" defaultValue={editing?.unitCost ?? ''} placeholder="Deja vacío para quitarlo" />
          <div className="flex justify-end gap-3 pt-1">
            <Button type="button" variant="ghost" onClick={() => setEditing(null)}>Cancelar</Button>
            <SaveBtn />
          </div>
        </form>
      </Modal>
    </Card>
  )
}
