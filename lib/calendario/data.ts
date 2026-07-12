import 'server-only'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { roundMoney } from '@/lib/cotizador/calc'
import { summarizeItems } from '@/lib/ordenes/data'
import type { CalcType } from '@/lib/cotizador/calc'
import type { OrderStage } from '@/lib/ordenes/format'
import type { CalendarOrder, CalendarNote, CalKind } from './types'

export function todayDR(): string {
  return new Date(Date.now() - 4 * 60 * 60 * 1000).toISOString().slice(0, 10)
}

/** All non-cancelled orders that have a delivery date, with item summaries and
 *  balance. The calendar reads orders — it never duplicates them. */
export async function listCalendarOrders(): Promise<CalendarOrder[]> {
  const supabase = createSupabaseServerClient()
  const { data: orders } = await supabase
    .from('orders')
    .select('id, number, client_id, client_name, assigned_name, stage, delivery_date, total, amount_paid')
    .neq('stage', 'cancelada')
    .not('delivery_date', 'is', null)
    .order('delivery_date', { ascending: true })

  const rows = (orders ?? []) as {
    id: string
    number: number
    client_id: string | null
    client_name: string | null
    assigned_name: string | null
    stage: OrderStage
    delivery_date: string
    total: number
    amount_paid: number
  }[]
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

  return rows.map((o) => {
    const balance = roundMoney(Math.max(0, Number(o.total) - Number(o.amount_paid)))
    return {
      id: o.id,
      number: o.number,
      clientId: o.client_id,
      clientName: o.client_name,
      assignedName: o.assigned_name,
      stage: o.stage,
      deliveryDate: o.delivery_date,
      total: roundMoney(Number(o.total)),
      amountPaid: roundMoney(Number(o.amount_paid)),
      balance,
      summary: summarizeItems(byOrder.get(o.id) ?? []),
    }
  })
}

export async function listCalendarNotes(): Promise<CalendarNote[]> {
  const supabase = createSupabaseServerClient()
  const { data } = await supabase
    .from('calendar_notes')
    .select('id, note_date, kind, title, body')
    .order('note_date', { ascending: true })
  return ((data ?? []) as { id: number; note_date: string; kind: CalKind; title: string; body: string | null }[]).map((n) => ({
    id: n.id,
    noteDate: n.note_date,
    kind: n.kind,
    title: n.title,
    body: n.body,
  }))
}
