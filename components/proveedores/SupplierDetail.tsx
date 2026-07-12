'use client'

import { useState } from 'react'
import Link from 'next/link'
import { ArrowLeft, Pencil, Plus, Phone, Mail, MapPin, User, Tag, ShoppingBag, History, Power } from 'lucide-react'
import { cn, formatDOP } from '@/lib/utils'
import { Card, CardHeader } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { Modal } from '@/components/ui/Modal'
import { EmptyState } from '@/components/dashboard/EmptyState'
import { WhatsAppButton } from '@/components/clientes/WhatsAppButton'
import { toggleSupplier } from '@/lib/proveedores/actions'
import { methodLabel, type Supplier, type SupplierPrice, type PriceHistoryRow, type SupplierPurchase, type Material } from '@/lib/proveedores/types'
import { SupplierForm } from './SupplierForm'
import { SetPriceModal } from './SetPriceModal'
import { PurchaseModal } from './PurchaseModal'

function fmtDate(d: string) {
  return new Date(d).toLocaleDateString('es-DO', { day: '2-digit', month: 'short', year: 'numeric' })
}

export function SupplierDetail({
  supplier,
  prices,
  history,
  purchases,
  materials,
  categories,
}: {
  supplier: Supplier
  prices: SupplierPrice[]
  history: PriceHistoryRow[]
  purchases: SupplierPurchase[]
  materials: Material[]
  categories: { id: string; name: string }[]
}) {
  const [edit, setEdit] = useState(false)
  const [priceOpen, setPriceOpen] = useState(false)
  const [pricePreset, setPricePreset] = useState<{ materialId?: string; price?: number }>({})
  const [purchaseOpen, setPurchaseOpen] = useState(false)
  const [confirmOff, setConfirmOff] = useState(false)
  const inactive = supplier.status === 'inactivo'

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Link href="/proveedores" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"><ArrowLeft className="h-4 w-4" />Proveedores</Link>
        <div className="flex gap-2">
          <WhatsAppButton phone={supplier.whatsapp || supplier.phone} label="WhatsApp" message={`Hola 👋, te escribo de Marjos Designs.`} />
          <Button variant="secondary" onClick={() => setEdit(true)}><Pencil className="h-4 w-4" />Editar</Button>
        </div>
      </div>

      <Card>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-bold tracking-tight">{supplier.name}</h1>
              {inactive && <Badge status="neutral">Inactivo</Badge>}
            </div>
            <div className="mt-2 grid grid-cols-1 gap-x-8 gap-y-1.5 text-sm sm:grid-cols-2">
              {supplier.contact_person && <Meta icon={User}>{supplier.contact_person}</Meta>}
              {(supplier.whatsapp || supplier.phone) && <Meta icon={Phone}>{supplier.whatsapp || supplier.phone}</Meta>}
              {supplier.email && <Meta icon={Mail}>{supplier.email}</Meta>}
              {supplier.address && <Meta icon={MapPin}>{supplier.address}</Meta>}
            </div>
          </div>
          {supplier.balance_owed > 0 && (
            <div className="rounded-xl border border-status-overdue/30 bg-status-overdue/10 px-3.5 py-2 text-right">
              <p className="text-xs text-muted-foreground">Le debes</p>
              <p className="tnum font-bold text-status-overdue">{formatDOP(supplier.balance_owed)}</p>
            </div>
          )}
        </div>
        {supplier.notes && <p className="mt-3 border-t border-border pt-3 text-sm text-muted-foreground dark:border-white/[0.08]">{supplier.notes}</p>}
      </Card>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Price list */}
        <Card>
          <CardHeader title="Lista de precios" subtitle="Qué te vende y a cuánto" action={<Button size="sm" variant="secondary" onClick={() => { setPricePreset({}); setPriceOpen(true) }}><Plus className="h-4 w-4" />Precio</Button>} />
          {prices.length === 0 ? (
            <EmptyState icon={Tag} title="Sin precios" subtitle="Agrega qué materiales te vende este proveedor." />
          ) : (
            <ul className="divide-y divide-border">
              {prices.map((p) => (
                <li key={p.id}>
                  <button type="button" onClick={() => { setPricePreset({ materialId: p.material_id, price: p.price }); setPriceOpen(true) }} className="flex w-full items-center justify-between gap-2 py-2.5 text-left transition-colors hover:opacity-80">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium">{p.material_name}</p>
                      <p className="text-xs text-muted-foreground">Actualizado {fmtDate(p.updated_at)}</p>
                    </div>
                    <span className="tnum shrink-0 text-sm font-semibold">{formatDOP(p.price)}<span className="text-xs font-normal text-muted-foreground">/{p.unit}</span></span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </Card>

        {/* Purchases */}
        <Card>
          <CardHeader title="Compras" subtitle="Se registran como gasto de producción" action={<Button size="sm" variant="secondary" onClick={() => setPurchaseOpen(true)}><ShoppingBag className="h-4 w-4" />Compra</Button>} />
          {purchases.length === 0 ? (
            <EmptyState icon={ShoppingBag} title="Sin compras registradas" subtitle="Registra una compra y entra sola a Gastos." />
          ) : (
            <ul className="divide-y divide-border">
              {purchases.map((c) => (
                <li key={c.id} className="flex items-center justify-between gap-2 py-2.5">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium">{c.description}</p>
                    <p className="text-xs text-muted-foreground">{fmtDate(c.expense_date)} · {methodLabel[c.method] ?? c.method}</p>
                  </div>
                  <span className="tnum shrink-0 text-sm font-semibold">{formatDOP(c.amount)}</span>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>

      {/* Price history */}
      {history.length > 0 && (
        <Card>
          <CardHeader title="Historial de cambios de precio" subtitle="Quién cambió qué y cuándo" action={<History className="h-4 w-4 text-muted-foreground" />} />
          <ul className="divide-y divide-border">
            {history.map((h) => (
              <li key={h.id} className="flex items-center justify-between gap-2 py-2 text-sm">
                <span className="min-w-0 truncate">{h.material_name}</span>
                <div className="flex shrink-0 items-center gap-2 text-xs text-muted-foreground">
                  {h.old_price != null && <span className="tnum line-through">{formatDOP(h.old_price)}</span>}
                  <span className={cn('tnum font-semibold', h.old_price != null && h.new_price > h.old_price ? 'text-status-overdue' : 'text-status-ready')}>{formatDOP(h.new_price)}</span>
                  <span>· {fmtDate(h.created_at)}{h.actor ? ` · ${h.actor}` : ''}</span>
                </div>
              </li>
            ))}
          </ul>
        </Card>
      )}

      {/* Soft-delete */}
      <div className="flex justify-center">
        <button type="button" onClick={() => setConfirmOff(true)} className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-status-overdue">
          <Power className="h-4 w-4" />{inactive ? 'Reactivar proveedor' : 'Desactivar proveedor'}
        </button>
      </div>

      <SupplierForm open={edit} onClose={() => setEdit(false)} editing={supplier} />
      <SetPriceModal open={priceOpen} onClose={() => setPriceOpen(false)} supplierId={supplier.id} materials={materials} presetMaterialId={pricePreset.materialId} presetPrice={pricePreset.price} />
      <PurchaseModal open={purchaseOpen} onClose={() => setPurchaseOpen(false)} supplierId={supplier.id} categories={categories} materials={materials} />

      <Modal open={confirmOff} onClose={() => setConfirmOff(false)} title={inactive ? 'Reactivar proveedor' : 'Desactivar proveedor'} description={inactive ? 'Volverá a aparecer en la lista.' : 'Se oculta de la lista pero conserva su historial (no se borra).'}>
        <form action={toggleSupplier}>
          <input type="hidden" name="id" value={supplier.id} />
          <input type="hidden" name="status" value={inactive ? 'activo' : 'inactivo'} />
          <div className="flex justify-end gap-3">
            <Button type="button" variant="ghost" onClick={() => setConfirmOff(false)}>Cancelar</Button>
            <Button type="submit" variant={inactive ? 'primary' : 'danger'} onClick={() => setConfirmOff(false)}>{inactive ? 'Reactivar' : 'Desactivar'}</Button>
          </div>
        </form>
      </Modal>
    </div>
  )
}

function Meta({ icon: Icon, children }: { icon: typeof User; children: React.ReactNode }) {
  return <div className="flex items-center gap-2 text-muted-foreground"><Icon className="h-4 w-4 shrink-0" /><span className="truncate text-foreground">{children}</span></div>
}
