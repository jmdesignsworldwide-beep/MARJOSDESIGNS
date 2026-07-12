import Link from 'next/link'
import { ArrowLeft, CheckCircle2, AlertTriangle, Wallet } from 'lucide-react'
import { requireRole } from '@/lib/auth/guards'
import { listRegisters } from '@/lib/caja/data'
import { Card } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { EmptyState } from '@/components/dashboard/EmptyState'
import { formatDOP } from '@/lib/utils'
import { fmtDateLong } from '@/lib/caja/format'

export const dynamic = 'force-dynamic'

export default async function CajaHistorialPage() {
  await requireRole('super_admin')
  const registers = await listRegisters()

  return (
    <div>
      <div className="mb-5">
        <Link href="/caja" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-4 w-4" />
          Volver a caja
        </Link>
        <h1 className="mt-2 text-2xl font-bold tracking-tight sm:text-3xl">Historial de cajas</h1>
        <p className="mt-1 text-sm text-muted-foreground">Cada día tiene su cierre — permanente e inviolable.</p>
      </div>

      {registers.length === 0 ? (
        <EmptyState icon={Wallet} title="Aún no hay cajas" subtitle="Cuando abras y cierres la caja del día, quedará aquí su historia." />
      ) : (
        <div className="space-y-3">
          {registers.map((r) => {
            const closed = r.status === 'cerrada'
            const diff = r.difference ?? 0
            const cuadra = closed && diff === 0
            return (
              <Link key={r.id} href={`/caja/historial/${r.id}`}>
                <Card clickable className="flex flex-wrap items-center justify-between gap-4">
                  <div>
                    <p className="font-semibold capitalize">{fmtDateLong(r.business_date)}</p>
                    <p className="mt-0.5 text-xs text-muted-foreground">Fondo inicial {formatDOP(r.opening_float)}</p>
                  </div>
                  <div className="flex items-center gap-4">
                    {closed ? (
                      <>
                        <div className="text-right">
                          <p className="text-xs text-muted-foreground">Contado</p>
                          <p className="tnum font-semibold">{formatDOP(r.counted_cash ?? 0)}</p>
                        </div>
                        <span
                          className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium ${
                            cuadra ? 'bg-status-ready/10 text-status-ready' : 'bg-status-overdue/10 text-status-overdue'
                          }`}
                        >
                          {cuadra ? <CheckCircle2 className="h-3.5 w-3.5" /> : <AlertTriangle className="h-3.5 w-3.5" />}
                          {cuadra ? 'Cuadró' : `${diff > 0 ? '+' : ''}${formatDOP(diff)}`}
                        </span>
                      </>
                    ) : (
                      <Badge status="ready">Abierta</Badge>
                    )}
                  </div>
                </Card>
              </Link>
            )
          })}
        </div>
      )}
    </div>
  )
}
