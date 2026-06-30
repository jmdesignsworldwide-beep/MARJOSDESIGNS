'use client'

import { useEffect, useRef, useState } from 'react'
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
  className?: string
}

/**
 * Stat card with count-up on mount (when scrolled into view). Numbers
 * use tabular-nums so RD$ amounts don't jitter while animating. The
 * top hairline is the brand gold gradient (KPI signature line).
 */
export function KpiCard({
  label,
  value,
  currency = false,
  delta,
  icon: Icon,
  className,
}: KpiCardProps) {
  const ref = useRef<HTMLDivElement>(null)
  const inView = useInView(ref, { once: true, amount: 0.4 })
  const animated = useCountUp({ to: value, start: inView })
  const rounded = Math.round(animated)

  const display = currency ? formatDOP(rounded) : formatNumber(rounded)

  return (
    <motion.div
      ref={ref}
      className={cn(
        'relative overflow-hidden rounded-2xl border border-border bg-card p-5',
        'shadow-layer-light dark:shadow-layer-dark dark:glass dark:border-white/[0.08]',
        className,
      )}
    >
      {/* gold signature line */}
      <div className="absolute inset-x-0 top-0 h-[2px] bg-gold-gradient" />

      <div className="flex items-start justify-between">
        <p className="text-sm font-medium text-muted-foreground">{label}</p>
        {Icon && (
          <span className="grid h-9 w-9 place-items-center rounded-lg bg-gold-gradient-soft text-gold-brand">
            <Icon className="h-4 w-4" />
          </span>
        )}
      </div>

      <p className="tnum mt-3 text-3xl font-bold tracking-tight text-foreground">
        {display}
      </p>

      {typeof delta === 'number' && (
        <p
          className={cn(
            'tnum mt-1 text-xs font-medium',
            delta >= 0 ? 'text-status-ready' : 'text-status-overdue',
          )}
        >
          {delta >= 0 ? '▲' : '▼'} {Math.abs(delta).toFixed(1)}% vs. mes anterior
        </p>
      )}
    </motion.div>
  )
}
