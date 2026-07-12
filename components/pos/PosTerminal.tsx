'use client'

import { useMemo, useRef, useState } from 'react'
import { Search, Plus, Trash2, Minus, Tag, X, ShoppingCart } from 'lucide-react'
import { cn, formatDOP } from '@/lib/utils'
import { computeTotals, type DiscountType } from '@/lib/cotizador/calc'
import { Card, CardHeader } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import type { Product } from '@/lib/cotizador/data'
import { PaymentModal } from './PaymentModal'
import { Receipt } from './Receipt'
import type { PosState } from '@/lib/pos/actions'

export interface CartLine {
  key: number
  productId: string | null
  description: string
  quantity: number
  unitPrice: number
}

export function PosTerminal({ products }: { products: Product[] }) {
  const [query, setQuery] = useState('')
  const [cart, setCart] = useState<CartLine[]>([])
  const [discountType, setDiscountType] = useState<DiscountType>('none')
  const [discountValue, setDiscountValue] = useState('')
  const [payOpen, setPayOpen] = useState(false)
  const [done, setDone] = useState<{ state: PosState; lines: CartLine[]; method: string; clientName: string } | null>(null)
  const keyRef = useRef(1)

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return products.slice(0, 8)
    return products.filter((p) => p.name.toLowerCase().includes(q)).slice(0, 8)
  }, [products, query])

  const totals = useMemo(
    () =>
      computeTotals(
        cart.map((l) => Math.round(l.quantity * l.unitPrice)),
        { type: discountType, value: Number(discountValue) || 0 },
      ),
    [cart, discountType, discountValue],
  )

  function addProduct(p: Product) {
    setCart((c) => {
      const existing = c.find((l) => l.productId === p.id)
      if (existing) return c.map((l) => (l.key === existing.key ? { ...l, quantity: l.quantity + 1 } : l))
      return [...c, { key: keyRef.current++, productId: p.id, description: p.name, quantity: 1, unitPrice: p.base_price }]
    })
    setQuery('')
  }

  function addCustom() {
    setCart((c) => [...c, { key: keyRef.current++, productId: null, description: '', quantity: 1, unitPrice: 0 }])
  }

  function update(key: number, patch: Partial<CartLine>) {
    setCart((c) => c.map((l) => (l.key === key ? { ...l, ...patch } : l)))
  }
  function remove(key: number) {
    setCart((c) => c.filter((l) => l.key !== key))
  }

  function onPaid(state: PosState, method: string, clientName: string) {
    setDone({ state, lines: cart, method, clientName })
    setPayOpen(false)
  }

  function reset() {
    setCart([])
    setDiscountType('none')
    setDiscountValue('')
    setDone(null)
  }

  if (done?.state.ok) {
    return (
      <Receipt
        saleNumber={done.state.saleNumber ?? 0}
        lines={done.lines}
        totals={totals}
        method={done.method}
        change={done.state.change ?? null}
        clientName={done.clientName}
        onNew={reset}
      />
    )
  }

  const canCharge = cart.length > 0 && cart.every((l) => l.description.trim() && l.quantity > 0) && totals.total > 0

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-5">
      {/* Product picker */}
      <div className="lg:col-span-3">
        <Card>
          <CardHeader title="Productos" subtitle="Busca en el catálogo o agrega un producto libre" />
          <div className="relative">
            <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input
              id="pos-search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Buscar producto…"
              className="h-11 w-full rounded-xl border border-border bg-input/5 pl-10 pr-3.5 text-sm outline-none focus:border-gold-mid focus:ring-2 focus:ring-gold-mid/30"
            />
          </div>
          <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2">
            {filtered.map((p) => (
              <button
                key={p.id}
                type="button"
                onClick={() => addProduct(p)}
                className="flex items-center justify-between rounded-xl border border-border bg-card/60 px-3.5 py-3 text-left transition-colors hover:border-gold-mid/50 dark:border-white/[0.08]"
              >
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium">{p.name}</p>
                  <p className="text-xs text-muted-foreground">{formatDOP(p.base_price)} · {p.unit_label}</p>
                </div>
                <span className="grid h-7 w-7 shrink-0 place-items-center rounded-lg bg-gold-gradient-soft text-gold-brand">
                  <Plus className="h-4 w-4" />
                </span>
              </button>
            ))}
            {filtered.length === 0 && (
              <p className="col-span-full py-4 text-center text-sm text-muted-foreground">Sin resultados para “{query}”.</p>
            )}
          </div>
          <button
            type="button"
            onClick={addCustom}
            className="mt-3 inline-flex items-center gap-1.5 text-sm font-medium text-gold-brand hover:underline"
          >
            <Plus className="h-4 w-4" />
            Producto libre (precio manual)
          </button>
        </Card>
      </div>

      {/* Cart + checkout */}
      <div className="lg:col-span-2">
        <div className="sticky top-24 space-y-4">
          <Card>
            <CardHeader title="Carrito" action={<ShoppingCart className="h-4 w-4 text-muted-foreground" />} />

            {cart.length === 0 ? (
              <p className="rounded-xl border border-dashed border-border bg-card/40 px-3.5 py-6 text-center text-sm text-muted-foreground dark:border-white/[0.08]">
                Toca un producto para agregarlo.
              </p>
            ) : (
              <ul className="space-y-3">
                {cart.map((l) => (
                  <li key={l.key} className="rounded-xl border border-border p-3 dark:border-white/[0.08]">
                    <div className="flex items-start justify-between gap-2">
                      {l.productId ? (
                        <p className="text-sm font-medium">{l.description}</p>
                      ) : (
                        <input
                          value={l.description}
                          onChange={(e) => update(l.key, { description: e.target.value })}
                          placeholder="Descripción"
                          className="w-full rounded-lg border border-border bg-input/5 px-2 py-1 text-sm outline-none focus:border-gold-mid"
                        />
                      )}
                      <button type="button" onClick={() => remove(l.key)} className="shrink-0 text-muted-foreground hover:text-status-overdue">
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                    <div className="mt-2 flex items-center gap-2">
                      <div className="flex items-center rounded-lg border border-border">
                        <button type="button" onClick={() => update(l.key, { quantity: Math.max(1, l.quantity - 1) })} className="grid h-8 w-8 place-items-center text-muted-foreground hover:text-foreground">
                          <Minus className="h-3.5 w-3.5" />
                        </button>
                        <input
                          type="number"
                          inputMode="numeric"
                          min="1"
                          value={l.quantity}
                          onChange={(e) => update(l.key, { quantity: Math.max(1, Math.floor(Number(e.target.value) || 1)) })}
                          className="tnum h-8 w-12 border-x border-border bg-transparent text-center text-sm outline-none"
                        />
                        <button type="button" onClick={() => update(l.key, { quantity: l.quantity + 1 })} className="grid h-8 w-8 place-items-center text-muted-foreground hover:text-foreground">
                          <Plus className="h-3.5 w-3.5" />
                        </button>
                      </div>
                      <span className="text-xs text-muted-foreground">×</span>
                      <div className="relative flex-1">
                        <span className="pointer-events-none absolute left-2 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">RD$</span>
                        <input
                          type="number"
                          inputMode="decimal"
                          min="0"
                          step="1"
                          value={l.unitPrice}
                          onChange={(e) => update(l.key, { unitPrice: Math.max(0, Number(e.target.value) || 0) })}
                          className="tnum h-8 w-full rounded-lg border border-border bg-input/5 pl-9 pr-2 text-sm outline-none focus:border-gold-mid"
                        />
                      </div>
                      <span className="tnum w-20 shrink-0 text-right text-sm font-semibold">{formatDOP(Math.round(l.quantity * l.unitPrice))}</span>
                    </div>
                  </li>
                ))}
              </ul>
            )}

            {/* Discount (only when toggled — mirror del cotizador) */}
            {cart.length > 0 && (
              <div className="mt-4 border-t border-border pt-4">
                {discountType === 'none' ? (
                  <button type="button" onClick={() => setDiscountType('amount')} className="inline-flex items-center gap-1.5 text-sm font-medium text-muted-foreground hover:text-gold-brand">
                    <Tag className="h-4 w-4" />
                    Agregar descuento
                  </button>
                ) : (
                  <div className="flex items-center gap-2">
                    <select value={discountType} onChange={(e) => setDiscountType(e.target.value as DiscountType)} className="h-9 rounded-lg border border-border bg-input/5 px-2 text-sm outline-none focus:border-gold-mid">
                      <option value="amount">RD$</option>
                      <option value="percent">%</option>
                    </select>
                    <input type="number" min="0" step="1" value={discountValue} onChange={(e) => setDiscountValue(e.target.value)} placeholder="0" className="tnum h-9 w-24 rounded-lg border border-border bg-input/5 px-2 text-sm outline-none focus:border-gold-mid" autoFocus />
                    <button type="button" onClick={() => { setDiscountType('none'); setDiscountValue('') }} className="text-muted-foreground hover:text-status-overdue">
                      <X className="h-4 w-4" />
                    </button>
                    <span className="tnum ml-auto text-sm text-status-overdue">− {formatDOP(totals.discountAmount)}</span>
                  </div>
                )}
              </div>
            )}

            {/* Totals */}
            <div className="mt-4 space-y-1 border-t border-border pt-4 text-sm">
              <div className="flex justify-between text-muted-foreground">
                <span>Subtotal</span>
                <span className="tnum">{formatDOP(totals.subtotal)}</span>
              </div>
              <div className="flex items-center justify-between pt-1">
                <span className="font-semibold">Total</span>
                <span className="tnum text-2xl font-bold text-gold-gradient">{formatDOP(totals.total)}</span>
              </div>
            </div>

            <Button onClick={() => setPayOpen(true)} disabled={!canCharge} size="lg" className="mt-4 w-full">
              Cobrar {totals.total > 0 ? formatDOP(totals.total) : ''}
            </Button>
          </Card>
        </div>
      </div>

      <PaymentModal
        open={payOpen}
        onClose={() => setPayOpen(false)}
        total={totals.total}
        cart={cart}
        discountType={discountType}
        discountValue={Number(discountValue) || 0}
        onPaid={onPaid}
      />
    </div>
  )
}
