import 'server-only'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { createSupabaseAdminClient } from '@/lib/supabase/admin'
import { roundMoney } from '@/lib/cotizador/calc'
import type {
  Expense,
  ExpenseCategory,
  ExpenseFilters,
  ExpenseGroup,
  ExpensesOverview,
  ReceiptItemRow,
  RecurringReminder,
} from './types'
import { groupMeta } from './types'

export const RECEIPTS_BUCKET = 'expense-receipts'

/** Current month YYYY-MM in DR time (UTC-4). */
export function monthKeyDR(): string {
  const dr = new Date(Date.now() - 4 * 60 * 60 * 1000)
  return dr.toISOString().slice(0, 7)
}
export function todayDR(): string {
  const dr = new Date(Date.now() - 4 * 60 * 60 * 1000)
  return dr.toISOString().slice(0, 10)
}
/** Shift a YYYY-MM key by whole months. */
export function shiftMonth(key: string, delta: number): string {
  const [y, m] = key.split('-').map(Number)
  const d = new Date(Date.UTC(y, m - 1 + delta, 1))
  return d.toISOString().slice(0, 7)
}

export async function listCategories(includeInactive = false): Promise<ExpenseCategory[]> {
  const supabase = createSupabaseServerClient()
  let q = supabase
    .from('expense_categories')
    .select('id, name, grp, status, is_system')
    .order('grp', { ascending: true })
    .order('position', { ascending: true })
    .order('name', { ascending: true })
  if (!includeInactive) q = q.eq('status', 'activo')
  const { data } = await q
  return (data as ExpenseCategory[]) ?? []
}

const EXPENSE_COLS =
  'id, category_id, description, amount, expense_date, method, vendor, notes, is_recurring, receipt_path, receipt_read, receipt_total, status, void_reason, created_at, expense_categories(name, grp)'

async function signReceipts(paths: (string | null)[]): Promise<Map<string, string>> {
  const real = paths.filter(Boolean) as string[]
  if (real.length === 0) return new Map()
  const admin = createSupabaseAdminClient()
  const { data } = await admin.storage.from(RECEIPTS_BUCKET).createSignedUrls(real, 60 * 30)
  const map = new Map<string, string>()
  for (const s of data ?? []) {
    if (s.path && s.signedUrl) map.set(s.path, s.signedUrl)
  }
  return map
}

export async function listExpenses(filters?: ExpenseFilters): Promise<Expense[]> {
  const supabase = createSupabaseServerClient()
  let q = supabase.from('expenses').select(EXPENSE_COLS).order('expense_date', { ascending: false }).order('id', { ascending: false }).limit(500)

  if (filters?.categoryId) q = q.eq('category_id', filters.categoryId)
  if (filters?.method) q = q.eq('method', filters.method)
  if (filters?.from) q = q.gte('expense_date', filters.from)
  if (filters?.to) q = q.lte('expense_date', filters.to)

  const { data } = await q
  let rows = (data ?? []) as Record<string, unknown>[]

  if (filters?.group) {
    rows = rows.filter((r) => (r.expense_categories as { grp: string } | null)?.grp === filters.group)
  }

  const signed = await signReceipts(rows.map((r) => (r.receipt_path as string) ?? null))

  // Count transcribed receipt lines per expense (to show "Ver detalle" only
  // when there is something to show — the items load on demand).
  const counts = new Map<number, number>()
  const ids = rows.map((r) => r.id as number)
  if (ids.length > 0) {
    const { data: itemRows } = await supabase
      .from('expense_receipt_items')
      .select('expense_id')
      .in('expense_id', ids)
    for (const it of (itemRows ?? []) as { expense_id: number }[]) {
      counts.set(it.expense_id, (counts.get(it.expense_id) ?? 0) + 1)
    }
  }

  return rows.map((r) => {
    const cat = r.expense_categories as { name: string; grp: ExpenseGroup } | null
    const path = (r.receipt_path as string) ?? null
    const id = r.id as number
    return {
      id,
      category_id: r.category_id as string,
      category_name: cat?.name ?? null,
      grp: cat?.grp ?? null,
      description: r.description as string,
      amount: Number(r.amount),
      expense_date: r.expense_date as string,
      method: r.method as Expense['method'],
      vendor: (r.vendor as string) ?? null,
      notes: (r.notes as string) ?? null,
      is_recurring: r.is_recurring as boolean,
      receipt_url: path ? signed.get(path) ?? null : null,
      receipt_read: (r.receipt_read as boolean) ?? false,
      receipt_total: r.receipt_total != null ? Number(r.receipt_total) : null,
      receipt_item_count: counts.get(id) ?? 0,
      status: r.status as Expense['status'],
      void_reason: (r.void_reason as string) ?? null,
      created_at: r.created_at as string,
    }
  })
}

