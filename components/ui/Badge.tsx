import { cn } from '@/lib/utils'

type Status = 'process' | 'ready' | 'overdue' | 'neutral'

const styles: Record<Status, { dot: string; chip: string }> = {
  process: {
    dot: 'bg-status-process',
    chip: 'text-status-process bg-status-process/10 border-status-process/25',
  },
  ready: {
    dot: 'bg-status-ready',
    chip: 'text-status-ready bg-status-ready/10 border-status-ready/25',
  },
  overdue: {
    dot: 'bg-status-overdue',
    chip: 'text-status-overdue bg-status-overdue/10 border-status-overdue/25',
  },
  neutral: {
    dot: 'bg-status-neutral',
    chip: 'text-status-neutral bg-status-neutral/10 border-status-neutral/25',
  },
}

/**
 * Status pill using the FUNCTIONAL color set (not brand gold).
 * `pulse` adds a heartbeat ring for urgent states (e.g. overdue).
 */
export function Badge({
  status = 'neutral',
  children,
  pulse = false,
  className,
}: {
  status?: Status
  children: React.ReactNode
  pulse?: boolean
  className?: string
}) {
  const s = styles[status]
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-medium',
        s.chip,
        className,
      )}
    >
      <span className="relative flex h-1.5 w-1.5">
        {pulse && (
          <span
            className={cn(
              'absolute inline-flex h-full w-full animate-ping rounded-full opacity-75',
              s.dot,
            )}
          />
        )}
        <span className={cn('relative inline-flex h-1.5 w-1.5 rounded-full', s.dot)} />
      </span>
      {children}
    </span>
  )
}
