'use client'

import { useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Search, UserPlus, User, Building2, Users } from 'lucide-react'
import { cn, formatPhone } from '@/lib/utils'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { Modal } from '@/components/ui/Modal'
import { EmptyState } from '@/components/dashboard/EmptyState'
import { Table, TableHead, Th, TableBody, Tr, Td } from '@/components/ui/Table'
import { ClientForm } from './ClientForm'
import type { Client, ClientType, ClientStatus } from '@/lib/clients/data'

type TypeFilter = 'all' | ClientType
type StatusFilter = 'all' | ClientStatus

export function ClientesList({ clients }: { clients: Client[] }) {
  const router = useRouter()
  const [query, setQuery] = useState('')
  const [typeF, setTypeF] = useState<TypeFilter>('all')
  const [statusF, setStatusF] = useState<StatusFilter>('activo')
  const [creating, setCreating] = useState(false)

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    return clients.filter((c) => {
      if (typeF !== 'all' && c.type !== typeF) return false
      if (statusF !== 'all' && c.status !== statusF) return false
      if (!q) return true
      const hay = `${c.name} ${c.phone ?? ''} ${c.whatsapp ?? ''} ${c.email ?? ''}`.toLowerCase()
      return hay.includes(q)
    })
  }, [clients, query, typeF, statusF])

  return (
    <div>
      <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">Clientes</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Tu gente: personas y empresas. {clients.length} registrado
            {clients.length === 1 ? '' : 's'}.
          </p>
        </div>
        <Button onClick={() => setCreating(true)}>
          <UserPlus className="h-4 w-4" />
          Nuevo cliente
        </Button>
      </div>

      {/* Search + filters */}
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Buscar por nombre, teléfono o email…"
            className="h-11 w-full rounded-xl border border-border bg-input/5 pl-10 pr-3.5 text-sm outline-none transition-colors focus:border-gold-mid focus:ring-2 focus:ring-gold-mid/30"
          />
        </div>
        <div className="flex gap-2">
          <FilterPills
            value={typeF}
            onChange={setTypeF}
            options={[
              { v: 'all', label: 'Todos' },
              { v: 'persona', label: 'Personas' },
              { v: 'empresa', label: 'Empresas' },
            ]}
          />
        </div>
      </div>
      <div className="mb-4">
        <FilterPills
          value={statusF}
          onChange={setStatusF}
          options={[
            { v: 'activo', label: 'Activos' },
            { v: 'inactivo', label: 'Inactivos' },
            { v: 'all', label: 'Todos' },
          ]}
        />
      </div>

      {clients.length === 0 ? (
        <EmptyState
          icon={Users}
          title="Aún no hay clientes."
          subtitle="Registra tu primer cliente con el botón “Nuevo cliente”. Se guarda de verdad."
        />
      ) : filtered.length === 0 ? (
        <EmptyState icon={Search} title="Sin resultados." subtitle="Ajusta la búsqueda o los filtros." />
      ) : (
        <Table>
          <TableHead>
            <Th>Cliente</Th>
            <Th>Tipo</Th>
            <Th>Teléfono</Th>
            <Th className="text-right">Total gastado</Th>
            <Th>Última orden</Th>
            <Th>Estado</Th>
          </TableHead>
          <TableBody>
            {filtered.map((c) => {
              const Icon = c.type === 'empresa' ? Building2 : User
              return (
                <Tr key={c.id} onClick={() => router.push(`/clientes/${c.id}`)}>
                  <Td>
                    <span className="font-medium">{c.name}</span>
                    {c.email && (
                      <span className="block text-xs text-muted-foreground">{c.email}</span>
                    )}
                  </Td>
                  <Td>
                    <span className="inline-flex items-center gap-1.5 text-muted-foreground">
                      <Icon className="h-3.5 w-3.5" />
                      <span className="capitalize">{c.type}</span>
                    </span>
                  </Td>
                  <Td className="tnum text-muted-foreground">{formatPhone(c.phone)}</Td>
                  <Td className="tnum text-right text-muted-foreground">—</Td>
                  <Td className="text-muted-foreground">—</Td>
                  <Td>
                    <Badge status={c.status === 'activo' ? 'ready' : 'neutral'}>
                      {c.status === 'activo' ? 'Activo' : 'Inactivo'}
                    </Badge>
                  </Td>
                </Tr>
              )
            })}
          </TableBody>
        </Table>
      )}

      <Modal
        open={creating}
        onClose={() => setCreating(false)}
        title="Nuevo cliente"
        description="Registra una persona o empresa."
      >
        <ClientForm
          mode="create"
          onDone={(createdId) => {
            setCreating(false)
            if (createdId) router.push(`/clientes/${createdId}`)
          }}
        />
      </Modal>
    </div>
  )
}

function FilterPills<T extends string>({
  value,
  onChange,
  options,
}: {
  value: T
  onChange: (v: T) => void
  options: { v: T; label: string }[]
}) {
  return (
    <div className="inline-flex rounded-xl border border-border p-1">
      {options.map((o) => (
        <button
          key={o.v}
          type="button"
          onClick={() => onChange(o.v)}
          className={cn(
            'rounded-lg px-3 py-1.5 text-sm font-medium transition-colors',
            value === o.v
              ? 'bg-gold-gradient-soft text-gold-brand'
              : 'text-muted-foreground hover:text-foreground',
          )}
        >
          {o.label}
        </button>
      ))}
    </div>
  )
}
