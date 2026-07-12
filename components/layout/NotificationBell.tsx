'use client'

import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { AnimatePresence, motion } from 'framer-motion'
import { Bell, CalendarClock, AlertTriangle } from 'lucide-react'
import { cn, formatDOP } from '@/lib/utils'
import { orderCode } from '@/lib/ordenes/format'
import type { DeliveryNotice } from '@/lib/notifications/data'

function noticeText(n: DeliveryNotice): { label: string; tone: 'overdue' | 'today' | 'soon' } {
  if (n.daysUntil < 0) {
    const d = Math.abs(n.daysUntil)
    return { label: d === 1 ? 'Atrasada 1 día' : `Atrasada ${d} días`, tone: 'overdue' }
  }
  if (n.daysUntil === 0) return { label: 'Entrega hoy', tone: 'today' }
  if (n.daysUntil === 1) return { label: 'Entrega mañana', tone: 'soon' }
  return { label: `Entrega en ${n.daysUntil} días`, tone: 'soon' }
}

const toneCls: Record<'overdue' | 'today' | 'soon', string> = {
  overdue: 'text-status-overdue',
  today: 'text-gold-brand',
  soon: 'text-status-process',
}

/** Header bell: deliveries due soon or overdue. Super_admin only. */
export function NotificationBell({ notices }: { notices: DeliveryNotice[] }) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  const overdue = notices.filter((n) => n.daysUntil < 0).length
  const count = notices.length

  useEffect(() => {
    if (!open) return
    const onDown = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false)
    document.addEventListener('mousedown', onDown)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onDown)
      document.removeEventListener('keydown', onKey)
    }
  }, [open])

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label={count > 0 ? `Notificaciones (${count})` : 'Notificaciones'}
        className="relative grid h-10 w-10 place-items-center rounded-xl border border-border bg-card/60 text-foreground transition-colors hover:border-gold-mid/50"
      >
        <Bell className="h-[18px] w-[18px]" />
        {count > 0 && (
          <span
            className={cn(
              'absolute -right-1 -top-1 grid h-[18px] min-w-[18px] place-items-center rounded-full px-1 text-[10px] font-bold text-white ring-2 ring-bg',
              overdue > 0 ? 'bg-status-overdue' : 'bg-gold-gradient !text-charcoal-900',
            )}
          >
            {count}
          </span>
        )}
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            role="menu"
            initial={{ opacity: 0, y: -6, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -6, scale: 0.98 }}
            transition={{ duration: 0.16, ease: 'easeOut' }}
            className="absolute right-0 z-50 mt-2 w-80 overflow-hidden rounded-xl border border-border bg-card shadow-layer-light dark:glass dark:border-white/[0.1] dark:shadow-layer-dark"
          >
            <div className="flex items-center justify-between border-b border-border px-4 py-3">
              <p className="text-sm font-semibold text-foreground">Entregas</p>
              {overdue > 0 && (
                <span className="inline-flex items-center gap-1 rounded-full bg-status-overdue/10 px-2 py-0.5 text-[11px] font-semibold text-status-overdue">
                  <AlertTriangle className="h-3 w-3" />
                  {overdue} atrasada{overdue > 1 ? 's' : ''}
                </span>
              )}
            </div>

            {count === 0 ? (
              <div className="flex flex-col items-center gap-2 px-4 py-8 text-center">
                <CalendarClock className="h-7 w-7 text-muted-foreground/60" />
                <p className="text-sm text-muted-foreground">Todo al día. Sin entregas próximas.</p>
              </div>
            ) : (
              <ul className="max-h-96 divide-y divide-border overflow-y-auto">
                {notices.map((n) => {
                  const t = noticeText(n)
                  return (
                    <li key={n.id}>
                      <Link
                        href={`/ordenes/${n.id}`}
                        onClick={() => setOpen(false)}
                        className="block px-4 py-3 transition-colors hover:bg-muted/40"
                      >
                        <div className="flex items-center justify-between gap-2">
                          <span className="tnum text-sm font-semibold text-foreground">
                            {orderCode(n.number)}
                          </span>
                          <span className={cn('text-xs font-semibold', toneCls[t.tone])}>
                            {t.label}
                          </span>
                        </div>
                        <div className="mt-0.5 flex items-center justify-between gap-2">
                          <span className="truncate text-xs text-muted-foreground">
                            {n.clientName ?? 'Sin cliente'}
                          </span>
                          {n.balance > 0 && (
                            <span className="tnum shrink-0 text-xs text-muted-foreground">
                              Balance {formatDOP(n.balance)}
                            </span>
                          )}
                        </div>
                      </Link>
                    </li>
                  )
                })}
              </ul>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
