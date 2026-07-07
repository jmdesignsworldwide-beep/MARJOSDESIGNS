'use client'

import { useEffect, useState } from 'react'
import { useTheme } from 'next-themes'
import { motion, AnimatePresence } from 'framer-motion'
import { Moon, Sun } from 'lucide-react'
import { cn } from '@/lib/utils'

/**
 * Sun/moon toggle with a soft cross-fade. Renders a stable placeholder
 * until mounted to avoid hydration mismatch (theme is unknown on the
 * server).
 */
export function ThemeToggle({ className }: { className?: string }) {
  const { resolvedTheme, setTheme } = useTheme()
  const [mounted, setMounted] = useState(false)

  useEffect(() => setMounted(true), [])

  const isDark = resolvedTheme === 'dark'
  // Until mounted the theme is unknown on the server — keep a stable, neutral
  // aria-label so SSR and the first client render match (no hydration mismatch).
  const label = !mounted ? 'Cambiar tema' : isDark ? 'Activar tema claro' : 'Activar tema oscuro'

  return (
    <button
      type="button"
      aria-label={label}
      onClick={() => mounted && setTheme(isDark ? 'light' : 'dark')}
      className={cn(
        'relative grid h-10 w-10 place-items-center rounded-xl',
        'border border-border bg-card/60 text-foreground',
        'transition-colors hover:border-gold-mid/50 hover:text-gold-bright',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-bg',
        className,
      )}
    >
      {mounted && (
        <AnimatePresence mode="wait" initial={false}>
          <motion.span
            key={isDark ? 'moon' : 'sun'}
            initial={{ rotate: -45, opacity: 0, scale: 0.6 }}
            animate={{ rotate: 0, opacity: 1, scale: 1 }}
            exit={{ rotate: 45, opacity: 0, scale: 0.6 }}
            transition={{ duration: 0.22, ease: 'easeOut' }}
            className="absolute"
          >
            {isDark ? (
              <Moon className="h-[18px] w-[18px]" />
            ) : (
              <Sun className="h-[18px] w-[18px]" />
            )}
          </motion.span>
        </AnimatePresence>
      )}
    </button>
  )
}
