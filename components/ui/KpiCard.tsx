'use client'

import { useRef } from 'react'
import { motion, useInView } from 'framer-motion'
import { type LucideIcon } from 'lucide-react'
import { cn, formatDOP, formatNumber } from '@/lib/utils'
import { useCountUp } from '@/lib/hooks/useCountUp'

interface KpiCardProps {
  label: string
  value: number
  /** Render value as RD$ currency. */
  currency?: boolean
  /** Optional delta, e.g. +12.5 (%) — colored by sign. */
  delta?: number
  icon?: LucideIcon
  /** 'danger' turns the accent red (e.g. overdue orders). */
  accent?: 'gold' | 'danger'
  /** Heartbeat ring — used when a danger value is non-zero. */
  pulse?: boolean
  /** Magnetic, clickable (monster pattern). */
  onClick?: () => void
  /** Small caption under the value (e.g. destination hint). */
  hint?: string
  className?: string
}

/**
 * Stat card with count-up on mount (when scrolled into view). Numbers use
 * tabular-nums so RD$ amounts don't jitter while animating. Supports a red
 * "danger" accent with an optional pulse, and a clickable/magnetic variant.
 */
export function KpiCard({
  label,
  value,
  currency = false,
  delta,
  icon: Icon,
  accent = 'gold',
  pulse = false,
  onClick,
  hint,
  className,
}: KpiCardProps) {
  const ref = useRef<HTMLDivElement>(null)
  const inView = useInView(ref, { once: true, amount: 0.4 })
  const animated = useCountUp({ to: value, start: inView })
  const rounded = Math.round(animated)
  const display = currency ? formatDOP(rounded) : formatNumber(rounded)

  const danger = accent === 'danger'
  const clickable = typeof onClick === 'function'
  const doPulse = pulse && value > 0

  return (
    <motion.div
      ref={ref}
      onClick={onClick}
      role={clickable ? 'button' : undefined}
      tabIndex={clickable ? 0 : undefined}
      onKeyDown={
        clickable
          ? (e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault()
                onClick?.()
              }
            }
          : undefined
      }
      whileHover={clickable ? { y: -4 } : undefined}
      whileTap={clickable ? { scale: 0.98 } : undefined}
      transition={{ type: 'spring', stiffness: 300, damping: 20 }}
      className={cn(
        'relative overflow-hidden rounded-2xl border bg-card p-5',
        'shadow-layer-light dark:shadow-layer-dark dark:glass',
        danger
          ? 'border-status-overdue/30 dark:border-status-overdue/25'
          : 'border-border dark:border-white/[0.08]',
        clickable &&
          'cursor-pointer transition-shadow focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-bg ' +
            (danger ? 'hover:shadow-[0_0_0_1px_rgba(239,68,68,0.35),0_8px_30px_-8px_rgba(239,68,68,0.45)]' : 'hover:border-gold-mid/40 hover:shadow-gold-glow'),
        className,
      )}
    >
      {/* signature line: gold, or red for danger */}
      <div
        className={cn(
          'absolute inset-x-0 top-0 h-[2px]',
          danger ? 'bg-status-overdue' : 'bg-gold-gradient',
        )}
      />

      <div className="flex items-start justify-between">
        <p className="text-sm font-medium text-muted-foreground">{label}</p>
        {Icon && (
          <span className="relative grid h-9 w-9 place-items-center rounded-lg">
            {doPulse && (
              <span className="absolute inset-0 animate-ping rounded-lg bg-status-overdue/30" />
            )}
            <span
              className={cn(
                'relative grid h-9 w-9 place-items-center rounded-lg',
                danger
                  ? 'bg-status-overdue/10 text-status-overdue'
                  : 'bg-gold-gradient-soft text-gold-brand',
              )}
            >
              <Icon className="h-4 w-4" />
            </span>
          </span>
        )}
      </div>

      <p
        className={cn(
          'tnum mt-3 text-3xl font-bold tracking-tight',
          danger && value > 0 ? 'text-status-overdue' : 'text-foreground',
        )}
      >
        {display}
      </p>

      {typeof delta === 'number' ? (
        <p
          className={cn(
            'tnum mt-1 text-xs font-medium',
            delta >= 0 ? 'text-status-ready' : 'text-status-overdue',
          )}
        >
          {delta >= 0 ? '▲' : '▼'} {Math.abs(delta).toFixed(1)}% vs. mes anterior
        </p>
      ) : hint ? (
        <p className="mt-1 text-xs text-muted-foreground">{hint}</p>
      ) : null}
    </motion.div>
  )
}
