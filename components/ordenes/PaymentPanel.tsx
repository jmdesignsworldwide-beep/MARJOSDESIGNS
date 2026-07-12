'use client'

import { useEffect, useRef, useState } from 'react'
import { useFormState, useFormStatus } from 'react-dom'
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion'
import { CreditCard, Plus, PartyPopper, RotateCcw } from 'lucide-react'
import { cn, formatDOP } from '@/lib/utils'
import { roundMoney } from '@/lib/cotizador/calc'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { Modal } from '@/components/ui/Modal'
import { Input, Select } from '@/components/ui/Field'
import { useToast } from '@/components/ui/Toast'
import { paymentStatus, paymentStatusMeta, methodLabel } from '@/lib/ordenes/format'
import type { Payment } from '@/lib/ordenes/finance'
import {
  registerPayment,
  registerReverso,
  type ManageState,
} from '@/app/(app)/ordenes/manage-actions'

const initial: ManageState = {}

/** Animate a number from its previous value to the new one (delight). */
function useAnimatedNumber(target: number) {
  const prefersReduced = useReducedMotion()
  const [display, setDisplay] = useState(target)
  const prev = useRef(target)
  useEffect(() => {
    if (prefersReduced || prev.current === target) {
      setDisplay(target)
      prev.current = target
      return
    }
    const from = prev.current
    const start = performance.now()
    const dur = 700
    let raf = 0
    const tick = (t: number) => {
      const p = Math.min((t - start) / dur, 1)
      const eased = 1 - Math.pow(1 - p, 3)
      setDisplay(from + (target - from) * eased)
      if (p < 1) raf = requestAnimationFrame(tick)
      else prev.current = target
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [target, prefersReduced])
  return display
}

function SubmitBtn({ label }: { label: string }) {
  const { pending } = useFormStatus()
  return <Button type="submit" loading={pending}>{label}</Button>
}

export function PaymentPanel({
  orderId,
  total,
  amountPaid,
  payments,
}: {
  orderId: string
  total: number
  amountPaid: number
  payments: Payment[]
}) {
  const balance = roundMoney(Math.max(0, total - amountPaid))
  const status = paymentStatus(total, amountPaid)
  const meta = paymentStatusMeta[status]
  const animatedBalance = useAnimatedNumber(balance)

  const [payOpen, setPayOpen] = useState(false)
  const [reversoOpen, setReversoOpen] = useState(false)
  const [prefill, setPrefill] = useState('')
  const [method, setMethod] = useState('efectivo')

  const [payState, payAction] = useFormState(registerPayment, initial)
  const [revState, revAction] = useFormState(registerReverso, initial)
  const { toast } = useToast()

  useEffect(() => {
    if (payState.ok) { toast({ title: 'Pago registrado', variant: 'success' }); setPayOpen(false) }
    if (payState.error) toast({ title: payState.error, variant: 'error' })
  }, [payState, toast])
  useEffect(() => {
    if (revState.ok) { toast({ title: 'Corrección registrada', variant: 'success' }); setReversoOpen(false) }
    if (revState.error) toast({ title: revState.error, variant: 'error' })
  }, [revState, toast])

  function openPay(amount: number) {
    setPrefill(amount > 0 ? String(amount) : '')
    setMethod('efectivo')
    setPayOpen(true)
  }

  const deposit50 = roundMoney(total * 0.5)

  return (
    <div className="space-y-4">
      {/* Balance card */}
      <div
        className={cn(
          'relative overflow-hidden rounded-2xl border p-5',
          status === 'pagado'
            ? 'border-status-ready/30 bg-status-ready/[0.06]'
            : 'border-border dark:border-white/[0.08]',
        )}
      >
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium text-muted-foreground">Por cobrar</span>
          <Badge status={meta.status}>{meta.label}</Badge>
        </div>
        <p className={cn('tnum mt-2 text-3xl font-bold tracking-tight', balance === 0 ? 'text-status-ready' : 'text-foreground')}>
          {formatDOP(roundMoney(animatedBalance))}
        </p>
        <div className="mt-2 flex justify-between text-xs text-muted-foreground">
          <span>Total {formatDOP(total)}</span>
          <span className="tnum">Pagado {formatDOP(amountPaid)}</span>
        </div>

        <AnimatePresence>
          {status === 'pagado' && (
            <motion.div
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="mt-3 inline-flex items-center gap-1.5 rounded-lg bg-status-ready/10 px-2.5 py-1 text-xs font-semibold text-status-ready"
            >
              <PartyPopper className="h-3.5 w-3.5" />
              ¡Orden pagada completa!
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {balance > 0 && (
        <div className="flex flex-wrap gap-2">
          <Button onClick={() => openPay(balance)} className="flex-1">
            <CreditCard className="h-4 w-4" />
            Cobrar balance
          </Button>
          {amountPaid === 0 && total > 0 && (
            <Button variant="secondary" onClick={() => openPay(deposit50)}>
              50% ({formatDOP(deposit50)})
            </Button>
          )}
        </div>
      )}
      {balance > 0 && (
        <Button variant="ghost" size="sm" onClick={() => openPay(0)} className="w-full">
          <Plus className="h-4 w-4" />
          Otro monto
        </Button>
      )}

      {/* Payments list */}
      <div>
        <p className="mb-2 text-sm font-semibold">Pagos registrados</p>
        {payments.length === 0 ? (
          <p className="rounded-xl border border-dashed border-border bg-card/40 px-3.5 py-3 text-xs text-muted-foreground dark:border-white/[0.08]">
            Aún sin pagos. Registra el adelanto para arrancar.
          </p>
        ) : (
          <ul className="space-y-2">
            {payments.map((p) => (
              <li key={p.id} className="flex items-center justify-between rounded-xl border border-border px-3 py-2 text-sm dark:border-white/[0.08]">
                <div className="min-w-0">
                  <p className={cn('tnum font-semibold', p.kind === 'reverso' && 'text-status-overdue')}>
                    {p.kind === 'reverso' ? '− ' : ''}{formatDOP(p.amount)}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {p.kind === 'reverso' ? 'Corrección' : methodLabel[p.method] ?? p.method}
                    {p.reference ? ` · ${p.reference}` : ''} · {new Date(p.created_at).toLocaleDateString('es-DO', { day: '2-digit', month: 'short' })}
                  </p>
                </div>
              </li>
            ))}
          </ul>
        )}
        {amountPaid > 0 && (
          <button type="button" onClick={() => setReversoOpen(true)} className="mt-2 inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-status-overdue">
            <RotateCcw className="h-3.5 w-3.5" />
            Corregir un pago
          </button>
        )}
      </div>

      {/* Register payment modal */}
      <Modal open={payOpen} onClose={() => setPayOpen(false)} title="Registrar pago" description="El balance se recalcula solo.">
        <form action={payAction} className="space-y-4">
          <input type="hidden" name="orderId" value={orderId} />
          <Input id="pay-amount" name="amount" label="Monto (RD$)" type="number" inputMode="decimal" step="1" min="0" defaultValue={prefill} required />
          <Select id="pay-method" name="method" label="Método" value={method} onChange={(e) => setMethod(e.target.value)}>
            <option value="efectivo">Efectivo</option>
            <option value="transferencia">Transferencia</option>
            <option value="debito">Débito</option>
            <option value="credito">Crédito</option>
          </Select>
          {method === 'transferencia' && (
            <Input id="pay-ref" name="reference" label="Referencia / voucher" placeholder="No. de transferencia" hint="Se avisa si la referencia ya existe en esta orden." />
          )}
          <div className="flex justify-end gap-3 pt-1">
            <Button type="button" variant="ghost" onClick={() => setPayOpen(false)}>Cancelar</Button>
            <SubmitBtn label="Registrar pago" />
          </div>
        </form>
      </Modal>

      {/* Reverso modal */}
      <Modal open={reversoOpen} onClose={() => setReversoOpen(false)} title="Corregir un pago" description="No borra el historial — registra una corrección auditada.">
        <form action={revAction} className="space-y-4">
          <input type="hidden" name="orderId" value={orderId} />
          <Input id="rev-amount" name="amount" label="Monto a revertir (RD$)" type="number" inputMode="decimal" step="1" min="0" required />
          <Input id="rev-reason" name="reason" label="Motivo" placeholder="Ej. voucher duplicado" required />
          <div className="flex justify-end gap-3 pt-1">
            <Button type="button" variant="ghost" onClick={() => setReversoOpen(false)}>Cancelar</Button>
            <SubmitBtn label="Registrar corrección" />
          </div>
        </form>
      </Modal>
    </div>
  )
}
