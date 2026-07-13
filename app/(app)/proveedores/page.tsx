import { requireRole } from '@/lib/auth/guards'
import { listSuppliers, getMaterialComparisons, getRecentHikes } from '@/lib/proveedores/data'
import { ProveedoresBoard } from '@/components/proveedores/ProveedoresBoard'

export const dynamic = 'force-dynamic'

export default async function ProveedoresPage() {
  await requireRole('super_admin')
  const [suppliers, comparisons, hikes] = await Promise.all([
    listSuppliers(),
    getMaterialComparisons(),
    getRecentHikes(),
  ])
  return <ProveedoresBoard suppliers={suppliers} comparisons={comparisons} hikes={hikes} />
}
