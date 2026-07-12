'use client'

import { motion } from 'framer-motion'
import { CheckCircle2, Printer, Plus } from 'lucide-react'
import { formatDOP } from '@/lib/utils'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { methodLabel } from '@/lib/caja/format'
import type { QuoteTotals } from '@/lib/cotizador/calc'
import type { CashMethod } from '@/lib/caja/types'
import type { CartLine } from './PosTerminal'

export function Receipt({
  saleNumber,
  lines,
  totals,
  method,
  change,
  clientName,
  onNew,
}: {
  saleNumber: number
  lines: CartLine[]
  totals: QuoteTotals
  method: string
  change: number | null
  clientName: string
  onNew: () => void
}) {
  const code = `POS-${String(saleNumber).padStart(4, '0')}`

  return (
    <div className="mx-auto max-w-md">
      <motion.div
        className="no-print mb-4 flex items-center justify-center gap-2 text-status-ready"
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ type: 'spring', stiffness: 300, damping: 18 }}
      >
        <CheckCircle2 className="h-5 w-5" />
        <p className="font-semibold">¡Venta registrada! Entró a la caja.</p>
      </motion.div>

      <Card className="print-area">
        <div className="text-center">
          <p className="text-sm font-semibold">Marjos Designs S.R.L.</p>
          <p className="text-[11px] text-muted-foreground">Comprobante interno (no fiscal)</p>
          <p className="tnum mt-2 text-lg font-bold tracking-tight">{code}</p>
          {clientName && <p className="text-xs text-muted-foreground">Cliente: {clientName}</p>}
        </div>

        <div className="mt-4 space-y-1.5 border-y border-dashed border-border py-3 text-sm">
          {lines.map((l) => (
            <div key={l.key} className="flex justify-between gap-3">
              <span className="min-w-0 truncate">
                <span className="tnum text-muted-foreground">{l.quantity}×</span> {l.description}
              </span>
              <span className="tnum shrink-0 font-medium">{formatDOP(Math.round(l.quantity * l.unitPrice))}</span>
            </div>
          ))}
        </div>

        <div className="mt-3 space-y-1 text-sm">
          <div className="flex justify-between text-muted-foreground">
            <span>Subtotal</span>
            <span className="tnum">{formatDOP(totals.subtotal)}</span>
          </div>
          {totals.discountAmount > 0 && (
            <div className="flex justify-between text-status-overdue">
              <span>Descuento</span>
              <span className="tnum">− {formatDOP(totals.discountAmount)}</span>
            </div>
          )}
          <div className="flex items-center justify-between border-t border-border pt-1.5">
            <span className="font-semibold">Total</span>
            <span className="tnum text-lg font-bold">{formatDOP(totals.total)}</span>
          </div>
          <div className="flex justify-between text-muted-foreground">
            <span>Método</span>
            <span>{methodLabel[method as CashMethod] ?? method}</span>
          </div>
          {change !== null && (
            <div className="flex justify-between text-muted-foreground">
              <span>Cambio</span>
              <span className="tnum">{formatDOP(change)}</span>
            </div>
          )}
        </div>

        <p className="mt-4 text-center text-[11px] text-muted-foreground">¡Gracias por tu compra! 🎉</p>
      </Card>

      <div className="no-print mt-4 flex justify-center gap-2">
        <Button variant="secondary" onClick={() => window.print()}>
          <Printer className="h-4 w-4" />
          Imprimir recibo
        </Button>
        <Button onClick={onNew}>
          <Plus className="h-4 w-4" />
          Nueva venta
        </Button>
      </div>
    </div>
  )
}
