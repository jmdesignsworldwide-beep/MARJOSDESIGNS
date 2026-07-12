'use client'

import { cn, formatDOP } from '@/lib/utils'
import { Card, CardHeader } from '@/components/ui/Card'
import { groupMeta, type ExpensesOverview, type ExpenseGroup } from '@/lib/gastos/types'

const groupBar: Record<ExpenseGroup, string> = {
  produccion: 'bg-status-process',
  negocio: 'bg-gold-mid',
  personal: 'bg-status-overdue',
}

function monthShort(key: string) {
  const [y, m] = key.split('-').map(Number)
  return new Date(y, m - 1, 1).toLocaleDateString('es-DO', { month: 'short' })
}

export function GastosCharts({ overview, currentMonth }: { overview: ExpensesOverview; currentMonth: string }) {
  const maxMonth = Math.max(1, ...overview.byMonth.map((m) => m.total))
  const maxCat = Math.max(1, ...overview.byCategory.map((c) => c.total))

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
      {/* By month */}
      <Card>
        <CardHeader title="Gastos por mes" subtitle="Últimos 6 meses" />
        <div className="flex h-40 items-end justify-between gap-2">
          {overview.byMonth.map((m) => {
            const isCurrent = m.month === currentMonth
            const h = Math.max(4, Math.round((m.total / maxMonth) * 100))
            return (
              <div key={m.month} className="flex flex-1 flex-col items-center gap-1.5">
                <span className="tnum text-[10px] text-muted-foreground">{m.total > 0 ? formatDOP(m.total).replace('RD$', '') : ''}</span>
                <div className="flex w-full flex-1 items-end">
                  <div
                    className={cn('w-full rounded-t-md transition-all', isCurrent ? 'bg-gold-gradient' : 'bg-muted-foreground/25')}
                    style={{ height: `${h}%` }}
                  />
                </div>
                <span className={cn('text-[11px] capitalize', isCurrent ? 'font-semibold text-gold-brand' : 'text-muted-foreground')}>
                  {monthShort(m.month)}
                </span>
              </div>
            )
          })}
        </div>
      </Card>

      {/* By category (this month) */}
      <Card>
        <CardHeader title="Por categoría" subtitle="Este mes" />
        {overview.byCategory.length === 0 ? (
          <p className="py-10 text-center text-sm text-muted-foreground">Sin gastos este mes todavía.</p>
        ) : (
          <ul className="space-y-2.5">
            {overview.byCategory.slice(0, 6).map((c) => (
              <li key={c.categoryId}>
                <div className="mb-1 flex items-center justify-between text-sm">
                  <span className="truncate">{c.name}</span>
                  <span className="tnum shrink-0 font-medium">{formatDOP(c.total)}</span>
                </div>
                <div className="h-2 overflow-hidden rounded-full bg-muted/50">
                  <div className={cn('h-full rounded-full', groupBar[c.grp])} style={{ width: `${Math.max(3, Math.round((c.total / maxCat) * 100))}%` }} />
                </div>
              </li>
            ))}
          </ul>
        )}
        <div className="mt-4 flex flex-wrap gap-3 border-t border-border pt-3 text-xs text-muted-foreground">
          {(['produccion', 'negocio', 'personal'] as ExpenseGroup[]).map((g) => (
            <span key={g} className="inline-flex items-center gap-1.5">
              <span className={cn('h-2.5 w-2.5 rounded-full', groupBar[g])} />
              {groupMeta[g].short} · {formatDOP(overview.byGroup[g])}
            </span>
          ))}
        </div>
      </Card>
    </div>
  )
}
