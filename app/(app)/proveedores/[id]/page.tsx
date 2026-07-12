import { notFound } from 'next/navigation'
import { requireRole } from '@/lib/auth/guards'
import { getSupplier, listMaterials } from '@/lib/proveedores/data'
import { listCategories } from '@/lib/gastos/data'
import { SupplierDetail } from '@/components/proveedores/SupplierDetail'

export const dynamic = 'force-dynamic'

export default async function SupplierPage({ params }: { params: { id: string } }) {
  await requireRole('super_admin')
  const [data, materials, categories] = await Promise.all([
    getSupplier(params.id),
    listMaterials(),
    listCategories(),
  ])
  if (!data) notFound()

  const produccion = categories.filter((c) => c.grp === 'produccion').map((c) => ({ id: c.id, name: c.name }))

  return (
    <SupplierDetail
      supplier={data.supplier}
      prices={data.prices}
      history={data.history}
      purchases={data.purchases}
      materials={materials}
      categories={produccion}
    />
  )
}
