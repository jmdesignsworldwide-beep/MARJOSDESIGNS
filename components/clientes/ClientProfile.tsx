'use client'

import { useState } from 'react'
import Link from 'next/link'
import {
  ArrowLeft,
  Pencil,
  Power,
  User,
  Building2,
  Phone,
  Mail,
  MapPin,
  Package,
  Sparkles,
  CalendarClock,
  StickyNote,
  IdCard,
} from 'lucide-react'
import { formatDOP, formatPhone } from '@/lib/utils'
import { Card, CardHeader } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Modal } from '@/components/ui/Modal'
import { KpiCard } from '@/components/ui/KpiCard'
import { Textarea } from '@/components/ui/Field'
import { useToast } from '@/components/ui/Toast'
import { EmptyState } from '@/components/dashboard/EmptyState'
import { WhatsAppButton } from './WhatsAppButton'
import { ClientForm } from './ClientForm'
import type { Client, ClientStats } from '@/lib/clients/data'
import { setClientStatus, saveClientNotes } from '@/app/(app)/clientes/actions'

export function ClientProfile({
  client,
  stats,
}: {
  client: Client
  stats: ClientStats
}) {
  const [editing, setEditing] = useState(false)
  const [confirming, setConfirming] = useState(false)
  const [notes, setNotes] = useState(client.notes ?? '')
  const [savingNotes, setSavingNotes] = useState(false)
  const { toast } = useToast()

  const isCompany = client.type === 'empresa'
  const active = client.status === 'activo'
  const waMsg = `Hola ${client.name.split(' ')[0]} 👋, te escribo de Marjos Designs.`

  async function onSaveNotes() {
    setSavingNotes(true)
    const fd = new FormData()
    fd.set('id', client.id)
    fd.set('notes', notes)
    await saveClientNotes(fd)
    setSavingNotes(false)
    toast({ title: 'Notas guardadas', variant: 'success' })
  }

  return (
    <div className="space-y-6">
      {/* Back */}
      <Link
        href="/clientes"
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" />
        Volver a clientes
      </Link>

      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex items-start gap-4">
          <span className="grid h-14 w-14 shrink-0 place-items-center rounded-2xl bg-gold-gradient-soft text-gold-brand">
            {isCompany ? <Building2 className="h-7 w-7" /> : <User className="h-7 w-7" />}
          </span>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">{client.name}</h1>
            <div className="mt-1.5 flex flex-wrap items-center gap-2">
              <span className="text-sm capitalize text-muted-foreground">{client.type}</span>
              <Badge status={active ? 'ready' : 'neutral'}>
                {active ? 'Activo' : 'Inactivo'}
              </Badge>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <WhatsAppButton phone={client.whatsapp ?? client.phone} message={waMsg} />
          <Button variant="secondary" onClick={() => setEditing(true)}>
            <Pencil className="h-4 w-4" />
            Editar
          </Button>
          <Button
            variant={active ? 'danger' : 'secondary'}
            onClick={() => (active ? setConfirming(true) : quickActivate())}
          >
            <Power className="h-4 w-4" />
            {active ? 'Desactivar' : 'Activar'}
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Contact */}
        <Card className="lg:col-span-1">
          <CardHeader title="Contacto" />
          <div className="space-y-3 text-sm">
            <Row icon={Phone} label="Teléfono" value={formatPhone(client.phone)} />
            <Row icon={Phone} label="WhatsApp" value={formatPhone(client.whatsapp)} />
            <Row icon={Mail} label="Email" value={client.email ?? '—'} />
            <Row icon={MapPin} label="Dirección" value={client.address ?? '—'} />
            {isCompany ? (
              <>
                <Row icon={IdCard} label="RNC" value={client.rnc ?? '—'} />
                <Row icon={User} label="Contacto" value={client.contact_person ?? '—'} />
              </>
            ) : (
              <Row icon={IdCard} label="Cédula" value={client.cedula ?? '—'} />
            )}
          </div>
          <div className="mt-4">
            <WhatsAppButton
              phone={client.whatsapp ?? client.phone}
              message={waMsg}
              label="Escribir por WhatsApp"
              className="w-full justify-center"
            />
          </div>
        </Card>

        {/* Stats */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:col-span-2">
          <KpiCard label="Total gastado" value={stats.totalSpent} currency icon={Package} hint="Se suma con las órdenes" />
          <KpiCard label="Órdenes" value={stats.orderCount} icon={Package} hint="Historial de compras" />

          {/* Frequency */}
          <Card className="sm:col-span-2">
            <CardHeader title="Frecuencia" subtitle="Cada cuánto viene" />
            {stats.orderCount === 0 ? (
              <EmptyState
                icon={CalendarClock}
                title="Sin datos de frecuencia todavía."
                subtitle="Primera y última visita se calculan de las órdenes."
                className="py-6"
              />
            ) : (
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-muted-foreground">Primera visita</p>
                  <p className="font-medium">{stats.firstOrder ?? '—'}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Última visita</p>
                  <p className="font-medium">{stats.lastOrder ?? '—'}</p>
                </div>
              </div>
            )}
          </Card>
        </div>
      </div>

      {/* Order history */}
      <Card>
        <CardHeader title="Historial de órdenes" subtitle="Todo lo que ha pedido" />
        {stats.orders.length === 0 ? (
          <EmptyState
            icon={Package}
            title="Aún no tiene órdenes registradas."
            subtitle="Cuando se cree el módulo de Órdenes, cada compra de este cliente aparecerá aquí."
            className="py-8"
          />
        ) : (
          <ul className="divide-y divide-border">
            {stats.orders.map((o) => (
              <li key={o.id} className="flex items-center justify-between py-3 text-sm">
                <span>{o.description}</span>
                <span className="tnum font-medium">{formatDOP(o.total)}</span>
              </li>
            ))}
          </ul>
        )}
      </Card>

      {/* Frequent products */}
      <Card>
        <CardHeader title="Qué más pide" subtitle="Productos y servicios frecuentes" />
        {stats.frequentProducts.length === 0 ? (
          <EmptyState
            icon={Sparkles}
            title="Todavía sin patrón de compra."
            subtitle="Aquí verás lo que este cliente pide más — clave para repetir diseños."
            className="py-8"
          />
        ) : (
          <div className="flex flex-wrap gap-2">
            {stats.frequentProducts.map((p) => (
              <span
                key={p.label}
                className="inline-flex items-center gap-1.5 rounded-full border border-gold-mid/30 bg-gold-gradient-soft px-3 py-1 text-sm text-gold-brand"
              >
                {p.label}
                <span className="tnum text-xs opacity-70">×{p.count}</span>
              </span>
            ))}
          </div>
        )}
      </Card>

      {/* Internal notes */}
      <Card>
        <CardHeader
          title="Notas internas"
          subtitle="Solo tú las ves"
          action={<StickyNote className="h-4 w-4 text-muted-foreground" />}
        />
        <Textarea
          id="client-notes"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Preferencias, colores favoritos, cómo le gusta que le entreguen…"
        />
        <div className="mt-3 flex justify-end">
          <Button
            size="sm"
            onClick={onSaveNotes}
            loading={savingNotes}
            disabled={notes === (client.notes ?? '')}
          >
            Guardar notas
          </Button>
        </div>
      </Card>

      {/* Edit modal */}
      <Modal
        open={editing}
        onClose={() => setEditing(false)}
        title="Editar cliente"
        description="Actualiza los datos del cliente."
      >
        <ClientForm mode="edit" client={client} onDone={() => setEditing(false)} />
      </Modal>

      {/* Deactivate confirmation */}
      <Modal
        open={confirming}
        onClose={() => setConfirming(false)}
        title="¿Desactivar cliente?"
        description="No se borra nada — su historial se conserva. Podrás reactivarlo cuando quieras."
      >
        <form action={setClientStatus} className="flex justify-end gap-3">
          <input type="hidden" name="id" value={client.id} />
          <input type="hidden" name="status" value="inactivo" />
          <Button type="button" variant="ghost" onClick={() => setConfirming(false)}>
            Cancelar
          </Button>
          <Button type="submit" variant="danger" onClick={() => setConfirming(false)}>
            Sí, desactivar
          </Button>
        </form>
      </Modal>
    </div>
  )

  function quickActivate() {
    const fd = new FormData()
    fd.set('id', client.id)
    fd.set('status', 'activo')
    void setClientStatus(fd)
  }
}

function Row({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof Phone
  label: string
  value: string
}) {
  return (
    <div className="flex items-start gap-3">
      <Icon className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
      <div className="min-w-0">
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className="break-words font-medium text-foreground">{value}</p>
      </div>
    </div>
  )
}
