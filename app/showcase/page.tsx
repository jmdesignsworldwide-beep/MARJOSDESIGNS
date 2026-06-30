'use client'

import { useState } from 'react'
import {
  Wallet,
  ClipboardList,
  Timer,
  TrendingUp,
  Palette,
  PanelRightOpen,
} from 'lucide-react'
import { AppShell } from '@/components/layout/AppShell'
import { Button } from '@/components/ui/Button'
import { Card, CardHeader } from '@/components/ui/Card'
import { KpiCard } from '@/components/ui/KpiCard'
import { Badge } from '@/components/ui/Badge'
import { Input, Select, Textarea } from '@/components/ui/Field'
import { Skeleton, SkeletonCard } from '@/components/ui/Skeleton'
import { Modal } from '@/components/ui/Modal'
import { useToast } from '@/components/ui/Toast'
import {
  Table,
  TableHead,
  Th,
  TableBody,
  Tr,
  Td,
} from '@/components/ui/Table'
import { RevealGroup, RevealItem } from '@/components/motion/Reveal'
import { formatDOP } from '@/lib/utils'

function Section({
  title,
  description,
  children,
}: {
  title: string
  description?: string
  children: React.ReactNode
}) {
  return (
    <section className="mt-10 first:mt-0">
      <div className="mb-4">
        <h2 className="text-lg font-semibold tracking-tight">{title}</h2>
        {description && (
          <p className="mt-0.5 text-sm text-muted-foreground">{description}</p>
        )}
      </div>
      {children}
    </section>
  )
}

const sampleOrders = [
  { id: '#1042', client: 'Farmacia Carol', item: 'Volantes 5,000u', total: 8500, status: 'process' as const, label: 'En proceso' },
  { id: '#1041', client: 'Colmado El Buen Precio', item: 'Banner 8×3', total: 4200, status: 'ready' as const, label: 'Lista' },
  { id: '#1040', client: 'Salón Glamour', item: 'Tarjetas premium', total: 3100, status: 'overdue' as const, label: 'Vencida' },
  { id: '#1039', client: 'Restaurante Doña Ana', item: 'Menú laminado', total: 6750, status: 'neutral' as const, label: 'Entregada' },
]

