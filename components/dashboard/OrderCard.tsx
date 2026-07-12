'use client'

import { motion } from 'framer-motion'
import { Clock, Wallet } from 'lucide-react'
import { cn, formatDOP } from '@/lib/utils'
import { Badge } from '@/components/ui/Badge'
import type { OrderStage, OrderSummary } from '@/lib/dashboard/data'
import { riseItem } from '@/components/motion/variants'

const stageBadge: Record<OrderStage, { status: 'process' | 'ready' | 'neutral'; label: string }> = {
  recibida: { status: 'process', label: 'Recibida' },
  en_produccion: { status: 'process', label: 'En producción' },
  lista: { status: 'ready', label: 'Lista para entrega' },
  entregada: { status: 'neutral', label: 'Entregada' },
  cancelada: { status: 'neutral', label: 'Cancelada' },
}

/**
 * A single order in an urgency section. Clickable (monster pattern) → will
 * open the order detail once the Órdenes module exists; for now the handler
 * shows where it will lead (never a dead button).
 */
export function OrderCard({
  order,
  variant = 'default',
  onClick,
}: {
  order: OrderSummary
  variant?: 'overdue' | 'today' | 'default'
  onClick?: () => void
}) {
  const badge = stageBadge[order.stage]
  const overdue = variant === 'overdue'

  return (
    <motion.button
      type="button"
      variants={riseItem}
      onClick={onClick}
      whileHover={{ y: -3 }}
      whileTap={{ scale: 0.99 }}
      className={cn(
        'group w-full rounded-xl border bg-card p-4 text-left transition-shadow',
        'shadow-layer-light dark:shadow-layer-dark dark:glass',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-bg',
        overdue
          ? 'border-status-overdue/30 hover:shadow-[0_0_0_1px_rgba(239,68,68,0.3),0_8px_24px_-10px_rgba(239,68,68,0.4)] dark:border-status-overdue/25'
          : 'border-border hover:border-gold-mid/40 hover:shadow-gold-glow dark:border-white/[0.08]',
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate font-semibold text-foreground">{order.client}</p>
          <p className="mt-0.5 truncate text-sm text-muted-foreground">{order.item}</p>
        </div>
        <Badge status={badge.status} pulse={overdue}>
          {badge.label}
        </Badge>
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm">
        {overdue ? (
          <span className="inline-flex items-center gap-1.5 font-medium text-status-overdue">
            <Clock className="h-3.5 w-3.5" />
            {order.daysOverdue === 1
              ? 'Vencida hace 1 día'
              : `Vencida hace ${order.daysOverdue} días`}
          </span>
        ) : (
          <span className="inline-flex items-center gap-1.5 text-muted-foreground">
            <Clock className="h-3.5 w-3.5" />
            Entrega {order.deliveryDate}
          </span>
        )}

        {order.balance > 0 && (
          <span className="tnum inline-flex items-center gap-1.5 text-muted-foreground">
            <Wallet className="h-3.5 w-3.5" />
            Por cobrar {formatDOP(order.balance)}
          </span>
        )}
      </div>
    </motion.button>
  )
}
