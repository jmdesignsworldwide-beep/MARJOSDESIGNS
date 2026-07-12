import Link from 'next/link'
import { History, Wallet } from 'lucide-react'
import { requireRole } from '@/lib/auth/guards'
import { listProducts } from '@/lib/cotizador/data'
import { getOpenRegister } from '@/lib/caja/data'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { PosTerminal } from '@/components/pos/PosTerminal'

export const dynamic = 'force-dynamic'

export default async function PosPage() {
  await requireRole('super_admin')
  const [products, register] = await Promise.all([listProducts(), getOpenRegister()])

  return (
    <div>
      <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">Venta rápida</h1>
          <p className="mt-1 text-sm text-muted-foreground">Para el cliente que llega, compra y se va. Entra sola a la caja.</p>
        </div>
        <Link
          href="/pos/historial"
          className="inline-flex items-center gap-1.5 rounded-xl border border-border bg-card/60 px-3.5 py-2 text-sm font-medium text-muted-foreground transition-colors hover:border-gold-mid/50 hover:text-foreground"
        >
          <History className="h-4 w-4" />
          Historial de ventas
        </Link>
      </div>

      {!register ? (
        <Card className="mx-auto max-w-md text-center">
          <div className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-gold-gradient-soft text-gold-brand">
            <Wallet className="h-7 w-7" />
          </div>
          <h2 className="mt-4 text-lg font-bold tracking-tight">Abre la caja para vender</h2>
          <p className="mx-auto mt-1 max-w-xs text-sm text-muted-foreground">
            La venta rápida entra a la caja del día. Ábrela primero con su fondo inicial.
          </p>
          <Link href="/caja" className="mt-5 inline-block">
            <Button>
              <Wallet className="h-4 w-4" />
              Ir a abrir caja
            </Button>
          </Link>
        </Card>
      ) : (
        <PosTerminal products={products} />
      )}
    </div>
  )
}
