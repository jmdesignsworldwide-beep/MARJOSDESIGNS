'use client'

import { useEffect } from 'react'
import { useFormState, useFormStatus } from 'react-dom'
import { Button } from '@/components/ui/Button'
import { Modal } from '@/components/ui/Modal'
import { Input, Select } from '@/components/ui/Field'
import { useToast } from '@/components/ui/Toast'
import { setSupplierPrice, type ProvState } from '@/lib/proveedores/actions'
import type { Material } from '@/lib/proveedores/types'

const initial: ProvState = {}

function SaveBtn() {
  const { pending } = useFormStatus()
  return <Button type="submit" loading={pending}>Guardar precio</Button>
}

export function SetPriceModal({
  open,
  onClose,
  supplierId,
  materials,
  presetMaterialId,
  presetPrice,
}: {
  open: boolean
  onClose: () => void
  supplierId: string
  materials: Material[]
  presetMaterialId?: string
  presetPrice?: number
}) {
  const [state, action] = useFormState(setSupplierPrice, initial)
  const { toast } = useToast()

  useEffect(() => {
    if (state.ok) { toast({ title: 'Precio guardado', variant: 'success' }); onClose() }
    if (state.error) toast({ title: state.error, variant: 'error' })
  }, [state, toast, onClose])

  return (
    <Modal open={open} onClose={onClose} title="Precio del proveedor" description="Cambiar un precio queda en el historial (con fecha).">
      <form action={action} className="space-y-4">
        <input type="hidden" name="supplierId" value={supplierId} />
        <Select id="p-material" name="materialId" label="Material" defaultValue={presetMaterialId ?? ''} required>
          <option value="" disabled>Elige un material</option>
          {materials.map((m) => <option key={m.id} value={m.id}>{m.name} ({m.unit})</option>)}
        </Select>
        <Input id="p-price" name="price" label="Precio (RD$)" type="number" inputMode="decimal" step="1" min="0" defaultValue={presetPrice ?? ''} required autoFocus />
        <div className="flex justify-end gap-3 pt-1">
          <Button type="button" variant="ghost" onClick={onClose}>Cancelar</Button>
          <SaveBtn />
        </div>
      </form>
    </Modal>
  )
}
