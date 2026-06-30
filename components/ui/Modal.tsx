'use client'

import { useEffect } from 'react'
import { createPortal } from 'react-dom'
import { AnimatePresence, motion } from 'framer-motion'
import { X } from 'lucide-react'
import { cn } from '@/lib/utils'

interface ModalProps {
  open: boolean
  onClose: () => void
  title?: string
  description?: string
  children: React.ReactNode
  /** 'center' = dialog, 'right' = slide-over panel (great on mobile). */
  variant?: 'center' | 'right'
}

/**
 * Modal / slide-over with AnimatePresence, backdrop blur and internal
 * scroll. Closes on Escape, backdrop click, and the X button — it can
 * never trap the user. Body scroll is locked while open. Portaled to
 * <body> so it escapes any transformed ancestor.
 */
export function Modal({
  open,
  onClose,
  title,
  description,
  children,
  variant = 'center',
}: ModalProps) {
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', onKey)
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = prev
    }
  }, [open, onClose])

  if (typeof document === 'undefined') return null

  const isRight = variant === 'right'

  return createPortal(
    <AnimatePresence>
      {open && (
        <div
          className="fixed inset-0 z-50 flex"
          role="dialog"
          aria-modal="true"
          aria-label={title}
        >
          {/* backdrop */}
          <motion.div
            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
          />

          {/* panel */}
          <motion.div
            initial={
              isRight ? { x: '100%' } : { opacity: 0, scale: 0.95, y: 16 }
            }
            animate={isRight ? { x: 0 } : { opacity: 1, scale: 1, y: 0 }}
            exit={isRight ? { x: '100%' } : { opacity: 0, scale: 0.95, y: 16 }}
            transition={{ type: 'spring', stiffness: 320, damping: 32 }}
            className={cn(
              'relative z-10 flex max-h-full flex-col border border-border bg-card shadow-2xl',
              'dark:border-white/[0.08]',
              isRight
                ? 'ml-auto h-full w-full max-w-md rounded-l-2xl'
                : 'm-auto w-[calc(100%-2rem)] max-w-lg rounded-2xl',
            )}
          >
            <div className="flex items-start justify-between gap-4 border-b border-border p-5">
              <div>
                {title && (
                  <h2 className="text-lg font-semibold tracking-tight text-foreground">
                    {title}
                  </h2>
                )}
                {description && (
                  <p className="mt-0.5 text-sm text-muted-foreground">
                    {description}
                  </p>
                )}
              </div>
              <button
                type="button"
                onClick={onClose}
                aria-label="Cerrar"
                className="grid h-9 w-9 shrink-0 place-items-center rounded-lg text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="overflow-y-auto p-5">{children}</div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>,
    document.body,
  )
}
