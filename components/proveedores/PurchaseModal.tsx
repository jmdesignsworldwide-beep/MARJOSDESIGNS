'use client'

import { useEffect } from 'react'
import { useFormState, useFormStatus } from 'react-dom'
import { Button } from '@/components/ui/Button'
import { Modal } from '@/components/ui/Modal'
import { Input, Select } from '@/components/ui/Field'
import { useToast } from '@/components/ui/Toast'
import { registerPurchase, type ProvState } from '@/lib/proveedores/actions'
import type { Material } from '@/lib/proveedores/types'

const initial: ProvState = {}

function SaveBtn() {
  const { pending } = useFormStatus()
  return <Button type="submit" loading={pending}>Registrar compra</Button>
}

export function PurchaseModal({
  open,
  onClose,
  supplierId,
  categories,
  materials,
}: {
  open: boolean
  onClose: () => void
  supplierId: string
  categories: { id: string; name: string }[]
  materials: Material[]
}) {
  const [state, action] = useFormState(registerPurchase, initial)
  const { toast } = useToast()

  useEffect(() => {
    if (state.ok) { toast({ title: 'Compra registrada (entró a Gastos)', variant: 'success' }); onClose() }
    if (state.error) toast({ title: state.error, variant: 'error' })
  }, [state, toast, onClose])

  return (
    <Modal open={open} onClose={onClose} title="Registrar compra" description="Se guarda como gasto de producción — sin recaptura.">
      <form action={action} className="space-y-4">
        <input type="hidden" name="supplierId" value={supplierId} />
        <Input id="pu-desc" name="description" label="¿Qué compraste?" placeholder="Ej. 2 rollos de lona" required />
        <div className="grid grid-cols-2 gap-3">
          <Input id="pu-amount" name="amount" label="Monto (RD$)" type="number" inputMode="decimal" step="1" min="0" required />
          <Select id="pu-method" name="method" label="Método" defaultValue="efectivo">
            <option value="efectivo">Efectivo</option>
            <option value="transferencia">Transferencia</option>
            <option value="debito">Débito</option>
            <option value="credito">Crédito</option>
          </Select>
        </div>
        <Select id="pu-cat" name="categoryId" label="Categoría de gasto (producción)" defaultValue={categories[0]?.id ?? ''} required>
          {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
        </Select>
        <Select id="pu-material" name="materialId" label="Material (opcional — actualiza su última compra)" defaultValue="">
          <option value="">— Ninguno —</option>
          {materials.map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}
        </Select>
        <div className="flex justify-end gap-3 pt-1">
          <Button type="button" variant="ghost" onClick={onClose}>Cancelar</Button>
          <SaveBtn />
        </div>
      </form>
    </Modal>
  )
}
