'use client'

import { useState, useTransition } from 'react'
import { FileText, Pencil, Ban, Repeat, ExternalLink, ReceiptText, ChevronDown, Loader2, ScanLine } from 'lucide-react'
import { cn, formatDOP } from '@/lib/utils'
import { Badge } from '@/components/ui/Badge'
import { EmptyState } from '@/components/dashboard/EmptyState'
import { fetchReceiptItems } from '@/lib/gastos/actions'
import { groupMeta, methodLabel, type Expense, type ReceiptItemRow } from '@/lib/gastos/types'

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
      {expenses.map((e) => (
        <ExpenseRow key={e.id} e={e} onEdit={onEdit} onVoid={onVoid} />
      ))}
    </ul>
  )
}

function ExpenseRow({ e, onEdit, onVoid }: { e: Expense; onEdit: (e: Expense) => void; onVoid: (e: Expense) => void }) {
  const anulado = e.status === 'anulado'
  const g = e.grp ? groupMeta[e.grp] : null
  const isImg = e.receipt_url && !e.receipt_url.toLowerCase().includes('.pdf')
  const hasItems = e.receipt_item_count > 0

  const [open, setOpen] = useState(false)
  const [items, setItems] = useState<ReceiptItemRow[] | null>(null)
  const [loading, startLoad] = useTransition()

  function toggle() {
    const next = !open
    setOpen(next)
    if (next && items === null) {
      startLoad(async () => setItems(await fetchReceiptItems(e.id)))
    }
  }

  return (
    <li className={cn('rounded-2xl border border-border bg-card/60 dark:border-white/[0.08]', anulado && 'opacity-60')}>
      <div className="flex items-center gap-3 p-3">
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
            {hasItems && (
              <span className="inline-flex items-center gap-1 rounded-full border border-status-ready/30 bg-status-ready/10 px-1.5 py-0.5 text-[10px] font-medium text-status-ready">
                <ScanLine className="h-3 w-3" />leído
              </span>
            )}
            {anulado && <Badge status="overdue">Anulado</Badge>}
          </div>
          <p className="truncate text-xs text-muted-foreground">
            {e.category_name} · {methodLabel[e.method]} · {fmtDate(e.expense_date)}
            {e.vendor ? ` · ${e.vendor}` : ''}
          </p>
          {anulado && e.void_reason && <p className="truncate text-xs text-status-overdue">Motivo: {e.void_reason}</p>}
          {hasItems && (
            <button type="button" onClick={toggle} className="mt-1 inline-flex items-center gap-1 text-xs font-medium text-muted-foreground hover:text-foreground">
              <ChevronDown className={cn('h-3.5 w-3.5 transition-transform', open && 'rotate-180')} />
              {open ? 'Ocultar detalle' : `Ver detalle de la factura (${e.receipt_item_count})`}
            </button>
          )}
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
      </div>

      {/* Detalle de ítems (del OCR) — siempre detrás del botón, nunca de golpe */}
      {open && (
        <div className="border-t border-border px-3 py-2.5 dark:border-white/[0.08]">
          {loading && items === null ? (
            <p className="flex items-center gap-2 text-xs text-muted-foreground"><Loader2 className="h-3.5 w-3.5 animate-spin" />Cargando detalle…</p>
          ) : items && items.length > 0 ? (
            <>
              {e.receipt_total != null && (
                <p className="mb-1.5 text-[11px] text-muted-foreground">Total en el recibo: <span className="tnum font-medium text-foreground">{formatDOP(e.receipt_total)}</span></p>
              )}
              <ul className="space-y-1 text-xs">
                {items.map((it) => (
                  <li key={it.id} className="flex items-center justify-between gap-2">
                    <span className="min-w-0 truncate">
                      {it.quantity != null && <span className="tnum text-muted-foreground">{it.quantity}× </span>}
                      {it.name}
                    </span>
                    {it.line_total != null && <span className="tnum shrink-0 text-muted-foreground">{formatDOP(it.line_total)}</span>}
                  </li>
                ))}
              </ul>
            </>
          ) : (
            <p className="text-xs text-muted-foreground">Sin detalle disponible.</p>
          )}
        </div>
      )}
    </li>
  )
}
