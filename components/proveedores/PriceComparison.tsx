'use client'

import { useState } from 'react'
import { TrendingDown, Sparkles, ChevronDown, ArrowUpRight } from 'lucide-react'
import { cn, formatDOP } from '@/lib/utils'
import { Card, CardHeader } from '@/components/ui/Card'
import { EmptyState } from '@/components/dashboard/EmptyState'
import { WhatsAppButton } from '@/components/clientes/WhatsAppButton'
import { Scale } from 'lucide-react'
import type { MaterialComparison } from '@/lib/proveedores/types'

function fmtDate(d: string) {
  return new Date(d).toLocaleDateString('es-DO', { day: '2-digit', month: 'short' })
}

export function PriceComparison({
  comparisons,
  hikes,
}: {
  comparisons: MaterialComparison[]
  hikes: { supplierName: string; materialName: string; oldPrice: number; newPrice: number; createdAt: string }[]
}) {
  const [open, setOpen] = useState<string | null>(comparisons.find((c) => c.rows.length > 1)?.materialId ?? null)
  const multi = comparisons.filter((c) => c.rows.length > 1)

  return (
    <Card>
      <CardHeader title="Comparar precios" subtitle="Quién te vende más barato cada material" action={<Scale className="h-4 w-4 text-muted-foreground" />} />

      {hikes.length > 0 && (
        <div className="mb-4 rounded-xl border border-status-overdue/30 bg-status-overdue/10 p-3">
          <p className="flex items-center gap-1.5 text-sm font-semibold text-status-overdue"><ArrowUpRight className="h-4 w-4" />Subieron un precio hace poco</p>
          <ul className="mt-1.5 space-y-0.5 text-xs text-muted-foreground">
            {hikes.slice(0, 3).map((h, i) => (
              <li key={i}>
                <span className="font-medium text-foreground">{h.supplierName}</span> subió <span className="font-medium">{h.materialName}</span>: {formatDOP(h.oldPrice)} → <span className="text-status-overdue">{formatDOP(h.newPrice)}</span> ({fmtDate(h.createdAt)})
              </li>
            ))}
          </ul>
        </div>
      )}

      {comparisons.length === 0 ? (
        <EmptyState icon={Scale} title="Sin precios que comparar" subtitle="Registra el mismo material en dos proveedores para ver quién lo tiene más barato." />
      ) : (
        <div className="space-y-2">
          {comparisons.map((c) => {
            const isOpen = open === c.materialId
            const canSave = c.rows.length > 1 && c.savings > 0
            return (
              <div key={c.materialId} className="rounded-xl border border-border dark:border-white/[0.08]">
                <button type="button" onClick={() => setOpen(isOpen ? null : c.materialId)} className="flex w-full items-center justify-between gap-2 px-3.5 py-2.5 text-left">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium">{c.materialName}</p>
                    {c.cheapest && (
                      <p className="truncate text-xs text-muted-foreground">
                        Más barato: <span className="font-medium text-status-ready">{c.cheapest.supplierName}</span> · {formatDOP(c.cheapest.price)}/{c.unit}
                      </p>
                    )}
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    {canSave && <span className="hidden rounded-full bg-status-ready/10 px-2 py-0.5 text-[11px] font-semibold text-status-ready sm:inline">ahorras {formatDOP(c.savings)}</span>}
                    <ChevronDown className={cn('h-4 w-4 text-muted-foreground transition-transform', isOpen && 'rotate-180')} />
                  </div>
                </button>
                {isOpen && (
                  <div className="border-t border-border px-3.5 py-2 dark:border-white/[0.08]">
                    {canSave && (
                      <p className="mb-2 flex items-start gap-1.5 rounded-lg bg-gold-gradient-soft px-2.5 py-1.5 text-xs text-gold-brand">
                        <Sparkles className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                        El {c.materialName.toLowerCase()} te sale más barato con {c.cheapest?.supplierName} ({formatDOP(c.cheapest?.price ?? 0)}) — ahorras {formatDOP(c.savings)} vs el más caro.
                      </p>
                    )}
                    <ul className="space-y-1.5">
                      {c.rows.map((r) => (
                        <li key={r.supplierId} className={cn('flex items-center justify-between gap-2 rounded-lg px-2 py-1.5', r.isCheapest && 'bg-status-ready/[0.07]')}>
                          <span className="flex items-center gap-1.5 truncate text-sm">
                            {r.isCheapest && <TrendingDown className="h-3.5 w-3.5 shrink-0 text-status-ready" />}
                            <span className={cn('truncate', r.isCheapest && 'font-semibold')}>{r.supplierName}</span>
                          </span>
                          <div className="flex shrink-0 items-center gap-2">
                            <span className={cn('tnum text-sm font-semibold', r.isCheapest ? 'text-status-ready' : 'text-foreground')}>{formatDOP(r.price)}</span>
                            <WhatsAppButton phone={r.whatsapp} size="sm" label="Pedir" message={`Hola 👋, de Marjos Designs. ¿Me confirmas disponibilidad y precio de ${c.materialName}? Gracias.`} />
                          </div>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            )
          })}
          {multi.length === 0 && <p className="px-1 text-xs text-muted-foreground">Agrega el mismo material a otro proveedor para comparar precios.</p>}
        </div>
      )}
    </Card>
  )
}
