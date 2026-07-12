import 'server-only'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { roundMoney } from '@/lib/cotizador/calc'
import type {
  Supplier,
  Material,
  SupplierPrice,
  PriceHistoryRow,
  MaterialComparison,
  ComparisonRow,
  SupplierPurchase,
} from './types'

const SUPPLIER_COLS =
  'id, name, phone, whatsapp, email, address, contact_person, notes, balance_owed, status, created_at'

export async function listSuppliers(includeInactive = false): Promise<Supplier[]> {
  const supabase = createSupabaseServerClient()
  let q = supabase.from('suppliers').select(SUPPLIER_COLS).order('name', { ascending: true })
  if (!includeInactive) q = q.eq('status', 'activo')
  const { data } = await q
  return (data as Supplier[]) ?? []
}

async function resolveActors(ids: (string | null)[]): Promise<Map<string, string>> {
  const supabase = createSupabaseServerClient()
  const unique = Array.from(new Set(ids.filter(Boolean))) as string[]
  if (unique.length === 0) return new Map()
  const { data } = await supabase.from('profiles').select('id, full_name').in('id', unique)
  return new Map((data ?? []).map((p) => [p.id as string, p.full_name as string]))
}

export async function getSupplier(id: string): Promise<{
  supplier: Supplier
  prices: SupplierPrice[]
  history: PriceHistoryRow[]
  purchases: SupplierPurchase[]
} | null> {
  const supabase = createSupabaseServerClient()
  const { data: supplier } = await supabase.from('suppliers').select(SUPPLIER_COLS).eq('id', id).maybeSingle()
  if (!supplier) return null

  const [{ data: prices }, { data: hist }, { data: purchases }] = await Promise.all([
    supabase.from('supplier_prices').select('id, material_id, price, updated_at, materials(name, unit)').eq('supplier_id', id),
    supabase
      .from('supplier_price_history')
      .select('id, old_price, new_price, changed_by, created_at, materials(name)')
      .eq('supplier_id', id)
      .order('created_at', { ascending: false })
      .limit(50),
    supabase
      .from('expenses')
      .select('id, description, amount, method, expense_date')
      .eq('supplier_id', id)
      .eq('status', 'activo')
      .order('expense_date', { ascending: false })
      .limit(50),
  ])

  const actors = await resolveActors(((hist ?? []) as { changed_by: string | null }[]).map((h) => h.changed_by))

  return {
    supplier: supplier as Supplier,
    prices: ((prices ?? []) as unknown as { id: number; material_id: string; price: number; updated_at: string; materials: { name: string; unit: string } | null }[]).map((p) => ({
      id: p.id,
      supplier_id: id,
      supplier_name: (supplier as Supplier).name,
      material_id: p.material_id,
      material_name: p.materials?.name ?? '—',
      unit: p.materials?.unit ?? 'unidad',
      price: roundMoney(Number(p.price)),
      updated_at: p.updated_at,
    })),
    history: ((hist ?? []) as unknown as { id: number; old_price: number | null; new_price: number; changed_by: string | null; created_at: string; materials: { name: string } | null }[]).map((h) => ({
      id: h.id,
      material_name: h.materials?.name ?? null,
      old_price: h.old_price != null ? roundMoney(Number(h.old_price)) : null,
      new_price: roundMoney(Number(h.new_price)),
      actor: h.changed_by ? actors.get(h.changed_by) ?? null : null,
      created_at: h.created_at,
    })),
    purchases: ((purchases ?? []) as { id: number; description: string; amount: number; method: string; expense_date: string }[]).map((e) => ({
      id: e.id,
      description: e.description,
      amount: roundMoney(Number(e.amount)),
      method: e.method,
      expense_date: e.expense_date,
    })),
  }
}

