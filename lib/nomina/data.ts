import 'server-only'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { roundMoney } from '@/lib/cotizador/calc'
import { activityLabel, type EmployeePayroll, type PayrollPayment, type VacationRow, type ActivityRow, type PayrollReportRow } from './types'

export function monthKeyDR(): string {
  return new Date(Date.now() - 4 * 60 * 60 * 1000).toISOString().slice(0, 7)
}
export function todayDR(): string {
  return new Date(Date.now() - 4 * 60 * 60 * 1000).toISOString().slice(0, 10)
}
function shiftMonth(key: string, d: number): string {
  const [y, m] = key.split('-').map(Number)
  return new Date(Date.UTC(y, m - 1 + d, 1)).toISOString().slice(0, 7)
}
function monthUTCBounds(monthKey: string) {
  return { from: `${monthKey}-01T04:00:00.000Z`, to: `${shiftMonth(monthKey, 1)}-01T04:00:00.000Z` }
}

export async function listEmployeesWithPayroll(): Promise<EmployeePayroll[]> {
  const supabase = createSupabaseServerClient()
  const month = monthUTCBounds(monthKeyDR())

  const [{ data: profiles }, { data: payroll }, { data: orders }, { data: pays }] = await Promise.all([
    supabase.from('profiles').select('id, full_name, position, status, role, hire_date').eq('role', 'empleado').order('full_name'),
    supabase.from('employee_payroll').select('profile_id, weekly_salary, employment_type'),
    supabase.from('orders').select('assigned_to, stage').not('stage', 'in', '(entregada,cancelada)'),
    supabase.from('payroll_payments').select('profile_id, net_amount').gte('created_at', month.from).lt('created_at', month.to),
  ])

  const cfg = new Map((payroll ?? []).map((p) => [p.profile_id as string, p]))
  const load = new Map<string, number>()
  for (const o of (orders ?? []) as { assigned_to: string | null }[]) if (o.assigned_to) load.set(o.assigned_to, (load.get(o.assigned_to) ?? 0) + 1)
  const paid = new Map<string, number>()
  for (const p of (pays ?? []) as { profile_id: string; net_amount: number }[]) paid.set(p.profile_id, (paid.get(p.profile_id) ?? 0) + Number(p.net_amount))

  return ((profiles ?? []) as { id: string; full_name: string; position: string | null; status: 'activo' | 'inactivo'; role: 'empleado'; hire_date: string | null }[]).map((p) => {
    const c = cfg.get(p.id) as { weekly_salary: number; employment_type: 'fijo' | 'pasante' } | undefined
    return {
      profileId: p.id,
      fullName: p.full_name,
      position: p.position,
      status: p.status,
      role: p.role,
      hireDate: p.hire_date,
      weeklySalary: c ? roundMoney(Number(c.weekly_salary)) : 0,
      employmentType: c?.employment_type ?? 'fijo',
      activeOrders: load.get(p.id) ?? 0,
      paidThisMonth: roundMoney(paid.get(p.id) ?? 0),
    }
  })
}

export async function getEmployeeName(profileId: string): Promise<string | null> {
  const supabase = createSupabaseServerClient()
  const { data } = await supabase.from('profiles').select('full_name').eq('id', profileId).maybeSingle()
  return (data?.full_name as string) ?? null
}

export async function getPayrollPayments(profileId: string): Promise<PayrollPayment[]> {
  const supabase = createSupabaseServerClient()
  const { data } = await supabase
    .from('payroll_payments')
    .select('id, week_start, week_end, amount, deduction, net_amount, method, note, paid_by, created_at')
    .eq('profile_id', profileId)
    .order('week_start', { ascending: false })
  const rows = (data ?? []) as { id: number; week_start: string; week_end: string; amount: number; deduction: number; net_amount: number; method: string; note: string | null; paid_by: string | null; created_at: string }[]
  const actorIds = Array.from(new Set(rows.map((r) => r.paid_by).filter(Boolean))) as string[]
  const names = new Map<string, string>()
  if (actorIds.length) {
    const { data: ps } = await supabase.from('profiles').select('id, full_name').in('id', actorIds)
    for (const p of ps ?? []) names.set(p.id as string, p.full_name as string)
  }
  return rows.map((r) => ({
    id: r.id,
    weekStart: r.week_start,
    weekEnd: r.week_end,
    amount: roundMoney(Number(r.amount)),
    deduction: roundMoney(Number(r.deduction)),
    netAmount: roundMoney(Number(r.net_amount)),
    method: r.method,
    note: r.note,
    actor: r.paid_by ? names.get(r.paid_by) ?? null : null,
    createdAt: r.created_at,
  }))
}

export async function getVacations(profileId: string): Promise<VacationRow[]> {
  const supabase = createSupabaseServerClient()
  const { data } = await supabase.from('employee_vacations').select('id, start_date, end_date, note').eq('profile_id', profileId).order('start_date', { ascending: false })
  return ((data ?? []) as { id: number; start_date: string; end_date: string; note: string | null }[]).map((v) => ({ id: v.id, startDate: v.start_date, endDate: v.end_date, note: v.note }))
}

/** Inviolable activity feed, derived from audit_log (append-only). */
export async function getEmployeeActivity(profileId: string, limit = 40): Promise<ActivityRow[]> {
  const supabase = createSupabaseServerClient()
  const { data } = await supabase
    .from('audit_log')
    .select('id, action, target_type, target_id, created_at')
    .eq('actor_id', profileId)
    .order('created_at', { ascending: false })
    .limit(limit)
  const rows = (data ?? []) as { id: number; action: string; target_type: string | null; target_id: string | null; created_at: string }[]

  const orderIds = Array.from(new Set(rows.filter((r) => r.target_type === 'order' && r.target_id).map((r) => r.target_id))) as string[]
  const numbers = new Map<string, number>()
  if (orderIds.length) {
    const { data: os } = await supabase.from('orders').select('id, number').in('id', orderIds)
    for (const o of os ?? []) numbers.set(o.id as string, o.number as number)
  }
  return rows.map((r) => ({
    id: r.id,
    action: r.action,
    label: activityLabel[r.action] ?? r.action,
    orderId: r.target_type === 'order' ? r.target_id : null,
    orderNumber: r.target_type === 'order' && r.target_id ? numbers.get(r.target_id) ?? null : null,
    createdAt: r.created_at,
  }))
}

export async function getPayrollReport(monthKey: string): Promise<{ total: number; count: number; rows: PayrollReportRow[] }> {
  const supabase = createSupabaseServerClient()
  const b = monthUTCBounds(monthKey)
  const { data } = await supabase.from('payroll_payments').select('profile_id, net_amount, profiles(full_name)').gte('created_at', b.from).lt('created_at', b.to)
  const rows = (data ?? []) as unknown as { profile_id: string; net_amount: number; profiles: { full_name: string } | null }[]
  const map = new Map<string, { name: string; total: number; count: number }>()
  let total = 0
  for (const r of rows) {
    total += Number(r.net_amount)
    const cur = map.get(r.profile_id) ?? { name: r.profiles?.full_name ?? '—', total: 0, count: 0 }
    cur.total += Number(r.net_amount)
    cur.count += 1
    map.set(r.profile_id, cur)
  }
  return {
    total: roundMoney(total),
    count: rows.length,
    rows: Array.from(map.entries()).map(([profileId, v]) => ({ profileId, fullName: v.name, total: roundMoney(v.total), count: v.count })).sort((a, b) => b.total - a.total),
  }
}
