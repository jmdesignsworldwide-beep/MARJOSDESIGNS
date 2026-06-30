'use client'

import { useState, type ReactNode } from 'react'
import { Sidebar } from './Sidebar'
import { MobileDrawer } from './MobileDrawer'
import { Header } from './Header'

/**
 * App layout: fixed desktop sidebar + sticky header + scrollable main.
 * On mobile the sidebar is replaced by the slide-in drawer.
 */
export function AppShell({ children }: { children: ReactNode }) {
  const [menuOpen, setMenuOpen] = useState(false)

  return (
    <div className="min-h-dvh">
      <Sidebar />
      <MobileDrawer open={menuOpen} onClose={() => setMenuOpen(false)} />

      <div className="lg:pl-64">
        <Header onOpenMenu={() => setMenuOpen(true)} />
        <main className="mx-auto w-full max-w-6xl px-4 py-6 sm:px-6 sm:py-8">
          {children}
        </main>
      </div>
    </div>
  )
}