export async function listMaterials(includeInactive = false): Promise<Material[]> {
  const supabase = createSupabaseServerClient()
  let q = supabase
    .from('materials')
    .select('id, name, category, unit, default_supplier_id, product_id, unit_cost, track_stock, stock, min_stock, last_purchase_at, status, suppliers:default_supplier_id(name)')
    .order('name', { ascending: true })
  if (!includeInactive) q = q.eq('status', 'activo')
  const { data } = await q
  return ((data ?? []) as unknown as (Omit<Material, 'default_supplier_name'> & { suppliers: { name: string } | null })[]).map((m) => ({
    id: m.id,
    name: m.name,
    category: m.category,
    unit: m.unit,
    default_supplier_id: m.default_supplier_id,
    default_supplier_name: m.suppliers?.name ?? null,
    product_id: m.product_id,
    unit_cost: m.unit_cost != null ? roundMoney(Number(m.unit_cost)) : null,
    track_stock: m.track_stock,
    stock: m.stock != null ? Number(m.stock) : null,
    min_stock: m.min_stock != null ? Number(m.min_stock) : null,
    last_purchase_at: m.last_purchase_at,
    status: m.status,
  }))
}

/** Price comparison across suppliers for each material — cheapest first. */
export async function getMaterialComparisons(): Promise<MaterialComparison[]> {
  const supabase = createSupabaseServerClient()
  const { data } = await supabase
    .from('supplier_prices')
    .select('price, supplier_id, material_id, updated_at, suppliers(name, whatsapp, status), materials(name, unit, status)')

  const byMaterial = new Map<string, { name: string; unit: string; rows: ComparisonRow[] }>()
  for (const r of (data ?? []) as unknown as {
    price: number
    supplier_id: string
    material_id: string
    updated_at: string
    suppliers: { name: string; whatsapp: string | null; status: string } | null
    materials: { name: string; unit: string; status: string } | null
  }[]) {
    if (r.suppliers?.status !== 'activo' || r.materials?.status !== 'activo') continue
    const entry = byMaterial.get(r.material_id) ?? { name: r.materials?.name ?? '—', unit: r.materials?.unit ?? 'unidad', rows: [] }
    entry.rows.push({
      supplierId: r.supplier_id,
      supplierName: r.suppliers?.name ?? '—',
      whatsapp: r.suppliers?.whatsapp ?? null,
      price: roundMoney(Number(r.price)),
      updatedAt: r.updated_at,
      isCheapest: false,
    })
    byMaterial.set(r.material_id, entry)
  }

  const out: MaterialComparison[] = []
  for (const [materialId, e] of Array.from(byMaterial.entries())) {
    const rows = e.rows.sort((a, b) => a.price - b.price)
    if (rows.length) rows[0].isCheapest = true
    const min = rows[0]?.price ?? 0
    const max = rows[rows.length - 1]?.price ?? 0
    out.push({ materialId, materialName: e.name, unit: e.unit, rows, cheapest: rows[0] ?? null, savings: roundMoney(max - min) })
  }
  return out.sort((a, b) => b.rows.length - a.rows.length || a.materialName.localeCompare(b.materialName))
}

/** Suppliers who raised a price recently (from history). */
export async function getRecentHikes(days = 45): Promise<
  { supplierName: string; materialName: string; oldPrice: number; newPrice: number; createdAt: string }[]
> {
  const supabase = createSupabaseServerClient()
  const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString()
  const { data } = await supabase
    .from('supplier_price_history')
    .select('old_price, new_price, created_at, suppliers(name), materials(name)')
    .gte('created_at', since)
    .order('created_at', { ascending: false })
    .limit(20)

  return ((data ?? []) as unknown as {
    old_price: number | null
    new_price: number
    created_at: string
    suppliers: { name: string } | null
    materials: { name: string } | null
  }[])
    .filter((h) => h.old_price != null && Number(h.new_price) > Number(h.old_price))
    .map((h) => ({
      supplierName: h.suppliers?.name ?? '—',
      materialName: h.materials?.name ?? '—',
      oldPrice: roundMoney(Number(h.old_price)),
      newPrice: roundMoney(Number(h.new_price)),
      createdAt: h.created_at,
    }))
}
