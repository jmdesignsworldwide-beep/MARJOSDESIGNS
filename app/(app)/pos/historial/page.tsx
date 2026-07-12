import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { requireRole } from '@/lib/auth/guards'
import { listSales } from '@/lib/pos/data'
import { listProducts } from '@/lib/cotizador/data'
import { SalesHistory } from '@/components/pos/SalesHistory'

export const dynamic = 'force-dynamic'

export default async function PosHistorialPage({
  searchParams,
}: {
  searchParams: { date?: string; product?: string }
}) {
  await requireRole('super_admin')
  const [sales, products] = await Promise.all([
    listSales({ date: searchParams.date, productId: searchParams.product }),
    listProducts(true),
  ])

  return (
    <div>
      <div className="mb-5">
        <Link href="/pos" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-4 w-4" />
          Volver a venta rápida
        </Link>
        <h1 className="mt-2 text-2xl font-bold tracking-tight sm:text-3xl">Historial de ventas</h1>
        <p className="mt-1 text-sm text-muted-foreground">Filtra por fecha o producto. Las ventas son inviolables — solo se anulan con motivo.</p>
      </div>

      <SalesHistory
        sales={sales}
        products={products.map((p) => ({ id: p.id, name: p.name }))}
        filters={{ date: searchParams.date ?? '', product: searchParams.product ?? '' }}
      />
    </div>
  )
}
