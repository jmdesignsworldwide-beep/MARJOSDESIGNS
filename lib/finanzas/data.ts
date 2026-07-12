import 'server-only'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { roundMoney } from '@/lib/cotizador/calc'
import type {
  FinanceSummary,
  LedgerEntry,
  LedgerFilters,
  MonthPoint,
  ProductMargin,
  Receivable,
  TopClient,
} from './types'

// ── date helpers (DR = UTC-4, no DST) ──────────────────────────────────────
export function monthKeyDR(): string {
  return new Date(Date.now() - 4 * 60 * 60 * 1000).toISOString().slice(0, 7)
}
export function todayDR(): string {
  return new Date(Date.now() - 4 * 60 * 60 * 1000).toISOString().slice(0, 10)
}
export function shiftMonth(key: string, delta: number): string {
  const [y, m] = key.split('-').map(Number)
  return new Date(Date.UTC(y, m - 1 + delta, 1)).toISOString().slice(0, 7)
}
/** DR-local instant for a YYYY-MM-DD date at 00:00 → UTC ISO (add 4h). */
function drStartUTC(date: string): string {
  return `${date}T04:00:00.000Z`
}
function addDays(date: string, days: number): string {
  const d = new Date(date + 'T00:00:00.000Z')
  d.setUTCDate(d.getUTCDate() + days)
  return d.toISOString().slice(0, 10)
}
function monthDateBounds(monthKey: string): { from: string; toNext: string } {
  return { from: `${monthKey}-01`, toNext: `${shiftMonth(monthKey, 1)}-01` }
}

// ── income / expenses primitives ───────────────────────────────────────────
async function incomeBetween(fromUTC: string, toUTC: string): Promise<number> {
  const supabase = createSupabaseServerClient()
  const [{ data: pays }, { data: sales }] = await Promise.all([
    supabase.from('payments').select('amount, kind').gte('created_at', fromUTC).lt('created_at', toUTC),
    supabase.from('pos_sales').select('total').eq('status', 'completada').gte('created_at', fromUTC).lt('created_at', toUTC),
  ])
  const payNet = (pays ?? []).reduce((s, p) => s + (p.kind === 'reverso' ? -Number(p.amount) : Number(p.amount)), 0)
  const posSum = (sales ?? []).reduce((s, r) => s + Number(r.total), 0)
  return roundMoney(payNet + posSum)
}

async function expensesByGroupBetween(
  fromDate: string,
  toNextDate: string,
): Promise<{ produccion: number; negocio: number; personal: number }> {
  const supabase = createSupabaseServerClient()
  const { data } = await supabase
    .from('expenses')
    .select('amount, expense_categories(grp)')
    .eq('status', 'activo')
    .gte('expense_date', fromDate)
    .lt('expense_date', toNextDate)
  const acc = { produccion: 0, negocio: 0, personal: 0 }
  for (const r of (data ?? []) as unknown as { amount: number; expense_categories: { grp: keyof typeof acc } | null }[]) {
    const g = r.expense_categories?.grp ?? 'negocio'
    acc[g] += Number(r.amount)
  }
  return { produccion: roundMoney(acc.produccion), negocio: roundMoney(acc.negocio), personal: roundMoney(acc.personal) }
}

export async function getSummary(monthKey: string): Promise<FinanceSummary> {
  const prev = shiftMonth(monthKey, -1)
  const cur = monthDateBounds(monthKey)
  const pre = monthDateBounds(prev)

  const [income, prevIncome, exp, prevExp] = await Promise.all([
    incomeBetween(drStartUTC(cur.from), drStartUTC(cur.toNext)),
    incomeBetween(drStartUTC(pre.from), drStartUTC(pre.toNext)),
    expensesByGroupBetween(cur.from, cur.toNext),
    expensesByGroupBetween(pre.from, pre.toNext),
  ])

  const expBusiness = roundMoney(exp.produccion + exp.negocio)
  const utilidadNegocio = roundMoney(income - expBusiness)
  const utilidadTotal = roundMoney(income - expBusiness - exp.personal)
  const prevBusiness = roundMoney(prevExp.produccion + prevExp.negocio)
  const prevUtilidadNegocio = roundMoney(prevIncome - prevBusiness)

  const pct = (now: number, before: number): number | null =>
    before > 0 ? Math.round(((now - before) / before) * 100) : now > 0 ? null : 0

  return {
    income,
    expProduccion: exp.produccion,
    expNegocio: exp.negocio,
    expPersonal: exp.personal,
    expBusiness,
    utilidadNegocio,
    utilidadTotal,
    marginNegocio: income > 0 ? Math.round((utilidadNegocio / income) * 100) : 0,
    prevIncome,
    prevUtilidadNegocio,
    incomeDeltaPct: pct(income, prevIncome),
    utilidadDeltaPct: pct(utilidadNegocio, prevUtilidadNegocio),
  }
}

