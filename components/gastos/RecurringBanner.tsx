'use client'

import { BellRing, ChevronRight } from 'lucide-react'
import { formatDOP } from '@/lib/utils'
import type { RecurringReminder } from '@/lib/gastos/types'

/** Soft nudge: fixed expenses not yet registered this month. */
export function RecurringBanner({
  reminders,
  onPick,
}: {
  reminders: RecurringReminder[]
  onPick: (r: RecurringReminder) => void
}) {
  if (reminders.length === 0) return null
  return (
    <div className="rounded-2xl border border-gold-mid/30 bg-gold-gradient-soft p-4">
      <div className="flex items-center gap-2 text-sm font-semibold text-gold-brand">
        <BellRing className="h-4 w-4" />
        Gastos fijos de este mes sin registrar
      </div>
      <div className="mt-3 flex flex-wrap gap-2">
        {reminders.map((r) => (
          <button
            key={`${r.categoryId}-${r.description}`}
            type="button"
            onClick={() => onPick(r)}
            className="group inline-flex items-center gap-2 rounded-xl border border-gold-mid/30 bg-card/70 px-3 py-2 text-left text-sm transition-colors hover:border-gold-mid/60"
          >
            <span>
              <span className="font-medium text-foreground">{r.description}</span>
              <span className="ml-1.5 text-xs text-muted-foreground">≈ {formatDOP(r.lastAmount)}</span>
            </span>
            <ChevronRight className="h-4 w-4 text-gold-brand transition-transform group-hover:translate-x-0.5" />
          </button>
        ))}
      </div>
      <p className="mt-2 text-xs text-muted-foreground">Toca uno para registrarlo con el monto pre-cargado (confirma si cambió).</p>
    </div>
  )
}
