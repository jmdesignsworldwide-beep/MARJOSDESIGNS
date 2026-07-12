import Link from 'next/link'
import { notFound } from 'next/navigation'
import { ArrowLeft } from 'lucide-react'
import { requireRole } from '@/lib/auth/guards'
import { getRegister, listMovements, summarize } from '@/lib/caja/data'
import { CajaBoard } from '@/components/caja/CajaBoard'
import { fmtDateLong } from '@/lib/caja/format'

export const dynamic = 'force-dynamic'

export default async function CajaDayPage({ params }: { params: { id: string } }) {
  await requireRole('super_admin')
  const register = await getRegister(params.id)
  if (!register) notFound()
  const movements = await listMovements(register.id)
  const summary = summarize(register, movements)

  return (
    <div>
      <div className="mb-5">
        <Link href="/caja/historial" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-4 w-4" />
          Volver al historial
        </Link>
        <h1 className="mt-2 text-2xl font-bold tracking-tight capitalize sm:text-3xl">{fmtDateLong(register.business_date)}</h1>
      </div>
      <CajaBoard register={register} summary={summary} movements={movements} />
    </div>
  )
}
