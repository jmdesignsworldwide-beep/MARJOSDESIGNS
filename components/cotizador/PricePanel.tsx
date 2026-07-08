'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useFormState, useFormStatus } from 'react-dom'
import { PackagePlus, Check, Power, History } from 'lucide-react'
import { formatDOP } from '@/lib/utils'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { Modal } from '@/components/ui/Modal'
import { useToast } from '@/components/ui/Toast'
import { Table, TableHead, Th, TableBody, Tr, Td } from '@/components/ui/Table'
import { ProductForm } from './ProductForm'
import {
  updateProductPrice,
  setProductStatus,
  type PanelActionState,
} from '@/app/(app)/cotizador/actions'
import type { Product, PriceHistoryRow } from '@/lib/cotizador/data'

const initial: PanelActionState = {}

function SaveBtn() {
  const { pending } = useFormStatus()
  return (
    <Button type="submit" size="sm" loading={pending} variant="secondary">
      <Check className="h-3.5 w-3.5" />
      Guardar
    </Button>
  )
}

function PriceRow({ product }: { product: Product }) {
  const [state, formAction] = useFormState(updateProductPrice, initial)
  const { toast } = useToast()
  useEffect(() => {
    if (state.success) toast({ title: state.success, variant: 'success' })
    if (state.error) toast({ title: state.error, variant: 'error' })
  }, [state, toast])

  return (
    <Tr>
      <Td>
        <span className="font-medium">{product.name}</span>
      </Td>
      <Td className="text-muted-foreground">
        {product.calc_type === 'area' ? 'Por área (pie²)' : 'Por cantidad'}
      </Td>
      <Td>
        <form action={formAction} className="flex items-center justify-end gap-2">
          <input type="hidden" name="id" value={product.id} />
          <div className="relative">
            <span className="pointer-events-none absolute left-2 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">RD$</span>
            <input
              type="number"
              name="basePrice"
              inputMode="decimal"
              step="0.01"
              min="0"
              defaultValue={product.base_price}
              className="tnum h-9 w-28 rounded-lg border border-border bg-input/5 pl-9 pr-2 text-right text-sm outline-none focus:border-gold-mid focus:ring-2 focus:ring-gold-mid/30"
            />
          </div>
          <SaveBtn />
        </form>
      </Td>
      <Td>
        <Badge status={product.status === 'activo' ? 'ready' : 'neutral'}>
          {product.status === 'activo' ? 'Activo' : 'Inactivo'}
        </Badge>
      </Td>
      <Td>
        <form action={setProductStatus} className="flex justify-end">
          <input type="hidden" name="id" value={product.id} />
          <input type="hidden" name="status" value={product.status === 'activo' ? 'inactivo' : 'activo'} />
          <button
            type="submit"
            className="inline-flex items-center gap-1.5 rounded-lg border border-border px-2.5 py-1 text-xs font-medium text-muted-foreground transition-colors hover:border-gold-mid/50 hover:text-foreground"
          >
            <Power className="h-3.5 w-3.5" />
            {product.status === 'activo' ? 'Desactivar' : 'Activar'}
          </button>
        </form>
      </Td>
    </Tr>
  )
}

export function PricePanel({
  products,
  history,
}: {
  products: Product[]
  history: PriceHistoryRow[]
}) {
  const router = useRouter()
  const [creating, setCreating] = useState(false)

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold tracking-tight">Lista de precios</h2>
          <p className="text-sm text-muted-foreground">
            Edita un precio y guárdalo — la próxima cotización lo usa.
          </p>
        </div>
        <Button onClick={() => setCreating(true)}>
          <PackagePlus className="h-4 w-4" />
          Nuevo producto
        </Button>
      </div>

      <Table>
        <TableHead>
          <Th>Producto</Th>
          <Th>Tipo</Th>
          <Th className="text-right">Precio base</Th>
          <Th>Estado</Th>
          <Th className="text-right">Acción</Th>
        </TableHead>
        <TableBody>
          {products.map((p) => (
            <PriceRow key={p.id} product={p} />
          ))}
        </TableBody>
      </Table>

      {/* Price history */}
      <div>
        <div className="mb-3 flex items-center gap-2">
          <History className="h-4 w-4 text-gold-brand" />
          <h2 className="text-lg font-semibold tracking-tight">Historial de cambios de precio</h2>
        </div>
        {history.length === 0 ? (
          <Card className="py-8 text-center text-sm text-muted-foreground">
            Aún no hay cambios de precio registrados.
          </Card>
        ) : (
          <Table>
            <TableHead>
              <Th>Producto</Th>
              <Th className="text-right">Antes</Th>
              <Th className="text-right">Ahora</Th>
              <Th className="text-right">Fecha</Th>
            </TableHead>
            <TableBody>
              {history.map((h) => (
                <Tr key={h.id}>
                  <Td>{h.product_name ?? '—'}</Td>
                  <Td className="tnum text-right text-muted-foreground">{h.old_price != null ? formatDOP(h.old_price) : '—'}</Td>
                  <Td className="tnum text-right font-medium">{h.new_price != null ? formatDOP(h.new_price) : '—'}</Td>
                  <Td className="tnum text-right text-muted-foreground">
                    {new Date(h.created_at).toLocaleString('es-DO', { day: '2-digit', month: '2-digit', year: '2-digit', hour: '2-digit', minute: '2-digit' })}
                  </Td>
                </Tr>
              ))}
            </TableBody>
          </Table>
        )}
      </div>

      <Modal open={creating} onClose={() => setCreating(false)} title="Nuevo producto" description="Se agrega a tu lista de precios.">
        <ProductForm onDone={() => { setCreating(false); router.refresh() }} />
      </Modal>
    </div>
  )
}
