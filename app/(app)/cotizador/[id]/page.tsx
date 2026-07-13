import { notFound } from 'next/navigation'
import { requireRole } from '@/lib/auth/guards'
import { getQuote } from '@/lib/cotizador/data'
import { getBusinessInfo } from '@/lib/settings/data'
import { QuoteDetail } from '@/components/cotizador/QuoteDetail'

export const dynamic = 'force-dynamic'

export default async function QuoteDetailPage({
  params,
}: {
  params: { id: string }
}) {
  await requireRole('super_admin')
  const [data, business] = await Promise.all([getQuote(params.id), getBusinessInfo()])
  if (!data) notFound()
  return <QuoteDetail quote={data.quote} lines={data.lines} business={business} />
}
