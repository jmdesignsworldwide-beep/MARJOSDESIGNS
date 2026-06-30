'use client'

import { forwardRef } from 'react'
import { motion, type HTMLMotionProps } from 'framer-motion'
import { Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger'
type Size = 'sm' | 'md' | 'lg'

export interface ButtonProps
  extends Omit<HTMLMotionProps<'button'>, 'ref' | 'children'> {
  variant?: Variant
  size?: Size
  loading?: boolean
  children?: React.ReactNode
}

const base =
  'relative inline-flex select-none items-center justify-center gap-2 rounded-xl font-medium tracking-tight ' +
  'transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ' +
  'focus-visible:ring-offset-2 focus-visible:ring-offset-bg disabled:pointer-events-none disabled:opacity-50'

const sizes: Record<Size, string> = {
  sm: 'h-9 px-3.5 text-sm',
  md: 'h-11 px-5 text-sm',
  lg: 'h-12 px-7 text-base',
}

const variants: Record<Variant, string> = {
  // Primary = the signature gold gradient with a glow on hover
  primary:
    'bg-gold-gradient text-charcoal-900 font-semibold shadow-[0_4px_20px_-6px_rgba(224,168,46,0.6)] ' +
    'hover:shadow-gold-glow-lg',
  secondary:
    'border border-border bg-card/70 text-foreground hover:border-gold-mid/50 hover:text-gold-bright',
  ghost:
    'text-muted-foreground hover:bg-muted hover:text-foreground',
  danger:
    'bg-status-overdue text-white shadow-[0_4px_20px_-6px_rgba(239,68,68,0.6)] hover:brightness-110',
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  (
    { className, variant = 'primary', size = 'md', loading, children, disabled, ...props },
    ref,
  ) => {
    return (
      <motion.button
        ref={ref}
        whileHover={{ y: -2 }}
        whileTap={{ scale: 0.97 }}
        transition={{ type: 'spring', stiffness: 400, damping: 22 }}
        className={cn(base, sizes[size], variants[variant], className)}
        disabled={disabled || loading}
        {...props}
      >
        {loading && <Loader2 className="h-4 w-4 animate-spin" />}
        {children}
      </motion.button>
    )
  },
)
Button.displayName = 'Button'
