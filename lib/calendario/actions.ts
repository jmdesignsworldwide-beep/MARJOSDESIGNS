'use server'

import { revalidatePath } from 'next/cache'
import { requireRole } from '@/lib/auth/guards'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { logAudit } from '@/lib/auth/audit'
import { rescheduleSchema, noteSchema, editNoteSchema } from '@/lib/validation/calendario'

export interface CalState {
  error?: string
  ok?: boolean
}

/** Move an order's promised delivery date. Audited; reflects everywhere. */
export async function rescheduleOrder(_prev: CalState, formData: FormData): Promise<CalState> {
  const admin = await requireRole('super_admin')
  const parsed = rescheduleSchema.safeParse({
    orderId: formData.get('orderId'),
    deliveryDate: formData.get('deliveryDate'),
  })
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? 'Datos inválidos.' }
  const { orderId, deliveryDate } = parsed.data

  const supabase = createSupabaseServerClient()
  const { data: order } = await supabase.from('orders').select('delivery_date').eq('id', orderId).maybeSingle()
  if (!order) return { error: 'Orden no encontrada.' }

  const { error } = await supabase.from('orders').update({ delivery_date: deliveryDate }).eq('id', orderId)
  if (error) return { error: 'No se pudo reprogramar.' }

  await logAudit({
    actorId: admin.id,
    action: 'order.reschedule',
    targetType: 'order',
    targetId: orderId,
    details: { from: order.delivery_date, to: deliveryDate },
  })
  revalidatePath('/calendario')
  revalidatePath('/ordenes')
  revalidatePath(`/ordenes/${orderId}`)
  revalidatePath('/dashboard')
  return { ok: true }
}

export async function createNote(_prev: CalState, formData: FormData): Promise<CalState> {
  const admin = await requireRole('super_admin')
  const parsed = noteSchema.safeParse({
    noteDate: formData.get('noteDate'),
    kind: formData.get('kind'),
    title: formData.get('title'),
    body: formData.get('body') ?? '',
  })
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? 'Datos inválidos.' }
  const input = parsed.data

  const supabase = createSupabaseServerClient()
  const { error } = await supabase.from('calendar_notes').insert({
    note_date: input.noteDate,
    kind: input.kind,
    title: input.title,
    body: input.body || null,
    created_by: admin.id,
  })
  if (error) return { error: 'No se pudo guardar la nota.' }
  revalidatePath('/calendario')
  return { ok: true }
}

export async function editNote(_prev: CalState, formData: FormData): Promise<CalState> {
  await requireRole('super_admin')
  const parsed = editNoteSchema.safeParse({
    id: formData.get('id'),
    noteDate: formData.get('noteDate'),
    kind: formData.get('kind'),
    title: formData.get('title'),
    body: formData.get('body') ?? '',
  })
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? 'Datos inválidos.' }
  const input = parsed.data

  const supabase = createSupabaseServerClient()
  const { error } = await supabase
    .from('calendar_notes')
    .update({ note_date: input.noteDate, kind: input.kind, title: input.title, body: input.body || null })
    .eq('id', input.id)
  if (error) return { error: 'No se pudo actualizar la nota.' }
  revalidatePath('/calendario')
  return { ok: true }
}

/** Personal notes are Marjos's own — she may delete them (orders are NOT). */
export async function deleteNote(formData: FormData): Promise<void> {
  await requireRole('super_admin')
  const id = Number(formData.get('id'))
  if (!id) return
  const supabase = createSupabaseServerClient()
  await supabase.from('calendar_notes').delete().eq('id', id)
  revalidatePath('/calendario')
}
