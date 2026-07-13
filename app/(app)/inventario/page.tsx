import { requireRole } from '@/lib/auth/guards'
import { listMaterials, listSuppliers } from '@/lib/proveedores/data'
import { listProducts } from '@/lib/cotizador/data'
import { MaterialsBoard } from '@/components/inventario/MaterialsBoard'

export const dynamic = 'force-dynamic'

export default async function InventarioPage() {
  await requireRole('super_admin')
  const [materials, suppliers, products] = await Promise.all([listMaterials(), listSuppliers(), listProducts()])
  return (
    <MaterialsBoard
      materials={materials}
      suppliers={suppliers.map((s) => ({ id: s.id, name: s.name }))}
      products={products.map((p) => ({ id: p.id, name: p.name }))}
    />
  )
}
