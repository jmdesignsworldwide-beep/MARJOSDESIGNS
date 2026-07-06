'use client'

import { useEffect, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { LogOut, ChevronDown } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { Profile } from '@/lib/auth/guards'
import { logout } from '@/lib/auth/session-actions'

const roleLabel: Record<Profile['role'], string> = {
  super_admin: 'Super Admin',
  empleado: 'Empleado',
}

function initials(name: string) {
  return name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase())
    .join('')
}

/** Header user chip with a dropdown: name, role, and sign-out. */
export function UserMenu({ profile }: { profile: Profile }) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

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
        className="flex items-center gap-2 rounded-xl border border-border bg-card/60 py-1.5 pl-1.5 pr-2 transition-colors hover:border-gold-mid/50"
      >
        <span className="grid h-8 w-8 place-items-center rounded-lg bg-gold-gradient text-xs font-bold text-charcoal-900">
          {initials(profile.full_name)}
        </span>
        <span className="hidden text-left sm:block">
          <span className="block max-w-[9rem] truncate text-sm font-medium leading-tight text-foreground">
            {profile.full_name}
          </span>
          <span className="block text-[11px] leading-tight text-muted-foreground">
            {roleLabel[profile.role]}
          </span>
        </span>
        <ChevronDown
          className={cn(
            'h-4 w-4 text-muted-foreground transition-transform',
            open && 'rotate-180',
          )}
        />
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            role="menu"
            initial={{ opacity: 0, y: -6, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -6, scale: 0.98 }}
            transition={{ duration: 0.16, ease: 'easeOut' }}
            className="absolute right-0 z-50 mt-2 w-60 overflow-hidden rounded-xl border border-border bg-card shadow-layer-light dark:shadow-layer-dark dark:glass dark:border-white/[0.1]"
          >
            <div className="border-b border-border p-4">
              <p className="truncate text-sm font-semibold text-foreground">
                {profile.full_name}
              </p>
              <p className="truncate text-xs text-muted-foreground">{profile.email}</p>
              <span className="mt-2 inline-flex rounded-full border border-gold-mid/30 bg-gold-gradient-soft px-2 py-0.5 text-[11px] font-medium text-gold-brand">
                {roleLabel[profile.role]}
              </span>
            </div>
            <form action={logout}>
              <button
                type="submit"
                role="menuitem"
                className="flex w-full items-center gap-2 px-4 py-3 text-left text-sm font-medium text-status-overdue transition-colors hover:bg-status-overdue/10"
              >
                <LogOut className="h-4 w-4" />
                Cerrar sesión
              </button>
            </form>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
