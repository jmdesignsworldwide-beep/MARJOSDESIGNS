'use client'

import { cn, formatDOP } from '@/lib/utils'
import type { MonthPoint } from '@/lib/finanzas/types'

function monthShort(key: string) {
  const [y, m] = key.split('-').map(Number)
  return new Date(y, m - 1, 1).toLocaleDateString('es-DO', { month: 'short' })
}

export function IncomeExpenseChart({ series, currentMonth }: { series: MonthPoint[]; currentMonth: string }) {
  const max = Math.max(1, ...series.flatMap((p) => [p.income, p.expenses]))

  return (
    <div>
      <div className="flex h-44 items-end justify-between gap-3">
        {series.map((p) => {
          const isCur = p.month === currentMonth
          const inH = Math.max(2, Math.round((p.income / max) * 100))
          const exH = Math.max(2, Math.round((p.expenses / max) * 100))
          return (
            <div key={p.month} className="flex flex-1 flex-col items-center gap-1.5">
              <span className={cn('tnum text-[10px]', p.utilidad >= 0 ? 'text-status-ready' : 'text-status-overdue')}>
                {p.utilidad !== 0 ? formatDOP(p.utilidad).replace('RD$', '') : ''}
              </span>
              <div className="flex w-full flex-1 items-end justify-center gap-1">
                <div className="flex h-full w-1/2 items-end">
                  <div className="w-full rounded-t bg-status-ready/80" style={{ height: `${inH}%` }} title={`Ingresos ${formatDOP(p.income)}`} />
                </div>
                <div className="flex h-full w-1/2 items-end">
                  <div className="w-full rounded-t bg-status-overdue/70" style={{ height: `${exH}%` }} title={`Gastos ${formatDOP(p.expenses)}`} />
                </div>
              </div>
              <span className={cn('text-[11px] capitalize', isCur ? 'font-semibold text-gold-brand' : 'text-muted-foreground')}>
                {monthShort(p.month)}
              </span>
            </div>
          )
        })}
      </div>
      <div className="mt-3 flex justify-center gap-4 border-t border-border pt-3 text-xs text-muted-foreground">
        <span className="inline-flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-full bg-status-ready/80" />Ingresos</span>
        <span className="inline-flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-full bg-status-overdue/70" />Gastos del negocio</span>
        <span className="inline-flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-full bg-gold-mid" />Utilidad (arriba)</span>
      </div>
    </div>
  )
}
