import { cn } from '@/lib/utils'

/**
 * Loading placeholder with a gold-tinted shimmer sweep. Compose several
 * to mock a card/row while data loads.
 */
export function Skeleton({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        'relative overflow-hidden rounded-lg bg-muted',
        'before:absolute before:inset-0 before:-translate-x-full',
        'before:animate-shimmer before:bg-gradient-to-r',
        'before:from-transparent before:via-white/10 before:to-transparent',
        className,
      )}
    />
  )
}

/** A pre-composed card skeleton for convenience. */
export function SkeletonCard({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        'rounded-2xl border border-border bg-card p-5 dark:border-white/[0.08]',
        className,
      )}
    >
      <Skeleton className="h-4 w-24" />
      <Skeleton className="mt-4 h-8 w-32" />
      <Skeleton className="mt-3 h-3 w-20" />
    </div>
  )
}
