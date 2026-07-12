'use client'

import { useEffect } from 'react'
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
  const { toast } = useToast()

  useEffect(() => {
    if (state.ok) { toast({ title: isEdit ? 'Nota actualizada' : 'Nota agregada', variant: 'success' }); onClose() }
    if (state.error) toast({ title: state.error, variant: 'error' })
  }, [state, toast, onClose, isEdit])

  return (
    <Modal open={open} onClose={onClose} title={isEdit ? 'Editar nota' : 'Nueva nota'} description="Tus recordatorios y eventos — separados de las órdenes.">
      <form action={action} className="space-y-4">
        {isEdit && <input type="hidden" name="id" value={editing!.id} />}
        <div className="grid grid-cols-2 gap-3">
          <Input id="note-date" name="noteDate" label="Fecha" type="date" defaultValue={editing?.noteDate ?? date} required />
          <Select id="note-kind" name="kind" label="Tipo" defaultValue={editing?.kind ?? 'nota'}>
            <option value="nota">📝 Nota</option>
            <option value="evento">📌 Evento</option>
            <option value="feriado">🎉 Feriado</option>
          </Select>
        </div>
        <Input id="note-title" name="title" label="Título" placeholder="Ej. comprar vinil, cita 3pm…" defaultValue={editing?.title ?? ''} required />
        <Textarea id="note-body" name="body" label="Detalle (opcional)" rows={2} defaultValue={editing?.body ?? ''} />
        <div className="flex items-center justify-between pt-1">
          {isEdit ? (
            <Button type="submit" formAction={deleteNote} variant="ghost" onClick={onClose} className="text-status-overdue hover:bg-status-overdue/10"><Trash2 className="h-4 w-4" />Eliminar</Button>
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
