'use client'

import { useState } from 'react'
import { Ruler } from 'lucide-react'

/**
 * Small convenience: convert feet → inches. Marjos measures in inches (the
 * calculator input is always inches), but if a client gives feet she can
 * convert here. Purely informational — does not feed the calculation.
 */
export function InchHelper() {
  const [feet, setFeet] = useState('')
  const f = parseFloat(feet)
  const inches = Number.isFinite(f) ? f * 12 : 0

  return (
    <div className="flex flex-wrap items-center gap-2 rounded-xl border border-dashed border-border bg-card/40 px-3.5 py-2.5 text-sm dark:border-white/[0.08]">
      <Ruler className="h-4 w-4 text-gold-brand" />
      <span className="text-muted-foreground">¿El cliente dio pies? Convierte:</span>
      <input
        type="number"
        inputMode="decimal"
        min="0"
        step="any"
        value={feet}
        onChange={(e) => setFeet(e.target.value)}
        placeholder="pies"
        className="tnum h-8 w-20 rounded-lg border border-border bg-input/5 px-2 text-right outline-none focus:border-gold-mid"
      />
      <span className="text-muted-foreground">=</span>
      <span className="tnum font-semibold text-foreground">{inches} pulgadas</span>
    </div>
  )
}
