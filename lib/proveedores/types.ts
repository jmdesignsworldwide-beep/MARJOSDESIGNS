/** Client-safe proveedores/inventario types (no server-only deps). */

export interface Supplier {
  id: string
  name: string
  phone: string | null
  whatsapp: string | null
  email: string | null
  address: string | null
  contact_person: string | null
  notes: string | null
  balance_owed: number
  status: 'activo' | 'inactivo'
  created_at: string
}

export interface Material {
  id: string
  name: string
  category: string | null
  unit: string
  default_supplier_id: string | null
  default_supplier_name: string | null
  product_id: string | null
  unit_cost: number | null
  track_stock: boolean
  stock: number | null
  min_stock: number | null
  last_purchase_at: string | null
  status: 'activo' | 'inactivo'
}

export interface SupplierPrice {
  id: number
  supplier_id: string
  supplier_name: string
  material_id: string
  material_name: string
  unit: string
  price: number
  updated_at: string
}

export interface PriceHistoryRow {
  id: number
  material_name: string | null
  old_price: number | null
  new_price: number
  actor: string | null
  created_at: string
}

export interface ComparisonRow {
  supplierId: string
  supplierName: string
  whatsapp: string | null
  price: number
  updatedAt: string
  isCheapest: boolean
}

export interface MaterialComparison {
  materialId: string
  materialName: string
  unit: string
  rows: ComparisonRow[]
  cheapest: ComparisonRow | null
  savings: number // cheapest vs most expensive
}

export interface SupplierPurchase {
  id: number
  description: string
  amount: number
  method: string
  expense_date: string
}

export type StockState = 'agotado' | 'bajo' | 'ok'

/** Stock alert only for materials Marjos chose to track. */
export function stockState(m: Pick<Material, 'track_stock' | 'stock' | 'min_stock'>): StockState | null {
  if (!m.track_stock || m.stock == null) return null
  if (m.stock <= 0) return 'agotado'
  if (m.min_stock != null && m.stock <= m.min_stock) return 'bajo'
  return 'ok'
}

export const stockMeta: Record<StockState, { label: string; status: 'process' | 'ready' | 'overdue' | 'neutral' }> = {
  agotado: { label: 'Agotado', status: 'overdue' },
  bajo: { label: 'Se está acabando', status: 'process' },
  ok: { label: 'En stock', status: 'ready' },
}

export const methodLabel: Record<string, string> = {
  efectivo: 'Efectivo',
  transferencia: 'Transferencia',
  debito: 'Débito',
  credito: 'Crédito',
}
