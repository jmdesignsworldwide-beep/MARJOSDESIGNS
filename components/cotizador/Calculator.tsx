'use client'

import { useMemo, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { AnimatePresence, motion } from 'framer-motion'
import {
  Plus,
  Trash2,
  Tag,
  Percent,
  PackagePlus,
  Save,
} from 'lucide-react'
import { cn, formatDOP } from '@/lib/utils'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { Modal } from '@/components/ui/Modal'
import { Select } from '@/components/ui/Field'
import { useToast } from '@/components/ui/Toast'
import { ProductForm } from './ProductForm'
import { ClientPicker } from '@/components/clientes/ClientPicker'
import { InchHelper } from './InchHelper'
import {
  computeLine,
  computeTotals,
  formatSqft,
  toInches,
  type CalcType,
  type LengthUnit,
} from '@/lib/cotizador/calc'
import { saveQuote } from '@/app/(app)/cotizador/actions'
import type { Product } from '@/lib/cotizador/data'

interface LineState {
  key: string
  productId: string | null
  description: string
  calcType: CalcType
  unitLabel: string
  /** Width/height as typed, in the line's chosen unit (converted to inches). */
  widthIn: string
  heightIn: string
  unit: LengthUnit
  quantity: string
  unitPrice: string
}

interface ClientOption {
  id: string
  name: string
}

function num(s: string): number {
  const n = parseFloat(s)
  return Number.isFinite(n) ? n : 0
}

export function Calculator({
  products,
  clients,
}: {
  products: Product[]
  clients: ClientOption[]
}) {
  const router = useRouter()
  const { toast } = useToast()
  const keySeq = useRef(0)

  const [lines, setLines] = useState<LineState[]>([])
  const [discountOpen, setDiscountOpen] = useState(false)
  const [discountType, setDiscountType] = useState<'amount' | 'percent'>('amount')
  const [discountValue, setDiscountValue] = useState('')
  const [clientId, setClientId] = useState<string>('')
  const [notes, setNotes] = useState('')
  const [newProduct, setNewProduct] = useState(false)
  const [saving, setSaving] = useState(false)

  function addLine(productId: string) {
    const p = products.find((x) => x.id === productId)
    if (!p) return
    setLines((prev) => [
      ...prev,
      {
        key: `l${keySeq.current++}`,
        productId: p.id,
        description: p.name,
        calcType: p.calc_type,
        unitLabel: p.unit_label,
        widthIn: '',
        heightIn: '',
        unit: 'in',
        quantity: '',
        unitPrice: String(p.base_price),
      },
    ])
  }

  function updateLine(key: string, patch: Partial<LineState>) {
    setLines((prev) => prev.map((l) => (l.key === key ? { ...l, ...patch } : l)))
  }
  function removeLine(key: string) {
    setLines((prev) => prev.filter((l) => l.key !== key))
  }

  const lineResults = useMemo(
    () =>
      lines.map((l) =>
        computeLine({
          calcType: l.calcType,
          unitPrice: num(l.unitPrice),
          widthIn: toInches(num(l.widthIn), l.unit),
          heightIn: toInches(num(l.heightIn), l.unit),
          quantity: num(l.quantity),
        }),
      ),
    [lines],
  )

  const totals = useMemo(
    () =>
      computeTotals(
        lineResults.map((r) => r.subtotal),
        {
          type: discountOpen ? discountType : 'none',
          value: num(discountValue),
        },
      ),
    [lineResults, discountOpen, discountType, discountValue],
  )

  const selectedClient = clients.find((c) => c.id === clientId)

  async function onSave() {
    if (lines.length === 0) {
      toast({ title: 'Agrega al menos un producto.', variant: 'warning' })
      return
    }
    setSaving(true)
    const res = await saveQuote({
      clientId: clientId || null,
      clientName: selectedClient?.name ?? '',
      notes,
      discountType: discountOpen ? discountType : 'none',
      discountValue: discountOpen ? num(discountValue) : 0,
      lines: lines.map((l) => ({
        productId: l.productId,
        description: l.description,
        calcType: l.calcType,
        widthIn: toInches(num(l.widthIn), l.unit),
        heightIn: toInches(num(l.heightIn), l.unit),
        quantity: num(l.quantity),
        unitPrice: num(l.unitPrice),
      })),
    })
    setSaving(false)
    if (res.ok && res.id) {
      toast({ title: 'Cotización guardada', variant: 'success' })
      router.push(`/cotizador/${res.id}`)
    } else {
      toast({ title: res.error ?? 'No se pudo guardar', variant: 'error' })
    }
  }

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
      {/* Left: lines */}
      <div className="space-y-4 lg:col-span-2">
        {/* Add product */}
        <Card>
          <div className="flex flex-wrap items-end gap-3">
            <div className="min-w-[200px] flex-1">
              <Select
                id="add-product"
                label="Agregar producto"
                value=""
                onChange={(e) => {
                  if (e.target.value) addLine(e.target.value)
                }}
              >
                <option value="">Elige un producto…</option>
                {products.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name} · {p.calc_type === 'area' ? 'por área' : 'por cantidad'} · {formatDOP(p.base_price)}
                    {p.calc_type === 'area' ? '/pie²' : ''}
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
            <span className="grid h-12 w-12 place-items-center rounded-2xl bg-gold-gradient-soft text-gold-brand">
              <Plus className="h-6 w-6" />
            </span>
            <p className="font-semibold">Empieza tu cotización</p>
            <p className="max-w-xs text-sm text-muted-foreground">
              Agrega productos arriba. Verás el desglose y el total en vivo.
            </p>
          </Card>
        ) : (
          <motion.div layout className="space-y-3">
            <AnimatePresence initial={false}>
              {lines.map((l, i) => (
                <LineRow
                  key={l.key}
                  line={l}
                  result={lineResults[i]}
                  onChange={(patch) => updateLine(l.key, patch)}
                  onRemove={() => removeLine(l.key)}
                />
              ))}
            </AnimatePresence>
          </motion.div>
        )}

        <InchHelper />
      </div>

      {/* Right: totals + save */}
      <div className="lg:col-span-1">
        <div className="sticky top-24 space-y-4">
          <Card>
            <h2 className="mb-4 text-base font-semibold">Resumen</h2>

            {/* Client — el MISMO selector en todo el sistema */}
            <div className="mb-4">
              <ClientPicker clients={clients} value={clientId} onChange={setClientId} />
            </div>

            {/* Totals */}
            <div className="space-y-2 border-t border-border pt-4 text-sm">
              <Row label="Subtotal" value={formatDOP(totals.subtotal)} />

              {discountOpen && (
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => setDiscountType('amount')}
                      className={cn('rounded px-1.5 text-xs', discountType === 'amount' ? 'bg-gold-gradient-soft text-gold-brand' : 'text-muted-foreground')}
                    >RD$</button>
                    <button
                      type="button"
                      onClick={() => setDiscountType('percent')}
                      className={cn('rounded px-1.5 text-xs', discountType === 'percent' ? 'bg-gold-gradient-soft text-gold-brand' : 'text-muted-foreground')}
                    >%</button>
                    <input
                      type="number"
                      inputMode="decimal"
                      min="0"
                      aria-label="Valor del descuento"
                      value={discountValue}
                      onChange={(e) => setDiscountValue(e.target.value)}
                      placeholder={discountType === 'amount' ? 'Monto' : '%'}
                      className="tnum h-8 w-20 rounded-lg border border-border bg-input/5 px-2 text-right text-sm outline-none focus:border-gold-mid"
                    />
                  </div>
                  <span className="tnum font-medium text-status-overdue">
                    − {formatDOP(totals.discountAmount)}
                  </span>
                </div>
              )}

              {!discountOpen ? (
                <button
                  type="button"
                  onClick={() => setDiscountOpen(true)}
                  className="inline-flex items-center gap-1.5 text-xs font-medium text-muted-foreground transition-colors hover:text-gold-brand"
                >
                  <Percent className="h-3.5 w-3.5" />
                  Agregar descuento
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => { setDiscountOpen(false); setDiscountValue('') }}
                  className="text-xs text-muted-foreground underline-offset-2 hover:underline"
                >
                  Quitar descuento
                </button>
              )}

              <div className="flex items-center justify-between border-t border-border pt-3">
                <span className="font-semibold">Total</span>
                <span className="tnum text-2xl font-bold text-gold-gradient transition-all">
                  {formatDOP(totals.total)}
                </span>
              </div>
              <div className="flex items-center justify-between rounded-lg bg-muted/50 px-3 py-2">
                <span className="text-muted-foreground">50% inicial (adelanto)</span>
                <span className="tnum font-semibold">{formatDOP(totals.deposit)}</span>
              </div>
            </div>

            <Button className="mt-4 w-full" onClick={onSave} loading={saving} disabled={lines.length === 0}>
              <Save className="h-4 w-4" />
              Guardar cotización
            </Button>
          </Card>
        </div>
      </div>

      {/* Modals */}
      <Modal open={newProduct} onClose={() => setNewProduct(false)} title="Nuevo producto" description="Se guarda en tu lista de precios.">
        <ProductForm onDone={() => { setNewProduct(false); router.refresh() }} />
      </Modal>
    </div>
  )
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-muted-foreground">{label}</span>
      <span className="tnum font-medium">{value}</span>
    </div>
  )
}

