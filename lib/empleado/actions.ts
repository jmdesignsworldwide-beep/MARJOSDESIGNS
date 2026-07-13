'use server'

import { revalidatePath } from 'next/cache'
import { requireAuth } from '@/lib/auth/guards'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { z } from 'zod'

export interface EmpState {
  error?: string
  ok?: boolean
}

const schema = z.object({
  orderId: z.string().uuid(),
  stage: z.enum(['en_diseno', 'en_produccion', 'lista']),
})

/** Employee advances ONE of their own orders. The DB function enforces
 *  ownership + allowed stages (SECURITY DEFINER) — no table grants involved. */
export async function employeeAdvanceStage(_prev: EmpState, formData: FormData): Promise<EmpState> {
  await requireAuth()
  const parsed = schema.safeParse({ orderId: formData.get('orderId'), stage: formData.get('stage') })
  if (!parsed.success) return { error: 'Datos inválidos.' }

  const supabase = createSupabaseServerClient()
  const { error } = await supabase.rpc('employee_advance_stage', { p_order: parsed.data.orderId, p_stage: parsed.data.stage })
  if (error) return { error: 'No se pudo actualizar esta orden.' }

  revalidatePath('/mis-ordenes')
  revalidatePath('/mi-calendario')
  revalidatePath('/dashboard')
  revalidatePath('/ordenes')
  revalidatePath('/calendario')
  return { ok: true }
}