// ── unified ledger ─────────────────────────────────────────────────────────
export async function getLedger(filters: LedgerFilters, from: string, to: string): Promise<LedgerEntry[]> {
  const supabase = createSupabaseServerClient()
  const fromUTC = drStartUTC(from)
  const toUTC = drStartUTC(addDays(to, 1))

  const [{ data: pays }, { data: sales }, { data: exps }] = await Promise.all([
    supabase
      .from('payments')
      .select('id, amount, method, kind, created_at, order_id, orders(number, client_name)')
      .gte('created_at', fromUTC)
      .lt('created_at', toUTC),
    supabase
      .from('pos_sales')
      .select('id, number, total, method, client_name, created_at')
      .eq('status', 'completada')
      .gte('created_at', fromUTC)
      .lt('created_at', toUTC),
    supabase
      .from('expenses')
      .select('id, description, amount, method, expense_date, expense_categories(name, grp)')
      .eq('status', 'activo')
      .gte('expense_date', from)
      .lt('expense_date', addDays(to, 1)),
  ])

  const entries: LedgerEntry[] = []

  for (const p of (pays ?? []) as unknown as {
    id: number; amount: number; method: string; kind: string; created_at: string; order_id: string | null
    orders: { number: number; client_name: string | null } | null
  }[]) {
    const num = p.orders?.number ? `#${String(p.orders.number).padStart(4, '0')}` : ''
    const who = p.orders?.client_name ? ` — ${p.orders.client_name}` : ''
    entries.push({
      id: `pay-${p.id}`,
      date: p.created_at,
      concept: p.kind === 'reverso' ? `Corrección orden ${num}` : `Pago orden ${num}${who}`,
      type: p.kind === 'reverso' ? 'salida' : 'entrada',
      bucket: 'ingreso',
      amount: roundMoney(Number(p.amount)),
      method: p.method,
      href: p.order_id ? `/ordenes/${p.order_id}` : null,
      origin: 'orden',
    })
  }

  for (const s of (sales ?? []) as unknown as {
    id: string; number: number; total: number; method: string; client_name: string | null; created_at: string
  }[]) {
    entries.push({
      id: `pos-${s.id}`,
      date: s.created_at,
      concept: `Venta POS-${String(s.number).padStart(4, '0')}${s.client_name ? ` — ${s.client_name}` : ''}`,
      type: 'entrada',
      bucket: 'ingreso',
      amount: roundMoney(Number(s.total)),
      method: s.method,
      href: '/pos/historial',
      origin: 'venta',
    })
  }

  for (const e of (exps ?? []) as unknown as {
    id: number; description: string; amount: number; method: string; expense_date: string
    expense_categories: { name: string; grp: 'produccion' | 'negocio' | 'personal' } | null
  }[]) {
    entries.push({
      id: `exp-${e.id}`,
      date: `${e.expense_date}T12:00:00.000Z`,
      concept: e.description,
      type: 'salida',
      bucket: e.expense_categories?.grp ?? 'negocio',
      amount: roundMoney(Number(e.amount)),
      method: e.method,
      href: '/gastos',
      origin: 'gasto',
    })
  }

  let out = entries.sort((a, b) => (a.date < b.date ? 1 : -1))

  if (filters.type) out = out.filter((e) => e.type === filters.type)
  if (filters.bucket) out = out.filter((e) => e.bucket === filters.bucket)
  if (filters.method) out = out.filter((e) => e.method === filters.method)
  if (filters.q) {
    const q = filters.q.toLowerCase()
    out = out.filter((e) => e.concept.toLowerCase().includes(q) || String(e.amount).includes(q))
  }
  return out.slice(0, 400)
}

// ── monthly trend ──────────────────────────────────────────────────────────
export async function getMonthlySeries(n = 6): Promise<MonthPoint[]> {
  const cur = monthKeyDR()
  const keys = Array.from({ length: n }, (_, i) => shiftMonth(cur, -(n - 1 - i)))
  const points = await Promise.all(
    keys.map(async (mk) => {
      const b = monthDateBounds(mk)
      const [income, exp] = await Promise.all([
        incomeBetween(drStartUTC(b.from), drStartUTC(b.toNext)),
        expensesByGroupBetween(b.from, b.toNext),
      ])
      const expenses = roundMoney(exp.produccion + exp.negocio)
      return { month: mk, income, expenses, utilidad: roundMoney(income - expenses) }
    }),
  )
  return points
}

