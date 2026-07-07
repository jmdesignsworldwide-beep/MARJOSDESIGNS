'use client'

import { useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Search, ScrollText } from 'lucide-react'
import { formatDOP } from '@/lib/utils'
import { Badge } from '@/components/ui/Badge'
import { EmptyState } from '@/components/dashboard/EmptyState'
import { Table, TableHead, Th, TableBody, Tr, Td } from '@/components/ui/Table'
import { quoteCode } from '@/lib/cotizador/format'
import type { Quote } from '@/lib/cotizador/data'

const statusBadge: Record<Quote['status'], { s: 'ready' | 'process' | 'neutral'; label: string }> = {
  guardada: { s: 'process', label: 'Guardada' },
  convertida: { s: 'ready', label: 'Convertida' },
  anulada: { s: 'neutral', label: 'Anulada' },
}

export function QuotesHistory({ quotes }: { quotes: Quote[] }) {
  const router = useRouter()
  const [q, setQ] = useState('')

  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase()
    if (!s) return quotes
    return quotes.filter(
      (x) =>
        (x.client_name ?? '').toLowerCase().includes(s) ||
        quoteCode(x.number).toLowerCase().includes(s),
    )
  }, [quotes, q])

  return (
    <div>
      <div className="mb-4 relative max-w-md">
        <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Buscar por cliente o número…"
          className="h-11 w-full rounded-xl border border-border bg-input/5 pl-10 pr-3.5 text-sm outline-none focus:border-gold-mid focus:ring-2 focus:ring-gold-mid/30"
        />
      </div>

      {quotes.length === 0 ? (
        <EmptyState
          icon={ScrollText}
          title="Aún no hay cotizaciones."
          subtitle="Las cotizaciones que guardes aparecerán aquí."
        />
      ) : filtered.length === 0 ? (
        <EmptyState icon={Search} title="Sin resultados." />
      ) : (
        <Table>
          <TableHead>
            <Th>Número</Th>
            <Th>Cliente</Th>
            <Th className="text-right">Total</Th>
            <Th className="text-right">50% inicial</Th>
            <Th>Estado</Th>
            <Th className="text-right">Fecha</Th>
          </TableHead>
          <TableBody>
            {filtered.map((x) => {
              const b = statusBadge[x.status]
              return (
                <Tr key={x.id} onClick={() => router.push(`/cotizador/${x.id}`)}>
                  <Td className="font-medium">{quoteCode(x.number)}</Td>
                  <Td>{x.client_name ?? 'Sin cliente'}</Td>
                  <Td className="tnum text-right font-medium">{formatDOP(x.total)}</Td>
                  <Td className="tnum text-right text-muted-foreground">{formatDOP(x.deposit)}</Td>
                  <Td><Badge status={b.s}>{b.label}</Badge></Td>
                  <Td className="tnum text-right text-muted-foreground">
                    {new Date(x.created_at).toLocaleDateString('es-DO', { day: '2-digit', month: '2-digit', year: '2-digit' })}
                  </Td>
                </Tr>
              )
            })}
          </TableBody>
        </Table>
      )}
    </div>
  )
}
