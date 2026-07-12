'use server'

import { revalidatePath } from 'next/cache'
import { requireRole } from '@/lib/auth/guards'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { createSupabaseAdminClient } from '@/lib/supabase/admin'
import { logAudit } from '@/lib/auth/audit'
import { recordCashMovement } from '@/lib/caja/movements'
import { netPaid, ATTACHMENTS_BUCKET } from '@/lib/ordenes/finance'
import {
  registerPaymentSchema,
  reversoSchema,
  stageValues,
  cancelSchema,
} from '@/lib/validation/pagos'

export interface ManageState {
  error?: string
  ok?: boolean
}

function revalidateOrder(id: string) {
  revalidatePath(`/ordenes/${id}`)
  revalidatePath('/ordenes')
  revalidatePath('/dashboard')
  revalidatePath('/calendario')
}

/** Recompute orders.amount_paid from the append-only payments (server truth). */
async function syncAmountPaid(orderId: string) {
  const supabase = createSupabaseServerClient()
  const { data } = await supabase.from('payments').select('amount, kind').eq('order_id', orderId)
  const paid = netPaid((data ?? []) as { amount: number; kind: string }[])
  await supabase.from('orders').update({ amount_paid: paid }).eq('id', orderId)
  return paid
}

/** Register a payment (adelanto o balance). Append-only; amount_paid is
 *  recomputed on the server so no one can forge a balance. */
export async function registerPayment(_prev: ManageState, formData: FormData): Promise<ManageState> {
  const admin = await requireRole('super_admin')
  const parsed = registerPaymentSchema.safeParse({
    orderId: formData.get('orderId'),
    amount: formData.get('amount'),
    method: formData.get('method'),
    reference: formData.get('reference') ?? '',
  })
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? 'Datos inválidos.' }
  const input = parsed.data
  const supabase = createSupabaseServerClient()

  // Duplicate-voucher guard for transfers.
  if (input.method === 'transferencia' && input.reference) {
    const { data: dup } = await supabase
      .from('payments')
      .select('id')
      .eq('order_id', input.orderId)
      .eq('reference', input.reference)
      .limit(1)
    if (dup && dup.length > 0) return { error: 'Ya existe un pago con esa referencia en esta orden.' }
  }

  const { data: inserted, error } = await supabase
    .from('payments')
    .insert({
      order_id: input.orderId,
      amount: input.amount,
      method: input.method,
      reference: input.reference || null,
      kind: 'pago',
      created_by: admin.id,
    })
    .select('id')
    .single()
  if (error || !inserted) return { error: 'No se pudo registrar el pago.' }

  const paid = await syncAmountPaid(input.orderId)

  // Cero recaptura: this payment lands in today's open caja automatically.
  const { data: ord } = await supabase
    .from('orders')
    .select('number, client_name')
    .eq('id', input.orderId)
    .maybeSingle()
  await recordCashMovement({
    source: 'order_payment',
    amount: input.amount,
    method: input.method,
    reference: input.reference || null,
    concept: ord?.number ? `Pago orden #${String(ord.number).padStart(4, '0')}` : 'Pago de orden',
    clientName: ord?.client_name ?? null,
    orderId: input.orderId,
    paymentId: inserted.id,
    createdBy: admin.id,
  })

  await logAudit({
    actorId: admin.id,
    action: 'payment.create',
    targetType: 'order',
    targetId: input.orderId,
    details: { amount: input.amount, method: input.method, totalPaid: paid },
  })
  revalidateOrder(input.orderId)
  revalidatePath('/caja')
  return { ok: true }
}

/** Correct a payment with an audited reverso (never edits/deletes history). */
export async function registerReverso(_prev: ManageState, formData: FormData): Promise<ManageState> {
  const admin = await requireRole('super_admin')
  const parsed = reversoSchema.safeParse({
    orderId: formData.get('orderId'),
    amount: formData.get('amount'),
    reason: formData.get('reason'),
  })
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? 'Datos inválidos.' }
  const input = parsed.data
  const supabase = createSupabaseServerClient()

  const { data: inserted, error } = await supabase
    .from('payments')
    .insert({
      order_id: input.orderId,
      amount: input.amount,
      method: 'efectivo',
      kind: 'reverso',
      note: input.reason,
      created_by: admin.id,
    })
    .select('id')
    .single()
  if (error || !inserted) return { error: 'No se pudo registrar la corrección.' }

  const paid = await syncAmountPaid(input.orderId)

  // Mirror the correction out of today's open caja (audited salida).
  const { data: ord } = await supabase
    .from('orders')
    .select('number, client_name')
    .eq('id', input.orderId)
    .maybeSingle()
  await recordCashMovement({
    direction: 'salida',
    source: 'order_reverso',
    amount: input.amount,
    method: 'efectivo',
    concept: ord?.number ? `Corrección orden #${String(ord.number).padStart(4, '0')}` : 'Corrección de pago',
    clientName: ord?.client_name ?? null,
    orderId: input.orderId,
    paymentId: inserted.id,
    createdBy: admin.id,
  })

  await logAudit({
    actorId: admin.id,
    action: 'payment.reverso',
    targetType: 'order',
    targetId: input.orderId,
    details: { amount: input.amount, reason: input.reason, totalPaid: paid },
  })
  revalidateOrder(input.orderId)
  revalidatePath('/caja')
  return { ok: true }
}

