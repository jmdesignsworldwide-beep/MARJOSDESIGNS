'use client'

import { useState, type ReactNode } from 'react'
import type { Profile } from '@/lib/auth/guards'
import type { DeliveryNotice } from '@/lib/notifications/data'
import { Sidebar } from './Sidebar'
import { MobileDrawer } from './MobileDrawer'
import { Header } from './Header'
import { WelcomeCurtain } from './WelcomeCurtain'

/**
 * App layout: fixed desktop sidebar + sticky header + scrollable main.
 * On mobile the sidebar is replaced by the slide-in drawer. The nav is
 * filtered by the signed-in user's role (or shows everything when no
 * profile is passed — used by the design showcase).
 */
export function AppShell({
  children,
  profile,
  notices,
}: {
  children: ReactNode
  profile?: Profile
  notices?: DeliveryNotice[]
}) {
  const [menuOpen, setMenuOpen] = useState(false)
  const role = profile?.role

  const firstName = profile?.full_name?.split(' ')[0] ?? ''

  return (
    <div className="min-h-dvh">
      {profile && <WelcomeCurtain name={firstName} />}
      <Sidebar role={role} />
      <MobileDrawer open={menuOpen} onClose={() => setMenuOpen(false)} role={role} />

      <div className="lg:pl-64">
        <Header onOpenMenu={() => setMenuOpen(true)} profile={profile} notices={notices} />
        <main className="mx-auto w-full max-w-6xl px-4 py-6 sm:px-6 sm:py-8">
          {children}
        </main>
      </div>
    </div>
  )
}
