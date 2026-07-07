import { cn } from '@/lib/utils'

/**
 * Premium responsive table. On narrow screens the wrapper scrolls
 * horizontally (with an inset shadow hint) instead of breaking the
 * layout. Wrap rows in <TableBody> for hover affordance.
 */
export function Table({
  children,
  className,
}: {
  children: React.ReactNode
  className?: string
}) {
  return (
    <div
      className={cn(
        'w-full overflow-x-auto rounded-2xl border border-border bg-card',
        'shadow-layer-light dark:shadow-layer-dark dark:border-white/[0.08]',
        className,
      )}
    >
      <table className="w-full min-w-[560px] border-collapse text-sm">
        {children}
      </table>
    </div>
  )
}

export function TableHead({ children }: { children: React.ReactNode }) {
  return (
    <thead className="border-b border-border text-left">
      <tr className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
        {children}
      </tr>
    </thead>
  )
}

export function Th({
  children,
  className,
}: {
  children: React.ReactNode
  className?: string
}) {
  return <th className={cn('px-4 py-3 font-semibold', className)}>{children}</th>
}

export function TableBody({ children }: { children: React.ReactNode }) {
  return <tbody className="divide-y divide-border">{children}</tbody>
}

export function Tr({
  children,
  onClick,
  className,
}: {
  children: React.ReactNode
  onClick?: () => void
  className?: string
}) {
  return (
    <tr
      onClick={onClick}
      className={cn(
        'transition-colors hover:bg-muted/50',
        onClick && 'cursor-pointer',
        className,
      )}
    >
      {children}
    </tr>
  )
}

export function Td({
  children,
  className,
}: {
  children: React.ReactNode
  className?: string
}) {
  return (
    <td className={cn('px-4 py-3 text-foreground', className)}>{children}</td>
  )
}