export default function ShowcasePage() {
  const [modalOpen, setModalOpen] = useState(false)
  const [panelOpen, setPanelOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [inputError, setInputError] = useState(false)
  const { toast } = useToast()

  return (
    <AppShell>
      {/* Page heading */}
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <span className="inline-flex items-center gap-2 rounded-full border border-gold-mid/30 bg-gold-gradient-soft px-3 py-1 text-xs font-medium text-gold-brand">
            <Palette className="h-3.5 w-3.5" />
            Sistema de diseño · Tanda 1A
          </span>
          <h1 className="mt-3 text-3xl font-bold tracking-tight">
            Showcase de primitivos
          </h1>
          <p className="mt-1 max-w-xl text-muted-foreground">
            Cambia entre tema oscuro y claro (sol/luna arriba), abre el menú en
            móvil (390px) y revisa las animaciones. Esta página es temporal.
          </p>
        </div>
        <Button variant="secondary" onClick={() => setPanelOpen(true)}>
          <PanelRightOpen className="h-4 w-4" />
          Abrir panel
        </Button>
      </div>

      {/* KPIs */}
      <Section
        title="KPIs / Stat cards"
        description="Count-up al entrar en vista, con tabular-nums y línea dorada de firma."
      >
        <RevealGroup className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <RevealItem>
            <KpiCard label="Ventas del mes" value={284500} currency icon={Wallet} delta={12.5} />
          </RevealItem>
          <RevealItem>
            <KpiCard label="Órdenes activas" value={37} icon={ClipboardList} delta={4.2} />
          </RevealItem>
          <RevealItem>
            <KpiCard label="En producción" value={12} icon={Timer} delta={-2.1} />
          </RevealItem>
          <RevealItem>
            <KpiCard label="Ticket promedio" value={7689} currency icon={TrendingUp} delta={6.8} />
          </RevealItem>
        </RevealGroup>
      </Section>

      {/* Buttons */}
      <Section
        title="Botones"
        description="Primario dorado con glow, secundario, fantasma y peligro. Hover/tap con micro-interacción."
      >
        <Card>
          <div className="flex flex-wrap items-center gap-3">
            <Button variant="primary">Primario</Button>
            <Button variant="secondary">Secundario</Button>
            <Button variant="ghost">Fantasma</Button>
            <Button variant="danger">Peligro</Button>
            <Button
              variant="primary"
              loading={loading}
              onClick={() => {
                setLoading(true)
                window.setTimeout(() => setLoading(false), 1600)
              }}
            >
              {loading ? 'Guardando…' : 'Probar loading'}
            </Button>
            <Button variant="secondary" disabled>
              Deshabilitado
            </Button>
            <Button variant="primary" size="sm">
              Pequeño
            </Button>
            <Button variant="primary" size="lg">
              Grande
            </Button>
          </div>
        </Card>
      </Section>

      {/* Cards */}
      <Section
        title="Tarjetas / Cards"
        description="Glassmorphism en oscuro, sombra en capas en claro. La variante clickeable se levanta (patrón monster)."
      >
        <RevealGroup className="grid grid-cols-1 gap-4 md:grid-cols-3">
          <RevealItem>
            <Card>
              <CardHeader title="Card estándar" subtitle="Superficie base premium" />
              <p className="text-sm text-muted-foreground">
                Bordes suaves, profundidad por capas y fondo adaptado al tema
                activo.
              </p>
            </Card>
          </RevealItem>
          <RevealItem>
            <Card clickable onClick={() => toast({ title: 'Card clickeada', variant: 'info' })}>
              <CardHeader
                title="Card clickeable"
                subtitle="Hover magnético"
                action={<Badge status="process">Live</Badge>}
              />
              <p className="text-sm text-muted-foreground">
                Pasa el cursor: se eleva e insinúa que revela más. Haz click.
              </p>
            </Card>
          </RevealItem>
          <RevealItem>
            <Card>
              <CardHeader title="Resumen" subtitle="Con monto RD$" />
              <p className="tnum text-2xl font-bold text-gold-gradient">
                {formatDOP(128400)}
              </p>
              <p className="mt-1 text-sm text-muted-foreground">
                Pendiente por cobrar
              </p>
            </Card>
          </RevealItem>
        </RevealGroup>
      </Section>

      {/* Badges */}
      <Section
        title="Badges de estado"
        description="Colores funcionales (azul/verde/rojo/gris). El latido marca urgencias."
      >
        <Card>
          <div className="flex flex-wrap items-center gap-3">
            <Badge status="process">En proceso</Badge>
            <Badge status="ready">Lista</Badge>
            <Badge status="overdue" pulse>
              Vencida
            </Badge>
            <Badge status="neutral">Entregada</Badge>
          </div>
        </Card>
      </Section>

      {/* Inputs */}
      <Section
        title="Inputs / Select / Textarea"
        description="Focus dorado, estado de error rojo y deshabilitado."
      >
        <Card>
          <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
            <Input
              id="cliente"
              label="Cliente"
              placeholder="Nombre del cliente"
              hint="Escribe para ver el focus dorado"
            />
            <Input
              id="monto"
              label="Monto (RD$)"
              placeholder="0.00"
              inputMode="decimal"
              error={inputError ? 'Este campo es obligatorio' : undefined}
            />
            <Select id="tipo" label="Tipo de orden" defaultValue="">
              <option value="" disabled>
                Selecciona…
              </option>
              <option value="impresion">Impresión</option>
              <option value="diseno">Diseño gráfico</option>
              <option value="gran-formato">Gran formato</option>
            </Select>
            <Input id="disabled" label="Campo bloqueado" value="No editable" disabled />
            <Textarea
              id="notas"
              label="Notas"
              placeholder="Detalles de la orden…"
              className="md:col-span-2"
            />
          </div>
          <div className="mt-4 flex gap-3">
            <Button variant="secondary" onClick={() => setInputError((v) => !v)}>
              {inputError ? 'Quitar error' : 'Mostrar estado de error'}
            </Button>
          </div>
        </Card>
      </Section>

      {/* Toasts + Modal */}
      <Section
        title="Modal, panel y toasts"
        description="AnimatePresence, backdrop blur, scroll interno. Nunca atrapan al usuario."
      >
        <Card>
          <div className="flex flex-wrap gap-3">
            <Button onClick={() => setModalOpen(true)}>Abrir modal</Button>
            <Button variant="secondary" onClick={() => setPanelOpen(true)}>
              Abrir panel deslizante
            </Button>
            <Button
              variant="secondary"
              onClick={() => toast({ title: 'Orden creada', description: 'La orden #1043 se guardó correctamente.', variant: 'success' })}
            >
              Toast éxito
            </Button>
            <Button
              variant="secondary"
              onClick={() => toast({ title: 'Atención', description: 'Esta orden está por vencer.', variant: 'warning' })}
            >
              Toast aviso
            </Button>
            <Button
              variant="secondary"
              onClick={() => toast({ title: 'Error al guardar', description: 'Revisa tu conexión e intenta de nuevo.', variant: 'error' })}
            >
              Toast error
            </Button>
          </div>
        </Card>
      </Section>

      {/* Table */}
      <Section
        title="Tabla responsive"
        description="En móvil hace scroll interno sin romper el layout."
      >
        <Table>
          <TableHead>
            <Th>Orden</Th>
            <Th>Cliente</Th>
            <Th>Trabajo</Th>
            <Th className="text-right">Total</Th>
            <Th>Estado</Th>
          </TableHead>
          <TableBody>
            {sampleOrders.map((o) => (
              <Tr key={o.id}>
                <Td className="font-medium">{o.id}</Td>
                <Td>{o.client}</Td>
                <Td className="text-muted-foreground">{o.item}</Td>
                <Td className="tnum text-right font-medium">{formatDOP(o.total)}</Td>
                <Td>
                  <Badge status={o.status} pulse={o.status === 'overdue'}>
                    {o.label}
                  </Badge>
                </Td>
              </Tr>
            ))}
          </TableBody>
        </Table>
      </Section>

      {/* Skeletons */}
      <Section
        title="Skeleton loaders"
        description="Estados de carga con shimmer dorado."
      >
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <SkeletonCard />
          <SkeletonCard />
          <Card>
            <div className="flex items-center gap-4">
              <Skeleton className="h-12 w-12 rounded-full" />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-4 w-3/4" />
                <Skeleton className="h-3 w-1/2" />
              </div>
            </div>
            <Skeleton className="mt-4 h-24 w-full" />
          </Card>
        </div>
      </Section>

      <div className="mt-12 border-t border-border pt-6 text-center text-sm text-muted-foreground">
        Marjos Designs S.R.L. · Página de showcase temporal (Tanda 1A)
      </div>

      {/* Center modal */}
      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title="Nueva orden"
        description="Ejemplo de modal centrado con scroll interno."
      >
        <div className="space-y-4">
          <Input id="m-cliente" label="Cliente" placeholder="Nombre del cliente" />
          <Select id="m-tipo" label="Tipo" defaultValue="impresion">
            <option value="impresion">Impresión</option>
            <option value="diseno">Diseño gráfico</option>
          </Select>
          <Textarea id="m-notas" label="Notas" placeholder="Detalles…" />
          <div className="flex justify-end gap-3 pt-2">
            <Button variant="ghost" onClick={() => setModalOpen(false)}>
              Cancelar
            </Button>
            <Button
              onClick={() => {
                setModalOpen(false)
                toast({ title: 'Orden creada', variant: 'success' })
              }}
            >
              Guardar
            </Button>
          </div>
        </div>
      </Modal>

      {/* Right slide-over panel */}
      <Modal
        open={panelOpen}
        onClose={() => setPanelOpen(false)}
        variant="right"
        title="Detalle de orden #1042"
        description="Panel deslizante — ideal para móvil."
      >
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">Estado</span>
            <Badge status="process">En proceso</Badge>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">Cliente</span>
            <span className="text-sm font-medium">Farmacia Carol</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">Total</span>
            <span className="tnum text-sm font-semibold text-gold-brand">
              {formatDOP(8500)}
            </span>
          </div>
          <div className="rounded-xl border border-border bg-muted/40 p-4 text-sm text-muted-foreground">
            5,000 volantes full color, papel couché 150g, tiro y retiro.
          </div>
          <Button className="w-full" onClick={() => setPanelOpen(false)}>
            Marcar como lista
          </Button>
        </div>
      </Modal>
    </AppShell>
  )
}
