'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { requireRole } from '@/lib/auth/guards'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { logAudit } from '@/lib/auth/audit'
import { createOrderSchema } from '@/lib/validation/ordenes'
import { getQuote } from '@/lib/cotizador/data'
import { computeLine, computeTotals, type CalcType } from '@/lib/cotizador/calc'
import { summarizeItems } from '@/lib/ordenes/data'

export interface OrderActionState {
  error?: string
  ok?: boolean
  id?: string
}

interface ComputedItem {
  product_id: string | null
  description: string
  calc_type: CalcType
  width_in: number | null
  height_in: number | null
  sqft: number | null
  quantity: number | null
  unit_price: number
  subtotal: number
  position: number
}

/** Recompute items + totals with the shared calc engine (authoritative). */
function recompute(
  rawItems: {
    productId?: string | null
    description: string
    calcType: CalcType
    widthIn?: number
    heightIn?: number
    quantity?: number
    unitPrice: number
  }[],
  discount: { type: 'none' | 'amount' | 'percent'; value: number },
) {
  const items: ComputedItem[] = rawItems.map((l, i) => {
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
      subtotal: r.subtotal,
      position: i,
    }
  })
  const totals = computeTotals(
    items.map((i) => i.subtotal),
    discount,
  )
  return { items, totals }
}

async function resolveNames(
  supabase: ReturnType<typeof createSupabaseServerClient>,
  clientId: string | null,
  assignedTo: string | null,
) {
  let clientName: string | null = null
  let assignedName: string | null = null
  if (clientId) {
    const { data } = await supabase.from('clients').select('name').eq('id', clientId).single()
    clientName = (data as { name: string } | null)?.name ?? null
  }
  if (assignedTo) {
    const { data } = await supabase.from('profiles').select('full_name').eq('id', assignedTo).single()
    assignedName = (data as { full_name: string } | null)?.full_name ?? null
  }
  return { clientName, assignedName }
}

async function insertOrder(
  admin: { id: string },
  base: {
    client_id: string | null
    client_name: string | null
    assigned_to: string | null
    assigned_name: string | null
    delivery_date: string | null
    notes: string | null
    discount_type: 'none' | 'amount' | 'percent'
    discount_value: number
    source: 'directa' | 'cotizacion'
    quote_id: string | null
  },
  items: ComputedItem[],
  totals: { subtotal: number; discountAmount: number; total: number; deposit: number },
): Promise<{ id: string; number: number } | { error: string }> {
  const supabase = createSupabaseServerClient()
  const description = summarizeItems(
    items.map((i) => ({ description: i.description, quantity: i.quantity, calc_type: i.calc_type })),
  )

  const { data: order, error } = await supabase
    .from('orders')
    .insert({
      ...base,
      description,
      subtotal: totals.subtotal,
      discount_amount: totals.discountAmount,
      total: totals.total,
      deposit: totals.deposit,
      stage: 'recibida',
      created_by: admin.id,
    })
    .select('id, number')
    .single()

  if (error || !order) return { error: 'No se pudo crear la orden.' }

  const rows = items.map((it) => ({ ...it, order_id: order.id }))
  const { error: itemsError } = await supabase.from('order_items').insert(rows)
  if (itemsError) {
    await supabase.from('orders').delete().eq('id', order.id)
    return { error: 'No se pudieron guardar los ítems de la orden.' }
  }
  return { id: order.id, number: order.number }
}

/** Create an order from scratch (Camino B). */
export async function createOrder(payload: unknown): Promise<OrderActionState> {
  const admin = await requireRole('super_admin')
  const parsed = createOrderSchema.safeParse(payload)
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? 'Datos inválidos.' }
  }
  const input = parsed.data
  const supabase = createSupabaseServerClient()

  const assignedTo = input.assignedTo ?? admin.id // default: the creator
  const { clientName, assignedName } = await resolveNames(
    supabase,
    input.clientId ?? null,
    assignedTo,
  )

  const { items, totals } = recompute(input.items, {
    type: input.discountType,
    value: input.discountValue,
  })

  const res = await insertOrder(
    admin,
    {
      client_id: input.clientId ?? null,
      client_name: clientName ?? input.clientName ?? null,
      assigned_to: assignedTo,
      assigned_name: assignedName,
      delivery_date: input.deliveryDate ?? null,
      notes: input.notes || null,
      discount_type: input.discountType,
      discount_value: input.discountType === 'none' ? 0 : input.discountValue,
      source: 'directa',
      quote_id: null,
    },
    items,
    totals,
  )
  if ('error' in res) return { error: res.error }

  await logAudit({
    actorId: admin.id,
    action: 'order.create',
    targetType: 'order',
    targetId: res.id,
    details: { number: res.number, total: totals.total, source: 'directa' },
  })
  revalidatePath('/ordenes')
  revalidatePath('/dashboard')
  return { ok: true, id: res.id }
}

/** Convert a saved quote into an order (Camino A) — drags everything over. */
export async function convertQuoteToOrder(quoteId: string): Promise<void> {
  const admin = await requireRole('super_admin')
  const data = await getQuote(quoteId)
  if (!data) return
  const { quote, lines } = data

  const { items, totals } = recompute(
    lines.map((l) => ({
      productId: l.product_id,
      description: l.description,
      calcType: l.calc_type,
      widthIn: l.width_in ?? undefined,
      heightIn: l.height_in ?? undefined,
      quantity: l.quantity ?? undefined,
      unitPrice: l.unit_price,
    })),
    { type: quote.discount_type, value: quote.discount_value },
  )

  const res = await insertOrder(
    admin,
    {
      client_id: quote.client_id,
      client_name: quote.client_name,
      assigned_to: admin.id,
      assigned_name: admin.full_name,
      delivery_date: null,
      notes: quote.notes,
      discount_type: quote.discount_type,
      discount_value: quote.discount_value,
      source: 'cotizacion',
      quote_id: quote.id,
    },
    items,
    totals,
  )
  if ('error' in res) return

  const supabase = createSupabaseServerClient()
  await supabase.from('quotes').update({ status: 'convertida' }).eq('id', quote.id)

  await logAudit({
    actorId: admin.id,
    action: 'order.create',
    targetType: 'order',
    targetId: res.id,
    details: { number: res.number, total: totals.total, source: 'cotizacion', quote: quote.number },
  })
  revalidatePath('/ordenes')
  revalidatePath('/dashboard')
  revalidatePath('/cotizador/historial')

  redirect(`/ordenes/${res.id}`)
}

/** Quick edit: assigned employee + delivery date (super_admin). */
export async function updateOrderMeta(formData: FormData): Promise<void> {
  const admin = await requireRole('super_admin')
  const id = String(formData.get('id') ?? '')
  const assignedTo = String(formData.get('assignedTo') ?? '') || null
  const deliveryDate = String(formData.get('deliveryDate') ?? '') || null
  if (!id) return

  const supabase = createSupabaseServerClient()
  let assignedName: string | null = null
  if (assignedTo) {
    const { data } = await supabase.from('profiles').select('full_name').eq('id', assignedTo).single()
    assignedName = (data as { full_name: string } | null)?.full_name ?? null
  }
  const { error } = await supabase
    .from('orders')
    .update({ assigned_to: assignedTo, assigned_name: assignedName, delivery_date: deliveryDate })
    .eq('id', id)
  if (error) return

  await logAudit({ actorId: admin.id, action: 'order.update', targetType: 'order', targetId: id })
  revalidatePath(`/ordenes/${id}`)
  revalidatePath('/ordenes')
  revalidatePath('/dashboard')
}
