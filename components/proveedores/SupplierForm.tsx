'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useFormState, useFormStatus } from 'react-dom'
import { Button } from '@/components/ui/Button'
import { Modal } from '@/components/ui/Modal'
import { Input, Textarea } from '@/components/ui/Field'
import { useToast } from '@/components/ui/Toast'
import { createSupplier, editSupplier, type ProvState } from '@/lib/proveedores/actions'
import type { Supplier } from '@/lib/proveedores/types'

const initial: ProvState = {}

function SaveBtn({ label }: { label: string }) {
  const { pending } = useFormStatus()
  return <Button type="submit" loading={pending}>{label}</Button>
}

export function SupplierForm({
  open,
  onClose,
  editing,
  goToDetailOnCreate = false,
}: {
  open: boolean
  onClose: () => void
  editing?: Supplier | null
  goToDetailOnCreate?: boolean
}) {
  const isEdit = !!editing
  const [state, action] = useFormState(isEdit ? editSupplier : createSupplier, initial)
  const { toast } = useToast()
  const router = useRouter()

  useEffect(() => {
    if (state.ok) {
      toast({ title: isEdit ? 'Proveedor actualizado' : 'Proveedor creado', variant: 'success' })
      onClose()
      if (!isEdit && goToDetailOnCreate && state.id) router.push(`/proveedores/${state.id}`)
    }
    if (state.error) toast({ title: state.error, variant: 'error' })
  }, [state, toast, onClose, isEdit, goToDetailOnCreate, router])

  const d = editing ?? undefined

  return (
    <Modal open={open} onClose={onClose} title={isEdit ? 'Editar proveedor' : 'Nuevo proveedor'} description="A quién le compras — con su WhatsApp para pedir directo.">
      <form action={action} className="space-y-4">
        {isEdit && <input type="hidden" name="id" value={editing!.id} />}
        <Input id="s-name" name="name" label="Nombre del proveedor" placeholder="Ej. Suplidora El Vinilo" defaultValue={d?.name ?? ''} required />
        <div className="grid grid-cols-2 gap-3">
          <Input id="s-whatsapp" name="whatsapp" label="WhatsApp" inputMode="tel" placeholder="809…" defaultValue={d?.whatsapp ?? ''} />
          <Input id="s-phone" name="phone" label="Teléfono" inputMode="tel" defaultValue={d?.phone ?? ''} />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Input id="s-contact" name="contactPerson" label="Persona de contacto" defaultValue={d?.contact_person ?? ''} />
          <Input id="s-email" name="email" label="Email" type="email" defaultValue={d?.email ?? ''} />
        </div>
        <Input id="s-address" name="address" label="Dirección" defaultValue={d?.address ?? ''} />
        <Input id="s-balance" name="balanceOwed" label="Balance que le debes (opcional, RD$)" type="number" inputMode="decimal" step="1" min="0" defaultValue={d?.balance_owed ? String(d.balance_owed) : ''} />
        <Textarea id="s-notes" name="notes" label="Notas internas" rows={2} defaultValue={d?.notes ?? ''} />
        <div className="flex justify-end gap-3 pt-1">
          <Button type="button" variant="ghost" onClick={onClose}>Cancelar</Button>
          <SaveBtn label={isEdit ? 'Guardar' : 'Crear proveedor'} />
        </div>
      </form>
    </Modal>
  )
}
