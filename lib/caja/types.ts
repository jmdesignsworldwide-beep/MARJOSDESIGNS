/** Client-safe caja types + constants (no server-only deps). */

export type CashMethod = 'efectivo' | 'transferencia' | 'debito' | 'credito'
export const CASH_METHODS: CashMethod[] = ['efectivo', 'transferencia', 'debito', 'credito']

export interface CashRegister {
  id: string
  business_date: string
  opening_float: number
  status: 'abierta' | 'cerrada'
  opened_at: string
  counted_cash: number | null
  expected_cash: number | null
  difference: number | null
  closing_note: string | null
  closed_at: string | null
}

export interface CashMovement {
  id: number
  direction: 'entrada' | 'salida'
  source: 'order_payment' | 'order_reverso' | 'pos_sale' | 'pos_void' | 'manual' | 'expense'
  amount: number
  method: CashMethod
  reference: string | null
  concept: string | null
  client_name: string | null
  order_id: string | null
  order_number: number | null
  pos_sale_id: string | null
  pos_sale_number: number | null
  created_at: string
}

export interface CashSummary {
  byMethod: Record<CashMethod, number>
  totalIn: number
  expectedCash: number
}
