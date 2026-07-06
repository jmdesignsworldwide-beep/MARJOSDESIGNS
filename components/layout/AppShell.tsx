'use client'

import { useState, type ReactNode } from 'react'
import type { Profile } from '@/lib/auth/guards'
import { Sidebar } from './Sidebar'
import { MobileDrawer } from './MobileDrawer'
import { Header } from './Header'

/**
 * App layout: fixed desktop sidebar + sticky header + scrollable main.
 * On mobile the sidebar is replaced by the slide-in drawer. The nav is
 * filtered by the signed-in user's role (or shows everything when no
 * profile is passed — used by the design showcase).
 */
export function AppShell({
  children,
  profile,
}: {
  children: ReactNode
  profile?: Profile
}) {
  const [menuOpen, setMenuOpen] = useState(false)
  const role = profile?.role

  return (
    <div className="min-h-dvh">
      <Sidebar role={role} />
      <MobileDrawer open={menuOpen} onClose={() => setMenuOpen(false)} role={role} />

      <div className="lg:pl-64">
        <Header onOpenMenu={() => setMenuOpen(true)} profile={profile} />
        <main className="mx-auto w-full max-w-6xl px-4 py-6 sm:px-6 sm:py-8">
          {children}
        </main>
      </div>
    </div>
  )
}