/** Transcribed lines of one receipt (loaded on demand behind "Ver detalle"). */
export async function getReceiptItems(expenseId: number): Promise<ReceiptItemRow[]> {
  const supabase = createSupabaseServerClient()
  const { data } = await supabase
    .from('expense_receipt_items')
    .select('id, name, quantity, unit_price, line_total')
    .eq('expense_id', expenseId)
    .order('position', { ascending: true })
  return ((data ?? []) as { id: number; name: string; quantity: number | null; unit_price: number | null; line_total: number | null }[]).map((r) => ({
    id: r.id,
    name: r.name,
    quantity: r.quantity != null ? Number(r.quantity) : null,
    unit_price: r.unit_price != null ? Number(r.unit_price) : null,
    line_total: r.line_total != null ? Number(r.line_total) : null,
  }))
}

export async function getExpenseReceiptPath(id: number): Promise<string | null> {
  const supabase = createSupabaseServerClient()
  const { data } = await supabase.from('expenses').select('receipt_path').eq('id', id).maybeSingle()
  return (data?.receipt_path as string) ?? null
}

/** Totals for the KPI header + charts. Only active (non-voided) expenses. */
export async function getOverview(): Promise<ExpensesOverview> {
  const supabase = createSupabaseServerClient()
  const thisMonth = monthKeyDR()
  const prevMonth = shiftMonth(thisMonth, -1)
  const sixAgo = shiftMonth(thisMonth, -5)

  const { data } = await supabase
    .from('expenses')
    .select('amount, expense_date, category_id, expense_categories(name, grp)')
    .eq('status', 'activo')
    .gte('expense_date', `${sixAgo}-01`)

  const rows = (data ?? []) as unknown as {
    amount: number
    expense_date: string
    category_id: string
    expense_categories: { name: string; grp: ExpenseGroup } | null
  }[]

  const byGroup: Record<ExpenseGroup, number> = { produccion: 0, negocio: 0, personal: 0 }
  const catMap = new Map<string, { name: string; grp: ExpenseGroup; total: number; prevTotal: number }>()
  const monthMap = new Map<string, number>()
  for (let i = 5; i >= 0; i--) monthMap.set(shiftMonth(thisMonth, -i), 0)

  let thisMonthTotal = 0
  let prevMonthTotal = 0

  for (const r of rows) {
    const mk = r.expense_date.slice(0, 7)
    const amt = Number(r.amount)
    if (monthMap.has(mk)) monthMap.set(mk, monthMap.get(mk)! + amt)
    const grp = r.expense_categories?.grp ?? 'negocio'
    const key = r.category_id
    const name = r.expense_categories?.name ?? 'Sin subcategoría'
    if (mk === thisMonth) {
      thisMonthTotal += amt
      byGroup[grp] += amt
      const prev = catMap.get(key)
      catMap.set(key, { name, grp, total: (prev?.total ?? 0) + amt, prevTotal: prev?.prevTotal ?? 0 })
    }
    if (mk === prevMonth) {
      prevMonthTotal += amt
      const prev = catMap.get(key)
      catMap.set(key, { name, grp, total: prev?.total ?? 0, prevTotal: (prev?.prevTotal ?? 0) + amt })
    }
  }

  const byCategory = Array.from(catMap.entries())
    .map(([categoryId, v]) => ({ categoryId, name: v.name, grp: v.grp, total: roundMoney(v.total), prevTotal: roundMoney(v.prevTotal) }))
    .filter((c) => c.total > 0) // solo lo que tiene gasto este mes
    .sort((a, b) => b.total - a.total)

  const byMonth = Array.from(monthMap.entries()).map(([month, total]) => ({ month, total: roundMoney(total) }))

  return {
    thisMonthTotal: roundMoney(thisMonthTotal),
    prevMonthTotal: roundMoney(prevMonthTotal),
    byGroup: {
      produccion: roundMoney(byGroup.produccion),
      negocio: roundMoney(byGroup.negocio),
      personal: roundMoney(byGroup.personal),
    },
    byCategory,
    byMonth,
    topCategory: byCategory[0] ? { name: byCategory[0].name, total: byCategory[0].total } : null,
    insights: buildInsights(byCategory),
  }
}

