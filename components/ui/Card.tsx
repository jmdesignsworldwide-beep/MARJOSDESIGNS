'use client'

import { forwardRef } from 'react'
import { motion, type HTMLMotionProps } from 'framer-motion'
import { cn } from '@/lib/utils'

export interface CardProps
  extends Omit<HTMLMotionProps<'div'>, 'ref' | 'children'> {
  /** Clickable variant: magnetic hover + cursor that hints "this reveals more". */
  clickable?: boolean
  children?: React.ReactNode
}

/**
 * Premium surface. Glassmorphism in dark, layered shadow in light.
 * The clickable variant lifts on hover (the "monster" tell that a card
 * opens into detail).
 */
export const Card = forwardRef<HTMLDivElement, CardProps>(
  ({ className, clickable, children, ...props }, ref) => {
    return (
      <motion.div
        ref={ref}
        whileHover={
          clickable ? { y: -4, transition: { type: 'spring', stiffness: 300, damping: 20 } } : undefined
        }
        whileTap={clickable ? { scale: 0.99 } : undefined}
        className={cn(
          'rounded-2xl border border-border bg-card p-5',
          'shadow-layer-light dark:shadow-layer-dark',
          'dark:glass dark:border-white/[0.08]',
          clickable &&
            'cursor-pointer transition-shadow hover:border-gold-mid/40 hover:shadow-gold-glow',
          className,
        )}
        {...props}
      >
        {children}
      </motion.div>
    )
  },
)
Card.displayName = 'Card'

export function CardHeader({
  title,
  subtitle,
  action,
  className,
}: {
  title: string
  subtitle?: string
  action?: React.ReactNode
  className?: string
}) {
  return (
    <div className={cn('mb-4 flex items-start justify-between gap-3', className)}>
      <div>
        <h3 className="text-base font-semibold tracking-tight text-foreground">
          {title}
        </h3>
        {subtitle && (
          <p className="mt-0.5 text-sm text-muted-foreground">{subtitle}</p>
        )}
      </div>
      {action}
    </div>
  )
}
