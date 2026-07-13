'use client'

import { useEffect, useMemo, useRef, useState, useTransition } from 'react'
import { useFormState, useFormStatus } from 'react-dom'
import { Camera, Paperclip, ScanLine, ChevronDown, Loader2, CheckCircle2, AlertTriangle } from 'lucide-react'
import { cn, formatDOP } from '@/lib/utils'
import { Button } from '@/components/ui/Button'
import { Modal } from '@/components/ui/Modal'
import { Input, Select, Textarea } from '@/components/ui/Field'
import { useToast } from '@/components/ui/Toast'
import { createExpense, editExpense, readReceipt, type GastoState, type ReadReceiptState } from '@/lib/gastos/actions'
import { GROUPS, groupMeta, type Expense, type ExpenseCategory, type ExpenseGroup, type ParsedReceiptItem } from '@/lib/gastos/types'

const initial: GastoState = {}

export interface ExpensePrefill {
  categoryId: string
  description: string
  method: string
  amount: number
  vendor: string | null
}

function SaveBtn({ label }: { label: string }) {
  const { pending } = useFormStatus()
  return <Button type="submit" loading={pending}>{label}</Button>
}

export function ExpenseModal({
  open,
  onClose,
  categories,
  products,
  cajaOpen,
  today,
  editing,
  prefill,
}: {
  open: boolean
  onClose: () => void
  categories: ExpenseCategory[]
  products: { id: string; name: string }[]
  cajaOpen: boolean
  today: string
  editing?: Expense | null
  prefill?: ExpensePrefill | null
}) {
  const isEdit = !!editing
  const action = isEdit ? editExpense : createExpense
  const [state, formAction] = useFormState(action, initial)

  const [group, setGroup] = useState<ExpenseGroup>('produccion')
  const [categoryId, setCategoryId] = useState('')
  const [method, setMethod] = useState('efectivo')
  const [amount, setAmount] = useState('')
  const [expenseDate, setExpenseDate] = useState(today)
  const [fileName, setFileName] = useState('')

  // Receipt reading (OCR) state.
  const [reading, startReading] = useTransition()
  const [read, setRead] = useState<ReadReceiptState | null>(null)
  const [items, setItems] = useState<ParsedReceiptItem[]>([])
  const [receiptTotal, setReceiptTotal] = useState<number | null>(null)
  const [detailOpen, setDetailOpen] = useState(false)

  const fileRef = useRef<HTMLInputElement>(null)
  const { toast } = useToast()

  const catById = useMemo(() => new Map(categories.map((c) => [c.id, c])), [categories])
  const inGroup = useMemo(() => categories.filter((c) => c.grp === group), [categories, group])

  // Seed fields when opening.
  useEffect(() => {
    if (!open) return
    setFileName('')
    setRead(null)
    setItems([])
    setReceiptTotal(null)
    setDetailOpen(false)
    if (editing) {
      setGroup(editing.grp ?? catById.get(editing.category_id)?.grp ?? 'produccion')
      setCategoryId(editing.category_id)
      setMethod(editing.method)
      setAmount(String(editing.amount))
      setExpenseDate(editing.expense_date)
    } else if (prefill) {
      setGroup(catById.get(prefill.categoryId)?.grp ?? 'produccion')
      setCategoryId(prefill.categoryId)
      setMethod(prefill.method)
      setAmount(prefill.amount ? String(prefill.amount) : '')
      setExpenseDate(today)
    } else {
      setGroup('produccion')
      setCategoryId('')
      setMethod('efectivo')
      setAmount('')
      setExpenseDate(today)
    }
  }, [open, editing, prefill, today, catById])

  useEffect(() => {
    if (state.ok) { toast({ title: isEdit ? 'Gasto actualizado' : 'Gasto registrado', variant: 'success' }); onClose() }
    if (state.error) toast({ title: state.error, variant: 'error' })
  }, [state, toast, onClose, isEdit])

  function onPickGroup(g: ExpenseGroup) {
    setGroup(g)
    // Keep the current subcategory only if it belongs to the new group.
    if (categoryId && catById.get(categoryId)?.grp !== g) setCategoryId('')
  }

  function onFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0]
    setFileName(f?.name ?? '')
    setRead(null)
    setItems([])
    setReceiptTotal(null)
    setDetailOpen(false)
  }

  function doRead() {
    const file = fileRef.current?.files?.[0]
    if (!file) { toast({ title: 'Toma o elige la foto del recibo primero.', variant: 'warning' }); return }
    const fd = new FormData()
    fd.append('receipt', file)
    startReading(async () => {
      const res = await readReceipt({}, fd)
      setRead(res)
      if (res.error) { toast({ title: res.error, variant: 'error' }); return }
      if (res.readable && res.items) {
        setItems(res.items)
        setReceiptTotal(res.total ?? null)
        // Auto-fill total + date only if empty (Marjos confirma antes de guardar).
        if (res.total != null && !amount) setAmount(String(Math.round(res.total)))
        if (res.date) setExpenseDate(res.date)
        toast({ title: `Recibo leído · ${res.items.length} ítems`, variant: 'success' })
      }
    })
  }

  const showProduct = group === 'produccion' && products.length > 0
  const showCaja = !isEdit && cajaOpen && method === 'efectivo'

  return (
    <Modal open={open} onClose={onClose} title={isEdit ? 'Editar gasto' : 'Registrar gasto'} description={isEdit ? 'Los cambios quedan auditados.' : 'Toma la foto, lee el recibo y confirma.'}>
      <form action={formAction} className="space-y-4">
        {isEdit && <input type="hidden" name="id" value={editing!.id} />}
        {/* Carried into createExpense so the transcribed lines + total persist. */}
        <input type="hidden" name="categoryId" value={categoryId} />
        <input type="hidden" name="receiptItems" value={items.length ? JSON.stringify(items) : ''} />
        <input type="hidden" name="receiptTotal" value={receiptTotal ?? ''} />

        {/* Grupo → Subcategoría (el select se adapta al grupo) */}
        <div className="space-y-2">
          <span className="text-sm font-medium">Grupo</span>
          <div className="grid grid-cols-3 gap-1.5">
            {GROUPS.map((g) => (
              <button
                key={g}
                type="button"
                onClick={() => onPickGroup(g)}
                className={cn(
                  'rounded-xl border px-2 py-2 text-xs font-medium transition-colors',
                  group === g ? 'border-gold-mid/50 bg-gold-gradient-soft text-gold-brand' : 'border-border text-muted-foreground hover:border-gold-mid/30',
                )}
              >
                {groupMeta[g].short}
              </button>
            ))}
          </div>
        </div>

        <Select id="exp-category" label="Subcategoría" value={categoryId} onChange={(e) => setCategoryId(e.target.value)} required>
          <option value="" disabled>Elige una subcategoría…</option>
          {inGroup.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
        </Select>

        <Input id="exp-desc" name="description" label="Descripción" placeholder="Ej. 2 galones de tinta negra" defaultValue={editing?.description ?? prefill?.description ?? ''} required />

        <div className="grid grid-cols-2 gap-3">
          <Input id="exp-amount" name="amount" label="Monto (RD$)" type="number" inputMode="decimal" step="1" min="0" value={amount} onChange={(e) => setAmount(e.target.value)} required />
          <Input id="exp-date" name="expenseDate" label="Fecha" type="date" value={expenseDate} onChange={(e) => setExpenseDate(e.target.value)} required />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <Select id="exp-method" name="method" label="Método" value={method} onChange={(e) => setMethod(e.target.value)}>
            <option value="efectivo">Efectivo</option>
            <option value="transferencia">Transferencia</option>
            <option value="debito">Débito</option>
            <option value="credito">Crédito</option>
          </Select>
          <Input id="exp-vendor" name="vendor" label="Proveedor / lugar" placeholder="Opcional" defaultValue={editing?.vendor ?? prefill?.vendor ?? ''} />
        </div>

        {showProduct && (
          <Select id="exp-product" name="productId" label="Asociar a producto (opcional)" defaultValue="">
            <option value="">— Ninguno —</option>
            {products.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
          </Select>
        )}

        <Textarea id="exp-notes" name="notes" label="Notas (opcional)" rows={2} defaultValue={editing?.notes ?? ''} />

        {/* Receipt — camera on mobile + lectura inteligente */}
        <div className="space-y-2">
          <span className="text-sm font-medium">Recibo {isEdit && '(sube uno nuevo para reemplazar)'}</span>
          <label className="flex cursor-pointer items-center gap-2 rounded-xl border border-dashed border-border bg-card/60 px-3.5 py-3 text-sm text-muted-foreground transition-colors hover:border-gold-mid/50 dark:border-white/[0.08]">
            <Camera className="h-5 w-5 text-gold-brand" />
            <span className="flex-1 truncate">{fileName || 'Tomar foto o elegir archivo'}</span>
            <Paperclip className="h-4 w-4" />
            <input ref={fileRef} type="file" name="receipt" accept="image/png,image/jpeg,image/webp,image/gif,application/pdf" capture="environment" className="hidden" onChange={onFileChange} />
          </label>

          {fileName && (
            <button type="button" onClick={doRead} disabled={reading} className="inline-flex items-center gap-1.5 rounded-lg border border-gold-mid/40 bg-gold-gradient-soft px-3 py-1.5 text-sm font-medium text-gold-brand transition-transform hover:scale-[1.02] disabled:opacity-60">
              {reading ? <Loader2 className="h-4 w-4 animate-spin" /> : <ScanLine className="h-4 w-4" />}
              {reading ? 'Leyendo la factura…' : 'Leer factura'}
            </button>
          )}

          {/* Lectura no configurada */}
          {read?.unconfigured && (
            <p className="flex items-start gap-1.5 rounded-lg border border-border bg-muted/40 px-3 py-2 text-xs text-muted-foreground">
              <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
              La lectura automática no está activada aún. Puedes registrar el gasto llenando el monto a mano — la foto igual se guarda.
            </p>
          )}

          {/* Foto ilegible → pedir otra */}
          {read?.ok && read.readable === false && (
            <p className="flex items-start gap-1.5 rounded-lg border border-status-overdue/30 bg-status-overdue/10 px-3 py-2 text-xs text-status-overdue">
              <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
              {read.reason ?? 'La foto no se ve bien para leerla — toma otra más nítida.'}
            </p>
          )}

          {/* Resumen leído (sin abrumar) + detalle desplegable */}
          {read?.readable && items.length > 0 && (
            <div className="rounded-xl border border-status-ready/30 bg-status-ready/10 px-3 py-2.5">
              <div className="flex items-center gap-2 text-sm font-medium text-status-ready">
                <CheckCircle2 className="h-4 w-4" />
                Recibo leído · {items.length} ítems{receiptTotal != null ? ` · total ${formatDOP(receiptTotal)}` : ''}
              </div>
              <button type="button" onClick={() => setDetailOpen((v) => !v)} className="mt-1.5 inline-flex items-center gap-1 text-xs font-medium text-muted-foreground hover:text-foreground">
                <ChevronDown className={cn('h-3.5 w-3.5 transition-transform', detailOpen && 'rotate-180')} />
                {detailOpen ? 'Ocultar detalle' : 'Ver detalle de la factura'}
              </button>
              {detailOpen && (
                <ul className="mt-2 max-h-44 space-y-1 overflow-y-auto border-t border-status-ready/20 pt-2 text-xs">
                  {items.map((it, i) => (
                    <li key={i} className="flex items-center justify-between gap-2">
                      <span className="min-w-0 truncate">
                        {it.quantity != null && <span className="tnum text-muted-foreground">{it.quantity}× </span>}
                        {it.name}
                      </span>
                      {it.lineTotal != null && <span className="tnum shrink-0 text-muted-foreground">{formatDOP(it.lineTotal)}</span>}
                    </li>
                  ))}
                </ul>
              )}
              <p className="mt-1.5 text-[11px] text-muted-foreground">Revisa el monto y confirma antes de guardar. La descripción la pones tú.</p>
            </div>
          )}

          <p className="text-xs text-muted-foreground">Imagen o PDF · máx 10 MB · privado (enlace firmado). La lectura solo funciona con foto (JPG/PNG).</p>
        </div>

        <div className="flex flex-wrap items-center gap-4">
          <label className="inline-flex items-center gap-2 text-sm">
            <input type="checkbox" name="isRecurring" defaultChecked={editing?.is_recurring} className="h-4 w-4 rounded border-border accent-gold-mid" />
            Gasto fijo / recurrente
          </label>
          {showCaja && (
            <label className="inline-flex items-center gap-2 text-sm">
              <input type="checkbox" name="deductFromCaja" className="h-4 w-4 rounded border-border accent-gold-mid" />
              Restar de la caja de hoy
            </label>
          )}
        </div>

        <div className="flex justify-end gap-3 pt-1">
          <Button type="button" variant="ghost" onClick={onClose}>Cancelar</Button>
          <SaveBtn label={isEdit ? 'Guardar cambios' : 'Registrar gasto'} />
        </div>
      </form>
    </Modal>
  )
}
