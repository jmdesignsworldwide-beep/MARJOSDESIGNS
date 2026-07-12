'use server'

import { revalidatePath } from 'next/cache'
import { requireRole } from '@/lib/auth/guards'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { logAudit } from '@/lib/auth/audit'
import { roundMoney } from '@/lib/cotizador/calc'
import { productCostSchema } from '@/lib/validation/finanzas'

export interface FinanzasState {
  error?: string
  ok?: boolean
}

/** Set/clear a product's optional unit cost (drives real margin). */
export async function setProductCost(_prev: FinanzasState, formData: FormData): Promise<FinanzasState> {
  const admin = await requireRole('super_admin')
  const parsed = productCostSchema.safeParse({
    productId: formData.get('productId'),
    unitCost: formData.get('unitCost') ?? '',
  })
  if (!parsed.success) return { error: 'Costo inválido.' }
  const { productId, unitCost } = parsed.data
  const value = unitCost == null ? null : roundMoney(unitCost)

  const supabase = createSupabaseServerClient()
  const { error } = await supabase.from('products').update({ unit_cost: value }).eq('id', productId)
  if (error) return { error: 'No se pudo guardar el costo.' }

  await logAudit({ actorId: admin.id, action: 'product.cost', targetType: 'product', targetId: productId, details: { unitCost: value } })
  revalidatePath('/finanzas')
  revalidatePath('/cotizador/precios')
  return { ok: true }
}