function LineRow({
  line,
  result,
  onChange,
  onRemove,
}: {
  line: LineState
  result: { sqft: number | null; subtotal: number }
  onChange: (patch: Partial<LineState>) => void
  onRemove: () => void
}) {
  const isArea = line.calcType === 'area'
  const unitWord = line.unit === 'ft' ? 'pies' : 'pulg'
  const breakdown = isArea
    ? `${line.widthIn || 0} × ${line.heightIn || 0} ${unitWord} = ${formatSqft(result.sqft)} pie² × ${formatDOP(num(line.unitPrice))}`
    : `${line.quantity || 0} × ${formatDOP(num(line.unitPrice))}`

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, height: 0, marginBottom: 0 }}
      transition={{ type: 'spring', stiffness: 300, damping: 28 }}
    >
      <Card>
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-2">
            <span className="font-semibold">{line.description}</span>
            <Badge status={isArea ? 'process' : 'neutral'}>
              {isArea ? 'Por área' : 'Por cantidad'}
            </Badge>
          </div>
          <button
            type="button"
            onClick={onRemove}
            aria-label="Quitar"
            className="text-muted-foreground transition-colors hover:text-status-overdue"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        </div>

        {isArea && (
          <div className="mt-3 flex items-center gap-1">
            <span className="mr-1 text-xs text-muted-foreground">Medidas en</span>
            {(['in', 'ft'] as LengthUnit[]).map((u) => (
              <button
                key={u}
                type="button"
                onClick={() => onChange({ unit: u })}
                className={cn('rounded-md px-2 py-0.5 text-xs font-medium transition-colors', line.unit === u ? 'bg-gold-gradient-soft text-gold-brand' : 'text-muted-foreground hover:text-foreground')}
              >
                {u === 'in' ? 'pulgadas' : 'pies'}
              </button>
            ))}
          </div>
        )}

        <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-4">
          {isArea ? (
            <>
              <NumField label={`Ancho (${unitWord})`} value={line.widthIn} onChange={(v) => onChange({ widthIn: v })} />
              <NumField label={`Alto (${unitWord})`} value={line.heightIn} onChange={(v) => onChange({ heightIn: v })} />
            </>
          ) : (
            <NumField label="Cantidad" value={line.quantity} onChange={(v) => onChange({ quantity: v })} />
          )}
          <NumField
            label={isArea ? 'Precio/pie²' : 'Precio unit.'}
            value={line.unitPrice}
            onChange={(v) => onChange({ unitPrice: v })}
            hintPrefix="RD$"
          />
        </div>

        <div className="mt-3 flex flex-wrap items-center justify-between gap-2 border-t border-border pt-3">
          <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <Tag className="h-3.5 w-3.5" />
            {breakdown} =
          </span>
          <span className="tnum text-lg font-bold">{formatDOP(result.subtotal)}</span>
        </div>
      </Card>
    </motion.div>
  )
}

function NumField({
  label,
  value,
  onChange,
  hintPrefix,
}: {
  label: string
  value: string
  onChange: (v: string) => void
  hintPrefix?: string
}) {
  return (
    <div>
      <label className="mb-1 block text-xs font-medium text-muted-foreground">{label}</label>
      <div className="relative">
        {hintPrefix && (
          <span className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">
            {hintPrefix}
          </span>
        )}
        <input
          type="number"
          inputMode="decimal"
          min="0"
          step="any"
          aria-label={label}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="0"
          className={cn(
            'tnum h-10 w-full rounded-lg border border-border bg-input/5 text-right text-sm outline-none transition-colors focus:border-gold-mid focus:ring-2 focus:ring-gold-mid/30',
            hintPrefix ? 'pl-10 pr-2.5' : 'px-2.5',
          )}
        />
      </div>
    </div>
  )
}
