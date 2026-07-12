'use client'

import { useState } from 'react'
import { Printer, Wallet, TrendingUp, TrendingDown, Landmark, ReceiptText } from 'lucide-react'
import { cn, formatDOP } from '@/lib/utils'
import { Card, CardHeader } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { KpiCard } from '@/components/ui/KpiCard'
import type {
  FinanceSummary,
  FinanceScope,
  LedgerEntry,
  LedgerFilters,
  MonthPoint,
  ProductMargin,
  Receivable,
  TopClient,
} from '@/lib/finanzas/types'
import { IncomeExpenseChart } from './IncomeExpenseChart'
import { LedgerTable } from './LedgerTable'
import { ProductMargins } from './ProductMargins'
import { TopClientsCard } from './TopClientsCard'
import { ReceivablesCard } from './ReceivablesCard'

export function FinanzasBoard({
  summary,
  series,
  margins,
  topClients,
  receivables,
  ledger,
  filters,
  period,
  currentMonth,
  monthLabel,
}: {
  summary: FinanceSummary
  series: MonthPoint[]
  margins: ProductMargin[]
  topClients: TopClient[]
  receivables: { total: number; rows: Receivable[] }
  ledger: LedgerEntry[]
  filters: LedgerFilters
  period: { from: string; to: string }
  currentMonth: string
  monthLabel: string
}) {
  const [scope, setScope] = useState<FinanceScope>('negocio')

  const utilidad = scope === 'negocio' ? summary.utilidadNegocio : summary.utilidadTotal
  const gastos = scope === 'negocio' ? summary.expBusiness : summary.expBusiness + summary.expPersonal
  const margin = summary.income > 0 ? Math.round((utilidad / summary.income) * 100) : 0
  const utilPositive = utilidad >= 0

  const deltaTxt = (pct: number | null) => (pct === null ? 'primer dato' : `${pct >= 0 ? '▲' : '▼'} ${Math.abs(pct)}% vs mes anterior`)

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="no-print flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">Finanzas</h1>
          <p className="mt-1 text-sm capitalize text-muted-foreground">{monthLabel} · tu contabilidad completa</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex rounded-xl border border-border p-0.5">
            <button type="button" onClick={() => setScope('negocio')} className={cn('rounded-lg px-3 py-1.5 text-sm font-medium transition-colors', scope === 'negocio' ? 'bg-gold-gradient text-charcoal-900' : 'text-muted-foreground hover:text-foreground')}>Negocio</button>
            <button type="button" onClick={() => setScope('total')} className={cn('rounded-lg px-3 py-1.5 text-sm font-medium transition-colors', scope === 'total' ? 'bg-gold-gradient text-charcoal-900' : 'text-muted-foreground hover:text-foreground')}>Total (con personal)</button>
          </div>
          <Button variant="secondary" onClick={() => window.print()}><Printer className="h-4 w-4" />PDF</Button>
        </div>
      </div>

      {/* Print-only header */}
      <div className="hidden print:block">
        <h1 className="text-xl font-bold">Marjos Designs S.R.L. — Estado de resultados</h1>
        <p className="text-sm capitalize">{monthLabel} · {scope === 'negocio' ? 'Negocio' : 'Panorama total'} · Comprobante interno (no fiscal)</p>
      </div>

      {/* Star number */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <div className={cn('relative overflow-hidden rounded-2xl border p-6 lg:col-span-1', utilPositive ? 'border-gold-mid/30 bg-gold-gradient-soft' : 'border-status-overdue/40 bg-status-overdue/[0.06]')}>
          <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
            {utilPositive ? <TrendingUp className="h-4 w-4 text-gold-brand" /> : <TrendingDown className="h-4 w-4 text-status-overdue" />}
            {scope === 'negocio' ? 'Utilidad del negocio' : 'Utilidad total (con personal)'}
          </div>
          <p className={cn('tnum mt-1 text-4xl font-bold tracking-tight', utilPositive ? 'text-gold-gradient' : 'text-status-overdue')}>{formatDOP(utilidad)}</p>
          <p className="mt-1 text-sm text-muted-foreground">Margen <span className={cn('font-semibold', utilPositive ? 'text-gold-brand' : 'text-status-overdue')}>{margin}%</span> · {deltaTxt(summary.utilidadDeltaPct)}</p>
        </div>

        <KpiCard label="Ingresos del mes" value={summary.income} currency icon={Wallet} hint={deltaTxt(summary.incomeDeltaPct)} />

        <Card className="flex flex-col justify-center">
          <div className="flex items-center gap-2 text-sm text-muted-foreground"><ReceiptText className="h-4 w-4" />Gastos del mes</div>
          <p className="tnum mt-1 text-2xl font-bold text-status-overdue">{formatDOP(gastos)}</p>
          <div className="mt-1 flex flex-wrap gap-x-3 gap-y-0.5 text-xs text-muted-foreground">
            <span>Producción {formatDOP(summary.expProduccion)}</span>
            <span>Negocio {formatDOP(summary.expNegocio)}</span>
            {scope === 'total' && <span className="text-status-overdue">Personal {formatDOP(summary.expPersonal)}</span>}
          </div>
          {scope === 'negocio' && summary.expPersonal > 0 && (
            <p className="mt-1 text-[11px] text-muted-foreground">+ {formatDOP(summary.expPersonal)} personal (fuera del negocio)</p>
          )}
        </Card>
      </div>

      {/* Trend chart */}
      <Card>
        <CardHeader title="Ingresos vs gastos" subtitle="Últimos 6 meses · utilidad arriba de cada mes" />
        <IncomeExpenseChart series={series} currentMonth={currentMonth} />
      </Card>

      {/* Intelligence grid */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <ProductMargins products={margins} />
        <div className="space-y-6">
          <TopClientsCard clients={topClients} />
          <ReceivablesCard total={receivables.total} rows={receivables.rows} />
        </div>
      </div>

      {/* Ledger */}
      <Card className="print-area">
        <CardHeader title="Libro mayor" subtitle="Cada peso que entró y salió — clic en un movimiento para ver su origen" action={<Landmark className="h-4 w-4 text-muted-foreground" />} />
        <LedgerTable entries={ledger} filters={filters} period={period} />
      </Card>
    </div>
  )
}
