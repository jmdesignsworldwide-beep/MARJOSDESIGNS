'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useFormState, useFormStatus } from 'react-dom'
import { AnimatePresence, motion } from 'framer-motion'
import { CheckCircle2, Circle, Banknote, Pencil, Trash2, PartyPopper, ExternalLink, Repeat } from 'lucide-react'
import { cn, formatDOP } from '@/lib/utils'
import { Modal } from '@/components/ui/Modal'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Field'
import { useToast } from '@/components/ui/Toast'
import { noteKindMeta, recurrenceLabel, type CalendarNote, type CalendarOccurrence } from '@/lib/calendario/types'
import { dayFull } from '@/lib/calendario/dates'
import { toggleOccurrenceDone, skipOccurrence, deleteNote, editOccurrence, type CalState } from '@/lib/calendario/actions'

const initial: CalState = {}

function Pending({ children }: { children: React.ReactNode }) {
  const { pending } = useFormStatus()
  return <span className={cn(pending && 'opacity-60')}>{children}</span>
}

export function OccurrencePanel({
  occurrence,
  note,
  onClose,
  onEditSeries,
  onPay,
}: {
  occurrence: CalendarOccurrence | null
  note: CalendarNote | null
  onClose: () => void
  onEditSeries: (n: CalendarNote) => void
  onPay: (o: CalendarOccurrence) => void
}) {
  const [doneState, doneAction] = useFormState(toggleOccurrenceDone, initial)
  const [ovState, ovAction] = useFormState(editOccurrence, initial)
  const [editOne, setEditOne] = useState(false)
  const { toast } = useToast()

  useEffect(() => {
    if (doneState.ok) toast({ title: '¡Listo!', variant: 'success' })
    if (doneState.error) toast({ title: doneState.error, variant: 'error' })
  }, [doneState, toast])
  useEffect(() => {
    if (ovState.ok) { toast({ title: 'Actualizado solo esta fecha', variant: 'success' }); setEditOne(false); onClose() }
    if (ovState.error) toast({ title: ovState.error, variant: 'error' })
  }, [ovState, toast, onClose])
  useEffect(() => { if (occurrence) setEditOne(false) }, [occurrence])

  if (!occurrence) return null
  const m = noteKindMeta[occurrence.kind]
  const recurring = occurrence.recurrence !== 'once'
  const isTask = occurrence.kind === 'tarea'
  const isPay = occurrence.kind === 'pago'

  return (
    <Modal open={!!occurrence} onClose={onClose} title={`${m.emoji} ${m.label}`} description={dayFull(occurrence.date)}>
      <div className="space-y-4">
        <div>
          <p className={cn('text-lg font-semibold', occurrence.done && 'text-muted-foreground line-through')}>{occurrence.title}</p>
          {occurrence.body && <p className="mt-0.5 text-sm text-muted-foreground">{occurrence.body}</p>}
          <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
            {recurring && <span className="inline-flex items-center gap-1"><Repeat className="h-3 w-3" />{recurrenceLabel[occurrence.recurrence]}</span>}
            {isPay && occurrence.amount != null && <span className="tnum font-semibold text-status-ready">{formatDOP(occurrence.amount)}</span>}
          </div>
        </div>

        {occurrence.done ? (
          <AnimatePresence>
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="flex items-center justify-between rounded-xl border border-status-ready/30 bg-status-ready/10 px-3.5 py-2.5">
              <span className="inline-flex items-center gap-1.5 text-sm font-semibold text-status-ready"><PartyPopper className="h-4 w-4" />{isPay ? 'Pagado' : 'Completada'}</span>
              {occurrence.expenseId && <Link href="/gastos" className="inline-flex items-center gap-1 text-xs text-gold-brand hover:underline">Ver en Gastos<ExternalLink className="h-3 w-3" /></Link>}
            </motion.div>
          </AnimatePresence>
        ) : (
          <div className="flex flex-wrap gap-2">
            {isTask && (
              <form action={doneAction}>
                <input type="hidden" name="noteId" value={occurrence.noteId} />
                <input type="hidden" name="occurrenceDate" value={occurrence.date} />
                <input type="hidden" name="done" value="true" />
                <Button type="submit"><Pending><CheckCircle2 className="h-4 w-4" /></Pending>Marcar completada</Button>
              </form>
            )}
            {isPay && (
              <>
                <Button onClick={() => onPay(occurrence)}><Banknote className="h-4 w-4" />Pagar y registrar gasto</Button>
                <form action={doneAction}>
                  <input type="hidden" name="noteId" value={occurrence.noteId} />
                  <input type="hidden" name="occurrenceDate" value={occurrence.date} />
                  <input type="hidden" name="done" value="true" />
                  <Button type="submit" variant="secondary">Solo marcar pagado</Button>
                </form>
              </>
            )}
          </div>
        )}

        {occurrence.done && (
          <form action={doneAction}>
            <input type="hidden" name="noteId" value={occurrence.noteId} />
            <input type="hidden" name="occurrenceDate" value={occurrence.date} />
            <input type="hidden" name="done" value="false" />
            <button type="submit" className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground"><Circle className="h-3.5 w-3.5" />Desmarcar</button>
          </form>
        )}

        {/* Edit only this date (recurring) */}
        {recurring && !editOne && (
          <button type="button" onClick={() => setEditOne(true)} className="text-xs text-muted-foreground hover:text-gold-brand">Editar solo esta fecha</button>
        )}
        {recurring && editOne && (
          <form action={ovAction} className="space-y-2 rounded-xl border border-border p-3 dark:border-white/[0.08]">
            <input type="hidden" name="noteId" value={occurrence.noteId} />
            <input type="hidden" name="occurrenceDate" value={occurrence.date} />
            <Input id="ov-title" name="title" label="Título (solo esta fecha)" defaultValue={occurrence.title} />
            {isPay && <Input id="ov-amount" name="amount" label="Monto (solo esta fecha)" type="number" step="1" min="0" defaultValue={occurrence.amount ?? ''} />}
            <div className="flex justify-end gap-2"><Button type="button" size="sm" variant="ghost" onClick={() => setEditOne(false)}>Cancelar</Button><Button type="submit" size="sm">Guardar</Button></div>
          </form>
        )}

        {/* Edit / delete */}
        <div className="flex flex-wrap items-center justify-between gap-2 border-t border-border pt-3 dark:border-white/[0.08]">
          {note && (
            <button type="button" onClick={() => onEditSeries(note)} className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"><Pencil className="h-3.5 w-3.5" />Editar{recurring ? ' serie' : ''}</button>
          )}
          <div className="flex gap-3">
            {recurring && (
              <form action={skipOccurrence}>
                <input type="hidden" name="noteId" value={occurrence.noteId} />
                <input type="hidden" name="occurrenceDate" value={occurrence.date} />
                <button type="submit" onClick={onClose} className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-status-overdue"><Trash2 className="h-3.5 w-3.5" />Eliminar solo esta</button>
              </form>
            )}
            <form action={deleteNote}>
              <input type="hidden" name="id" value={occurrence.noteId} />
              <button type="submit" onClick={onClose} className="inline-flex items-center gap-1.5 text-sm text-status-overdue hover:underline"><Trash2 className="h-3.5 w-3.5" />Eliminar{recurring ? ' serie' : ''}</button>
            </form>
          </div>
        </div>
      </div>
    </Modal>
  )
}
