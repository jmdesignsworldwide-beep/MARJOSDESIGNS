'use server'

import { revalidatePath } from 'next/cache'
import { requireRole } from '@/lib/auth/guards'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { logAudit } from '@/lib/auth/audit'
import { roundMoney } from '@/lib/cotizador/calc'
import {
  rescheduleSchema,
  noteSchema,
  editNoteSchema,
  occurrenceSchema,
  payReminderSchema,
} from '@/lib/validation/calendario'

export interface CalState {
  error?: string
  ok?: boolean
}

function revalidateCal() {
  revalidatePath('/calendario')
  revalidatePath('/dashboard')
}

/** Move an order's promised delivery date. Audited; reflects everywhere. */
export async function rescheduleOrder(_prev: CalState, formData: FormData): Promise<CalState> {
  const admin = await requireRole('super_admin')
  const parsed = rescheduleSchema.safeParse({ orderId: formData.get('orderId'), deliveryDate: formData.get('deliveryDate') })
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? 'Datos inválidos.' }
  const { orderId, deliveryDate } = parsed.data

  const supabase = createSupabaseServerClient()
  const { data: order } = await supabase.from('orders').select('delivery_date').eq('id', orderId).maybeSingle()
  if (!order) return { error: 'Orden no encontrada.' }

  const { error } = await supabase.from('orders').update({ delivery_date: deliveryDate }).eq('id', orderId)
  if (error) return { error: 'No se pudo reprogramar.' }

  await logAudit({ actorId: admin.id, action: 'order.reschedule', targetType: 'order', targetId: orderId, details: { from: order.delivery_date, to: deliveryDate } })
  revalidatePath('/calendario'); revalidatePath('/ordenes'); revalidatePath(`/ordenes/${orderId}`); revalidatePath('/dashboard')
  return { ok: true }
}

function noteFields(formData: FormData) {
  return {
    noteDate: formData.get('noteDate'),
    kind: formData.get('kind'),
    title: formData.get('title'),
    body: formData.get('body') ?? '',
    amount: formData.get('amount') ?? '',
    recurrence: formData.get('recurrence') || 'once',
    recurrenceEnd: formData.get('recurrenceEnd') ?? '',
  }
}

export async function createNote(_prev: CalState, formData: FormData): Promise<CalState> {
  const admin = await requireRole('super_admin')
  const parsed = noteSchema.safeParse(noteFields(formData))
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? 'Datos inválidos.' }
  const v = parsed.data

  const supabase = createSupabaseServerClient()
  const { error } = await supabase.from('calendar_notes').insert({
    note_date: v.noteDate,
    kind: v.kind,
    title: v.title,
    body: v.body || null,
    amount: v.amount != null ? roundMoney(v.amount) : null,
    recurrence: v.recurrence,
    recurrence_end: v.recurrenceEnd,
    created_by: admin.id,
  })
  if (error) return { error: 'No se pudo guardar la nota.' }
  revalidateCal()
  return { ok: true }
}

/** Edit the WHOLE series. */
export async function editNote(_prev: CalState, formData: FormData): Promise<CalState> {
  await requireRole('super_admin')
  const parsed = editNoteSchema.safeParse({ id: formData.get('id'), ...noteFields(formData) })
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? 'Datos inválidos.' }
  const v = parsed.data

  const supabase = createSupabaseServerClient()
  const { error } = await supabase
    .from('calendar_notes')
    .update({ note_date: v.noteDate, kind: v.kind, title: v.title, body: v.body || null, amount: v.amount != null ? roundMoney(v.amount) : null, recurrence: v.recurrence, recurrence_end: v.recurrenceEnd })
    .eq('id', v.id)
  if (error) return { error: 'No se pudo actualizar la nota.' }
  revalidateCal()
  return { ok: true }
}

/** Delete the WHOLE series (cascades occurrences). */
export async function deleteNote(formData: FormData): Promise<void> {
  await requireRole('super_admin')
  const id = Number(formData.get('id'))
  if (!id) return
  const supabase = createSupabaseServerClient()
  await supabase.from('calendar_notes').delete().eq('id', id)
  revalidateCal()
}

