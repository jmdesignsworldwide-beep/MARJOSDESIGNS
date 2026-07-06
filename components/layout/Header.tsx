'use client'

import { Bell, Menu } from 'lucide-react'
import type { Profile } from '@/lib/auth/guards'
import { Logo } from './Logo'
import { ThemeToggle } from '@/components/theme/ThemeToggle'
import { UserMenu } from './UserMenu'

/**
 * Top header. On mobile shows the hamburger + logo; on desktop the logo
 * lives in the sidebar. Right side: theme toggle, notifications placeholder,
 * and the real user menu (with sign-out) when a profile is present.
 */
export function Header({
  onOpenMenu,
  profile,
}: {
  onOpenMenu: () => void
  profile?: Profile
}) {
  return (
    <header className="sticky top-0 z-20 flex h-16 items-center gap-3 border-b border-border bg-bg/70 px-4 backdrop-blur-xl dark:border-white/[0.06] sm:px-6">
      {/* hamburger — mobile/tablet only */}
      <button
        type="button"
        onClick={onOpenMenu}
        aria-label="Abrir menú"
        className="grid h-10 w-10 place-items-center rounded-xl border border-border bg-card/60 text-foreground transition-colors hover:border-gold-mid/50 lg:hidden"
      >
        <Menu className="h-5 w-5" />
      </button>

      {/* logo on mobile (desktop shows it in the sidebar) */}
      <div className="lg:hidden">
        <Logo size={52} />
      </div>

      <div className="ml-auto flex items-center gap-2">
        <ThemeToggle />

        {/* notifications placeholder */}
        <button
          type="button"
          aria-label="Notificaciones"
          className="relative grid h-10 w-10 place-items-center rounded-xl border border-border bg-card/60 text-foreground transition-colors hover:border-gold-mid/50"
        >
          <Bell className="h-[18px] w-[18px]" />
          <span className="absolute right-2.5 top-2.5 h-2 w-2 rounded-full bg-gold-gradient ring-2 ring-bg" />
        </button>

        {profile ? (
          <UserMenu profile={profile} />
        ) : (
          <div
            aria-label="Usuario"
            className="grid h-10 w-10 place-items-center rounded-xl bg-gold-gradient text-sm font-bold text-charcoal-900"
          >
            M
          </div>
        )}
      </div>
    </header>
  )
}
