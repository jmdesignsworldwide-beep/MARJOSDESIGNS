'use client'

import { useEffect, useState } from 'react'
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion'
import { Logo } from './Logo'

/**
 * Cinematic welcome — shown ONCE per session, fail-safe (any error → it simply
 * doesn't mount and the app is already behind it, so access is never blocked).
 * Tap anywhere to skip. Respects prefers-reduced-motion with a quick fade.
 */
export function WelcomeCurtain({ name }: { name: string }) {
  const [show, setShow] = useState(false)
  const prefersReduced = useReducedMotion()

  useEffect(() => {
    try {
      if (typeof window === 'undefined') return
      if (sessionStorage.getItem('marjos-welcomed')) return
      sessionStorage.setItem('marjos-welcomed', '1')
      setShow(true)
      const t = setTimeout(() => setShow(false), prefersReduced ? 1100 : 2800)
      return () => clearTimeout(t)
    } catch {
      /* fail-safe: never block access */
    }
  }, [prefersReduced])

  const dur = prefersReduced ? 0.3 : 0.7

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          key="welcome"
          onClick={() => setShow(false)}
          initial={{ opacity: 1 }}
          exit={{ opacity: 0, transition: { duration: 0.6, ease: 'easeInOut' } }}
          className="fixed inset-0 z-[200] grid cursor-pointer place-items-center overflow-hidden bg-bg"
          aria-label="Bienvenida"
        >
          {/* Aurora depth — breathing gold */}
          {!prefersReduced && (
            <>
              <motion.div
                className="pointer-events-none absolute -top-1/3 left-1/2 h-[80vmax] w-[80vmax] -translate-x-1/2 rounded-full"
                style={{ background: 'radial-gradient(circle, rgba(224,168,46,0.20) 0%, rgba(224,168,46,0) 60%)' }}
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: [0.95, 1.05, 0.98], opacity: 1 }}
                transition={{ duration: 4, repeat: Infinity, repeatType: 'reverse', ease: 'easeInOut' }}
              />
              <motion.div
                className="pointer-events-none absolute bottom-[-20%] right-[-10%] h-[55vmax] w-[55vmax] rounded-full"
                style={{ background: 'radial-gradient(circle, rgba(244,199,64,0.14) 0%, rgba(244,199,64,0) 60%)' }}
                initial={{ opacity: 0 }}
                animate={{ opacity: [0.6, 1, 0.7] }}
                transition={{ duration: 5, repeat: Infinity, repeatType: 'reverse', ease: 'easeInOut' }}
              />
            </>
          )}

          <div className="relative flex flex-col items-center px-6 text-center">
            {/* Logo with glow */}
            <motion.div
              initial={{ scale: 0.8, opacity: 0, filter: 'blur(10px)' }}
              animate={{ scale: 1, opacity: 1, filter: 'blur(0px)' }}
              transition={{ duration: dur, ease: [0.16, 1, 0.3, 1] }}
              className="drop-shadow-[0_0_40px_rgba(224,168,46,0.55)]"
            >
              <Logo size={112} />
            </motion.div>

            {/* Brand — gradient */}
            <motion.h1
              initial={{ opacity: 0, y: 14, filter: 'blur(8px)' }}
              animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
              transition={{ duration: dur, delay: prefersReduced ? 0 : 0.25, ease: [0.16, 1, 0.3, 1] }}
              className="mt-6 text-4xl font-bold tracking-tight text-gold-gradient sm:text-5xl"
            >
              Marjos Designs
            </motion.h1>

            {/* Name below the logo */}
            <motion.p
              initial={{ opacity: 0, filter: 'blur(6px)' }}
              animate={{ opacity: 1, filter: 'blur(0px)' }}
              transition={{ duration: dur, delay: prefersReduced ? 0 : 0.55, ease: 'easeOut' }}
              className="mt-3 text-lg text-muted-foreground sm:text-xl"
            >
              Bienvenida de nuevo, <span className="font-semibold text-foreground">{name}</span>
            </motion.p>

            {!prefersReduced && (
              <motion.span
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 1.4 }}
                className="mt-8 text-xs uppercase tracking-[0.2em] text-muted-foreground/60"
              >
                toca para entrar
              </motion.span>
            )}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
