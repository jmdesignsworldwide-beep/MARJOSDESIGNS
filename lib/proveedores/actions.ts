'use server'

import { z } from 'zod'
import { revalidatePath } from 'next/cache'
import { requireRole } from '@/lib/auth/guards'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { logAudit } from '@/lib/auth/audit'
import { roundMoney } from '@/lib/cotizador/calc'
import {
  supplierSchema,
  editSupplierSchema,
  toggleSchema,
  materialSchema,
  editMaterialSchema,
  supplierPriceSchema,
  purchaseSchema,
} from '@/lib/validation/proveedores'

export interface ProvState {
  error?: string
  ok?: boolean
  id?: string
}

function revalidateProv(supplierId?: string) {
  revalidatePath('/proveedores')
  revalidatePath('/inventario')
  if (supplierId) revalidatePath(`/proveedores/${supplierId}`)
}
function todayDR() {
  return new Date(Date.now() - 4 * 60 * 60 * 1000).toISOString().slice(0, 10)
}

// ── suppliers ──────────────────────────────────────────────────────────────
function supplierFields(formData: FormData) {
  return {
    name: formData.get('name'),
    phone: formData.get('phone') ?? '',
    whatsapp: formData.get('whatsapp') ?? '',
    email: formData.get('email') ?? '',
    address: formData.get('address') ?? '',
    contactPerson: formData.get('contactPerson') ?? '',
    notes: formData.get('notes') ?? '',
    balanceOwed: formData.get('balanceOwed') ?? '',
  }
}

export async function createSupplier(_prev: ProvState, formData: FormData): Promise<ProvState> {
  const admin = await requireRole('super_admin')
  const parsed = supplierSchema.safeParse(supplierFields(formData))
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? 'Datos inválidos.' }
  const v = parsed.data
  const supabase = createSupabaseServerClient()
  const { data, error } = await supabase
    .from('suppliers')
    .insert({
      name: v.name,
      phone: v.phone || null,
      whatsapp: v.whatsapp || null,
      email: v.email || null,
      address: v.address || null,
      contact_person: v.contactPerson || null,
      notes: v.notes || null,
      balance_owed: v.balanceOwed ? roundMoney(v.balanceOwed) : 0,
      created_by: admin.id,
    })
    .select('id')
    .single()
  if (error || !data) return { error: 'No se pudo crear el proveedor.' }
  await logAudit({ actorId: admin.id, action: 'supplier.create', targetType: 'supplier', targetId: data.id, details: { name: v.name } })
  revalidateProv()
  return { ok: true, id: data.id }
}

export async function editSupplier(_prev: ProvState, formData: FormData): Promise<ProvState> {
  const admin = await requireRole('super_admin')
  const parsed = editSupplierSchema.safeParse({ id: formData.get('id'), ...supplierFields(formData) })
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? 'Datos inválidos.' }
  const v = parsed.data
  const supabase = createSupabaseServerClient()
  const { error } = await supabase
    .from('suppliers')
    .update({
      name: v.name,
      phone: v.phone || null,
      whatsapp: v.whatsapp || null,
      email: v.email || null,
      address: v.address || null,
      contact_person: v.contactPerson || null,
      notes: v.notes || null,
      balance_owed: v.balanceOwed ? roundMoney(v.balanceOwed) : 0,
    })
    .eq('id', v.id)
  if (error) return { error: 'No se pudo actualizar.' }
  await logAudit({ actorId: admin.id, action: 'supplier.edit', targetType: 'supplier', targetId: v.id })
  revalidateProv(v.id)
  return { ok: true, id: v.id }
}

export async function toggleSupplier(formData: FormData): Promise<void> {
  const admin = await requireRole('super_admin')
  const parsed = toggleSchema.safeParse({ id: formData.get('id'), status: formData.get('status') })
  if (!parsed.success) return
  const supabase = createSupabaseServerClient()
  await supabase.from('suppliers').update({ status: parsed.data.status }).eq('id', parsed.data.id)
  await logAudit({ actorId: admin.id, action: 'supplier.toggle', targetType: 'supplier', targetId: parsed.data.id, details: { status: parsed.data.status } })
  revalidateProv(parsed.data.id)
}

// ── materials ────────────────────────────────────────────────────────────────
function materialFields(formData: FormData) {
  return {
    name: formData.get('name'),
    category: formData.get('category') ?? '',
    unit: formData.get('unit') || 'unidad',
    defaultSupplierId: formData.get('defaultSupplierId') ?? '',
    productId: formData.get('productId') ?? '',
    unitCost: formData.get('unitCost') ?? '',
    trackStock: formData.get('trackStock') === 'on' || formData.get('trackStock') === 'true',
    stock: formData.get('stock') ?? '',
    minStock: formData.get('minStock') ?? '',
  }
}
function materialRow(v: z.infer<typeof materialSchema>) {
  return {
    name: v.name,
    category: v.category || null,
    unit: v.unit,
    default_supplier_id: v.defaultSupplierId || null,
    product_id: v.productId || null,
    unit_cost: v.unitCost,
    track_stock: !!v.trackStock,
    stock: v.trackStock ? v.stock : null,
    min_stock: v.trackStock ? v.minStock : null,
  }
}

