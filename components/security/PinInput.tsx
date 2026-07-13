'use client'

import { useRef } from 'react'
import { cn } from '@/lib/utils'

/** 4 casillas de PIN — foco automático, teclado numérico en móvil, avance y
 *  borrado natural. Controlado por `value` (string de hasta 4 dígitos). */
export function PinInput({
  value,
  onChange,
  onComplete,
  disabled = false,
  autoFocus = true,
}: {
  value: string
  onChange: (v: string) => void
  onComplete?: (v: string) => void
  disabled?: boolean
  autoFocus?: boolean
}) {
  const refs = useRef<(HTMLInputElement | null)[]>([])
  const digits = value.padEnd(4, ' ').slice(0, 4).split('')

  function setAt(i: number, ch: string) {
    const arr = value.padEnd(4, ' ').slice(0, 4).split('')
    arr[i] = ch
    const next = arr.join('').replace(/\s+$/g, '').replace(/\s/g, '')
    onChange(next)
    if (ch && next.length === 4 && onComplete) onComplete(next)
  }

  return (
    <div className="flex justify-center gap-3">
      {[0, 1, 2, 3].map((i) => (
        <input
          key={i}
          ref={(el) => { refs.current[i] = el }}
          type="password"
          inputMode="numeric"
          autoComplete="one-time-code"
          maxLength={1}
          disabled={disabled}
          autoFocus={autoFocus && i === 0}
          value={digits[i].trim()}
          onChange={(e) => {
            const ch = e.target.value.replace(/\D/g, '').slice(-1)
            if (!ch) { setAt(i, ''); return }
            setAt(i, ch)
            if (i < 3) refs.current[i + 1]?.focus()
          }}
          onKeyDown={(e) => {
            if (e.key === 'Backspace' && !digits[i].trim() && i > 0) {
              refs.current[i - 1]?.focus()
              setAt(i - 1, '')
            }
          }}
          className={cn(
            'h-14 w-12 rounded-xl border border-border bg-input/5 text-center text-2xl font-bold outline-none transition-colors',
            'focus:border-gold-mid focus:ring-2 focus:ring-gold-mid/30 disabled:opacity-50',
          )}
        />
      ))}
    </div>
  )
}
