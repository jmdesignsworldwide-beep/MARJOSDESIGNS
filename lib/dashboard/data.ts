import 'server-only'
import { createSupabaseServerClient } from '@/lib/supabase/server'

/**
 * Dashboard data layer.
 *
 * The modules that produce data (Órdenes, Clientes, Gastos) ship in later
 * tandas, so the `orders` table may not exist yet. This layer queries the
 * REAL tables via the RLS-respecting server client and degrades to honest
 * empty/zero results when a table isn't there — so the dashboard shows
 * elegant empty states now and fills itself in automatically once Órdenes
 * lands. No hardcoded/fake numbers, ever.
 *
 * ── Expected `orders` contract (for the future Órdenes tanda) ──────────────
 *   id            uuid primary key
 *   client_name   text            -- (or a clients FK later)
 *   description   text            -- "50 tazas sublimadas mágicas"
 *   stage         text            -- 'cotizacion' | 'en_produccion' | 'lista' |
 *                                 --   'entregada' | 'cancelada'
 *   delivery_date date
 *   total         numeric
 *   amount_paid   numeric         -- adelanto cobrado (balance = total - amount_paid)
 *   assigned_to   uuid            -- empleado responsable (RLS)
 *   created_at    timestamptz
 *   delivered_at  timestamptz
 * With RLS so employees only see their own assigned rows and never the
 * managerial aggregates.
 */

export type OrderStage =
  | 'recibida'
  | 'en_diseno'
  | 'en_produccion'
  | 'lista'
  | 'entregada'
  | 'cancelada'

export interface OrderSummary {
  id: string
  client: string
  item: string
  stage: OrderStage
  deliveryDate: string
  balance: number
  daysOverdue: number
}

export interface DayGroup {
  date: string
  label: string
  orders: OrderSummary[]
}

export interface MonthPulse {
  revenue: number
  revenuePrev: number
  completed: number
  completedPrev: number
  newClients: number
  newClientsPrev: number
}

export interface DashboardData {
  /** True once the orders table exists — flips the UI from empty to live. */
  ordersReady: boolean
  kpis: {
    today: number
    overdue: number
    inProduction: number
    receivable: number
  }
  overdue: OrderSummary[]
  today: OrderSummary[]
  week: DayGroup[]
  monthPulse: MonthPulse
}

const EMPTY: DashboardData = {
  ordersReady: false,
  kpis: { today: 0, overdue: 0, inProduction: 0, receivable: 0 },
  overdue: [],
  today: [],
  week: [],
  monthPulse: {
    revenue: 0,
    revenuePrev: 0,
    completed: 0,
    completedPrev: 0,
    newClients: 0,
    newClientsPrev: 0,
  },
}

function ymd(d: Date) {
  return d.toISOString().slice(0, 10)
}

function dayLabel(d: Date) {
  return d.toLocaleDateString('es-DO', { weekday: 'long', day: 'numeric', month: 'short' })
}

interface OrderRow {
  id: string | number
  client_name?: string | null
  description?: string | null
  stage?: string | null
  delivery_date?: string | null
  total?: number | null
  amount_paid?: number | null
  delivered_at?: string | null
}

function toSummary(row: OrderRow, today: Date): OrderSummary {
  const delivery = row.delivery_date ? new Date(row.delivery_date + 'T00:00:00') : today
  const diffDays = Math.floor((today.getTime() - delivery.getTime()) / 86_400_000)
  const balance = Math.max(0, Number(row.total ?? 0) - Number(row.amount_paid ?? 0))
  return {
    id: String(row.id),
    client: row.client_name ?? 'Cliente',
    item: row.description ?? '—',
    stage: (row.stage as OrderStage) ?? 'en_produccion',
    deliveryDate: row.delivery_date ?? ymd(today),
    balance,
    daysOverdue: diffDays > 0 ? diffDays : 0,
  }
}

const ACTIVE_STAGES = ['recibida', 'en_diseno', 'en_produccion', 'lista']

/**
 * Managerial dashboard data (super_admin only — the page guards the role).
 * Any query error (most importantly: orders table not created yet) yields
 * the honest EMPTY result rather than throwing.
 */
export async function getDashboardData(): Promise<DashboardData> {
  const supabase = createSupabaseServerClient()

  // Probe: does the orders table exist / is it readable yet?
  const probe = await supabase.from('orders').select('id').limit(1)
  if (probe.error) {
    return EMPTY // table not created yet → elegant empty states
  }

  const now = new Date()
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const todayStr = ymd(today)
  const weekEnd = new Date(today)
  weekEnd.setDate(weekEnd.getDate() + 7)

  const { data: active } = await supabase
    .from('orders')
    .select('id, client_name, description, stage, delivery_date, total, amount_paid')
    .in('stage', ACTIVE_STAGES)
    .order('delivery_date', { ascending: true })

  const rows = (active ?? []).map((r) => toSummary(r, today))

  const overdue = rows.filter((r) => r.deliveryDate < todayStr)
  const todayOrders = rows.filter((r) => r.deliveryDate === todayStr)
  const weekRows = rows.filter(
    (r) => r.deliveryDate > todayStr && r.deliveryDate <= ymd(weekEnd),
  )

  // Group "this week" by delivery day
  const byDay = new Map<string, OrderSummary[]>()
  for (const r of weekRows) {
    if (!byDay.has(r.deliveryDate)) byDay.set(r.deliveryDate, [])
    byDay.get(r.deliveryDate)!.push(r)
  }
  const week: DayGroup[] = Array.from(byDay.entries())
    .sort(([a], [b]) => (a < b ? -1 : 1))
    .map(([date, orders]) => ({
      date,
      label: dayLabel(new Date(date + 'T00:00:00')),
      orders,
    }))

  const inProduction = rows.filter(
    (r) => r.stage === 'en_diseno' || r.stage === 'en_produccion',
  ).length
  const receivable = rows.reduce((sum, r) => sum + r.balance, 0)

  // Month pulse (support block). Best-effort; missing columns just read 0.
  const monthPulse = await getMonthPulse(supabase, now)

  return {
    ordersReady: true,
    kpis: {
      today: todayOrders.length,
      overdue: overdue.length,
      inProduction,
      receivable,
    },
    overdue,
    today: todayOrders,
    week,
    monthPulse,
  }
}

async function getMonthPulse(
  supabase: ReturnType<typeof createSupabaseServerClient>,
  now: Date,
): Promise<MonthPulse> {
  const startThis = new Date(now.getFullYear(), now.getMonth(), 1)
  const startPrev = new Date(now.getFullYear(), now.getMonth() - 1, 1)

  async function monthStats(from: Date, to: Date) {
    const { data } = await supabase
      .from('orders')
      .select('total, amount_paid, stage, delivered_at')
      .gte('delivered_at', from.toISOString())
      .lt('delivered_at', to.toISOString())
      .eq('stage', 'entregada')
    const rows = (data ?? []) as OrderRow[]
    const revenue = rows.reduce((s, r) => s + Number(r.total ?? 0), 0)
    return { revenue, completed: rows.length }
  }

  try {
    const [cur, prev] = await Promise.all([
      monthStats(startThis, now),
      monthStats(startPrev, startThis),
    ])
    return {
      revenue: cur.revenue,
      revenuePrev: prev.revenue,
      completed: cur.completed,
      completedPrev: prev.completed,
      newClients: 0, // clientes module is a later tanda
      newClientsPrev: 0,
    }
  } catch {
    return EMPTY.monthPulse
  }
}
