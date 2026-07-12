'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { ArrowDownLeft, ArrowUpRight, ExternalLink, Search, Filter } from 'lucide-react'
import { cn, formatDOP } from '@/lib/utils'
import { Badge } from '@/components/ui/Badge'
import { EmptyState } from '@/components/dashboard/EmptyState'
import { Landmark } from 'lucide-react'
import { bucketMeta, methodLabel, type LedgerEntry, type LedgerFilters } from '@/lib/finanzas/types'

function fmt(d: string) {
  return new Date(d).toLocaleDateString('es-DO', { day: '2-digit', month: 'short', year: '2-digit' })
}

export function LedgerTable({
  entries,
  filters,
  period,
}: {
  entries: LedgerEntry[]
  filters: LedgerFilters
  period: { from: string; to: string }
}) {
  const router = useRouter()
  const [q, setQ] = useState(filters.q ?? '')

  function apply(patch: Partial<LedgerFilters & { from: string; to: string }>) {
    const next = { ...filters, from: period.from, to: period.to, ...patch }
    const p = new URLSearchParams()
    for (const [k, v] of Object.entries(next)) if (v) p.set(k, String(v))
    router.push(`/finanzas${p.toString() ? `?${p}` : ''}`)
  }

  const totalIn = entries.filter((e) => e.type === 'entrada').reduce((s, e) => s + e.amount, 0)
  const totalOut = entries.filter((e) => e.type === 'salida').reduce((s, e) => s + e.amount, 0)

  return (
    <div>
      {/* Filters */}
      <div className="no-print mb-4 flex flex-wrap items-center gap-2">
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && apply({ q: q || undefined })}
            onBlur={() => filters.q !== q && apply({ q: q || undefined })}
            placeholder="Buscar concepto o monto…"
            className="h-9 w-56 rounded-xl border border-border bg-input/5 pl-9 pr-3 text-sm outline-none focus:border-gold-mid"
          />
        </div>
        <Filter className="h-4 w-4 text-muted-foreground" />
        <input type="date" value={period.from} onChange={(e) => apply({ from: e.target.value })} className="tnum h-9 rounded-xl border border-border bg-input/5 px-2.5 text-sm outline-none focus:border-gold-mid" />
        <span className="text-xs text-muted-foreground">a</span>
        <input type="date" value={period.to} onChange={(e) => apply({ to: e.target.value })} className="tnum h-9 rounded-xl border border-border bg-input/5 px-2.5 text-sm outline-none focus:border-gold-mid" />
        <select value={filters.type ?? ''} onChange={(e) => apply({ type: (e.target.value || undefined) as LedgerFilters['type'] })} className="h-9 rounded-xl border border-border bg-input/5 px-2.5 text-sm outline-none focus:border-gold-mid">
          <option value="">Todo</option>
          <option value="entrada">Entradas</option>
          <option value="salida">Salidas</option>
        </select>
        <select value={filters.bucket ?? ''} onChange={(e) => apply({ bucket: (e.target.value || undefined) as LedgerFilters['bucket'] })} className="h-9 rounded-xl border border-border bg-input/5 px-2.5 text-sm outline-none focus:border-gold-mid">
          <option value="">Categoría</option>
          <option value="ingreso">Ingreso</option>
          <option value="produccion">Producción</option>
          <option value="negocio">Negocio</option>
          <option value="personal">Personal</option>
        </select>
        <select value={filters.method ?? ''} onChange={(e) => apply({ method: e.target.value || undefined })} className="h-9 rounded-xl border border-border bg-input/5 px-2.5 text-sm outline-none focus:border-gold-mid">
          <option value="">Método</option>
          {['efectivo', 'transferencia', 'debito', 'credito'].map((m) => <option key={m} value={m}>{methodLabel[m]}</option>)}
        </select>
        {(filters.type || filters.bucket || filters.method || filters.q) && (
          <button type="button" onClick={() => apply({ type: undefined, bucket: undefined, method: undefined, q: undefined })} className="text-sm text-muted-foreground hover:text-foreground">Limpiar</button>
        )}
      </div>

      {/* Period totals */}
      <div className="mb-4 flex flex-wrap gap-4 text-sm">
        <span className="text-muted-foreground">Entradas: <span className="tnum font-semibold text-status-ready">{formatDOP(totalIn)}</span></span>
        <span className="text-muted-foreground">Salidas: <span className="tnum font-semibold text-status-overdue">{formatDOP(totalOut)}</span></span>
        <span className="text-muted-foreground">Neto: <span className={cn('tnum font-semibold', totalIn - totalOut >= 0 ? 'text-status-ready' : 'text-status-overdue')}>{formatDOP(totalIn - totalOut)}</span></span>
      </div>

      {entries.length === 0 ? (
        <EmptyState icon={Landmark} title="Sin movimientos" subtitle="No hay entradas ni salidas en este periodo/filtro." />
      ) : (
        <ul className="divide-y divide-border">
          {entries.map((e) => {
            const out = e.type === 'salida'
            const m = bucketMeta[e.bucket]
            const body = (
              <>
                <span className={cn('grid h-9 w-9 shrink-0 place-items-center rounded-xl', out ? 'bg-status-overdue/10 text-status-overdue' : 'bg-status-ready/10 text-status-ready')}>
                  {out ? <ArrowUpRight className="h-4 w-4" /> : <ArrowDownLeft className="h-4 w-4" />}
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5">
                    <p className="truncate text-sm font-medium">{e.concept}</p>
                    {e.href && <ExternalLink className="h-3 w-3 shrink-0 text-muted-foreground" />}
                  </div>
                  <p className="text-xs text-muted-foreground">{fmt(e.date)} · {methodLabel[e.method] ?? e.method}</p>
                </div>
                <Badge status={m.status}>{m.label}</Badge>
                <span className={cn('tnum w-24 shrink-0 text-right text-sm font-semibold', out ? 'text-status-overdue' : 'text-status-ready')}>
                  {out ? '− ' : '+ '}{formatDOP(e.amount)}
                </span>
              </>
            )
            return (
              <li key={e.id}>
                {e.href ? (
                  <Link href={e.href} className="flex items-center gap-3 py-3 transition-colors hover:bg-muted/30">{body}</Link>
                ) : (
                  <div className="flex items-center gap-3 py-3">{body}</div>
                )}
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}
