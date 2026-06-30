'use client'

import { useEffect, useRef, useState } from 'react'
import { useReducedMotion } from 'framer-motion'

interface UseCountUpOptions {
  /** Final value to count to. */
  to: number
  /** Duration in ms. */
  duration?: number
  /** Start counting only when true (e.g. when scrolled into view). */
  start?: boolean
}

/**
 * Animates a number from 0 → `to` with an ease-out curve.
 * Respects prefers-reduced-motion (jumps straight to the final value).
 */
export function useCountUp({ to, duration = 1400, start = true }: UseCountUpOptions) {
  const prefersReduced = useReducedMotion()
  const [value, setValue] = useState(0)
  const frame = useRef<number>()

  useEffect(() => {
    if (!start) return

    if (prefersReduced) {
      setValue(to)
      return
    }

    let startTime: number | null = null
    const easeOutCubic = (t: number) => 1 - Math.pow(1 - t, 3)

    const tick = (now: number) => {
      if (startTime === null) startTime = now
      const elapsed = now - startTime
      const progress = Math.min(elapsed / duration, 1)
      setValue(to * easeOutCubic(progress))
      if (progress < 1) {
        frame.current = requestAnimationFrame(tick)
      } else {
        setValue(to)
      }
    }

    frame.current = requestAnimationFrame(tick)
    return () => {
      if (frame.current) cancelAnimationFrame(frame.current)
    }
  }, [to, duration, start, prefersReduced])

  return value
}
