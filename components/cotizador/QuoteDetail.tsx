'use client'

import { useRef, useState } from 'react'
import Link from 'next/link'
import { useInView } from 'framer-motion'
import { ArrowLeft, Printer, PackageCheck } from 'lucide-react'
import { formatDOP } from '@/lib/utils'
import { useCountUp } from '@/lib/hooks/useCountUp'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { Modal } from '@/components/ui/Modal'
import { formatSqft } from '@/lib/cotizador/calc'
import { quoteCode } from '@/lib/cotizador/format'
import { convertQuoteToOrder } from '@/app/(app)/ordenes/actions'
import type { Quote, QuoteLine } from '@/lib/cotizador/data'

function lineBreakdown(l: QuoteLine): string {
  if (l.calc_type === 'area') {
    return `${l.width_in ?? 0} × ${l.height_in ?? 0} pulg (${formatSqft(l.sqft)} pie²) × ${formatDOP(l.unit_price)}`
  }
  return `${l.quantity ?? 0} × ${formatDOP(l.unit_price)}`
}

export function QuoteDetail({ quote, lines }: { quote: Quote; lines: QuoteLine[] }) {
  const [converting, setConverting] = useState(false)
  const ref = useRef<HTMLParagraphElement>(null)
  const inView = useInView(ref, { once: true, amount: 0.5 })
  const total = useCountUp({ to: quote.total, start: inView })

  return (
    <div className="space-y-6">
      <div className="no-print flex flex-wrap items-center justify-between gap-3">
        <Link href="/cotizador/historial" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-4 w-4" />
          Volver al historial
        </Link>
        <div className="flex gap-2">
          <Button variant="secondary" onClick={() => window.print()}>
            <Printer className="h-4 w-4" />
            Imprimir / PDF
          </Button>
          <Button onClick={() => setConverting(true)} disabled={quote.status === 'convertida'}>
            <PackageCheck className="h-4 w-4" />
            {quote.status === 'convertida' ? 'Ya convertida' : 'Convertir en orden'}
          </Button>
        </div>
      </div>

      <Card className="print-area mx-auto max-w-3xl">
        {/* Header */}
        <div className="flex flex-wrap items-start justify-between gap-4 border-b border-border pb-5">
          <div className="flex items-center gap-3">
            <span className="grid h-12 w-12 place-items-center rounded-xl bg-gold-gradient text-lg font-bold text-charcoal-900">MD</span>
            <div>
              <p className="text-lg font-bold tracking-tight">Marjos Designs S.R.L.</p>
              <p className="text-xs text-muted-foreground">Cotización · comprobante interno (no fiscal)</p>
            </div>
          </div>
          <div className="text-right">
            <p className="tnum text-xl font-bold text-gold-gradient">{quoteCode(quote.number)}</p>
            <p className="text-xs text-muted-foreground">
              {new Date(quote.created_at).toLocaleDateString('es-DO', { day: '2-digit', month: 'long', year: 'numeric' })}
            </p>
            <Badge status={quote.status === 'convertida' ? 'ready' : 'process'} className="mt-1">
              {quote.status === 'convertida' ? 'Convertida' : quote.status === 'anulada' ? 'Anulada' : 'Guardada'}
            </Badge>
          </div>
        </div>

        {/* Client */}
        <div className="py-4">
          <p className="text-xs text-muted-foreground">Cliente</p>
          <p className="font-semibold">{quote.client_name ?? 'Sin cliente (general)'}</p>
        </div>

        {/* Lines */}
        <div className="overflow-x-auto">
          <table className="w-full min-w-[480px] border-collapse text-sm">
            <thead>
              <tr className="border-y border-border text-left text-xs uppercase tracking-wider text-muted-foreground">
                <th className="py-2 pr-3 font-semibold">Producto</th>
                <th className="py-2 px-3 font-semibold">Desglose</th>
                <th className="py-2 pl-3 text-right font-semibold">Subtotal</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {lines.map((l) => (
                <tr key={l.id}>
                  <td className="py-3 pr-3 font-medium">{l.description}</td>
                  <td className="tnum py-3 px-3 text-muted-foreground">{lineBreakdown(l)}</td>
                  <td className="tnum py-3 pl-3 text-right font-medium">{formatDOP(l.subtotal)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Totals */}
        <div className="mt-5 flex flex-col items-end gap-1.5 text-sm">
          <div className="flex w-full max-w-xs justify-between">
            <span className="text-muted-foreground">Subtotal</span>
            <span className="tnum font-medium">{formatDOP(quote.subtotal)}</span>
          </div>
          {quote.discount_type !== 'none' && quote.discount_amount > 0 && (
            <div className="flex w-full max-w-xs justify-between">
              <span className="text-muted-foreground">
                Descuento{quote.discount_type === 'percent' ? ` (${quote.discount_value}%)` : ''}
              </span>
              <span className="tnum font-medium text-status-overdue">− {formatDOP(quote.discount_amount)}</span>
            </div>
          )}
          <div className="mt-1 flex w-full max-w-xs items-center justify-between border-t border-border pt-2">
            <span className="font-semibold">Total</span>
            <span ref={ref} className="tnum text-2xl font-bold text-gold-gradient">
              {formatDOP(Math.round(total))}
            </span>
          </div>
          <div className="flex w-full max-w-xs justify-between rounded-lg bg-muted/50 px-3 py-2">
            <span className="text-muted-foreground">50% inicial (adelanto)</span>
            <span className="tnum font-semibold">{formatDOP(quote.deposit)}</span>
          </div>
        </div>

        {quote.notes && (
          <div className="mt-5 border-t border-border pt-4 text-sm">
            <p className="text-xs text-muted-foreground">Notas</p>
            <p className="mt-1 whitespace-pre-wrap">{quote.notes}</p>
          </div>
        )}
      </Card>

      <Modal open={converting} onClose={() => setConverting(false)} title="Convertir en orden" description="Se crea una orden de trabajo con todo listo.">
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Se creará una <span className="font-medium text-foreground">orden de trabajo</span> arrastrando
            cliente, ítems, precios, descuento, total y 50% inicial — sin recapturar nada. Luego podrás
            asignar empleada y fecha de entrega.
          </p>
          <form action={convertQuoteToOrder.bind(null, quote.id)} className="flex justify-end gap-3">
            <Button type="button" variant="ghost" onClick={() => setConverting(false)}>Cancelar</Button>
            <Button type="submit">
              <PackageCheck className="h-4 w-4" />
              Crear orden
            </Button>
          </form>
        </div>
      </Modal>
    </div>
  )
}
