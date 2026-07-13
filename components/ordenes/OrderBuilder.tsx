'use client'

import { useMemo, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { AnimatePresence, motion } from 'framer-motion'
import { Plus, Trash2, Tag, Percent, PackagePlus, Save, CalendarClock } from 'lucide-react'
import { cn, formatDOP } from '@/lib/utils'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { Modal } from '@/components/ui/Modal'
import { Select } from '@/components/ui/Field'
import { useToast } from '@/components/ui/Toast'
import { ProductForm } from '@/components/cotizador/ProductForm'
import { ClientPicker } from '@/components/clientes/ClientPicker'
import { computeLine, computeTotals, formatSqft, type CalcType } from '@/lib/cotizador/calc'
import { createOrder } from '@/app/(app)/ordenes/actions'
import type { Product } from '@/lib/cotizador/data'

interface LineState {
  key: string
  productId: string | null
  description: string
  calcType: CalcType
  widthIn: string
  heightIn: string
  quantity: string
  unitPrice: string
}

const num = (s: string) => {
  const n = parseFloat(s)
  return Number.isFinite(n) ? n : 0
}

export function OrderBuilder({
  products,
  clients,
  employees,
  defaultAssignee,
}: {
  products: Product[]
  clients: { id: string; name: string }[]
  employees: { id: string; name: string }[]
  defaultAssignee: string
}) {
  const router = useRouter()
  const { toast } = useToast()
  const keySeq = useRef(0)

  const [lines, setLines] = useState<LineState[]>([])
  const [discountOpen, setDiscountOpen] = useState(false)
  const [discountType, setDiscountType] = useState<'amount' | 'percent'>('amount')
  const [discountValue, setDiscountValue] = useState('')
  const [clientId, setClientId] = useState('')
  const [assignedTo, setAssignedTo] = useState(defaultAssignee)
  const [deliveryDate, setDeliveryDate] = useState('')
  const [notes, setNotes] = useState('')
  const [newProduct, setNewProduct] = useState(false)
  const [saving, setSaving] = useState(false)

  function addLine(productId: string) {
    const p = products.find((x) => x.id === productId)
    if (!p) return
    setLines((prev) => [
      ...prev,
      { key: `l${keySeq.current++}`, productId: p.id, description: p.name, calcType: p.calc_type, widthIn: '', heightIn: '', quantity: '', unitPrice: String(p.base_price) },
    ])
  }
  const patch = (key: string, p: Partial<LineState>) =>
    setLines((prev) => prev.map((l) => (l.key === key ? { ...l, ...p } : l)))
  const remove = (key: string) => setLines((prev) => prev.filter((l) => l.key !== key))

  const results = useMemo(
    () => lines.map((l) => computeLine({ calcType: l.calcType, unitPrice: num(l.unitPrice), widthIn: num(l.widthIn), heightIn: num(l.heightIn), quantity: num(l.quantity) })),
    [lines],
  )
  const totals = useMemo(
    () => computeTotals(results.map((r) => r.subtotal), { type: discountOpen ? discountType : 'none', value: num(discountValue) }),
    [results, discountOpen, discountType, discountValue],
  )

  async function onSave() {
    if (lines.length === 0) {
      toast({ title: 'Agrega al menos un ítem.', variant: 'warning' })
      return
    }
    setSaving(true)
    const res = await createOrder({
      clientId: clientId || null,
      assignedTo: assignedTo || null,
      deliveryDate: deliveryDate || '',
      notes,
      discountType: discountOpen ? discountType : 'none',
      discountValue: discountOpen ? num(discountValue) : 0,
      items: lines.map((l) => ({
        productId: l.productId,
        description: l.description,
        calcType: l.calcType,
        widthIn: num(l.widthIn),
        heightIn: num(l.heightIn),
        quantity: num(l.quantity),
        unitPrice: num(l.unitPrice),
      })),
    })
    setSaving(false)
    if (res.ok && res.id) {
      toast({ title: 'Orden creada', variant: 'success' })
      router.push(`/ordenes/${res.id}`)
    } else {
      toast({ title: res.error ?? 'No se pudo crear la orden', variant: 'error' })
    }
  }

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
      <div className="space-y-4 lg:col-span-2">
        <Card>
          <div className="flex flex-wrap items-end gap-3">
            <div className="min-w-[200px] flex-1">
              <Select id="add-product" label="Agregar ítem" value="" onChange={(e) => e.target.value && addLine(e.target.value)}>
                <option value="">Elige un producto…</option>
                {products.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name} · {p.calc_type === 'area' ? 'por área' : 'por cantidad'} · {formatDOP(p.base_price)}{p.calc_type === 'area' ? '/pie²' : ''}
                  </option>
                ))}
              </Select>
            </div>
            <Button variant="secondary" onClick={() => setNewProduct(true)}>
              <PackagePlus className="h-4 w-4" />
              Nuevo producto
            </Button>
          </div>
        </Card>

        {lines.length === 0 ? (
          <Card className="flex flex-col items-center gap-2 py-12 text-center">
            <span className="grid h-12 w-12 place-items-center rounded-2xl bg-gold-gradient-soft text-gold-brand"><Plus className="h-6 w-6" /></span>
            <p className="font-semibold">Arma la orden</p>
            <p className="max-w-xs text-sm text-muted-foreground">Agrega ítems arriba. El total se calcula exacto, igual que el cotizador.</p>
          </Card>
        ) : (
          <motion.div layout className="space-y-3">
            <AnimatePresence initial={false}>
              {lines.map((l, i) => (
                <LineRow key={l.key} line={l} result={results[i]} onChange={(p) => patch(l.key, p)} onRemove={() => remove(l.key)} />
              ))}
            </AnimatePresence>
          </motion.div>
        )}
      </div>

      <div className="lg:col-span-1">
        <div className="sticky top-24 space-y-4">
          <Card className="space-y-4">
            <h2 className="text-base font-semibold">Orden</h2>

            <ClientPicker clients={clients} value={clientId} onChange={setClientId} />


            <Field label="Empleada asignada">
              <NativeSelect value={assignedTo} onChange={setAssignedTo}>
                {employees.map((e) => <option key={e.id} value={e.id}>{e.name}</option>)}
              </NativeSelect>
            </Field>

            <Field label="Fecha de entrega">
              <div className="relative">
                <CalendarClock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <input type="date" value={deliveryDate} onChange={(e) => setDeliveryDate(e.target.value)} className="tnum h-11 w-full rounded-xl border border-border bg-input/5 pl-10 pr-3 text-sm outline-none focus:border-gold-mid focus:ring-2 focus:ring-gold-mid/30" />
              </div>
            </Field>

            <Field label="Notas / descripción">
              <textarea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Detalles del trabajo…" className="min-h-[72px] w-full rounded-xl border border-border bg-input/5 px-3.5 py-2.5 text-sm outline-none focus:border-gold-mid focus:ring-2 focus:ring-gold-mid/30" />
            </Field>

            {/* Totals */}
            <div className="space-y-2 border-t border-border pt-4 text-sm">
              <Row label="Subtotal" value={formatDOP(totals.subtotal)} />
              {discountOpen && (
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-1">
                    <button type="button" onClick={() => setDiscountType('amount')} className={cn('rounded px-1.5 text-xs', discountType === 'amount' ? 'bg-gold-gradient-soft text-gold-brand' : 'text-muted-foreground')}>RD$</button>
                    <button type="button" onClick={() => setDiscountType('percent')} className={cn('rounded px-1.5 text-xs', discountType === 'percent' ? 'bg-gold-gradient-soft text-gold-brand' : 'text-muted-foreground')}>%</button>
                    <input type="number" inputMode="decimal" min="0" aria-label="Valor del descuento" value={discountValue} onChange={(e) => setDiscountValue(e.target.value)} placeholder={discountType === 'amount' ? 'Monto' : '%'} className="tnum h-8 w-20 rounded-lg border border-border bg-input/5 px-2 text-right text-sm outline-none focus:border-gold-mid" />
                  </div>
                  <span className="tnum font-medium text-status-overdue">− {formatDOP(totals.discountAmount)}</span>
                </div>
              )}
              {!discountOpen ? (
                <button type="button" onClick={() => setDiscountOpen(true)} className="inline-flex items-center gap-1.5 text-xs font-medium text-muted-foreground hover:text-gold-brand"><Percent className="h-3.5 w-3.5" />Agregar descuento</button>
              ) : (
                <button type="button" onClick={() => { setDiscountOpen(false); setDiscountValue('') }} className="text-xs text-muted-foreground underline-offset-2 hover:underline">Quitar descuento</button>
              )}
              <div className="flex items-center justify-between border-t border-border pt-3">
                <span className="font-semibold">Total</span>
                <span className="tnum text-2xl font-bold text-gold-gradient">{formatDOP(totals.total)}</span>
              </div>
              <div className="flex items-center justify-between rounded-lg bg-muted/50 px-3 py-2">
                <span className="text-muted-foreground">50% inicial (adelanto)</span>
                <span className="tnum font-semibold">{formatDOP(totals.deposit)}</span>
              </div>
            </div>

            <Button className="w-full" onClick={onSave} loading={saving} disabled={lines.length === 0}>
              <Save className="h-4 w-4" />
              Crear orden
            </Button>
          </Card>
        </div>
      </div>

      <Modal open={newProduct} onClose={() => setNewProduct(false)} title="Nuevo producto"><ProductForm onDone={() => { setNewProduct(false); router.refresh() }} /></Modal>
    </div>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <label className="text-sm font-medium">{label}</label>
      {children}
    </div>
  )
}
function NativeSelect({ value, onChange, children }: { value: string; onChange: (v: string) => void; children: React.ReactNode }) {
  return (
    <select value={value} onChange={(e) => onChange(e.target.value)} className="h-11 flex-1 w-full appearance-none rounded-xl border border-border bg-input/5 px-3.5 text-sm outline-none focus:border-gold-mid focus:ring-2 focus:ring-gold-mid/30">
      {children}
    </select>
  )
}
function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between"><span className="text-muted-foreground">{label}</span><span className="tnum font-medium">{value}</span></div>
  )
}

