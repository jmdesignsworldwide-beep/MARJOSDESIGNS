'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import { Plus, Lock, Wallet, AlertTriangle, PartyPopper } from 'lucide-react'
import { cn, formatDOP } from '@/lib/utils'
import { Card, CardHeader } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { CASH_METHODS, type CashRegister, type CashSummary, type CashMovement } from '@/lib/caja/types'
import { methodLabel, methodIcon, fmtDateLong, fmtTime } from '@/lib/caja/format'
import { OpenRegisterForm } from './OpenRegisterForm'
import { MovementsList } from './MovementsList'
import { ManualMovementModal } from './ManualMovementModal'
import { CloseRegisterPanel } from './CloseRegisterPanel'

export function CajaBoard({
  register,
  summary,
  movements,
}: {
  register: CashRegister | null
  summary: CashSummary | null
  movements: CashMovement[]
}) {
  const [manualOpen, setManualOpen] = useState(false)

  if (!register || !summary) return <OpenRegisterForm />

  const closed = register.status === 'cerrada'

  return (
    <div className="space-y-6">
      {/* Status header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <span className="text-sm capitalize text-muted-foreground">{fmtDateLong(register.business_date)}</span>
          <Badge status={closed ? 'neutral' : 'ready'}>{closed ? 'Cerrada' : 'Caja abierta'}</Badge>
        </div>
        {!closed && (
          <Button variant="secondary" size="sm" onClick={() => setManualOpen(true)}>
            <Plus className="h-4 w-4" />
            Movimiento manual
          </Button>
        )}
      </div>

      {/* Expected cash — the number Marjos watches to cuadrar */}
      <Card className={cn('relative overflow-hidden', !closed && 'border-gold-mid/30')}>
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
              <Wallet className="h-4 w-4" />
              Efectivo esperado en caja
            </div>
            <p className="tnum mt-1 text-4xl font-bold tracking-tight text-gold-gradient">
              {formatDOP(summary.expectedCash)}
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              Fondo inicial {formatDOP(register.opening_float)} + efectivo del día {formatDOP(summary.byMethod.efectivo)}
            </p>
          </div>
          <div className="text-right">
            <p className="text-xs uppercase tracking-wider text-muted-foreground">Total del día</p>
            <p className="tnum text-2xl font-bold">{formatDOP(summary.totalIn)}</p>
          </div>
        </div>
      </Card>

      {/* Per-method breakdown */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {CASH_METHODS.map((m) => {
          const Icon = methodIcon[m]
          return (
            <div key={m} className="rounded-2xl border border-border bg-card/60 p-4 dark:border-white/[0.08]">
              <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
                <Icon className="h-4 w-4" />
                {methodLabel[m]}
              </div>
              <p className="tnum mt-1.5 text-xl font-bold tracking-tight">{formatDOP(summary.byMethod[m])}</p>
            </div>
          )
        })}
      </div>

      {closed ? (
        <ClosedSummary register={register} />
      ) : (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          <div className="lg:col-span-2">
            <Card>
              <CardHeader title="Movimientos del día" subtitle="Pagos de órdenes, ventas y manuales — en vivo" />
              <MovementsList movements={movements} />
            </Card>
          </div>
          <div className="lg:col-span-1">
            <div className="sticky top-24">
              <Card>
                <CardHeader title="Cerrar caja" subtitle="Cuenta el efectivo y cuadra el día" />
                <CloseRegisterPanel registerId={register.id} expectedCash={summary.expectedCash} openingFloat={register.opening_float} summary={summary} />
              </Card>
            </div>
          </div>
        </div>
      )}

      {closed && (
        <Card>
          <CardHeader title="Movimientos del día" subtitle="Registro permanente e inviolable" />
          <MovementsList movements={movements} />
        </Card>
      )}

      <ManualMovementModal open={manualOpen} onClose={() => setManualOpen(false)} />
    </div>
  )
}

function ClosedSummary({ register }: { register: CashRegister }) {
  const diff = register.difference ?? 0
  const cuadra = diff === 0
  const over = diff > 0
  return (
    <Card
      className={cn(
        cuadra ? 'border-status-ready/40 bg-status-ready/[0.05]' : 'border-status-overdue/40 bg-status-overdue/[0.05]',
      )}
    >
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <motion.div
            className="flex items-center gap-2"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ type: 'spring', stiffness: 300, damping: 18 }}
          >
            {cuadra ? (
              <PartyPopper className="h-5 w-5 text-status-ready" />
            ) : (
              <AlertTriangle className="h-5 w-5 text-status-overdue" />
            )}
            <p className="font-semibold">
              {cuadra ? 'Caja cuadrada ✓' : over ? 'Cerró con sobrante' : 'Cerró con faltante'}
            </p>
          </motion.div>
          {register.closed_at && (
            <p className="mt-1 text-xs text-muted-foreground">Cerrada a las {fmtTime(register.closed_at)}</p>
          )}
          {register.closing_note && <p className="mt-2 text-sm text-muted-foreground">“{register.closing_note}”</p>}
        </div>
        <div className="flex gap-6 text-right">
          <div>
            <p className="text-xs text-muted-foreground">Esperado</p>
            <p className="tnum font-semibold">{formatDOP(register.expected_cash ?? 0)}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Contado</p>
            <p className="tnum font-semibold">{formatDOP(register.counted_cash ?? 0)}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Diferencia</p>
            <p className={cn('tnum font-bold', cuadra ? 'text-status-ready' : 'text-status-overdue')}>
              {over ? '+' : ''}
              {formatDOP(diff)}
            </p>
          </div>
        </div>
      </div>
      <div className="mt-4 flex items-center gap-1.5 text-xs text-muted-foreground">
        <Lock className="h-3.5 w-3.5" />
        Cierre guardado permanentemente — no se edita ni se borra.
      </div>
    </Card>
  )
}