/** Turn the per-subcategory numbers into plain-Spanish insights for Marjos. */
function buildInsights(
  byCategory: { name: string; grp: ExpenseGroup; total: number; prevTotal: number }[],
): string[] {
  const out: string[] = []
  const personal = byCategory.filter((c) => c.grp === 'personal')
  const topPersonal = personal[0]
  if (topPersonal) {
    out.push(`Tu mayor gasto personal este mes fue ${topPersonal.name.toLowerCase()} (${formatMoney(topPersonal.total)}).`)
  }
  // Biggest month-over-month jump (needs a prior-month base to be meaningful).
  const jumps = byCategory
    .filter((c) => c.prevTotal > 0)
    .map((c) => ({ ...c, pct: Math.round(((c.total - c.prevTotal) / c.prevTotal) * 100) }))
    .filter((c) => Math.abs(c.pct) >= 15)
    .sort((a, b) => Math.abs(b.pct) - Math.abs(a.pct))
  const jump = jumps[0]
  if (jump) {
    out.push(
      jump.pct > 0
        ? `Gastaste ${jump.pct}% más en ${jump.name.toLowerCase()} que el mes pasado — quizás busca mejor precio.`
        : `Bajaste ${Math.abs(jump.pct)}% en ${jump.name.toLowerCase()} vs el mes pasado. ¡Bien ahí!`,
    )
  }
  return out.slice(0, 3)
}

function formatMoney(n: number): string {
  return `RD$${Math.round(n).toLocaleString('es-DO')}`
}

/** Recurring fixed expenses not yet registered this month (soft reminder). */
export async function getRecurringReminders(): Promise<RecurringReminder[]> {
  const supabase = createSupabaseServerClient()
  const thisMonth = monthKeyDR()
  const { data } = await supabase
    .from('expenses')
    .select('category_id, description, method, amount, vendor, expense_date, expense_categories(name, grp)')
    .eq('is_recurring', true)
    .eq('status', 'activo')
    .order('expense_date', { ascending: false })

  const rows = (data ?? []) as unknown as {
    category_id: string
    description: string
    method: RecurringReminder['method']
    amount: number
    vendor: string | null
    expense_date: string
    expense_categories: { name: string; grp: ExpenseGroup } | null
  }[]

  const latest = new Map<string, (typeof rows)[number]>()
  const registeredThisMonth = new Set<string>()
  for (const r of rows) {
    const key = `${r.category_id}::${r.description.toLowerCase()}`
    if (!latest.has(key)) latest.set(key, r) // rows are date-desc → first is latest
    if (r.expense_date.slice(0, 7) === thisMonth) registeredThisMonth.add(key)
  }

  const reminders: RecurringReminder[] = []
  for (const [key, r] of Array.from(latest.entries())) {
    if (registeredThisMonth.has(key)) continue // already logged this month
    reminders.push({
      categoryId: r.category_id,
      categoryName: r.expense_categories?.name ?? 'Gasto fijo',
      grp: r.expense_categories?.grp ?? 'negocio',
      description: r.description,
      method: r.method,
      lastAmount: roundMoney(Number(r.amount)),
      vendor: r.vendor,
    })
  }
  return reminders
}