// ── product margins + revenue ──────────────────────────────────────────────
export async function getProductMargins(): Promise<ProductMargin[]> {
  const supabase = createSupabaseServerClient()
  const [{ data: products }, { data: oItems }, { data: pItems }] = await Promise.all([
    supabase.from('products').select('id, name, unit_label, base_price, unit_cost'),
    supabase.from('order_items').select('product_id, subtotal, quantity'),
    supabase.from('pos_sale_items').select('product_id, subtotal, quantity'),
  ])

  const billed = new Map<string, { revenue: number; units: number }>()
  const bump = (pid: string | null, sub: number, qty: number | null) => {
    if (!pid) return
    const cur = billed.get(pid) ?? { revenue: 0, units: 0 }
    cur.revenue += Number(sub)
    cur.units += Number(qty ?? 0)
    billed.set(pid, cur)
  }
  for (const it of oItems ?? []) bump(it.product_id as string | null, it.subtotal as number, it.quantity as number | null)
  for (const it of pItems ?? []) bump(it.product_id as string | null, it.subtotal as number, it.quantity as number | null)

  return ((products ?? []) as { id: string; name: string; unit_label: string; base_price: number; unit_cost: number | null }[])
    .map((p) => {
      const b = billed.get(p.id)
      const marginPct =
        p.unit_cost != null && Number(p.base_price) > 0
          ? Math.round(((Number(p.base_price) - Number(p.unit_cost)) / Number(p.base_price)) * 100)
          : null
      return {
        productId: p.id,
        name: p.name,
        unitLabel: p.unit_label,
        basePrice: roundMoney(Number(p.base_price)),
        unitCost: p.unit_cost != null ? roundMoney(Number(p.unit_cost)) : null,
        marginPct,
        billed: roundMoney(b?.revenue ?? 0),
        unitsSold: Math.round(b?.units ?? 0),
      }
    })
    .filter((p) => p.billed > 0 || p.unitCost != null)
    .sort((a, b) => b.billed - a.billed)
}

// ── top clients (from CRM orders) ──────────────────────────────────────────
export async function getTopClients(limit = 5): Promise<TopClient[]> {
  const supabase = createSupabaseServerClient()
  const { data } = await supabase.from('orders').select('client_id, client_name, amount_paid').neq('stage', 'cancelada')
  const map = new Map<string, { name: string; total: number }>()
  for (const o of (data ?? []) as { client_id: string | null; client_name: string | null; amount_paid: number }[]) {
    const key = o.client_id ?? `name:${o.client_name ?? '—'}`
    const cur = map.get(key) ?? { name: o.client_name ?? 'Sin cliente', total: 0 }
    cur.total += Number(o.amount_paid)
    map.set(key, cur)
  }
  return Array.from(map.entries())
    .map(([key, v]) => ({ clientId: key.startsWith('name:') ? null : key, name: v.name, total: roundMoney(v.total) }))
    .filter((c) => c.total > 0)
    .sort((a, b) => b.total - a.total)
    .slice(0, limit)
}

// ── receivables (balances still owed) ──────────────────────────────────────
export async function getReceivables(): Promise<{ total: number; rows: Receivable[] }> {
  const supabase = createSupabaseServerClient()
  const { data } = await supabase
    .from('orders')
    .select('id, number, client_id, client_name, total, amount_paid, stage')
    .neq('stage', 'cancelada')
  const owed = ((data ?? []) as {
    id: string; number: number; client_id: string | null; client_name: string | null; total: number; amount_paid: number
  }[])
    .map((o) => ({ ...o, balance: roundMoney(Number(o.total) - Number(o.amount_paid)) }))
    .filter((o) => o.balance > 0)

  const clientIds = Array.from(new Set(owed.map((o) => o.client_id).filter(Boolean))) as string[]
  const phones = new Map<string, string | null>()
  if (clientIds.length) {
    const { data: cs } = await supabase.from('clients').select('id, whatsapp, phone').in('id', clientIds)
    for (const c of cs ?? []) phones.set(c.id as string, ((c.whatsapp as string) || (c.phone as string)) ?? null)
  }

  const rows: Receivable[] = owed
    .map((o) => ({
      orderId: o.id,
      number: o.number,
      clientName: o.client_name,
      whatsapp: o.client_id ? phones.get(o.client_id) ?? null : null,
      balance: o.balance,
    }))
    .sort((a, b) => b.balance - a.balance)

  return { total: roundMoney(rows.reduce((s, r) => s + r.balance, 0)), rows }
}
