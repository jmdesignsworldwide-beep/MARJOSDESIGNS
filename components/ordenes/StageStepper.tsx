'use client'

import { useState } from 'react'
import { useFormState } from 'react-dom'
import { motion } from 'framer-motion'
import { Check, ChevronRight, XCircle } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/Button'
import { Modal } from '@/components/ui/Modal'
import { Textarea } from '@/components/ui/Field'
import { STAGE_FLOW, stageMeta, type OrderStage } from '@/lib/ordenes/format'
import { advanceStage, cancelOrder, type ManageState } from '@/app/(app)/ordenes/manage-actions'

const initial: ManageState = {}

export function StageStepper({ orderId, stage }: { orderId: string; stage: OrderStage }) {
  const [cancelOpen, setCancelOpen] = useState(false)
  const [cancelState, cancelAction] = useFormState(cancelOrder, initial)

  const cancelled = stage === 'cancelada'
  const idx = STAGE_FLOW.indexOf(stage)
  const next = idx >= 0 && idx < STAGE_FLOW.length - 1 ? STAGE_FLOW[idx + 1] : null

  return (
    <div>
      {/* Stepper */}
      <div className="flex flex-wrap items-center gap-1.5">
        {STAGE_FLOW.map((s, i) => {
          const done = !cancelled && idx >= 0 && i < idx
          const current = !cancelled && i === idx
          return (
            <div key={s} className="flex items-center gap-1.5">
              <span
                className={cn(
                  'inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium transition-colors',
                  current && 'border-gold-mid/40 bg-gold-gradient-soft text-gold-brand',
                  done && 'border-status-ready/30 bg-status-ready/10 text-status-ready',
                  !current && !done && 'border-border text-muted-foreground',
                )}
              >
                {done && <Check className="h-3 w-3" />}
                {stageMeta[s].label}
              </span>
              {i < STAGE_FLOW.length - 1 && <ChevronRight className="h-3.5 w-3.5 text-muted-foreground/50" />}
            </div>
          )
        })}
      </div>

      {cancelled ? (
        <div className="mt-4 inline-flex items-center gap-2 rounded-xl border border-status-overdue/30 bg-status-overdue/10 px-3.5 py-2 text-sm font-medium text-status-overdue">
          <XCircle className="h-4 w-4" />
          Orden cancelada
        </div>
      ) : (
        <div className="mt-4 flex flex-wrap items-center gap-3">
          {next && (
            <form action={advanceStage}>
              <input type="hidden" name="orderId" value={orderId} />
              <input type="hidden" name="stage" value={next} />
              <Button type="submit">
                <ChevronRight className="h-4 w-4" />
                Marcar como: {stageMeta[next].label}
              </Button>
            </form>
          )}
          <button
            type="button"
            onClick={() => setCancelOpen(true)}
            className="text-sm font-medium text-muted-foreground underline-offset-2 transition-colors hover:text-status-overdue hover:underline"
          >
            Cancelar orden
          </button>
        </div>
      )}

      <Modal open={cancelOpen} onClose={() => setCancelOpen(false)} title="Cancelar orden" description="Queda en el historial (no se borra). El motivo es obligatorio.">
        <form action={cancelAction} className="space-y-4">
          <input type="hidden" name="orderId" value={orderId} />
          <Textarea id="cancel-reason" name="reason" label="Motivo de cancelación" placeholder="¿Por qué se cancela?" error={cancelState.error} required />
          <div className="flex justify-end gap-3">
            <Button type="button" variant="ghost" onClick={() => setCancelOpen(false)}>Volver</Button>
            <Button type="submit" variant="danger" onClick={() => setCancelOpen(false)}>Cancelar orden</Button>
          </div>
        </form>
      </Modal>
    </div>
  )
}