export async function createMaterial(_prev: ProvState, formData: FormData): Promise<ProvState> {
  const admin = await requireRole('super_admin')
  const parsed = materialSchema.safeParse(materialFields(formData))
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? 'Datos inválidos.' }
  const supabase = createSupabaseServerClient()
  const { error } = await supabase.from('materials').insert({ ...materialRow(parsed.data), created_by: admin.id })
  if (error) return { error: 'No se pudo crear el material.' }
  await logAudit({ actorId: admin.id, action: 'material.create', targetType: 'material', details: { name: parsed.data.name } })
  revalidateProv()
  return { ok: true }
}

export async function editMaterial(_prev: ProvState, formData: FormData): Promise<ProvState> {
  const admin = await requireRole('super_admin')
  const parsed = editMaterialSchema.safeParse({ id: formData.get('id'), ...materialFields(formData) })
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? 'Datos inválidos.' }
  const supabase = createSupabaseServerClient()
  const { id, ...rest } = parsed.data
  const { error } = await supabase.from('materials').update(materialRow(rest)).eq('id', id)
  if (error) return { error: 'No se pudo actualizar el material.' }
  await logAudit({ actorId: admin.id, action: 'material.edit', targetType: 'material', targetId: id })
  revalidateProv()
  return { ok: true }
}

export async function toggleMaterial(formData: FormData): Promise<void> {
  await requireRole('super_admin')
  const parsed = toggleSchema.safeParse({ id: formData.get('id'), status: formData.get('status') })
  if (!parsed.success) return
  const supabase = createSupabaseServerClient()
  await supabase.from('materials').update({ status: parsed.data.status }).eq('id', parsed.data.id)
  revalidateProv()
}

// ── supplier price (with audited history) ──────────────────────────────────
export async function setSupplierPrice(_prev: ProvState, formData: FormData): Promise<ProvState> {
  const admin = await requireRole('super_admin')
  const parsed = supplierPriceSchema.safeParse({
    supplierId: formData.get('supplierId'),
    materialId: formData.get('materialId'),
    price: formData.get('price'),
  })
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? 'Datos inválidos.' }
  const { supplierId, materialId } = parsed.data
  const price = roundMoney(parsed.data.price)

  const supabase = createSupabaseServerClient()
  const { data: existing } = await supabase
    .from('supplier_prices')
    .select('id, price')
    .eq('supplier_id', supplierId)
    .eq('material_id', materialId)
    .maybeSingle()
  const oldPrice = existing ? Number(existing.price) : null

  const { error } = await supabase
    .from('supplier_prices')
    .upsert({ supplier_id: supplierId, material_id: materialId, price, created_by: admin.id, updated_at: new Date().toISOString() }, { onConflict: 'supplier_id,material_id' })
  if (error) return { error: 'No se pudo guardar el precio.' }

  if (oldPrice == null || oldPrice !== price) {
    await supabase.from('supplier_price_history').insert({ supplier_id: supplierId, material_id: materialId, old_price: oldPrice, new_price: price, changed_by: admin.id })
    await logAudit({ actorId: admin.id, action: 'supplier.price', targetType: 'supplier', targetId: supplierId, details: { materialId, from: oldPrice, to: price } })
  }
  revalidateProv(supplierId)
  return { ok: true }
}

// ── purchase → production expense (Gastos hook, no duplicate) ───────────────
export async function registerPurchase(_prev: ProvState, formData: FormData): Promise<ProvState> {
  const admin = await requireRole('super_admin')
  const parsed = purchaseSchema.safeParse({
    supplierId: formData.get('supplierId'),
    categoryId: formData.get('categoryId'),
    description: formData.get('description'),
    amount: formData.get('amount'),
    method: formData.get('method'),
    materialId: formData.get('materialId') ?? '',
  })
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? 'Datos inválidos.' }
  const v = parsed.data
  const amount = roundMoney(v.amount)

  const supabase = createSupabaseServerClient()
  const { error } = await supabase.from('expenses').insert({
    category_id: v.categoryId,
    description: v.description,
    amount,
    expense_date: todayDR(),
    method: v.method,
    supplier_id: v.supplierId,
    created_by: admin.id,
  })
  if (error) return { error: 'No se pudo registrar la compra.' }

  if (v.materialId) await supabase.from('materials').update({ last_purchase_at: todayDR() }).eq('id', v.materialId)

  await logAudit({ actorId: admin.id, action: 'supplier.purchase', targetType: 'supplier', targetId: v.supplierId, details: { amount, method: v.method } })
  revalidateProv(v.supplierId)
  revalidatePath('/gastos')
  revalidatePath('/finanzas')
  return { ok: true }
}

/** Push a material's cost onto its linked product (feeds real margin). */
export async function applyCostToProduct(formData: FormData): Promise<void> {
  const admin = await requireRole('super_admin')
  const materialId = String(formData.get('materialId') ?? '')
  if (!materialId) return
  const supabase = createSupabaseServerClient()
  const { data: m } = await supabase.from('materials').select('product_id, unit_cost').eq('id', materialId).maybeSingle()
  if (!m?.product_id || m.unit_cost == null) return
  await supabase.from('products').update({ unit_cost: roundMoney(Number(m.unit_cost)) }).eq('id', m.product_id)
  await logAudit({ actorId: admin.id, action: 'material.apply_cost', targetType: 'product', targetId: m.product_id, details: { unitCost: Number(m.unit_cost) } })
  revalidateProv()
  revalidatePath('/finanzas')
}
