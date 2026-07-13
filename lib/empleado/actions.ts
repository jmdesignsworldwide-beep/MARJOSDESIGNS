'use server'

import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { requireAuth } from '@/lib/auth/guards'
import { createSupabaseAdminClient } from '@/lib/supabase/admin'
import { logAudit } from '@/lib/auth/audit'

export interface EmpState {
  error?: string
  ok?: boolean
}

const schema = z.object({
  orderId: z.string().uuid(),
  stage: z.enum(['en_diseno', 'en_produccion', 'lista']),
})

/**
 * Employee advances ONE of their own orders. Security model:
 *  - requireAuth() verifies the session and gives the caller's own id/role —
 *    it cannot be spoofed by the client.
 *  - We confirm the order is assigned to that id and the target stage is one
 *    of the allowed employee stages, then write with the service_role.
 * Employees have NO direct UPDATE on orders (RLS super_admin-only), so this
 * server action is the only path — and it is gated by ownership.
 */
export async function employeeAdvanceStage(_prev: EmpState, formData: FormData): Promise<EmpState> {
  const me = await requireAuth()
  if (me.role !== 'empleado' || me.status !== 'activo') return { error: 'No autorizado.' }

  const parsed = schema.safeParse({ orderId: formData.get('orderId'), stage: formData.get('stage') })
  if (!parsed.success) return { error: 'Datos inválidos.' }
  const { orderId, stage } = parsed.data

  const admin = createSupabaseAdminClient()
  const { data: order } = await admin.from('orders').select('stage, assigned_to').eq('id', orderId).maybeSingle()
  if (!order || order.assigned_to !== me.id) return { error: 'Esta orden no está asignada a ti.' }
  if (order.stage === 'cancelada' || order.stage === 'entregada') return { error: 'Esta orden ya está cerrada.' }
  if (order.stage === stage) return { ok: true }

  const { error } = await admin.from('orders').update({ stage }).eq('id', orderId)
  if (error) return { error: 'No se pudo actualizar esta orden.' }

  await admin.from('order_stage_history').insert({ order_id: orderId, from_stage: order.stage, to_stage: stage, changed_by: me.id })
  await logAudit({ actorId: me.id, action: 'order.stage', targetType: 'order', targetId: orderId, details: { from: order.stage, to: stage, by: 'empleado' } })

  revalidatePath('/mis-ordenes')
  revalidatePath('/mi-calendario')
  revalidatePath('/dashboard')
  revalidatePath('/ordenes')
  revalidatePath('/calendario')
  return { ok: true }
}
