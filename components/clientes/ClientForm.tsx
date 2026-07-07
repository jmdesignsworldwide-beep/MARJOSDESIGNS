'use client'

import { useEffect, useState } from 'react'
import { useFormState, useFormStatus } from 'react-dom'
import { User, Building2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/Button'
import { Input, Textarea } from '@/components/ui/Field'
import { useToast } from '@/components/ui/Toast'
import type { Client, ClientType } from '@/lib/clients/data'
import {
  createClient,
  updateClient,
  type ClientActionState,
} from '@/app/(app)/clientes/actions'

const initial: ClientActionState = {}

function SubmitButton({ label }: { label: string }) {
  const { pending } = useFormStatus()
  return (
    <Button type="submit" loading={pending}>
      {label}
    </Button>
  )
}

export function ClientForm({
  mode,
  client,
  onDone,
}: {
  mode: 'create' | 'edit'
  client?: Client
  onDone: (createdId?: string) => void
}) {
  const action = mode === 'create' ? createClient : updateClient
  const [state, formAction] = useFormState(action, initial)
  const [type, setType] = useState<ClientType>(client?.type ?? 'persona')
  const { toast } = useToast()

  useEffect(() => {
    if (state.success) {
      toast({ title: state.success, variant: 'success' })
      onDone(state.createdId)
    }
  }, [state.success, state.createdId, toast, onDone])

  const fe = state.fieldErrors ?? {}

  return (
    <form action={formAction} className="space-y-4">
      {mode === 'edit' && <input type="hidden" name="id" value={client!.id} />}
      <input type="hidden" name="type" value={type} />

      {/* Type toggle */}
      <div className="grid grid-cols-2 gap-2 rounded-xl border border-border p-1">
        {(['persona', 'empresa'] as ClientType[]).map((t) => {
          const Icon = t === 'persona' ? User : Building2
          const active = type === t
          return (
            <button
              key={t}
              type="button"
              onClick={() => setType(t)}
              className={cn(
                'inline-flex items-center justify-center gap-2 rounded-lg py-2 text-sm font-medium capitalize transition-colors',
                active
                  ? 'bg-gold-gradient text-charcoal-900'
                  : 'text-muted-foreground hover:text-foreground',
              )}
            >
              <Icon className="h-4 w-4" />
              {t}
            </button>
          )
        })}
      </div>

      <Input
        id="name"
        name="name"
        label={type === 'empresa' ? 'Razón social' : 'Nombre completo'}
        defaultValue={client?.name}
        error={fe.name}
        required
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Input id="phone" name="phone" label="Teléfono" placeholder="809-555-1234" defaultValue={client?.phone ?? ''} error={fe.phone} />
        <Input id="whatsapp" name="whatsapp" label="WhatsApp" placeholder="Igual o distinto al teléfono" defaultValue={client?.whatsapp ?? ''} error={fe.whatsapp} />
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Input id="email" name="email" type="email" label="Email (opcional)" defaultValue={client?.email ?? ''} error={fe.email} />
        {type === 'persona' ? (
          <Input id="cedula" name="cedula" label="Cédula (opcional)" defaultValue={client?.cedula ?? ''} error={fe.cedula} />
        ) : (
          <Input id="rnc" name="rnc" label="RNC (opcional)" defaultValue={client?.rnc ?? ''} error={fe.rnc} />
        )}
      </div>

      {type === 'empresa' && (
        <Input id="contact_person" name="contact_person" label="Persona de contacto (opcional)" defaultValue={client?.contact_person ?? ''} error={fe.contact_person} />
      )}

      <Input id="address" name="address" label="Dirección (opcional)" defaultValue={client?.address ?? ''} error={fe.address} />
      <Textarea id="notes" name="notes" label="Notas internas" placeholder="Preferencias, detalles, recordatorios…" defaultValue={client?.notes ?? ''} error={fe.notes} />

      {state.error && <p className="text-sm font-medium text-status-overdue">{state.error}</p>}

      <div className="flex justify-end gap-3 pt-1">
        <Button type="button" variant="ghost" onClick={() => onDone()}>
          Cancelar
        </Button>
        <SubmitButton label={mode === 'create' ? 'Guardar cliente' : 'Guardar cambios'} />
      </div>
    </form>
  )
}
