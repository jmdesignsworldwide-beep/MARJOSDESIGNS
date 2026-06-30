'use client'

import { motion } from 'framer-motion'
import { cn } from '@/lib/utils'
import { Logo } from './Logo'
import { navItems } from './nav'

/** Shared nav list, used by both the desktop rail and the mobile drawer. */
export function NavList({ onNavigate }: { onNavigate?: () => void }) {
  return (
    <nav className="flex flex-1 flex-col gap-1 px-3">
      {navItems.map((item) => {
        const Icon = item.icon
        // First item is highlighted as the "active" example.
        const active = item.label === 'Dashboard'
        return (
          <a
            key={item.label}
            href={item.href}
            onClick={(e) => {
              if (item.disabled) e.preventDefault()
              onNavigate?.()
            }}
            aria-disabled={item.disabled}
            className={cn(
              'group relative flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors',
              active
                ? 'text-foreground'
                : 'text-muted-foreground hover:bg-muted hover:text-foreground',
            )}
          >
            {active && (
              <motion.span
                layoutId="nav-active"
                className="absolute inset-0 -z-10 rounded-xl border border-gold-mid/30 bg-gold-gradient-soft"
              />
            )}
            {active && (
              <span className="absolute left-0 top-1/2 h-5 w-[3px] -translate-y-1/2 rounded-full bg-gold-gradient" />
            )}
            <Icon
              className={cn(
                'h-[18px] w-[18px] shrink-0 transition-colors',
                active
                  ? 'text-gold-brand'
                  : 'text-muted-foreground group-hover:text-foreground',
              )}
            />
            {item.label}
          </a>
        )
      })}
    </nav>
  )
}

/** Desktop sidebar rail — fixed, hidden below lg (mobile uses the drawer). */
export function Sidebar() {
  return (
    <aside className="fixed inset-y-0 left-0 z-30 hidden w-64 flex-col border-r border-border bg-bg-elevated/80 backdrop-blur-xl lg:flex dark:border-white/[0.06]">
      <div className="flex h-16 items-center px-5">
        <Logo withWordmark />
      </div>
      <div className="mt-2 flex flex-1 flex-col pb-6">
        <NavList />
        <div className="mt-auto px-5">
          <p className="text-[11px] text-muted-foreground/70">
            Marjos Designs · v0.1
          </p>
        </div>
      </div>
    </aside>
  )
}
