'use client'

import { useEffect } from 'react'
import { useFormState, useFormStatus } from 'react-dom'
import { Button } from '@/components/ui/Button'
import { Modal } from '@/components/ui/Modal'
import { Input, Select } from '@/components/ui/Field'
import { useToast } from '@/components/ui/Toast'
import { payReminderAsExpense, type CalState } from '@/lib/calendario/actions'
import { GROUPS, groupMeta, type ExpenseCategory } from '@/lib/gastos/types'
import type { CalendarOccurrence } from '@/lib/calendario/types'

const initial: CalState = {}
function SaveBtn() { const { pending } = useFormStatus(); return <Button type="submit" loading={pending}>Registrar pago</Button> }

export function PayReminderModal({
  occurrence,
  categories,
  onClose,
}: {
  occurrence: CalendarOccurrence | null
  categories: ExpenseCategory[]
  onClose: () => void
}) {
  const [state, action] = useFormState(payReminderAsExpense, initial)
  const { toast } = useToast()
  useEffect(() => {
    if (state.ok) { toast({ title: 'Pago registrado como gasto', variant: 'success' }); onClose() }
    if (state.error) toast({ title: state.error, variant: 'error' })
  }, [state, toast, onClose])

  if (!occurrence) return null

  return (
    <Modal open={!!occurrence} onClose={onClose} title="Registrar como gasto" description="Confirma para que cuadre con Gastos y Finanzas — sin recaptura.">
      <form action={action} className="space-y-4">
        <input type="hidden" name="noteId" value={occurrence.noteId} />
        <input type="hidden" name="occurrenceDate" value={occurrence.date} />
        <div className="rounded-xl border border-border bg-card/60 p-3 text-sm dark:border-white/[0.08]">
          <span className="font-medium">{occurrence.title}</span> · {occurrence.date}
        </div>
        <Input id="pr-amount" name="amount" label="Monto (RD$)" type="number" inputMode="decimal" step="1" min="0" defaultValue={occurrence.amount ?? ''} required />
        <Select id="pr-cat" name="categoryId" label="Categoría de gasto" defaultValue="" required>
          <option value="" disabled>Elige una categoría</option>
          {GROUPS.map((g) => {
            const inG = categories.filter((c) => c.grp === g)
            if (inG.length === 0) return null
            return <optgroup key={g} label={groupMeta[g].label}>{inG.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</optgroup>
          })}
        </Select>
        <Select id="pr-method" name="method" label="Método" defaultValue="efectivo">
          <option value="efectivo">Efectivo</option>
          <option value="transferencia">Transferencia</option>
          <option value="debito">Débito</option>
          <option value="credito">Crédito</option>
        </Select>
        <div className="flex justify-end gap-3 pt-1">
          <Button type="button" variant="ghost" onClick={onClose}>Cancelar</Button>
          <SaveBtn />
        </div>
      </form>
    </Modal>
  )
}
