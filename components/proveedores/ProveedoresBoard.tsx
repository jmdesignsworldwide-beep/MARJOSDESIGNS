'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Plus, Truck, Phone, User, ChevronRight } from 'lucide-react'
import { formatDOP } from '@/lib/utils'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { EmptyState } from '@/components/dashboard/EmptyState'
import { WhatsAppButton } from '@/components/clientes/WhatsAppButton'
import { SupplierForm } from './SupplierForm'
import { PriceComparison } from './PriceComparison'
import type { Supplier, MaterialComparison } from '@/lib/proveedores/types'

export function ProveedoresBoard({
  suppliers,
  comparisons,
  hikes,
}: {
  suppliers: Supplier[]
  comparisons: MaterialComparison[]
  hikes: { supplierName: string; materialName: string; oldPrice: number; newPrice: number; createdAt: string }[]
}) {
  const [addOpen, setAddOpen] = useState(false)

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">Proveedores</h1>
          <p className="mt-1 text-sm text-muted-foreground">A quién le compras, a qué precio, y cómo pedirle — en un clic.</p>
        </div>
        <Button onClick={() => setAddOpen(true)}><Plus className="h-4 w-4" />Nuevo proveedor</Button>
      </div>

      <PriceComparison comparisons={comparisons} hikes={hikes} />

      {suppliers.length === 0 ? (
        <EmptyState icon={Truck} title="Aún no hay proveedores" subtitle="Registra tu primer suplidor con su WhatsApp y sus precios." />
      ) : (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {suppliers.map((s) => (
            <Card key={s.id} className="flex flex-col">
              <Link href={`/proveedores/${s.id}`} className="group flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="truncate font-semibold group-hover:text-gold-brand">{s.name}</p>
                  {s.contact_person && <p className="flex items-center gap-1 truncate text-xs text-muted-foreground"><User className="h-3 w-3" />{s.contact_person}</p>}
                  {(s.phone || s.whatsapp) && <p className="flex items-center gap-1 truncate text-xs text-muted-foreground"><Phone className="h-3 w-3" />{s.whatsapp || s.phone}</p>}
                </div>
                <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5" />
              </Link>
              {s.balance_owed > 0 && <p className="mt-2 text-xs text-status-overdue">Le debes {formatDOP(s.balance_owed)}</p>}
              <div className="mt-3 flex items-center gap-2 border-t border-border pt-3 dark:border-white/[0.08]">
                <WhatsAppButton phone={s.whatsapp || s.phone} size="sm" label="WhatsApp" message={`Hola 👋, te escribo de Marjos Designs.`} className="flex-1" />
                <Link href={`/proveedores/${s.id}`}><Button variant="secondary" size="sm">Ver</Button></Link>
              </div>
            </Card>
          ))}
        </div>
      )}

      <SupplierForm open={addOpen} onClose={() => setAddOpen(false)} goToDetailOnCreate />
    </div>
  )
}
