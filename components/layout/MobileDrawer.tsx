'use client'

import { useEffect } from 'react'
import { createPortal } from 'react-dom'
import { AnimatePresence, motion } from 'framer-motion'
import { X } from 'lucide-react'
import type { UserRole } from '@/lib/auth/guards'
import { Logo } from './Logo'
import { NavList } from './Sidebar'

/**
 * Mobile navigation drawer. Slides in from the left over a blurred
 * backdrop. Closes on backdrop tap, X button, Escape, and after a nav
 * tap — it can never trap the user. Locks body scroll while open.
 * Tested for 390px.
 */
export function MobileDrawer({
  open,
  onClose,
  role,
}: {
  open: boolean
  onClose: () => void
  role?: UserRole
}) {
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

  return createPortal(
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-50 lg:hidden">
          {/* backdrop — tapping it closes; never blocks the close action */}
          <motion.div
            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
          />

          <motion.aside
            initial={{ x: '-100%' }}
            animate={{ x: 0 }}
            exit={{ x: '-100%' }}
            transition={{ type: 'spring', stiffness: 340, damping: 34 }}
            className="absolute inset-y-0 left-0 flex w-[82vw] max-w-xs flex-col border-r border-border bg-bg-elevated shadow-2xl dark:border-white/[0.08]"
          >
            <div className="flex h-16 items-center justify-between px-5">
              <Logo withWordmark />
              <button
                type="button"
                onClick={onClose}
                aria-label="Cerrar menú"
                className="grid h-10 w-10 place-items-center rounded-xl text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="mt-2 flex flex-1 flex-col pb-6">
              <NavList role={role} onNavigate={onClose} />
            </div>
          </motion.aside>
        </div>
      )}
    </AnimatePresence>,
    document.body,
  )
}
