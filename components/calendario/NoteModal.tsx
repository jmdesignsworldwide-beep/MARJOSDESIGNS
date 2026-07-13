'use client'

import { useEffect, useState } from 'react'
import { useFormState, useFormStatus } from 'react-dom'
import { Trash2 } from 'lucide-react'
import { Modal } from '@/components/ui/Modal'
import { Button } from '@/components/ui/Button'
import { Input, Select, Textarea } from '@/components/ui/Field'
import { useToast } from '@/components/ui/Toast'
import { createNote, editNote, deleteNote, type CalState } from '@/lib/calendario/actions'
import type { CalendarNote } from '@/lib/calendario/types'

const initial: CalState = {}

function SaveBtn({ label }: { label: string }) {
  const { pending } = useFormStatus()
  return <Button type="submit" loading={pending}>{label}</Button>
}

export function NoteModal({
  open,
  onClose,
  date,
  editing,
}: {
  open: boolean
  onClose: () => void
  date: string
  editing?: CalendarNote | null
}) {
  const isEdit = !!editing
  const [state, action] = useFormState(isEdit ? editNote : createNote, initial)
  const [kind, setKind] = useState('tarea')
  const [recurrence, setRecurrence] = useState('once')
  const { toast } = useToast()

  useEffect(() => {
    if (open) {
      setKind(editing?.kind ?? 'tarea')
      setRecurrence(editing?.recurrence ?? 'once')
    }
  }, [open, editing])

  useEffect(() => {
    if (state.ok) { toast({ title: isEdit ? 'Nota actualizada' : 'Agregado al calendario', variant: 'success' }); onClose() }
    if (state.error) toast({ title: state.error, variant: 'error' })
  }, [state, toast, onClose, isEdit])

  return (
    <Modal open={open} onClose={onClose} title={isEdit ? 'Editar' : 'Nueva nota o tarea'} description={isEdit && editing?.recurrence !== 'once' ? 'Editas toda la serie recurrente.' : 'Tus pendientes, recordatorios y eventos — separados de las órdenes.'}>
      <form action={action} className="space-y-4">
        {isEdit && <input type="hidden" name="id" value={editing!.id} />}
        <div className="grid grid-cols-2 gap-3">
          <Select id="note-kind" name="kind" label="Tipo" value={kind} onChange={(e) => setKind(e.target.value)}>
            <option value="tarea">✅ Tarea / pendiente</option>
            <option value="pago">💵 Recordatorio de pago</option>
            <option value="nota">📝 Nota</option>
            <option value="evento">📌 Evento</option>
            <option value="feriado">🎉 Feriado</option>
          </Select>
          <Input id="note-date" name="noteDate" label={recurrence === 'once' ? 'Fecha' : 'Empieza el'} type="date" defaultValue={editing?.noteDate ?? date} required />
        </div>

        <Input id="note-title" name="title" label="Título" placeholder={kind === 'pago' ? 'Ej. Pagar la casa' : 'Ej. Comprar vinil'} defaultValue={editing?.title ?? ''} required />

        {kind === 'pago' && (
          <Input id="note-amount" name="amount" label="Monto (RD$)" type="number" inputMode="decimal" step="1" min="0" defaultValue={editing?.amount ?? ''} required />
        )}

        <div className="grid grid-cols-2 gap-3">
          <Select id="note-rec" name="recurrence" label="Se repite" value={recurrence} onChange={(e) => setRecurrence(e.target.value)}>
            <option value="once">Una vez</option>
            <option value="weekly">Cada semana</option>
            <option value="monthly">Cada mes</option>
          </Select>
          {recurrence === 'monthly' && (
            <Input id="note-end" name="recurrenceEnd" label="Hasta (opcional)" type="date" defaultValue={editing?.recurrenceEnd ?? ''} hint="Vacío = sin fin" />
          )}
        </div>

        <Textarea id="note-body" name="body" label="Detalle (opcional)" rows={2} defaultValue={editing?.body ?? ''} />

        <div className="flex items-center justify-between pt-1">
          {isEdit ? (
            <Button type="submit" formAction={deleteNote} variant="ghost" onClick={onClose} className="text-status-overdue hover:bg-status-overdue/10"><Trash2 className="h-4 w-4" />Eliminar serie</Button>
          ) : <span />}
          <div className="flex gap-2">
            <Button type="button" variant="ghost" onClick={onClose}>Cancelar</Button>
            <SaveBtn label={isEdit ? 'Guardar' : 'Agregar'} />
          </div>
        </div>
      </form>
    </Modal>
  )
}
