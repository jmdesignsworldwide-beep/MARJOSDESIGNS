'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Plus, Package, AlertTriangle, Truck, Pencil, Sparkles } from 'lucide-react'
import { cn, formatDOP } from '@/lib/utils'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { EmptyState } from '@/components/dashboard/EmptyState'
import { applyCostToProduct } from '@/lib/proveedores/actions'
import { stockState, stockMeta, type Material } from '@/lib/proveedores/types'
import { MaterialForm } from './MaterialForm'

export function MaterialsBoard({
  materials,
  suppliers,
  products,
}: {
  materials: Material[]
  suppliers: { id: string; name: string }[]
  products: { id: string; name: string }[]
}) {
  const [addOpen, setAddOpen] = useState(false)
  const [editing, setEditing] = useState<Material | null>(null)

  const alerts = materials.filter((m) => {
    const s = stockState(m)
    return s === 'agotado' || s === 'bajo'
  })

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">Inventario</h1>
          <p className="mt-1 text-sm text-muted-foreground">Tus materiales con proveedor y precio. El stock es opcional — sin conteo obligatorio.</p>
        </div>
        <Button onClick={() => { setEditing(null); setAddOpen(true) }}><Plus className="h-4 w-4" />Nuevo material</Button>
      </div>

      {alerts.length > 0 && (
        <Card className="border-status-overdue/30 bg-status-overdue/[0.05]">
          <p className="flex items-center gap-2 text-sm font-semibold text-status-overdue"><AlertTriangle className="h-4 w-4" />Se están acabando</p>
          <div className="mt-2 flex flex-wrap gap-2">
            {alerts.map((m) => (
              <span key={m.id} className="rounded-full bg-status-overdue/10 px-2.5 py-0.5 text-xs font-medium text-status-overdue">
                {m.name}{m.stock != null ? ` · ${m.stock} ${m.unit}` : ''}
              </span>
            ))}
          </div>
        </Card>
      )}

      {materials.length === 0 ? (
        <EmptyState icon={Package} title="Sin materiales" subtitle="Agrega lona, vinil, tazas en blanco… con su proveedor y precio." />
      ) : (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {materials.map((m) => {
            const s = stockState(m)
            const canApply = m.product_id && m.unit_cost != null
            return (
              <Card key={m.id} className="flex flex-col">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="truncate font-semibold">{m.name}</p>
                    <p className="truncate text-xs text-muted-foreground">{m.category ? `${m.category} · ` : ''}{m.unit}</p>
                  </div>
                  <button type="button" onClick={() => { setEditing(m); setAddOpen(true) }} className="shrink-0 text-muted-foreground hover:text-foreground"><Pencil className="h-3.5 w-3.5" /></button>
                </div>
                <div className="mt-2 flex flex-wrap items-center gap-2 text-xs">
                  {s ? <Badge status={stockMeta[s].status}>{stockMeta[s].label}{m.stock != null ? ` · ${m.stock}` : ''}</Badge> : <span className="text-muted-foreground">Sin conteo</span>}
                  {m.unit_cost != null && <span className="tnum text-muted-foreground">Costo {formatDOP(m.unit_cost)}</span>}
                </div>
                {m.default_supplier_name && (
                  <Link href={`/proveedores/${m.default_supplier_id}`} className="mt-2 inline-flex items-center gap-1 text-xs text-gold-brand hover:underline">
                    <Truck className="h-3 w-3" />{m.default_supplier_name}
                  </Link>
                )}
                {canApply && (
                  <form action={applyCostToProduct} className="mt-2 border-t border-border pt-2 dark:border-white/[0.08]">
                    <input type="hidden" name="materialId" value={m.id} />
                    <button type="submit" className="inline-flex items-center gap-1 text-xs font-medium text-muted-foreground hover:text-gold-brand" title="Usa este costo como el costo del producto (para el margen en Finanzas)">
                      <Sparkles className="h-3 w-3" />Aplicar costo al producto
                    </button>
                  </form>
                )}
              </Card>
            )
          })}
        </div>
      )}

      <MaterialForm open={addOpen} onClose={() => setAddOpen(false)} editing={editing} suppliers={suppliers} products={products} />
    </div>
  )
}
