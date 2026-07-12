'use client'

import { Menu } from 'lucide-react'
import type { Profile } from '@/lib/auth/guards'
import type { DeliveryNotice } from '@/lib/notifications/data'
import { Logo } from './Logo'
import { ThemeToggle } from '@/components/theme/ThemeToggle'
import { UserMenu } from './UserMenu'
import { NotificationBell } from './NotificationBell'

/**
 * Top header. On mobile shows the hamburger + logo; on desktop the logo
 * lives in the sidebar. Right side: theme toggle, delivery notifications
 * (super_admin), and the real user menu (with sign-out) when present.
 */
export function Header({
  onOpenMenu,
  profile,
  notices,
}: {
  onOpenMenu: () => void
  profile?: Profile
  notices?: DeliveryNotice[]
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

        {notices && <NotificationBell notices={notices} />}

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
