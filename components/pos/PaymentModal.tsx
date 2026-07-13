'use client'

import { useEffect, useState, useTransition } from 'react'
import { cn, formatDOP } from '@/lib/utils'
import { roundMoney, toInches, type DiscountType } from '@/lib/cotizador/calc'
import { Button } from '@/components/ui/Button'
import { Modal } from '@/components/ui/Modal'
import { Input } from '@/components/ui/Field'
import { useToast } from '@/components/ui/Toast'
import { createSale, type PosState } from '@/lib/pos/actions'
import { methodLabel } from '@/lib/caja/format'
import type { CashMethod } from '@/lib/caja/types'
import type { CartLine } from './PosTerminal'

const METHODS: CashMethod[] = ['efectivo', 'transferencia', 'debito', 'credito']

export function PaymentModal({
  open,
  onClose,
  total,
  cart,
  discountType,
  discountValue,
  onPaid,
}: {
  open: boolean
  onClose: () => void
  total: number
  cart: CartLine[]
  discountType: DiscountType
  discountValue: number
  onPaid: (state: PosState, method: string, clientName: string) => void
}) {
  const [method, setMethod] = useState<CashMethod>('efectivo')
  const [cashReceived, setCashReceived] = useState('')
  const [reference, setReference] = useState('')
  const [clientName, setClientName] = useState('')
  const [pending, startTransition] = useTransition()
  const { toast } = useToast()

  useEffect(() => {
    if (open) {
      setMethod('efectivo')
      setCashReceived('')
      setReference('')
      setClientName('')
    }
  }, [open])

  const received = Number(cashReceived) || 0
  const change = method === 'efectivo' ? roundMoney(received - total) : 0
  const shortCash = method === 'efectivo' && received < total

  function submit() {
    startTransition(async () => {
      const state = await createSale({
        items: cart.map((l) => ({
          productId: l.productId,
          description: l.description,
          calcType: l.calcType,
          quantity: l.quantity,
          unitPrice: l.unitPrice,
          widthIn: l.calcType === 'area' ? toInches(l.width, l.unit) : undefined,
          heightIn: l.calcType === 'area' ? toInches(l.height, l.unit) : undefined,
        })),
        discountType,
        discountValue,
        method,
        reference: reference || undefined,
        cashReceived: method === 'efectivo' ? received : undefined,
        clientName: clientName || undefined,
      })
      if (state.error) {
        toast({ title: state.error, variant: 'error' })
        return
      }
      onPaid(state, method, clientName)
    })
  }

  return (
    <Modal open={open} onClose={onClose} title="Cobrar" description={`Total a cobrar: ${formatDOP(total)}`}>
      <div className="space-y-4">
        {/* Method picker — thumb-friendly */}
        <div className="grid grid-cols-2 gap-2">
          {METHODS.map((m) => (
            <button
              key={m}
              type="button"
              onClick={() => setMethod(m)}
              className={cn(
                'rounded-xl border px-3 py-2.5 text-sm font-medium transition-colors',
                method === m
                  ? 'border-gold-mid/50 bg-gold-gradient-soft text-gold-brand'
                  : 'border-border text-muted-foreground hover:border-gold-mid/30',
              )}
            >
              {methodLabel[m]}
            </button>
          ))}
        </div>

        {method === 'efectivo' && (
          <>
            <Input
              id="cash-received"
              label="Efectivo recibido (RD$)"
              type="number"
              inputMode="decimal"
              step="1"
              min="0"
              value={cashReceived}
              onChange={(e) => setCashReceived(e.target.value)}
              placeholder="¿Con cuánto paga?"
              autoFocus
            />
            <div
              className={cn(
                'flex items-center justify-between rounded-xl border px-3.5 py-3',
                shortCash ? 'border-status-overdue/30 bg-status-overdue/10' : 'border-status-ready/30 bg-status-ready/10',
              )}
            >
              <span className="text-sm font-medium text-muted-foreground">Cambio a devolver</span>
              <span className={cn('tnum text-xl font-bold', shortCash ? 'text-status-overdue' : 'text-status-ready')}>
                {shortCash ? 'Falta ' + formatDOP(total - received) : formatDOP(change)}
              </span>
            </div>
          </>
        )}

        {method === 'transferencia' && (
          <Input
            id="pos-reference"
            label="Referencia / voucher"
            value={reference}
            onChange={(e) => setReference(e.target.value)}
            placeholder="No. de transferencia"
            hint="Se avisa si la referencia ya existe."
          />
        )}

        <Input id="pos-client" label="Cliente (opcional)" value={clientName} onChange={(e) => setClientName(e.target.value)} placeholder="Nombre del cliente" />

        <div className="flex justify-end gap-3 pt-1">
          <Button type="button" variant="ghost" onClick={onClose}>Cancelar</Button>
          <Button type="button" loading={pending} disabled={shortCash || total <= 0} onClick={submit}>
            Confirmar cobro
          </Button>
        </div>
      </div>
    </Modal>
  )
}
