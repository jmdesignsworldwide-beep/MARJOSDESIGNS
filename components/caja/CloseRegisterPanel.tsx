'use client'

import { useEffect, useState } from 'react'
import { useFormState, useFormStatus } from 'react-dom'
import { Lock, CheckCircle2, AlertTriangle } from 'lucide-react'
import { cn, formatDOP } from '@/lib/utils'
import { roundMoney } from '@/lib/cotizador/calc'
import { Button } from '@/components/ui/Button'
import { Input, Textarea } from '@/components/ui/Field'
import { useToast } from '@/components/ui/Toast'
import { closeRegister, type CajaState } from '@/lib/caja/actions'
import type { CashSummary } from '@/lib/caja/types'

const initial: CajaState = {}

function CloseBtn({ disabled }: { disabled: boolean }) {
  const { pending } = useFormStatus()
  return (
    <Button type="submit" variant="danger" loading={pending} disabled={disabled} className="w-full">
      <Lock className="h-4 w-4" />
      Cerrar caja del día
    </Button>
  )
}

export function CloseRegisterPanel({
  registerId,
  expectedCash,
  openingFloat,
  summary,
}: {
  registerId: string
  expectedCash: number
  openingFloat: number
  summary: CashSummary
}) {
  const [counted, setCounted] = useState('')
  const [state, action] = useFormState(closeRegister, initial)
  const { toast } = useToast()

  const hasCount = counted.trim() !== '' && Number.isFinite(Number(counted))
  const diff = hasCount ? roundMoney(Number(counted) - expectedCash) : 0
  const cuadra = hasCount && diff === 0

  useEffect(() => {
    if (state.error) toast({ title: state.error, variant: 'error' })
    if (state.ok) toast({ title: 'Caja cerrada', variant: 'success' })
  }, [state, toast])

  return (
    <form action={action} className="space-y-4">
      <input type="hidden" name="registerId" value={registerId} />

      <div className="rounded-xl border border-border bg-card/60 p-3 text-sm dark:border-white/[0.08]">
        <div className="flex justify-between">
          <span className="text-muted-foreground">Fondo inicial</span>
          <span className="tnum font-medium">{formatDOP(openingFloat)}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-muted-foreground">Efectivo del día</span>
          <span className="tnum font-medium">{formatDOP(summary.byMethod.efectivo)}</span>
        </div>
        <div className="mt-1 flex justify-between border-t border-border pt-1">
          <span className="font-semibold">Efectivo esperado</span>
          <span className="tnum font-bold text-gold-brand">{formatDOP(expectedCash)}</span>
        </div>
      </div>

      <Input
        id="counted-cash"
        name="countedCash"
        label="Efectivo contado (real en gaveta)"
        type="number"
        inputMode="decimal"
        step="1"
        min="0"
        value={counted}
        onChange={(e) => setCounted(e.target.value)}
        placeholder="Cuenta el efectivo físico"
        required
      />

      {hasCount && (
        <div
          className={cn(
            'flex items-center gap-2 rounded-xl border px-3 py-2.5 text-sm font-medium',
            cuadra
              ? 'border-status-ready/30 bg-status-ready/10 text-status-ready'
              : 'border-status-overdue/30 bg-status-overdue/10 text-status-overdue',
          )}
        >
          {cuadra ? <CheckCircle2 className="h-4 w-4" /> : <AlertTriangle className="h-4 w-4" />}
          {cuadra
            ? '¡Cuadra perfecto!'
            : diff > 0
              ? `Sobrante de ${formatDOP(diff)}`
              : `Faltante de ${formatDOP(Math.abs(diff))}`}
        </div>
      )}

      <Textarea id="closing-note" name="note" label="Nota de cierre (opcional)" placeholder="Ej. faltante por vuelto mal dado" rows={2} />

      <CloseBtn disabled={!hasCount} />
    </form>
  )
}
