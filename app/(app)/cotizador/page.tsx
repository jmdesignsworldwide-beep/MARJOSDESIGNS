import { requireRole } from '@/lib/auth/guards'
import { listProducts } from '@/lib/cotizador/data'
import { listClients } from '@/lib/clients/data'
import { listMaterials } from '@/lib/proveedores/data'
import { getSettings } from '@/lib/settings/data'
import { CotizadorTabs } from '@/components/cotizador/CotizadorTabs'
import { Calculator } from '@/components/cotizador/Calculator'

export const dynamic = 'force-dynamic'

export default async function CotizadorPage() {
  await requireRole('super_admin')
  const [products, clients, materials, settings] = await Promise.all([
    listProducts(),
    listClients(),
    listMaterials(),
    getSettings(),
  ])

  // Supplier catalog items that have a known cost (for cost→margin quoting).
  const supplierItems = materials
    .filter((m) => m.status === 'activo' && m.unit_cost != null)
    .map((m) => ({ id: m.id, name: m.name, category: m.category ?? 'Otros', supplierName: m.default_supplier_name ?? 'Proveedor', cost: m.unit_cost as number }))

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">Cotizador</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Arma precios rápido y exactos. Tú tienes el control final.
        </p>
      </div>
      <CotizadorTabs />
      <Calculator
        products={products}
        clients={clients
          .filter((c) => c.status === 'activo')
          .map((c) => ({ id: c.id, name: c.name }))}
        supplierItems={supplierItems}
        defaultMargin={settings.defaultMarginPct}
      />
    </div>
  )
}
