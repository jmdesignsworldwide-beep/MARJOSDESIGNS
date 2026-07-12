import 'server-only'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import type { CashMethod } from '@/lib/caja/data'

export interface PosSaleItem {
  id: number
  product_id: string | null
  description: string
  quantity: number
  unit_price: number
  subtotal: number
  position: number
}

export interface PosSale {
  id: string
  number: number
  client_name: string | null
  subtotal: number
  discount_type: 'none' | 'amount' | 'percent'
  discount_value: number
  discount_amount: number
  total: number
  method: CashMethod
  reference: string | null
  cash_received: number | null
  change_given: number | null
  status: 'completada' | 'anulada'
  void_reason: string | null
  sold_by: string | null
  sold_by_name: string | null
  created_at: string
}

const SALE_COLS =
  'id, number, client_name, subtotal, discount_type, discount_value, discount_amount, total, method, reference, cash_received, change_given, status, void_reason, sold_by, created_at'

/** Receipt code POS-0001. */
export function saleCode(n: number): string {
  return `POS-${String(n).padStart(4, '0')}`
}

async function attachSellerNames(rows: PosSale[]): Promise<PosSale[]> {
  const ids = Array.from(new Set(rows.map((r) => r.sold_by).filter(Boolean))) as string[]
  if (ids.length === 0) return rows
  const supabase = createSupabaseServerClient()
  const { data } = await supabase.from('profiles').select('id, full_name').in('id', ids)
  const names = new Map((data ?? []).map((p) => [p.id as string, p.full_name as string]))
  return rows.map((r) => ({ ...r, sold_by_name: r.sold_by ? names.get(r.sold_by) ?? null : null }))
}

export async function listSales(filters?: {
  date?: string
  productId?: string
}): Promise<PosSale[]> {
  const supabase = createSupabaseServerClient()
  let q = supabase.from('pos_sales').select(SALE_COLS).order('created_at', { ascending: false }).limit(200)

  if (filters?.date) {
    // DR day window → UTC (UTC-4): [date 04:00Z, next day 04:00Z)
    const start = new Date(filters.date + 'T04:00:00.000Z')
    const end = new Date(start.getTime() + 24 * 60 * 60 * 1000)
    q = q.gte('created_at', start.toISOString()).lt('created_at', end.toISOString())
  }

  if (filters?.productId) {
    const { data: saleIds } = await supabase
      .from('pos_sale_items')
      .select('sale_id')
      .eq('product_id', filters.productId)
    const ids = Array.from(new Set((saleIds ?? []).map((r) => r.sale_id as string)))
    if (ids.length === 0) return []
    q = q.in('id', ids)
  }

  const { data } = await q
  const rows = ((data as PosSale[]) ?? []).map((r) => ({ ...r, sold_by_name: null }))
  return attachSellerNames(rows)
}

export async function getSale(
  id: string,
): Promise<{ sale: PosSale; items: PosSaleItem[] } | null> {
  const supabase = createSupabaseServerClient()
  const { data: sale } = await supabase.from('pos_sales').select(SALE_COLS).eq('id', id).maybeSingle()
  if (!sale) return null
  const { data: items } = await supabase
    .from('pos_sale_items')
    .select('id, product_id, description, quantity, unit_price, subtotal, position')
    .eq('sale_id', id)
    .order('position', { ascending: true })
  const [withName] = await attachSellerNames([{ ...(sale as PosSale), sold_by_name: null }])
  return { sale: withName, items: (items as PosSaleItem[]) ?? [] }
}
