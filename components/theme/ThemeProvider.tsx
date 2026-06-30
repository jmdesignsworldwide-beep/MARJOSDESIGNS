'use client'

import { ThemeProvider as NextThemesProvider } from 'next-themes'
import type { ReactNode } from 'react'

/**
 * Wraps next-themes so the chosen theme is persisted to localStorage
 * and applied as a class on <html> before paint (no flash of wrong
 * theme). Toggle lives in the header.
 */
export function ThemeProvider({ children }: { children: ReactNode }) {
  return (
    <NextThemesProvider
      attribute="class"
      defaultTheme="dark"
      enableSystem={false}
      disableTransitionOnChange={false}
      storageKey="marjos-theme"
    >
      {children}
    </NextThemesProvider>
  )
}
