'use client'

import { useEffect, useState } from 'react'
import { useFormState, useFormStatus } from 'react-dom'
import { Button } from '@/components/ui/Button'
import { Modal } from '@/components/ui/Modal'
import { Input, Select } from '@/components/ui/Field'
import { useToast } from '@/components/ui/Toast'
import { addManualMovement, type CajaState } from '@/lib/caja/actions'

const initial: CajaState = {}

function SaveBtn() {
  const { pending } = useFormStatus()
  return <Button type="submit" loading={pending}>Registrar</Button>
}

export function ManualMovementModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [state, action] = useFormState(addManualMovement, initial)
  const [method, setMethod] = useState('efectivo')
  const { toast } = useToast()

  useEffect(() => {
    if (state.ok) { toast({ title: 'Movimiento registrado', variant: 'success' }); onClose() }
    if (state.error) toast({ title: state.error, variant: 'error' })
  }, [state, toast, onClose])

  return (
    <Modal open={open} onClose={onClose} title="Movimiento manual" description="Para dinero que no viene de una orden ni de una venta.">
      <form action={action} className="space-y-4">
        <Select id="mv-direction" name="direction" label="Tipo" defaultValue="entrada">
          <option value="entrada">Entrada (dinero que entra)</option>
          <option value="salida">Salida (dinero que sale)</option>
        </Select>
        <Input id="mv-amount" name="amount" label="Monto (RD$)" type="number" inputMode="decimal" step="1" min="0" required />
        <Select id="mv-method" name="method" label="Método" value={method} onChange={(e) => setMethod(e.target.value)}>
          <option value="efectivo">Efectivo</option>
          <option value="transferencia">Transferencia</option>
          <option value="debito">Débito</option>
          <option value="credito">Crédito</option>
        </Select>
        <Input id="mv-concept" name="concept" label="Concepto" placeholder="Ej. abono suelto, compra de material" required />
        <Input id="mv-client" name="clientName" label="Cliente (opcional)" />
        {method === 'transferencia' && (
          <Input id="mv-ref" name="reference" label="Referencia / voucher" hint="Se avisa si la referencia ya existe." />
        )}
        <div className="flex justify-end gap-3 pt-1">
          <Button type="button" variant="ghost" onClick={onClose}>Cancelar</Button>
          <SaveBtn />
        </div>
      </form>
    </Modal>
  )
}
