/** Client-safe finanzas types (no server-only deps). */

export type LedgerType = 'entrada' | 'salida'
/** Bucket = the accounting line a movement belongs to. */
export type LedgerBucket = 'ingreso' | 'produccion' | 'negocio' | 'personal'
export type FinanceScope = 'negocio' | 'total'

export const bucketMeta: Record<
  LedgerBucket,
  { label: string; scope: 'negocio' | 'personal'; status: 'process' | 'ready' | 'overdue' | 'neutral' }
> = {
  ingreso: { label: 'Ingreso', scope: 'negocio', status: 'ready' },
  produccion: { label: 'Producción', scope: 'negocio', status: 'process' },
  negocio: { label: 'Negocio', scope: 'negocio', status: 'neutral' },
  personal: { label: 'Personal', scope: 'personal', status: 'overdue' },
}

export const methodLabel: Record<string, string> = {
  efectivo: 'Efectivo',
  transferencia: 'Transferencia',
  debito: 'Débito',
  credito: 'Crédito',
}

export interface LedgerEntry {
  id: string
  date: string // ISO timestamp
  concept: string
  type: LedgerType
  bucket: LedgerBucket
  amount: number
  method: string
  href: string | null
  origin: 'orden' | 'venta' | 'gasto'
}

export interface FinanceSummary {
  income: number
  expProduccion: number
  expNegocio: number
  expPersonal: number
  expBusiness: number // produccion + negocio
  utilidadNegocio: number // income − business
  utilidadTotal: number // income − (business + personal)
  marginNegocio: number // utilidadNegocio / income (%)
  prevIncome: number
  prevUtilidadNegocio: number
  incomeDeltaPct: number | null
  utilidadDeltaPct: number | null
}

export interface MonthPoint {
  month: string // YYYY-MM
  income: number
  expenses: number // business expenses (produccion + negocio)
  utilidad: number
}

export interface ProductMargin {
  productId: string
  name: string
  unitLabel: string
  basePrice: number
  unitCost: number | null
  marginPct: number | null
  billed: number
  unitsSold: number
}

export interface TopClient {
  clientId: string | null
  name: string
  total: number
}

export interface Receivable {
  orderId: string
  number: number
  clientName: string | null
  whatsapp: string | null
  balance: number
}

export interface LedgerFilters {
  from?: string // YYYY-MM-DD
  to?: string
  type?: LedgerType
  bucket?: LedgerBucket
  method?: string
  q?: string
}

export interface FinancePeriod {
  from: string
  to: string
  monthKey: string // for month-scoped summary/analytics
  label: string
}
