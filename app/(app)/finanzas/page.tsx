import { requireRole } from '@/lib/auth/guards'
import {
  getSummary,
  getLedger,
  getMonthlySeries,
  getProductMargins,
  getTopClients,
  getReceivables,
  monthKeyDR,
  todayDR,
} from '@/lib/finanzas/data'
import type { LedgerFilters } from '@/lib/finanzas/types'
import { FinanzasBoard } from '@/components/finanzas/FinanzasBoard'

export const dynamic = 'force-dynamic'

const TYPES = ['entrada', 'salida']
const BUCKETS = ['ingreso', 'produccion', 'negocio', 'personal']
const METHODS = ['efectivo', 'transferencia', 'debito', 'credito']
const DATE = /^\d{4}-\d{2}-\d{2}$/

export default async function FinanzasPage({
  searchParams,
}: {
  searchParams: { from?: string; to?: string; type?: string; bucket?: string; method?: string; q?: string }
}) {
  await requireRole('super_admin')

  const month = monthKeyDR()
  const today = todayDR()
  const from = DATE.test(searchParams.from ?? '') ? searchParams.from! : `${month}-01`
  const to = DATE.test(searchParams.to ?? '') ? searchParams.to! : today

  const filters: LedgerFilters = {
    from,
    to,
    type: TYPES.includes(searchParams.type ?? '') ? (searchParams.type as LedgerFilters['type']) : undefined,
    bucket: BUCKETS.includes(searchParams.bucket ?? '') ? (searchParams.bucket as LedgerFilters['bucket']) : undefined,
    method: METHODS.includes(searchParams.method ?? '') ? searchParams.method : undefined,
    q: searchParams.q?.trim() || undefined,
  }

  const [summary, series, margins, topClients, receivables, ledger] = await Promise.all([
    getSummary(month),
    getMonthlySeries(6),
    getProductMargins(),
    getTopClients(),
    getReceivables(),
    getLedger(filters, from, to),
  ])

  const monthLabel = new Date(`${month}-01T12:00:00`).toLocaleDateString('es-DO', { month: 'long', year: 'numeric' })

  return (
    <FinanzasBoard
      summary={summary}
      series={series}
      margins={margins}
      topClients={topClients}
      receivables={receivables}
      ledger={ledger}
      filters={filters}
      period={{ from, to }}
      currentMonth={month}
      monthLabel={monthLabel}
    />
  )
}
