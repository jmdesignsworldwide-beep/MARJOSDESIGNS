import 'server-only'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { createSupabaseAdminClient } from '@/lib/supabase/admin'
import { roundMoney } from '@/lib/cotizador/calc'
import type { OrderStage } from './format'

export const ATTACHMENTS_BUCKET = 'order-attachments'

export interface Payment {
  id: number
  amount: number
  method: string
  reference: string | null
  kind: 'pago' | 'reverso'
  note: string | null
  actor: string | null
  created_at: string
}

export interface StageEvent {
  id: number
  from_stage: OrderStage | null
  to_stage: OrderStage
  reason: string | null
  actor: string | null
  created_at: string
}

export interface Attachment {
  id: number
  filename: string
  mime: string | null
  size_bytes: number | null
  created_at: string
  url: string | null
}

/** Net amount paid = sum(pago) − sum(reverso), rounded to whole peso. */
export function netPaid(payments: { amount: number; kind: string }[]): number {
  const sum = payments.reduce(
    (s, p) => s + (p.kind === 'reverso' ? -Number(p.amount) : Number(p.amount)),
    0,
  )
  return roundMoney(Math.max(0, sum))
}

/** Resolve auth user ids → display names (super_admin can read profiles). */
async function resolveActors(ids: (string | null)[]): Promise<Map<string, string>> {
  const supabase = createSupabaseServerClient()
  const unique = Array.from(new Set(ids.filter(Boolean))) as string[]
  if (unique.length === 0) return new Map()
  const { data } = await supabase.from('profiles').select('id, full_name').in('id', unique)
  return new Map((data ?? []).map((p) => [p.id as string, p.full_name as string]))
}

export async function listPayments(orderId: string): Promise<Payment[]> {
  const supabase = createSupabaseServerClient()
  const { data } = await supabase
    .from('payments')
    .select('id, amount, method, reference, kind, note, created_by, created_at')
    .eq('order_id', orderId)
    .order('created_at', { ascending: true })
  const rows = data ?? []
  const actors = await resolveActors(rows.map((r) => r.created_by))
  return rows.map((r) => ({
    id: r.id,
    amount: Number(r.amount),
    method: r.method,
    reference: r.reference,
    kind: r.kind,
    note: r.note,
    actor: r.created_by ? actors.get(r.created_by) ?? null : null,
    created_at: r.created_at,
  }))
}

export async function listStageHistory(orderId: string): Promise<StageEvent[]> {
  const supabase = createSupabaseServerClient()
  const { data } = await supabase
    .from('order_stage_history')
    .select('id, from_stage, to_stage, reason, changed_by, created_at')
    .eq('order_id', orderId)
    .order('created_at', { ascending: true })
  const rows = data ?? []
  const actors = await resolveActors(rows.map((r) => r.changed_by))
  return rows.map((r) => ({
    id: r.id,
    from_stage: r.from_stage,
    to_stage: r.to_stage,
    reason: r.reason,
    actor: r.changed_by ? actors.get(r.changed_by) ?? null : null,
    created_at: r.created_at,
  }))
}

/** Attachments with SHORT-LIVED signed URLs (never public links). */
export async function listAttachments(orderId: string): Promise<Attachment[]> {
  const supabase = createSupabaseServerClient()
  const { data } = await supabase
    .from('order_attachments')
    .select('id, storage_path, filename, mime, size_bytes, created_at')
    .eq('order_id', orderId)
    .order('created_at', { ascending: false })
  const rows = data ?? []
  if (rows.length === 0) return []

  const admin = createSupabaseAdminClient()
  const paths = rows.map((r) => r.storage_path)
  const { data: signed } = await admin.storage
    .from(ATTACHMENTS_BUCKET)
    .createSignedUrls(paths, 60 * 30) // 30 min
  const urlByPath = new Map((signed ?? []).map((s) => [s.path, s.signedUrl]))

  return rows.map((r) => ({
    id: r.id,
    filename: r.filename,
    mime: r.mime,
    size_bytes: r.size_bytes,
    created_at: r.created_at,
    url: urlByPath.get(r.storage_path) ?? null,
  }))
}
