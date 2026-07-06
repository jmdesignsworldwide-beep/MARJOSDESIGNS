import { type LucideIcon } from 'lucide-react'
import { cn } from '@/lib/utils'

/**
 * Honest, warm empty state. Used while the Órdenes module (later tanda) has
 * not produced data yet — never fake numbers. `tone` tints the icon.
 */
export function EmptyState({
  icon: Icon,
  title,
  subtitle,
  tone = 'neutral',
  className,
}: {
  icon: LucideIcon
  title: string
  subtitle?: string
  tone?: 'neutral' | 'positive'
  className?: string
}) {
  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center rounded-2xl border border-dashed border-border bg-card/40 px-6 py-10 text-center dark:border-white/[0.08]',
        className,
      )}
    >
      <span
        className={cn(
          'mb-3 grid h-12 w-12 place-items-center rounded-2xl',
          tone === 'positive'
            ? 'bg-status-ready/10 text-status-ready'
            : 'bg-gold-gradient-soft text-gold-brand',
        )}
      >
        <Icon className="h-6 w-6" />
      </span>
      <p className="font-semibold text-foreground">{title}</p>
      {subtitle && (
        <p className="mt-1 max-w-xs text-sm text-muted-foreground">{subtitle}</p>
      )}
    </div>
  )
}
