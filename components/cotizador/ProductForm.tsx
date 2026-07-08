'use client'

import { useEffect } from 'react'
import { useFormState, useFormStatus } from 'react-dom'
import { Button } from '@/components/ui/Button'
import { Input, Select } from '@/components/ui/Field'
import { useToast } from '@/components/ui/Toast'
import { createProduct, type PanelActionState } from '@/app/(app)/cotizador/actions'

const initial: PanelActionState = {}

function SubmitButton() {
  const { pending } = useFormStatus()
  return <Button type="submit" loading={pending}>Agregar producto</Button>
}

/** Create a new product (name, calc type, base price). Reused by the
 *  calculator's "Nuevo producto" and the price panel. */
export function ProductForm({ onDone }: { onDone: () => void }) {
  const [state, formAction] = useFormState(createProduct, initial)
  const { toast } = useToast()

  useEffect(() => {
    if (state.success) {
      toast({ title: state.success, variant: 'success' })
      onDone()
    }
  }, [state.success, toast, onDone])

  const fe = state.fieldErrors ?? {}

  return (
    <form action={formAction} className="space-y-4">
      <Input id="p-name" name="name" label="Nombre del producto" placeholder="Ej. Mousepad" error={fe.name} required />
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Select id="p-calc" name="calcType" label="Tipo de cálculo" defaultValue="quantity">
          <option value="quantity">Por cantidad (unidad)</option>
          <option value="area">Por área (pie²)</option>
        </Select>
        <Input
          id="p-price"
          name="basePrice"
          label="Precio base (RD$)"
          type="number"
          inputMode="decimal"
          step="0.01"
          min="0"
          placeholder="0.00"
          error={fe.basePrice}
          required
        />
      </div>
      {state.error && <p className="text-sm font-medium text-status-overdue">{state.error}</p>}
      <div className="flex justify-end gap-3 pt-1">
        <Button type="button" variant="ghost" onClick={onDone}>Cancelar</Button>
        <SubmitButton />
      </div>
    </form>
  )
}
