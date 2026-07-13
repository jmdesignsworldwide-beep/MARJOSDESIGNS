'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Search, ChevronDown, UserPlus, X, Check } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Modal } from '@/components/ui/Modal'
import { ClientForm } from './ClientForm'

export interface ClientOption {
  id: string
  name: string
}

/**
 * The ONE way to choose a client across the whole system (Órdenes, Cotizador,
 * POS, Caja). Searches the REGISTERED clients — no loose free text. If the
 * client isn't there yet, "Registrar cliente nuevo" opens the same form and the
 * new client is selected on return. Reuse this everywhere; never hand-roll a
 * client field again.
 */
export function ClientPicker({
  clients,
  value,
  onChange,
  label = 'Cliente',
  noneLabel = 'Sin cliente (general)',
  allowNone = true,
  placeholder = 'Buscar cliente…',
}: {
  clients: ClientOption[]
  value: string
  onChange: (id: string) => void
  label?: string
  noneLabel?: string
  allowNone?: boolean
  placeholder?: string
}) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [newOpen, setNewOpen] = useState(false)
  const wrapRef = useRef<HTMLDivElement>(null)

  const selected = clients.find((c) => c.id === value) ?? null

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return clients.slice(0, 50)
    return clients.filter((c) => c.name.toLowerCase().includes(q)).slice(0, 50)
  }, [clients, query])

  // Close on outside click.
  useEffect(() => {
    if (!open) return
    function onDoc(e: MouseEvent) {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', onDoc)
    return () => document.removeEventListener('mousedown', onDoc)
  }, [open])

  function pick(id: string) {
    onChange(id)
    setOpen(false)
    setQuery('')
  }

  return (
    <div ref={wrapRef} className="relative">
      {label && <label className="mb-1.5 block text-sm font-medium text-foreground">{label}</label>}

      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex h-11 w-full items-center gap-2 rounded-xl border border-border bg-input/5 px-3.5 text-left text-sm outline-none transition-colors focus:border-gold-mid focus:ring-2 focus:ring-gold-mid/30"
      >
        <span className={cn('flex-1 truncate', !selected && 'text-muted-foreground')}>
          {selected ? selected.name : noneLabel}
        </span>
        {selected && (
          <span
            role="button"
            tabIndex={-1}
            aria-label="Quitar cliente"
            onClick={(e) => { e.stopPropagation(); onChange('') }}
            className="grid h-5 w-5 place-items-center rounded text-muted-foreground hover:text-status-overdue"
          >
            <X className="h-3.5 w-3.5" />
          </span>
        )}
        <ChevronDown className={cn('h-4 w-4 shrink-0 text-muted-foreground transition-transform', open && 'rotate-180')} />
      </button>

      {open && (
        <div className="absolute z-30 mt-1.5 w-full overflow-hidden rounded-xl border border-border bg-card shadow-lg dark:border-white/[0.08]">
          <div className="relative border-b border-border p-2 dark:border-white/[0.08]">
            <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input
              autoFocus
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={placeholder}
              className="h-9 w-full rounded-lg border border-border bg-input/5 pl-9 pr-3 text-sm outline-none focus:border-gold-mid"
            />
          </div>

          <ul className="max-h-56 overflow-y-auto py-1">
            {allowNone && (
              <li>
                <button type="button" onClick={() => pick('')} className="flex w-full items-center justify-between px-3.5 py-2 text-left text-sm text-muted-foreground hover:bg-muted/50">
                  {noneLabel}
                  {!value && <Check className="h-4 w-4 text-gold-brand" />}
                </button>
              </li>
            )}
            {filtered.map((c) => (
              <li key={c.id}>
                <button type="button" onClick={() => pick(c.id)} className="flex w-full items-center justify-between px-3.5 py-2 text-left text-sm hover:bg-muted/50">
                  <span className="truncate">{c.name}</span>
                  {value === c.id && <Check className="h-4 w-4 shrink-0 text-gold-brand" />}
                </button>
              </li>
            ))}
            {filtered.length === 0 && (
              <li className="px-3.5 py-3 text-center text-xs text-muted-foreground">
                Sin clientes que coincidan con “{query}”.
              </li>
            )}
          </ul>

          <button
            type="button"
            onClick={() => { setNewOpen(true); setOpen(false) }}
            className="flex w-full items-center gap-2 border-t border-border px-3.5 py-2.5 text-left text-sm font-medium text-gold-brand hover:bg-gold-gradient-soft dark:border-white/[0.08]"
          >
            <UserPlus className="h-4 w-4" />
            Registrar cliente nuevo
          </button>
        </div>
      )}

      <Modal open={newOpen} onClose={() => setNewOpen(false)} title="Nuevo cliente" description="Se guarda en tu lista de clientes.">
        <ClientForm
          mode="create"
          onDone={(createdId) => {
            setNewOpen(false)
            if (createdId) onChange(createdId)
            router.refresh()
          }}
        />
      </Modal>
    </div>
  )
}
