import 'server-only'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import type { CalcType } from './calc'

export interface Product {
  id: string
  name: string
  calc_type: CalcType
  base_price: number
  unit_label: string
  status: 'activo' | 'inactivo'
}

export interface QuoteLine {
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

export interface Quote {
  id: string
  number: number
  client_id: string | null
  client_name: string | null
  subtotal: number
  discount_type: 'none' | 'amount' | 'percent'
  discount_value: number
  discount_amount: number
  total: number
  deposit: number
  status: 'guardada' | 'convertida' | 'anulada'
  notes: string | null
  created_at: string
}

export interface PriceHistoryRow {
  id: number
  product_name: string | null
  old_price: number | null
  new_price: number | null
  created_at: string
}

export async function listProducts(includeInactive = false): Promise<Product[]> {
  const supabase = createSupabaseServerClient()
  let q = supabase
    .from('products')
    .select('id, name, calc_type, base_price, unit_label, status')
    .order('calc_type', { ascending: true })
    .order('name', { ascending: true })
  if (!includeInactive) q = q.eq('status', 'activo')
  const { data } = await q
  return (data as Product[]) ?? []
}

export async function listQuotes(): Promise<Quote[]> {
  const supabase = createSupabaseServerClient()
  const { data } = await supabase
    .from('quotes')
    .select(
      'id, number, client_id, client_name, subtotal, discount_type, discount_value, discount_amount, total, deposit, status, notes, created_at',
    )
    .order('created_at', { ascending: false })
  return (data as Quote[]) ?? []
}

export async function getQuote(
  id: string,
): Promise<{ quote: Quote; lines: QuoteLine[] } | null> {
  const supabase = createSupabaseServerClient()
  const { data: quote } = await supabase
    .from('quotes')
    .select(
      'id, number, client_id, client_name, subtotal, discount_type, discount_value, discount_amount, total, deposit, status, notes, created_at',
    )
    .eq('id', id)
    .single()
  if (!quote) return null

  const { data: lines } = await supabase
    .from('quote_lines')
    .select(
      'id, product_id, description, calc_type, width_in, height_in, sqft, quantity, unit_price, subtotal, position',
    )
    .eq('quote_id', id)
    .order('position', { ascending: true })

  return { quote: quote as Quote, lines: (lines as QuoteLine[]) ?? [] }
}

export async function getPriceHistory(limit = 30): Promise<PriceHistoryRow[]> {
  const supabase = createSupabaseServerClient()
  const { data } = await supabase
    .from('price_history')
    .select('id, product_name, old_price, new_price, created_at')
    .order('created_at', { ascending: false })
    .limit(limit)
  return (data as PriceHistoryRow[]) ?? []
}
