'use client'

import { useEffect, useState } from 'react'
import { useFormState, useFormStatus } from 'react-dom'
import { Button } from '@/components/ui/Button'
import { Modal } from '@/components/ui/Modal'
import { Input, Select } from '@/components/ui/Field'
import { useToast } from '@/components/ui/Toast'
import { createMaterial, editMaterial, type ProvState } from '@/lib/proveedores/actions'
import type { Material } from '@/lib/proveedores/types'

const initial: ProvState = {}

function SaveBtn({ label }: { label: string }) {
  const { pending } = useFormStatus()
  return <Button type="submit" loading={pending}>{label}</Button>
}

export function MaterialForm({
  open,
  onClose,
  editing,
  suppliers,
  products,
}: {
  open: boolean
  onClose: () => void
  editing?: Material | null
  suppliers: { id: string; name: string }[]
  products: { id: string; name: string }[]
}) {
  const isEdit = !!editing
  const [state, action] = useFormState(isEdit ? editMaterial : createMaterial, initial)
  const [track, setTrack] = useState(false)
  const { toast } = useToast()

  useEffect(() => { if (open) setTrack(editing?.track_stock ?? false) }, [open, editing])
  useEffect(() => {
    if (state.ok) { toast({ title: isEdit ? 'Material actualizado' : 'Material agregado', variant: 'success' }); onClose() }
    if (state.error) toast({ title: state.error, variant: 'error' })
  }, [state, toast, onClose, isEdit])

  const d = editing ?? undefined

  return (
    <Modal open={open} onClose={onClose} title={isEdit ? 'Editar material' : 'Nuevo material'} description="El stock es opcional — anótalo solo si quieres alertas.">
      <form action={action} className="space-y-4">
        {isEdit && <input type="hidden" name="id" value={editing!.id} />}
        <Input id="m-name" name="name" label="Nombre" placeholder="Ej. Lona banner" defaultValue={d?.name ?? ''} required />
        <div className="grid grid-cols-2 gap-3">
          <Input id="m-cat" name="category" label="Categoría" placeholder="Ej. Impresión" defaultValue={d?.category ?? ''} />
          <Input id="m-unit" name="unit" label="Unidad" placeholder="metro, unidad, galón" defaultValue={d?.unit ?? 'unidad'} />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Select id="m-supplier" name="defaultSupplierId" label="Proveedor" defaultValue={d?.default_supplier_id ?? ''}>
            <option value="">— Ninguno —</option>
            {suppliers.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
          </Select>
          <Input id="m-cost" name="unitCost" label="Costo por unidad (RD$)" type="number" inputMode="decimal" step="1" min="0" defaultValue={d?.unit_cost ?? ''} />
        </div>
        <Select id="m-product" name="productId" label="Producto asociado (opcional — para margen)" defaultValue={d?.product_id ?? ''}>
          <option value="">— Ninguno —</option>
          {products.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
        </Select>

        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" name="trackStock" checked={track} onChange={(e) => setTrack(e.target.checked)} className="h-4 w-4 rounded border-border accent-gold-mid" />
          Llevar stock de este material (opcional)
        </label>
        {track && (
          <div className="grid grid-cols-2 gap-3">
            <Input id="m-stock" name="stock" label="Stock actual" type="number" inputMode="decimal" step="1" min="0" defaultValue={d?.stock ?? ''} />
            <Input id="m-min" name="minStock" label="Stock mínimo (alerta)" type="number" inputMode="decimal" step="1" min="0" defaultValue={d?.min_stock ?? ''} />
          </div>
        )}

        <div className="flex justify-end gap-3 pt-1">
          <Button type="button" variant="ghost" onClick={onClose}>Cancelar</Button>
          <SaveBtn label={isEdit ? 'Guardar' : 'Agregar material'} />
        </div>
      </form>
    </Modal>
  )
}
