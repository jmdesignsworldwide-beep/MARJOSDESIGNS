'use client'

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from 'react'
import { createPortal } from 'react-dom'
import { AnimatePresence, motion } from 'framer-motion'
import { CheckCircle2, Info, XCircle, AlertTriangle, X } from 'lucide-react'
import { cn } from '@/lib/utils'

type ToastVariant = 'success' | 'error' | 'info' | 'warning'

interface Toast {
  id: number
  title: string
  description?: string
  variant: ToastVariant
}

interface ToastContextValue {
  toast: (t: Omit<Toast, 'id'>) => void
}

const ToastContext = createContext<ToastContextValue | null>(null)

const config: Record<
  ToastVariant,
  { icon: typeof Info; accent: string; bar: string }
> = {
  success: { icon: CheckCircle2, accent: 'text-status-ready', bar: 'bg-status-ready' },
  error: { icon: XCircle, accent: 'text-status-overdue', bar: 'bg-status-overdue' },
  info: { icon: Info, accent: 'text-status-process', bar: 'bg-status-process' },
  warning: { icon: AlertTriangle, accent: 'text-gold-bright', bar: 'bg-gold-mid' },
}

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([])
  const counter = useRef(0)
  // Portal only after mount so the first client render matches the server
  // (which renders no portal) — avoids a hydration mismatch in <body>.
  const [mounted, setMounted] = useState(false)
  useEffect(() => setMounted(true), [])

  const remove = useCallback((id: number) => {
    setToasts((prev) => prev.filter((t) => t.id !== id))
  }, [])

  const toast = useCallback(
    (t: Omit<Toast, 'id'>) => {
      const id = ++counter.current
      setToasts((prev) => [...prev, { ...t, id }])
      window.setTimeout(() => remove(id), 4200)
    },
    [remove],
  )

  return (
    <ToastContext.Provider value={{ toast }}>
      {children}
      {mounted &&
        createPortal(
          <div className="pointer-events-none fixed inset-x-0 bottom-0 z-[60] flex flex-col items-center gap-2 p-4 sm:items-end">
            <AnimatePresence>
              {toasts.map((t) => {
                const c = config[t.variant]
                const Icon = c.icon
                return (
                  <motion.div
                    key={t.id}
                    layout
                    initial={{ opacity: 0, y: 24, scale: 0.9 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, x: 40, scale: 0.9 }}
                    transition={{ type: 'spring', stiffness: 360, damping: 30 }}
                    className={cn(
                      'pointer-events-auto relative flex w-full max-w-sm items-start gap-3 overflow-hidden',
                      'rounded-xl border border-border bg-card p-4 shadow-layer-light dark:shadow-layer-dark',
                      'dark:glass dark:border-white/[0.1]',
                    )}
                  >
                    <span className={cn('absolute inset-y-0 left-0 w-1', c.bar)} />
                    <Icon className={cn('mt-0.5 h-5 w-5 shrink-0', c.accent)} />
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-semibold text-foreground">
                        {t.title}
                      </p>
                      {t.description && (
                        <p className="mt-0.5 text-sm text-muted-foreground">
                          {t.description}
                        </p>
                      )}
                    </div>
                    <button
                      type="button"
                      onClick={() => remove(t.id)}
                      aria-label="Cerrar notificación"
                      className="text-muted-foreground transition-colors hover:text-foreground"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </motion.div>
                )
              })}
            </AnimatePresence>
          </div>,
          document.body,
        )}
    </ToastContext.Provider>
  )
}

export function useToast() {
  const ctx = useContext(ToastContext)
  if (!ctx) throw new Error('useToast must be used within a ToastProvider')
  return ctx
}