/** Advance/set the order stage (records from→to in the append-only history). */
export async function advanceStage(formData: FormData): Promise<void> {
  const admin = await requireRole('super_admin')
  const id = String(formData.get('orderId') ?? '')
  const to = stageValues.safeParse(formData.get('stage'))
  if (!id || !to.success) return

  const supabase = createSupabaseServerClient()
  const { data: order } = await supabase.from('orders').select('stage').eq('id', id).single()
  if (!order) return
  const from = order.stage as string
  if (from === to.data) return

  const update: Record<string, unknown> = { stage: to.data }
  if (to.data === 'entregada') update.delivered_at = new Date().toISOString()
  const { error } = await supabase.from('orders').update(update).eq('id', id)
  if (error) return

  await supabase.from('order_stage_history').insert({
    order_id: id,
    from_stage: from,
    to_stage: to.data,
    changed_by: admin.id,
  })
  await logAudit({ actorId: admin.id, action: 'order.stage', targetType: 'order', targetId: id, details: { from, to: to.data } })
  revalidateOrder(id)
}

/** Cancel an order (reason required, soft — kept in history). */
export async function cancelOrder(_prev: ManageState, formData: FormData): Promise<ManageState> {
  const admin = await requireRole('super_admin')
  const parsed = cancelSchema.safeParse({ orderId: formData.get('orderId'), reason: formData.get('reason') })
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? 'Motivo requerido.' }
  const { orderId, reason } = parsed.data

  const supabase = createSupabaseServerClient()
  const { data: order } = await supabase.from('orders').select('stage').eq('id', orderId).single()
  if (!order) return { error: 'Orden no encontrada.' }

  const { error } = await supabase.from('orders').update({ stage: 'cancelada', cancel_reason: reason }).eq('id', orderId)
  if (error) return { error: 'No se pudo cancelar.' }

  await supabase.from('order_stage_history').insert({
    order_id: orderId,
    from_stage: order.stage,
    to_stage: 'cancelada',
    reason,
    changed_by: admin.id,
  })
  await logAudit({ actorId: admin.id, action: 'order.cancel', targetType: 'order', targetId: orderId, details: { reason } })
  revalidateOrder(orderId)
  return { ok: true }
}

const ALLOWED_MIME = ['image/png', 'image/jpeg', 'image/webp', 'image/gif', 'application/pdf']
const MAX_BYTES = 10 * 1024 * 1024

/** Upload a design attachment to the PRIVATE bucket (service_role). */
export async function uploadAttachment(_prev: ManageState, formData: FormData): Promise<ManageState> {
  const actor = await requireRole('super_admin')
  const orderId = String(formData.get('orderId') ?? '')
  const file = formData.get('file')
  if (!orderId || !(file instanceof File) || file.size === 0) return { error: 'Selecciona un archivo.' }
  if (!ALLOWED_MIME.includes(file.type)) return { error: 'Tipo de archivo no permitido (imágenes o PDF).' }
  if (file.size > MAX_BYTES) return { error: 'El archivo supera 10 MB.' }

  const safeName = file.name.replace(/[^\w.\-]/g, '_').slice(0, 80)
  const path = `${orderId}/${Date.now()}-${safeName}`
  const admin = createSupabaseAdminClient()
  const { error: upErr } = await admin.storage
    .from(ATTACHMENTS_BUCKET)
    .upload(path, file, { contentType: file.type, upsert: false })
  if (upErr) return { error: 'No se pudo subir el archivo.' }

  const supabase = createSupabaseServerClient()
  const { error } = await supabase.from('order_attachments').insert({
    order_id: orderId,
    storage_path: path,
    filename: file.name.slice(0, 200),
    mime: file.type,
    size_bytes: file.size,
    uploaded_by: actor.id,
  })
  if (error) {
    await admin.storage.from(ATTACHMENTS_BUCKET).remove([path])
    return { error: 'No se pudo guardar el adjunto.' }
  }

  await logAudit({ actorId: actor.id, action: 'order.attach', targetType: 'order', targetId: orderId, details: { filename: file.name } })
  revalidatePath(`/ordenes/${orderId}`)
  return { ok: true }
}

/** Remove an attachment (super_admin, audited). */
export async function deleteAttachment(formData: FormData): Promise<void> {
  const actor = await requireRole('super_admin')
  const id = Number(formData.get('id'))
  const orderId = String(formData.get('orderId') ?? '')
  if (!id || !orderId) return

  const supabase = createSupabaseServerClient()
  const { data: row } = await supabase.from('order_attachments').select('storage_path').eq('id', id).single()
  if (!row) return

  const admin = createSupabaseAdminClient()
  await admin.storage.from(ATTACHMENTS_BUCKET).remove([row.storage_path])
  await supabase.from('order_attachments').delete().eq('id', id)
  await logAudit({ actorId: actor.id, action: 'order.attach.delete', targetType: 'order', targetId: orderId })
  revalidatePath(`/ordenes/${orderId}`)
}
