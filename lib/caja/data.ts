import 'server-only'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { roundMoney } from '@/lib/cotizador/calc'
import { CASH_METHODS, type CashMethod, type CashRegister, type CashMovement, type CashSummary } from './types'

export { CASH_METHODS }
export type { CashMethod, CashRegister, CashMovement, CashSummary }

const REG_COLS =
  'id, business_date, opening_float, status, opened_at, counted_cash, expected_cash, difference, closing_note, closed_at'

/** Business date in DR time (America/Santo_Domingo, UTC-4, no DST) as YYYY-MM-DD. */
export function businessDateDR(): string {
  const now = new Date()
  const dr = new Date(now.getTime() - 4 * 60 * 60 * 1000)
  return dr.toISOString().slice(0, 10)
}

export async function getOpenRegister(): Promise<CashRegister | null> {
  const supabase = createSupabaseServerClient()
  const { data } = await supabase
    .from('cash_registers')
    .select(REG_COLS)
    .eq('status', 'abierta')
    .maybeSingle()
  return (data as CashRegister) ?? null
}

/** Today's register whether open or already closed. */
export async function getTodayRegister(): Promise<CashRegister | null> {
  const supabase = createSupabaseServerClient()
  const { data } = await supabase
    .from('cash_registers')
    .select(REG_COLS)
    .eq('business_date', businessDateDR())
    .maybeSingle()
  return (data as CashRegister) ?? null
}

export async function getRegister(id: string): Promise<CashRegister | null> {
  const supabase = createSupabaseServerClient()
  const { data } = await supabase.from('cash_registers').select(REG_COLS).eq('id', id).maybeSingle()
  return (data as CashRegister) ?? null
}

export async function listRegisters(): Promise<CashRegister[]> {
  const supabase = createSupabaseServerClient()
  const { data } = await supabase
    .from('cash_registers')
    .select(REG_COLS)
    .order('business_date', { ascending: false })
  return (data as CashRegister[]) ?? []
}

export async function listMovements(registerId: string): Promise<CashMovement[]> {
  const supabase = createSupabaseServerClient()
  const { data } = await supabase
    .from('cash_movements')
    .select(
      'id, direction, source, amount, method, reference, concept, client_name, order_id, pos_sale_id, created_at, orders(number), pos_sales(number)',
    )
    .eq('register_id', registerId)
    .order('created_at', { ascending: false })

  return ((data ?? []) as Record<string, unknown>[]).map((r) => ({
    id: r.id as number,
    direction: r.direction as CashMovement['direction'],
    source: r.source as CashMovement['source'],
    amount: Number(r.amount),
    method: r.method as CashMethod,
    reference: (r.reference as string) ?? null,
    concept: (r.concept as string) ?? null,
    client_name: (r.client_name as string) ?? null,
    order_id: (r.order_id as string) ?? null,
    order_number: (r.orders as { number: number } | null)?.number ?? null,
    pos_sale_id: (r.pos_sale_id as string) ?? null,
    pos_sale_number: (r.pos_sales as { number: number } | null)?.number ?? null,
    created_at: r.created_at as string,
  }))
}

/** Net money per method (entrada − salida) + expected physical cash. Exact peso. */
export function summarize(register: CashRegister, movements: CashMovement[]): CashSummary {
  const byMethod: Record<CashMethod, number> = {
    efectivo: 0,
    transferencia: 0,
    debito: 0,
    credito: 0,
  }
  let grossIn = 0
  let grossOut = 0
  let cashIn = 0
  let cashOut = 0
  for (const m of movements) {
    const signed = m.direction === 'salida' ? -m.amount : m.amount
    byMethod[m.method] += signed
    if (m.direction === 'salida') {
      grossOut += m.amount
      if (m.method === 'efectivo') cashOut += m.amount
    } else {
      grossIn += m.amount
      if (m.method === 'efectivo') cashIn += m.amount
    }
  }
  for (const k of CASH_METHODS) byMethod[k] = roundMoney(byMethod[k])
  const totalIn = roundMoney(CASH_METHODS.reduce((s, k) => s + byMethod[k], 0))
  const expectedCash = roundMoney(register.opening_float + byMethod.efectivo)
  return {
    byMethod,
    totalIn,
    grossIn: roundMoney(grossIn),
    grossOut: roundMoney(grossOut),
    cashIn: roundMoney(cashIn),
    cashOut: roundMoney(cashOut),
    expectedCash,
  }
}
