import { requireRole } from '@/lib/auth/guards'
import { listQuotes } from '@/lib/cotizador/data'
import { CotizadorTabs } from '@/components/cotizador/CotizadorTabs'
import { QuotesHistory } from '@/components/cotizador/QuotesHistory'

export const dynamic = 'force-dynamic'

export default async function HistorialPage() {
  await requireRole('super_admin')
  const quotes = await listQuotes()

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">Cotizador</h1>
        <p className="mt-1 text-sm text-muted-foreground">Historial de cotizaciones.</p>
      </div>
      <CotizadorTabs />
      <QuotesHistory quotes={quotes} />
    </div>
  )
}
