'use server'

import { revalidatePath } from 'next/cache'
import { requireRole } from '@/lib/auth/guards'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { logAudit } from '@/lib/auth/audit'
import {
  saveQuoteSchema,
  productCreateSchema,
  productPriceSchema,
} from '@/lib/validation/cotizador'
import { computeLine, computeTotals } from '@/lib/cotizador/calc'

export interface QuoteActionState {
  error?: string
  ok?: boolean
  id?: string
}

/**
 * Save a quote. The server RE-COMPUTES every line subtotal and the totals
 * from the raw inputs (dimensions / quantity / unit price / discount) using
 * the shared calc engine — the client-sent totals are ignored, so no one can
 * forge a price from the browser.
 */
export async function saveQuote(payload: unknown): Promise<QuoteActionState> {
  const admin = await requireRole('super_admin')

  const parsed = saveQuoteSchema.safeParse(payload)
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? 'Datos inválidos.' }
  }
  const input = parsed.data

  // Authoritative recalculation.
  const computedLines = input.lines.map((l, i) => {
    const r = computeLine({
      calcType: l.calcType,
      unitPrice: l.unitPrice,
      widthIn: l.widthIn,
      heightIn: l.heightIn,
      quantity: l.quantity,
    })
    return {
      product_id: l.productId ?? null,
      description: l.description,
      calc_type: l.calcType,
      width_in: l.calcType === 'area' ? l.widthIn ?? null : null,
      height_in: l.calcType === 'area' ? l.heightIn ?? null : null,
      sqft: r.sqft,
      quantity: l.calcType === 'quantity' ? l.quantity ?? null : null,
      unit_price: l.unitPrice,
      unit_cost: l.unitCost ?? null,
      subtotal: r.subtotal,
      position: i,
    }
  })

  const totals = computeTotals(
    computedLines.map((l) => l.subtotal),
    { type: input.discountType, value: input.discountValue },
  )

  const supabase = createSupabaseServerClient()
  const { data: quote, error } = await supabase
    .from('quotes')
    .insert({
      client_id: input.clientId ?? null,
      client_name: input.clientName || null,
      subtotal: totals.subtotal,
      discount_type: input.discountType,
      discount_value: input.discountType === 'none' ? 0 : input.discountValue,
      discount_amount: totals.discountAmount,
      total: totals.total,
      deposit: totals.deposit,
      notes: input.notes || null,
      created_by: admin.id,
    })
    .select('id, number')
    .single()

  if (error || !quote) return { error: 'No se pudo guardar la cotización.' }

  const lineRows = computedLines.map((l) => ({ ...l, quote_id: quote.id }))
  const { error: linesError } = await supabase.from('quote_lines').insert(lineRows)
  if (linesError) {
    // roll back the header so we never leave a quote with no lines
    await supabase.from('quotes').delete().eq('id', quote.id)
    return { error: 'No se pudieron guardar las líneas de la cotización.' }
  }

  await logAudit({
    actorId: admin.id,
    action: 'quote.create',
    targetType: 'quote',
    targetId: quote.id,
    details: { number: quote.number, total: totals.total },
  })

  revalidatePath('/cotizador/historial')
  return { ok: true, id: quote.id }
}

export interface PanelActionState {
  error?: string
  fieldErrors?: Record<string, string>
  success?: string
}

/** Create a new product in the price list (super_admin). */
export async function createProduct(
  _prev: PanelActionState,
  formData: FormData,
): Promise<PanelActionState> {
  const admin = await requireRole('super_admin')
  const parsed = productCreateSchema.safeParse({
    name: formData.get('name'),
    calcType: formData.get('calcType'),
    basePrice: formData.get('basePrice'),
  })
  if (!parsed.success) {
    const fe: Record<string, string> = {}
    for (const i of parsed.error.issues) fe[String(i.path[0])] = i.message
    return { error: 'Revisa los campos.', fieldErrors: fe }
  }
  const { name, calcType, basePrice } = parsed.data

  const supabase = createSupabaseServerClient()
  const { data, error } = await supabase
    .from('products')
    .insert({
      name,
      calc_type: calcType,
      base_price: basePrice,
      unit_label: calcType === 'area' ? 'pie²' : 'unidad',
    })
    .select('id')
    .single()
  if (error || !data) return { error: 'No se pudo crear el producto.' }

  await logAudit({ actorId: admin.id, action: 'product.create', targetType: 'product', targetId: data.id, details: { name, basePrice } })
  revalidatePath('/cotizador/precios')
  revalidatePath('/cotizador')
  return { success: `Producto ${name} agregado.` }
}

/** Update a base price; logs the change to the append-only price_history. */
export async function updateProductPrice(
  _prev: PanelActionState,
  formData: FormData,
): Promise<PanelActionState> {
  const admin = await requireRole('super_admin')
  const parsed = productPriceSchema.safeParse({
    id: formData.get('id'),
    basePrice: formData.get('basePrice'),
  })
  if (!parsed.success) return { error: 'Precio inválido.' }
  const { id, basePrice } = parsed.data

  const supabase = createSupabaseServerClient()
  const { data: current } = await supabase
    .from('products')
    .select('name, base_price')
    .eq('id', id)
    .single()
  if (!current) return { error: 'Producto no encontrado.' }

  if (Number(current.base_price) === basePrice) {
    return { success: 'Sin cambios.' }
  }

  const { error } = await supabase.from('products').update({ base_price: basePrice }).eq('id', id)
  if (error) return { error: 'No se pudo actualizar el precio.' }

  await supabase.from('price_history').insert({
    product_id: id,
    product_name: current.name,
    old_price: current.base_price,
    new_price: basePrice,
    changed_by: admin.id,
  })
  await logAudit({ actorId: admin.id, action: 'product.price', targetType: 'product', targetId: id, details: { old: current.base_price, new: basePrice } })

  revalidatePath('/cotizador/precios')
  revalidatePath('/cotizador')
  return { success: 'Precio actualizado.' }
}

/** Activate / deactivate a product (soft — keeps history). */
export async function setProductStatus(formData: FormData): Promise<void> {
  const admin = await requireRole('super_admin')
  const id = String(formData.get('id') ?? '')
  const status = formData.get('status') === 'inactivo' ? 'inactivo' : 'activo'
  if (!id) return
  const supabase = createSupabaseServerClient()
  const { error } = await supabase.from('products').update({ status }).eq('id', id)
  if (error) return
  await logAudit({ actorId: admin.id, action: status === 'activo' ? 'product.activate' : 'product.deactivate', targetType: 'product', targetId: id })
  revalidatePath('/cotizador/precios')
  revalidatePath('/cotizador')
}