function LineRow({ line, result, onChange, onRemove }: { line: LineState; result: { sqft: number | null; subtotal: number }; onChange: (p: Partial<LineState>) => void; onRemove: () => void }) {
  const isArea = line.calcType === 'area'
  const breakdown = isArea
    ? `${line.widthIn || 0} × ${line.heightIn || 0} pulg = ${formatSqft(result.sqft)} pie² × ${formatDOP(num(line.unitPrice))}`
    : `${line.quantity || 0} × ${formatDOP(num(line.unitPrice))}`
  return (
    <motion.div layout initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, height: 0, marginBottom: 0 }} transition={{ type: 'spring', stiffness: 300, damping: 28 }}>
      <Card>
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-2">
            <span className="font-semibold">{line.description}</span>
            <Badge status={isArea ? 'process' : 'neutral'}>{isArea ? 'Por área' : 'Por cantidad'}</Badge>
          </div>
          <button type="button" onClick={onRemove} aria-label="Quitar" className="text-muted-foreground hover:text-status-overdue"><Trash2 className="h-4 w-4" /></button>
        </div>
        <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-4">
          {isArea ? (
            <>
              <NumField label="Ancho (pulg)" value={line.widthIn} onChange={(v) => onChange({ widthIn: v })} />
              <NumField label="Alto (pulg)" value={line.heightIn} onChange={(v) => onChange({ heightIn: v })} />
            </>
          ) : (
            <NumField label="Cantidad" value={line.quantity} onChange={(v) => onChange({ quantity: v })} />
          )}
          <NumField label={isArea ? 'Precio/pie²' : 'Precio unit.'} value={line.unitPrice} onChange={(v) => onChange({ unitPrice: v })} hintPrefix="RD$" />
        </div>
        <div className="mt-3 flex flex-wrap items-center justify-between gap-2 border-t border-border pt-3">
          <span className="flex items-center gap-1.5 text-xs text-muted-foreground"><Tag className="h-3.5 w-3.5" />{breakdown} =</span>
          <span className="tnum text-lg font-bold">{formatDOP(result.subtotal)}</span>
        </div>
      </Card>
    </motion.div>
  )
}

function NumField({ label, value, onChange, hintPrefix }: { label: string; value: string; onChange: (v: string) => void; hintPrefix?: string }) {
  return (
    <div>
      <label className="mb-1 block text-xs font-medium text-muted-foreground">{label}</label>
      <div className="relative">
        {hintPrefix && <span className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">{hintPrefix}</span>}
        <input type="number" inputMode="decimal" min="0" step="any" aria-label={label} value={value} onChange={(e) => onChange(e.target.value)} placeholder="0" className={cn('tnum h-10 w-full rounded-lg border border-border bg-input/5 text-right text-sm outline-none focus:border-gold-mid focus:ring-2 focus:ring-gold-mid/30', hintPrefix ? 'pl-10 pr-2.5' : 'px-2.5')} />
      </div>
    </div>
  )
}
