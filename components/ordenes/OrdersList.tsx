'use client'

import { useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Search, Plus, ClipboardList } from 'lucide-react'
import { cn, formatDOP } from '@/lib/utils'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { EmptyState } from '@/components/dashboard/EmptyState'
import { Table, TableHead, Th, TableBody, Tr, Td } from '@/components/ui/Table'
import { orderCode, stageMeta, type OrderStage } from '@/lib/ordenes/format'
import type { Order } from '@/lib/ordenes/data'

const STAGE_FILTERS: { v: 'all' | OrderStage; label: string }[] = [
  { v: 'all', label: 'Todas' },
  { v: 'recibida', label: 'Recibidas' },
  { v: 'en_produccion', label: 'En producción' },
  { v: 'lista', label: 'Listas' },
  { v: 'entregada', label: 'Entregadas' },
]

function fmtDate(d: string | null) {
  if (!d) return '—'
  return new Date(d + 'T00:00:00').toLocaleDateString('es-DO', { day: '2-digit', month: 'short' })
}

export function OrdersList({
  orders,
  employees,
}: {
  orders: Order[]
  employees: { id: string; name: string }[]
}) {
  const router = useRouter()
  const [q, setQ] = useState('')
  const [stage, setStage] = useState<'all' | OrderStage>('all')
  const [emp, setEmp] = useState('all')

  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase()
    return orders.filter((o) => {
      if (stage !== 'all' && o.stage !== stage) return false
      if (emp !== 'all' && o.assigned_to !== emp) return false
      if (!s) return true
      return (
        orderCode(o.number).toLowerCase().includes(s) ||
        (o.client_name ?? '').toLowerCase().includes(s) ||
        (o.description ?? '').toLowerCase().includes(s)
      )
    })
  }, [orders, q, stage, emp])

  return (
    <div>
      <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">Órdenes</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {orders.length} orden{orders.length === 1 ? '' : 'es'} · ordenadas por entrega
          </p>
        </div>
        <Button onClick={() => router.push('/ordenes/nueva')}>
          <Plus className="h-4 w-4" />
          Nueva orden
        </Button>
      </div>

      <div className="mb-4 flex flex-col gap-3 lg:flex-row lg:items-center">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Buscar por número, cliente o trabajo…"
            className="h-11 w-full rounded-xl border border-border bg-input/5 pl-10 pr-3.5 text-sm outline-none focus:border-gold-mid focus:ring-2 focus:ring-gold-mid/30"
          />
        </div>
        <select
          value={emp}
          onChange={(e) => setEmp(e.target.value)}
          className="h-11 appearance-none rounded-xl border border-border bg-input/5 px-3.5 text-sm outline-none focus:border-gold-mid"
        >
          <option value="all">Toda empleada</option>
          {employees.map((e) => <option key={e.id} value={e.id}>{e.name}</option>)}
        </select>
      </div>

      <div className="mb-4 flex flex-wrap gap-1 rounded-xl border border-border p-1 sm:inline-flex">
        {STAGE_FILTERS.map((f) => (
          <button
            key={f.v}
            type="button"
            onClick={() => setStage(f.v)}
            className={cn(
              'rounded-lg px-3 py-1.5 text-sm font-medium transition-colors',
              stage === f.v ? 'bg-gold-gradient-soft text-gold-brand' : 'text-muted-foreground hover:text-foreground',
            )}
          >
            {f.label}
          </button>
        ))}
      </div>

      {orders.length === 0 ? (
        <EmptyState
          icon={ClipboardList}
          title="Aún no hay órdenes."
          subtitle="Crea tu primera orden con “Nueva orden”, o convierte una cotización. El Dashboard se encenderá al instante."
        />
      ) : filtered.length === 0 ? (
        <EmptyState icon={Search} title="Sin resultados." subtitle="Ajusta la búsqueda o los filtros." />
      ) : (
        <Table>
          <TableHead>
            <Th>Orden</Th>
            <Th>Cliente</Th>
            <Th>Trabajo</Th>
            <Th>Empleada</Th>
            <Th>Entrega</Th>
            <Th className="text-right">Total</Th>
            <Th>Estado</Th>
          </TableHead>
          <TableBody>
            {filtered.map((o) => {
              const m = stageMeta[o.stage]
              return (
                <Tr key={o.id} onClick={() => router.push(`/ordenes/${o.id}`)}>
                  <Td className="font-medium">{orderCode(o.number)}</Td>
                  <Td>{o.client_name ?? 'Sin cliente'}</Td>
                  <Td className="max-w-[200px] truncate text-muted-foreground">{o.description ?? '—'}</Td>
                  <Td className="text-muted-foreground">{o.assigned_name ?? '—'}</Td>
                  <Td className="tnum text-muted-foreground">{fmtDate(o.delivery_date)}</Td>
                  <Td className="tnum text-right font-medium">{formatDOP(o.total)}</Td>
                  <Td><Badge status={m.status}>{m.label}</Badge></Td>
                </Tr>
              )
            })}
          </TableBody>
        </Table>
      )}
    </div>
  )
}
