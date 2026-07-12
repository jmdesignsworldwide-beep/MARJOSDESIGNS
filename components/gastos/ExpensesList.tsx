'use client'

import { FileText, Pencil, Ban, Repeat, ExternalLink, ReceiptText } from 'lucide-react'
import { cn, formatDOP } from '@/lib/utils'
import { Badge } from '@/components/ui/Badge'
import { EmptyState } from '@/components/dashboard/EmptyState'
import { groupMeta, methodLabel, type Expense } from '@/lib/gastos/types'

function fmtDate(d: string) {
  return new Date(d + 'T00:00:00').toLocaleDateString('es-DO', { day: '2-digit', month: 'short', year: 'numeric' })
}

export function ExpensesList({
  expenses,
  onEdit,
  onVoid,
}: {
  expenses: Expense[]
  onEdit: (e: Expense) => void
  onVoid: (e: Expense) => void
}) {
  if (expenses.length === 0) {
    return <EmptyState icon={ReceiptText} title="Sin gastos" subtitle="Registra el primero — toma foto del recibo y listo." />
  }

  return (
    <ul className="space-y-2">
      {expenses.map((e) => {
        const anulado = e.status === 'anulado'
        const g = e.grp ? groupMeta[e.grp] : null
        const isImg = e.receipt_url && !e.receipt_url.toLowerCase().includes('.pdf')
        return (
          <li
            key={e.id}
            className={cn(
              'flex items-center gap-3 rounded-2xl border border-border bg-card/60 p-3 dark:border-white/[0.08]',
              anulado && 'opacity-60',
            )}
          >
            {/* Receipt thumbnail */}
            {e.receipt_url ? (
              <a href={e.receipt_url} target="_blank" rel="noopener noreferrer" className="group relative h-14 w-14 shrink-0 overflow-hidden rounded-xl border border-border dark:border-white/[0.08]">
                {isImg ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={e.receipt_url} alt="Recibo" className="h-full w-full object-cover" />
                ) : (
                  <div className="grid h-full w-full place-items-center bg-muted/40 text-muted-foreground"><FileText className="h-6 w-6" /></div>
                )}
                <span className="absolute inset-0 grid place-items-center bg-black/40 opacity-0 transition-opacity group-hover:opacity-100">
                  <ExternalLink className="h-4 w-4 text-white" />
                </span>
              </a>
            ) : (
              <div className="grid h-14 w-14 shrink-0 place-items-center rounded-xl border border-dashed border-border text-muted-foreground/50 dark:border-white/[0.08]">
                <ReceiptText className="h-5 w-5" />
              </div>
            )}

            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-1.5">
                <p className={cn('truncate text-sm font-medium', anulado && 'line-through')}>{e.description}</p>
                {e.is_recurring && <Repeat className="h-3.5 w-3.5 text-gold-brand" />}
                {anulado && <Badge status="overdue">Anulado</Badge>}
              </div>
              <p className="truncate text-xs text-muted-foreground">
                {e.category_name} · {methodLabel[e.method]} · {fmtDate(e.expense_date)}
                {e.vendor ? ` · ${e.vendor}` : ''}
              </p>
              {anulado && e.void_reason && <p className="truncate text-xs text-status-overdue">Motivo: {e.void_reason}</p>}
            </div>

            <div className="flex shrink-0 flex-col items-end gap-1.5">
              <span className={cn('tnum text-sm font-bold', anulado && 'line-through')}>{formatDOP(e.amount)}</span>
              {g && <span className="text-[10px] font-medium text-muted-foreground">{g.short}</span>}
            </div>

            {!anulado && (
              <div className="flex shrink-0 flex-col gap-1">
                <button type="button" onClick={() => onEdit(e)} title="Editar" className="grid h-7 w-7 place-items-center rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground">
                  <Pencil className="h-3.5 w-3.5" />
                </button>
                <button type="button" onClick={() => onVoid(e)} title="Anular" className="grid h-7 w-7 place-items-center rounded-lg text-muted-foreground hover:bg-status-overdue/10 hover:text-status-overdue">
                  <Ban className="h-3.5 w-3.5" />
                </button>
              </div>
            )}
          </li>
        )
      })}
    </ul>
  )
}
