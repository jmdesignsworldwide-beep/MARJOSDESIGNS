import { requireRole } from '@/lib/auth/guards'
import { listProducts, getPriceHistory } from '@/lib/cotizador/data'
import { CotizadorTabs } from '@/components/cotizador/CotizadorTabs'
import { PricePanel } from '@/components/cotizador/PricePanel'

export const dynamic = 'force-dynamic'

export default async function PreciosPage() {
  await requireRole('super_admin')
  const [products, history] = await Promise.all([
    listProducts(true), // include inactive
    getPriceHistory(),
  ])

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">Cotizador</h1>
        <p className="mt-1 text-sm text-muted-foreground">Panel de precios y productos.</p>
      </div>
      <CotizadorTabs />
      <PricePanel products={products} history={history} />
    </div>
  )
}
