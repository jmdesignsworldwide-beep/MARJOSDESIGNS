import { notFound } from 'next/navigation'
import { requireRole } from '@/lib/auth/guards'
import { getQuote } from '@/lib/cotizador/data'
import { QuoteDetail } from '@/components/cotizador/QuoteDetail'

export const dynamic = 'force-dynamic'

export default async function QuoteDetailPage({
  params,
}: {
  params: { id: string }
}) {
  await requireRole('super_admin')
  const data = await getQuote(params.id)
  if (!data) notFound()
  return <QuoteDetail quote={data.quote} lines={data.lines} />
}
