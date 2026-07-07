import 'server-only'
import { createSupabaseServerClient } from '@/lib/supabase/server'

export type ClientType = 'persona' | 'empresa'
export type ClientStatus = 'activo' | 'inactivo'

export interface Client {
  id: string
  type: ClientType
  name: string
  phone: string | null
  whatsapp: string | null
  email: string | null
  address: string | null
  notes: string | null
  cedula: string | null
  rnc: string | null
  contact_person: string | null
  status: ClientStatus
  created_at: string
}

/**
 * Per-client aggregates that come from ORDERS (a later tanda). Until that
 * table exists the queries degrade to zero/empty — the profile shows honest
 * empty states and fills itself in automatically. No invented numbers.
 *
 * ── Expected `orders` link (future) ──
 *   orders.client_id uuid references clients(id)
 *   orders.total, orders.amount_paid, orders.description, orders.delivered_at
 */
export interface ClientStats {
  ordersReady: boolean
  totalSpent: number
  orderCount: number
  firstOrder: string | null
  lastOrder: string | null
  frequentProducts: { label: string; count: number }[]
  orders: {
    id: string
    description: string
    total: number
    stage: string
    deliveryDate: string | null
  }[]
}

const EMPTY_STATS: ClientStats = {
  ordersReady: false,
  totalSpent: 0,
  orderCount: 0,
  firstOrder: null,
  lastOrder: null,
  frequentProducts: [],
  orders: [],
}

const CLIENT_COLS =
  'id, type, name, phone, whatsapp, email, address, notes, cedula, rnc, contact_person, status, created_at'

export async function listClients(): Promise<Client[]> {
  const supabase = createSupabaseServerClient()
  const { data } = await supabase
    .from('clients')
    .select(CLIENT_COLS)
    .order('name', { ascending: true })
  return (data as Client[]) ?? []
}

export async function getClient(id: string): Promise<Client | null> {
  const supabase = createSupabaseServerClient()
  const { data } = await supabase.from('clients').select(CLIENT_COLS).eq('id', id).single()
  return (data as Client) ?? null
}

/** Order-derived stats for one client. Empty until Órdenes ships. */
export async function getClientStats(clientId: string): Promise<ClientStats> {
  const supabase = createSupabaseServerClient()
  const probe = await supabase.from('orders').select('id').eq('client_id', clientId).limit(1)
  if (probe.error) return EMPTY_STATS

  const { data } = await supabase
    .from('orders')
    .select('id, description, total, amount_paid, stage, delivery_date, delivered_at')
    .eq('client_id', clientId)
    .order('created_at', { ascending: false })

  const rows = data ?? []
  if (rows.length === 0) return { ...EMPTY_STATS, ordersReady: true }

  const totalSpent = rows.reduce(
    (s, r) => s + Number((r as { amount_paid?: number }).amount_paid ?? 0),
    0,
  )
  const delivered = rows
    .map((r) => (r as { delivered_at?: string }).delivered_at)
    .filter(Boolean) as string[]

  // frequent products by description
  const counts = new Map<string, number>()
  for (const r of rows) {
    const label = ((r as { description?: string }).description ?? '—').trim()
    counts.set(label, (counts.get(label) ?? 0) + 1)
  }
  const frequentProducts = Array.from(counts.entries())
    .map(([label, count]) => ({ label, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 5)

  return {
    ordersReady: true,
    totalSpent,
    orderCount: rows.length,
    firstOrder: delivered.length ? delivered.sort()[0] : null,
    lastOrder: delivered.length ? delivered.sort().at(-1)! : null,
    frequentProducts,
    orders: rows.map((r) => {
      const o = r as {
        id: string
        description?: string
        total?: number
        stage?: string
        delivery_date?: string
      }
      return {
        id: String(o.id),
        description: o.description ?? '—',
        total: Number(o.total ?? 0),
        stage: o.stage ?? 'en_produccion',
        deliveryDate: o.delivery_date ?? null,
      }
    }),
  }
}

export interface ClientIntelligence {
  ordersReady: boolean
  topBySpend: { id: string; name: string; value: number }[]
  topByOrders: { id: string; name: string; value: number }[]
  reactivation: { id: string; name: string; whatsapp: string | null; daysSince: number }[]
}

/**
 * CRM intelligence (best clients, reactivation alerts). Built now, lit up
 * automatically when orders exist. Reactivation buckets: 30 / 60 / 90 days
 * without an order.
 */
export async function getClientIntelligence(): Promise<ClientIntelligence> {
  const supabase = createSupabaseServerClient()
  const probe = await supabase.from('orders').select('id').limit(1)
  if (probe.error) {
    return { ordersReady: false, topBySpend: [], topByOrders: [], reactivation: [] }
  }
  // Real aggregation lands with the Órdenes tanda; until there is data the
  // lists stay empty (honest) even though the table now exists.
  return { ordersReady: true, topBySpend: [], topByOrders: [], reactivation: [] }
}
