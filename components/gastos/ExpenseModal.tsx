'use client'

import { useEffect, useRef, useState } from 'react'
import { useFormState, useFormStatus } from 'react-dom'
import { Camera, Paperclip } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Modal } from '@/components/ui/Modal'
import { Input, Select, Textarea } from '@/components/ui/Field'
import { useToast } from '@/components/ui/Toast'
import { createExpense, editExpense, type GastoState } from '@/lib/gastos/actions'
import { GROUPS, groupMeta, type Expense, type ExpenseCategory } from '@/lib/gastos/types'

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
  const [categoryId, setCategoryId] = useState('')
  const [method, setMethod] = useState('efectivo')
  const [fileName, setFileName] = useState('')
  const formRef = useRef<HTMLFormElement>(null)
  const { toast } = useToast()

  // Seed fields when opening.
  useEffect(() => {
    if (!open) return
    setFileName('')
    if (editing) {
      setCategoryId(editing.category_id)
      setMethod(editing.method)
    } else if (prefill) {
      setCategoryId(prefill.categoryId)
      setMethod(prefill.method)
    } else {
      setCategoryId('')
      setMethod('efectivo')
    }
  }, [open, editing, prefill])

  useEffect(() => {
    if (state.ok) { toast({ title: isEdit ? 'Gasto actualizado' : 'Gasto registrado', variant: 'success' }); onClose() }
    if (state.error) toast({ title: state.error, variant: 'error' })
  }, [state, toast, onClose, isEdit])

  const selectedGroup = categories.find((c) => c.id === categoryId)?.grp
  const showProduct = selectedGroup === 'produccion' && products.length > 0
  const showCaja = !isEdit && cajaOpen && method === 'efectivo'

  const def = editing ?? undefined
  const pf = prefill ?? undefined

  return (
    <Modal open={open} onClose={onClose} title={isEdit ? 'Editar gasto' : 'Registrar gasto'} description={isEdit ? 'Los cambios quedan auditados.' : 'Foto del recibo y listo.'}>
      <form ref={formRef} action={formAction} className="space-y-4">
        {isEdit && <input type="hidden" name="id" value={editing!.id} />}

        <Select id="exp-category" name="categoryId" label="Categoría" value={categoryId} onChange={(e) => setCategoryId(e.target.value)} required>
          <option value="" disabled>Elige una categoría</option>
          {GROUPS.map((g) => {
            const inG = categories.filter((c) => c.grp === g)
            if (inG.length === 0) return null
            return (
              <optgroup key={g} label={groupMeta[g].label}>
                {inG.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </optgroup>
            )
          })}
        </Select>

        <Input id="exp-desc" name="description" label="Descripción" placeholder="Ej. 2 galones de tinta negra" defaultValue={def?.description ?? pf?.description ?? ''} required />

        <div className="grid grid-cols-2 gap-3">
          <Input id="exp-amount" name="amount" label="Monto (RD$)" type="number" inputMode="decimal" step="1" min="0" defaultValue={def?.amount ?? pf?.amount ?? ''} required />
          <Input id="exp-date" name="expenseDate" label="Fecha" type="date" defaultValue={def?.expense_date ?? today} required />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <Select id="exp-method" name="method" label="Método" value={method} onChange={(e) => setMethod(e.target.value)}>
            <option value="efectivo">Efectivo</option>
            <option value="transferencia">Transferencia</option>
            <option value="debito">Débito</option>
            <option value="credito">Crédito</option>
          </Select>
          <Input id="exp-vendor" name="vendor" label="Proveedor / lugar" placeholder="Opcional" defaultValue={def?.vendor ?? pf?.vendor ?? ''} />
        </div>

        {showProduct && (
          <Select id="exp-product" name="productId" label="Asociar a producto (opcional)" defaultValue="">
            <option value="">— Ninguno —</option>
            {products.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
          </Select>
        )}

        <Textarea id="exp-notes" name="notes" label="Notas (opcional)" rows={2} defaultValue={def?.notes ?? ''} />

        {/* Receipt — camera on mobile */}
        <div className="space-y-1.5">
          <span className="text-sm font-medium">Recibo {isEdit && '(sube uno nuevo para reemplazar)'}</span>
          <label className="flex cursor-pointer items-center gap-2 rounded-xl border border-dashed border-border bg-card/60 px-3.5 py-3 text-sm text-muted-foreground transition-colors hover:border-gold-mid/50 dark:border-white/[0.08]">
            <Camera className="h-5 w-5 text-gold-brand" />
            <span className="flex-1 truncate">{fileName || 'Tomar foto o elegir archivo'}</span>
            <Paperclip className="h-4 w-4" />
            <input type="file" name="receipt" accept="image/png,image/jpeg,image/webp,image/gif,application/pdf" capture="environment" className="hidden" onChange={(e) => setFileName(e.target.files?.[0]?.name ?? '')} />
          </label>
          <p className="text-xs text-muted-foreground">Imagen o PDF · máx 10 MB · privado (enlace firmado)</p>
        </div>

        <div className="flex flex-wrap items-center gap-4">
          <label className="inline-flex items-center gap-2 text-sm">
            <input type="checkbox" name="isRecurring" defaultChecked={def?.is_recurring} className="h-4 w-4 rounded border-border accent-gold-mid" />
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
