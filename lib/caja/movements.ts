import 'server-only'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { roundMoney } from '@/lib/cotizador/calc'
import type { CashMethod } from './data'

export interface MovementInput {
  direction?: 'entrada' | 'salida'
  source: 'order_payment' | 'order_reverso' | 'pos_sale' | 'pos_void' | 'manual' | 'expense'
  amount: number
  method: CashMethod
  reference?: string | null
  concept?: string | null
  clientName?: string | null
  orderId?: string | null
  paymentId?: number | null
  posSaleId?: string | null
  expenseId?: number | null
  createdBy: string
}

/** The currently open register's id, or null. */
export async function findOpenRegisterId(): Promise<string | null> {
  const supabase = createSupabaseServerClient()
  const { data } = await supabase
    .from('cash_registers')
    .select('id')
    .eq('status', 'abierta')
    .maybeSingle()
  return (data?.id as string) ?? null
}

/**
 * Append a movement to a register's ledger. When registerId is omitted it
 * targets the currently open register; if none is open the movement is
 * skipped (money still lives in its source table — the caja only reflects the
 * day while it's open). Returns true when a row was written.
 */
export async function recordCashMovement(
  input: MovementInput,
  registerId?: string | null,
): Promise<boolean> {
  const rid = registerId ?? (await findOpenRegisterId())
  if (!rid) return false
  const amount = roundMoney(input.amount)
  if (amount <= 0) return false

  const supabase = createSupabaseServerClient()
  const { error } = await supabase.from('cash_movements').insert({
    register_id: rid,
    direction: input.direction ?? 'entrada',
    source: input.source,
    amount,
    method: input.method,
    reference: input.reference || null,
    concept: input.concept || null,
    client_name: input.clientName || null,
    order_id: input.orderId || null,
    payment_id: input.paymentId ?? null,
    pos_sale_id: input.posSaleId || null,
    expense_id: input.expenseId ?? null,
    created_by: input.createdBy,
  })
  return !error
}
