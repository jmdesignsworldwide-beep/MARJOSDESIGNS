import 'server-only'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import type { CalcType } from '@/lib/cotizador/calc'
import type { OrderStage } from './format'

export interface OrderItem {
  id: number
  product_id: string | null
  description: string
  calc_type: CalcType
  width_in: number | null
  height_in: number | null
  sqft: number | null
  quantity: number | null
  unit_price: number
  subtotal: number
  position: number
}

export interface Order {
  id: string
  number: number
  client_id: string | null
  client_name: string | null
  assigned_to: string | null
  assigned_name: string | null
  description: string | null
  subtotal: number
  discount_type: 'none' | 'amount' | 'percent'
  discount_value: number
  discount_amount: number
  total: number
  deposit: number
  amount_paid: number
  stage: OrderStage
  delivery_date: string | null
  notes: string | null
  cancel_reason: string | null
  source: 'directa' | 'cotizacion'
  quote_id: string | null
  created_at: string
}

const ORDER_COLS =
  'id, number, client_id, client_name, assigned_to, assigned_name, description, subtotal, discount_type, discount_value, discount_amount, total, deposit, amount_paid, stage, delivery_date, notes, cancel_reason, source, quote_id, created_at'

/** Orders sorted by delivery date (soonest first) — sensible for a workshop. */
export async function listOrders(): Promise<Order[]> {
  const supabase = createSupabaseServerClient()
  const { data } = await supabase
    .from('orders')
    .select(ORDER_COLS)
    .order('delivery_date', { ascending: true, nullsFirst: false })
    .order('created_at', { ascending: false })
  return (data as Order[]) ?? []
}

export async function getOrder(
  id: string,
): Promise<{ order: Order; items: OrderItem[] } | null> {
  const supabase = createSupabaseServerClient()
  const { data: order } = await supabase.from('orders').select(ORDER_COLS).eq('id', id).single()
  if (!order) return null
  const { data: items } = await supabase
    .from('order_items')
    .select(
      'id, product_id, description, calc_type, width_in, height_in, sqft, quantity, unit_price, subtotal, position',
    )
    .eq('order_id', id)
    .order('position', { ascending: true })
  return { order: order as Order, items: (items as OrderItem[]) ?? [] }
}

/** Active employees for the "asignar empleado" picker (super_admin view). */
export async function listAssignableUsers(): Promise<{ id: string; name: string }[]> {
  const supabase = createSupabaseServerClient()
  const { data } = await supabase
    .from('profiles')
    .select('id, full_name, status')
    .eq('status', 'activo')
    .order('full_name', { ascending: true })
  return ((data as { id: string; full_name: string }[]) ?? []).map((u) => ({
    id: u.id,
    name: u.full_name,
  }))
}

/** Build a short "50 tazas + 2 banners" style summary from items. */
export function summarizeItems(
  items: { description: string; quantity: number | null; calc_type: CalcType }[],
): string {
  if (items.length === 0) return '—'
  const parts = items.slice(0, 3).map((it) => {
    if (it.calc_type === 'quantity' && it.quantity) {
      return `${Math.round(it.quantity)} ${it.description}`
    }
    return it.description
  })
  const extra = items.length > 3 ? ` +${items.length - 3} más` : ''
  return parts.join(' · ') + extra
}
