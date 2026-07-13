'use server'

import { revalidatePath } from 'next/cache'
import { requireRole } from '@/lib/auth/guards'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { logAudit } from '@/lib/auth/audit'
import { roundMoney, computeLine, computeTotals } from '@/lib/cotizador/calc'
import { createSaleSchema, voidSaleSchema } from '@/lib/validation/pos'
import { recordCashMovement } from '@/lib/caja/movements'

export interface PosState {
  error?: string
  ok?: boolean
  saleId?: string
  saleNumber?: number
  change?: number
}

function revalidatePos() {
  revalidatePath('/pos')
  revalidatePath('/pos/historial')
  revalidatePath('/caja')
  revalidatePath('/dashboard')
}

/** Register a quick sale. Totals and change are recomputed on the server. */
export async function createSale(payload: unknown): Promise<PosState> {
  const admin = await requireRole('super_admin')
  const parsed = createSaleSchema.safeParse(payload)
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? 'Datos inválidos.' }
  const input = parsed.data

  const supabase = createSupabaseServerClient()
  const { data: reg } = await supabase.from('cash_registers').select('id').eq('status', 'abierta').maybeSingle()
  if (!reg) return { error: 'Abre la caja antes de registrar una venta.' }

  // Server-authoritative money (whole peso). Area lines recompute from the
  // dimensions (in inches) with the SAME engine as the Cotizador — the client
  // subtotal is never trusted.
  const lines = input.items.map((it) => {
    const r = computeLine({
      calcType: it.calcType,
      unitPrice: it.unitPrice,
      widthIn: it.widthIn,
      heightIn: it.heightIn,
      quantity: it.quantity,
    })
    return { ...it, subtotal: r.subtotal, sqft: r.sqft }
  })
  const totals = computeTotals(
    lines.map((l) => l.subtotal),
    { type: input.discountType, value: input.discountValue },
  )
  if (totals.total <= 0) return { error: 'El total debe ser mayor que 0.' }

  // Cash → require received ≥ total, compute change. Others → no change.
  let cashReceived: number | null = null
  let change: number | null = null
  if (input.method === 'efectivo') {
    cashReceived = roundMoney(input.cashReceived ?? 0)
    if (cashReceived < totals.total) return { error: 'El efectivo recibido es menor que el total.' }
    change = roundMoney(cashReceived - totals.total)
  }

  // Duplicate-voucher guard for transfers.
  if (input.method === 'transferencia' && input.reference) {
    const { data: dup } = await supabase
      .from('pos_sales')
      .select('id')
      .eq('reference', input.reference)
      .eq('method', 'transferencia')
      .eq('status', 'completada')
      .limit(1)
    if (dup && dup.length > 0) return { error: 'Ya existe una venta con esa referencia.' }
  }

  const { data: sale, error } = await supabase
    .from('pos_sales')
    .insert({
      register_id: reg.id,
      client_name: input.clientName || null,
      subtotal: totals.subtotal,
      discount_type: input.discountType,
      discount_value: input.discountType === 'none' ? 0 : input.discountValue,
      discount_amount: totals.discountAmount,
      total: totals.total,
      method: input.method,
      reference: input.reference || null,
      cash_received: cashReceived,
      change_given: change,
      sold_by: admin.id,
    })
    .select('id, number')
    .single()
  if (error || !sale) return { error: 'No se pudo registrar la venta.' }

  const itemRows = lines.map((l, i) => ({
    sale_id: sale.id,
    product_id: l.productId ?? null,
    description: l.description,
    calc_type: l.calcType,
    quantity: l.calcType === 'area' ? 1 : l.quantity,
    unit_price: roundMoney(l.unitPrice),
    width_in: l.calcType === 'area' ? l.widthIn ?? null : null,
    height_in: l.calcType === 'area' ? l.heightIn ?? null : null,
    sqft: l.calcType === 'area' ? l.sqft : null,
    subtotal: l.subtotal,
    position: i,
  }))
  const { error: itemErr } = await supabase.from('pos_sale_items').insert(itemRows)
  if (itemErr) return { error: 'No se pudieron guardar los productos de la venta.' }

  // Money lands in the caja automatically (cero recaptura).
  await recordCashMovement(
    {
      source: 'pos_sale',
      amount: totals.total,
      method: input.method,
      reference: input.reference || null,
      concept: `Venta rápida POS-${String(sale.number).padStart(4, '0')}`,
      clientName: input.clientName || null,
      posSaleId: sale.id,
      createdBy: admin.id,
    },
    reg.id,
  )

  await logAudit({ actorId: admin.id, action: 'pos.sale', targetType: 'pos_sale', targetId: sale.id, details: { total: totals.total, method: input.method } })
  revalidatePos()
  return { ok: true, saleId: sale.id, saleNumber: sale.number, change: change ?? undefined }
}

/** Void a sale (reason required). Reverses the caja effect if the register is
 *  still open; a sale on an already-closed caja is voided/audited but the
 *  closed caja stays intact (it was already counted). */
export async function voidSale(_prev: PosState, formData: FormData): Promise<PosState> {
  const admin = await requireRole('super_admin')
  const parsed = voidSaleSchema.safeParse({ saleId: formData.get('saleId'), reason: formData.get('reason') })
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? 'Motivo requerido.' }
  const { saleId, reason } = parsed.data

  const supabase = createSupabaseServerClient()
  const { data: sale } = await supabase
    .from('pos_sales')
    .select('id, number, register_id, total, method, status')
    .eq('id', saleId)
    .maybeSingle()
  if (!sale) return { error: 'Venta no encontrada.' }
  if (sale.status === 'anulada') return { error: 'La venta ya está anulada.' }

  const { error } = await supabase
    .from('pos_sales')
    .update({ status: 'anulada', void_reason: reason, voided_by: admin.id, voided_at: new Date().toISOString() })
    .eq('id', saleId)
    .eq('status', 'completada')
  if (error) return { error: 'No se pudo anular la venta.' }

  // Reverse in caja only if that register is still open.
  const { data: reg } = await supabase.from('cash_registers').select('id, status').eq('id', sale.register_id).maybeSingle()
  if (reg?.status === 'abierta') {
    await recordCashMovement(
      {
        direction: 'salida',
        source: 'pos_void',
        amount: Number(sale.total),
        method: sale.method,
        concept: `Anulación POS-${String(sale.number).padStart(4, '0')}: ${reason}`,
        posSaleId: sale.id,
        createdBy: admin.id,
      },
      sale.register_id,
    )
  }

  await logAudit({ actorId: admin.id, action: 'pos.void', targetType: 'pos_sale', targetId: saleId, details: { reason, total: Number(sale.total) } })
  revalidatePos()
  return { ok: true }
}
