'use server'

import { revalidatePath } from 'next/cache'
import { requireRole } from '@/lib/auth/guards'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { logAudit } from '@/lib/auth/audit'
import { roundMoney } from '@/lib/cotizador/calc'
import { setPayrollSchema, payWeekSchema, vacationSchema } from '@/lib/validation/nomina'

export interface NominaState {
  error?: string
  ok?: boolean
}

function todayDR() {
  return new Date(Date.now() - 4 * 60 * 60 * 1000).toISOString().slice(0, 10)
}
function revalidateNomina(profileId?: string) {
  revalidatePath('/nominas')
  if (profileId) revalidatePath(`/nominas/${profileId}`)
  revalidatePath('/gastos')
  revalidatePath('/finanzas')
}

export async function setPayroll(_prev: NominaState, formData: FormData): Promise<NominaState> {
  const admin = await requireRole('super_admin')
  const parsed = setPayrollSchema.safeParse({
    profileId: formData.get('profileId'),
    weeklySalary: formData.get('weeklySalary'),
    employmentType: formData.get('employmentType'),
  })
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? 'Datos inválidos.' }
  const v = parsed.data

  const supabase = createSupabaseServerClient()
  const { error } = await supabase
    .from('employee_payroll')
    .upsert({ profile_id: v.profileId, weekly_salary: roundMoney(v.weeklySalary), employment_type: v.employmentType, updated_by: admin.id, updated_at: new Date().toISOString() }, { onConflict: 'profile_id' })
  if (error) return { error: 'No se pudo guardar.' }
  await logAudit({ actorId: admin.id, action: 'payroll.config', targetType: 'employee', targetId: v.profileId, details: { weeklySalary: roundMoney(v.weeklySalary), type: v.employmentType } })
  revalidateNomina(v.profileId)
  return { ok: true }
}

/** Pay a week's salary. Creates a business expense (Salarios) — the nómina
 *  flows to Gastos/Finanzas once, with the payroll record linking to it. */
export async function payWeek(_prev: NominaState, formData: FormData): Promise<NominaState> {
  const admin = await requireRole('super_admin')
  const parsed = payWeekSchema.safeParse({
    profileId: formData.get('profileId'),
    weekStart: formData.get('weekStart'),
    weekEnd: formData.get('weekEnd'),
    amount: formData.get('amount'),
    deduction: formData.get('deduction') || 0,
    method: formData.get('method'),
    note: formData.get('note') ?? '',
  })
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? 'Datos inválidos.' }
  const v = parsed.data
  const amount = roundMoney(v.amount)
  const deduction = roundMoney(v.deduction)
  const net = roundMoney(amount - deduction)
  if (net <= 0) return { error: 'El neto a pagar debe ser mayor que 0.' }

  const supabase = createSupabaseServerClient()
  const { data: emp } = await supabase.from('profiles').select('full_name').eq('id', v.profileId).maybeSingle()
  const { data: cat } = await supabase.from('expense_categories').select('id').eq('name', 'Salarios / Nómina').maybeSingle()
  if (!cat) return { error: 'Falta la categoría de salarios en Gastos.' }

  // The salary expense (business) — counted once in Finanzas.
  const { data: exp, error: expErr } = await supabase
    .from('expenses')
    .insert({
      category_id: cat.id,
      description: `Nómina ${emp?.full_name ?? ''} (${v.weekStart} → ${v.weekEnd})`.trim(),
      amount: net,
      expense_date: todayDR(),
      method: v.method,
      created_by: admin.id,
    })
    .select('id')
    .single()
  if (expErr || !exp) return { error: 'No se pudo registrar el gasto de nómina.' }

  const { error } = await supabase.from('payroll_payments').insert({
    profile_id: v.profileId,
    week_start: v.weekStart,
    week_end: v.weekEnd,
    amount,
    deduction,
    net_amount: net,
    method: v.method,
    note: v.note || null,
    expense_id: exp.id,
    paid_by: admin.id,
  })
  if (error) return { error: 'No se pudo registrar el pago de nómina.' }

  await logAudit({ actorId: admin.id, action: 'payroll.pay', targetType: 'employee', targetId: v.profileId, details: { net, week: `${v.weekStart}/${v.weekEnd}`, method: v.method } })
  revalidateNomina(v.profileId)
  return { ok: true }
}

export async function addVacation(_prev: NominaState, formData: FormData): Promise<NominaState> {
  const admin = await requireRole('super_admin')
  const parsed = vacationSchema.safeParse({
    profileId: formData.get('profileId'),
    startDate: formData.get('startDate'),
    endDate: formData.get('endDate'),
    note: formData.get('note') ?? '',
  })
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? 'Datos inválidos.' }
  const v = parsed.data
  const supabase = createSupabaseServerClient()
  const { error } = await supabase.from('employee_vacations').insert({ profile_id: v.profileId, start_date: v.startDate, end_date: v.endDate, note: v.note || null, created_by: admin.id })
  if (error) return { error: 'No se pudo guardar.' }
  revalidateNomina(v.profileId)
  return { ok: true }
}

export async function deleteVacation(formData: FormData): Promise<void> {
  await requireRole('super_admin')
  const id = Number(formData.get('id'))
  const profileId = String(formData.get('profileId') ?? '')
  if (!id) return
  const supabase = createSupabaseServerClient()
  await supabase.from('employee_vacations').delete().eq('id', id)
  revalidateNomina(profileId)
}