async function upsertOccurrence(patch: Record<string, unknown>, noteId: number, date: string, actorId: string) {
  const supabase = createSupabaseServerClient()
  return supabase
    .from('calendar_note_occurrences')
    .upsert({ note_id: noteId, occurrence_date: date, created_by: actorId, ...patch }, { onConflict: 'note_id,occurrence_date' })
}

/** Toggle a task/reminder occurrence as done/undone (with delight on the UI). */
export async function toggleOccurrenceDone(_prev: CalState, formData: FormData): Promise<CalState> {
  const admin = await requireRole('super_admin')
  const parsed = occurrenceSchema.safeParse({ noteId: formData.get('noteId'), occurrenceDate: formData.get('occurrenceDate') })
  if (!parsed.success) return { error: 'Datos inválidos.' }
  const done = formData.get('done') !== 'false'
  const { error } = await upsertOccurrence({ done, done_at: done ? new Date().toISOString() : null }, parsed.data.noteId, parsed.data.occurrenceDate, admin.id)
  if (error) return { error: 'No se pudo actualizar.' }
  revalidateCal()
  return { ok: true }
}

/** "Editar solo esta" — override title/amount for one occurrence of a series. */
export async function editOccurrence(_prev: CalState, formData: FormData): Promise<CalState> {
  const admin = await requireRole('super_admin')
  const parsed = occurrenceSchema.safeParse({ noteId: formData.get('noteId'), occurrenceDate: formData.get('occurrenceDate') })
  if (!parsed.success) return { error: 'Datos inválidos.' }
  const title = String(formData.get('title') ?? '').trim()
  const amountRaw = String(formData.get('amount') ?? '').trim()
  const patch: Record<string, unknown> = { override_title: title || null }
  if (amountRaw !== '') patch.override_amount = roundMoney(Number(amountRaw) || 0)
  const { error } = await upsertOccurrence(patch, parsed.data.noteId, parsed.data.occurrenceDate, admin.id)
  if (error) return { error: 'No se pudo editar.' }
  revalidateCal()
  return { ok: true }
}

/** "Eliminar solo esta" — hide a single occurrence of a series. */
export async function skipOccurrence(formData: FormData): Promise<void> {
  const admin = await requireRole('super_admin')
  const parsed = occurrenceSchema.safeParse({ noteId: formData.get('noteId'), occurrenceDate: formData.get('occurrenceDate') })
  if (!parsed.success) return
  await upsertOccurrence({ skipped: true }, parsed.data.noteId, parsed.data.occurrenceDate, admin.id)
  revalidateCal()
}

/** Mark a payment reminder occurrence PAID and register it as a Gasto (with
 *  confirmation from the UI). Reuses the expenses flow — no duplicated logic. */
export async function payReminderAsExpense(_prev: CalState, formData: FormData): Promise<CalState> {
  const admin = await requireRole('super_admin')
  const parsed = payReminderSchema.safeParse({
    noteId: formData.get('noteId'),
    occurrenceDate: formData.get('occurrenceDate'),
    amount: formData.get('amount'),
    categoryId: formData.get('categoryId'),
    method: formData.get('method'),
  })
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? 'Datos inválidos.' }
  const v = parsed.data
  const amount = roundMoney(v.amount)

  const supabase = createSupabaseServerClient()
  const { data: note } = await supabase.from('calendar_notes').select('title').eq('id', v.noteId).maybeSingle()

  // Create the expense (Gastos), then link it to the occurrence.
  const { data: exp, error: expErr } = await supabase
    .from('expenses')
    .insert({ category_id: v.categoryId, description: note?.title ?? 'Pago', amount, expense_date: v.occurrenceDate, method: v.method, created_by: admin.id })
    .select('id')
    .single()
  if (expErr || !exp) return { error: 'No se pudo registrar el gasto.' }

  const { error } = await upsertOccurrence({ done: true, done_at: new Date().toISOString(), expense_id: exp.id }, v.noteId, v.occurrenceDate, admin.id)
  if (error) return { error: 'No se pudo marcar como pagado.' }

  await logAudit({ actorId: admin.id, action: 'calendar.pay', targetType: 'calendar_note', targetId: String(v.noteId), details: { amount, date: v.occurrenceDate } })
  revalidateCal()
  revalidatePath('/gastos')
  revalidatePath('/finanzas')
  return { ok: true }
}
