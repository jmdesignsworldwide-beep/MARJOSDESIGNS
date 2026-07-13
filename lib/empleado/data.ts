import 'server-only'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { summarizeItems } from '@/lib/ordenes/data'
import type { CalcType } from '@/lib/cotizador/calc'
import type { OrderStage } from '@/lib/ordenes/format'
import type { CalendarOrder } from '@/lib/calendario/types'
import type { EmployeeOrder } from './types'

export function todayDR(): string {
  return new Date(Date.now() - 4 * 60 * 60 * 1000).toISOString().slice(0, 10)
}

/** The signed-in employee's assigned orders. RLS already restricts rows to
 *  the caller; we also filter explicitly. NO money is ever selected. */
export async function getMyOrders(): Promise<EmployeeOrder[]> {
  const supabase = createSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return []

  const { data: orders } = await supabase
    .from('orders')
    .select('id, number, client_name, stage, delivery_date')
    .eq('assigned_to', user.id)
    .neq('stage', 'cancelada')
    .order('delivery_date', { ascending: true, nullsFirst: false })

  const rows = (orders ?? []) as { id: string; number: number; client_name: string | null; stage: OrderStage; delivery_date: string | null }[]
  if (rows.length === 0) return []

  const ids = rows.map((o) => o.id)
  const { data: items } = await supabase
    .from('order_items')
    .select('order_id, description, quantity, calc_type, position')
    .in('order_id', ids)
    .order('position', { ascending: true })

  const byOrder = new Map<string, { description: string; quantity: number | null; calc_type: CalcType }[]>()
  for (const it of (items ?? []) as { order_id: string; description: string; quantity: number | null; calc_type: CalcType }[]) {
    const arr = byOrder.get(it.order_id) ?? []
    arr.push({ description: it.description, quantity: it.quantity, calc_type: it.calc_type })
    byOrder.set(it.order_id, arr)
  }

  return rows.map((o) => ({
    id: o.id,
    number: o.number,
    clientName: o.client_name,
    summary: summarizeItems(byOrder.get(o.id) ?? []),
    stage: o.stage,
    deliveryDate: o.delivery_date,
  }))
}

/** Same orders (with a delivery date) mapped to the calendar shape — money
 *  fields are ZEROED so the employee calendar never shows balances. */
export async function getMyCalendarOrders(): Promise<CalendarOrder[]> {
  const orders = await getMyOrders()
  return orders
    .filter((o) => o.deliveryDate)
    .map((o) => ({
      id: o.id,
      number: o.number,
      clientId: null,
      clientName: o.clientName,
      assignedName: null,
      stage: o.stage,
      deliveryDate: o.deliveryDate as string,
      total: 0,
      amountPaid: 0,
      balance: 0,
      summary: o.summary,
    }))
}
