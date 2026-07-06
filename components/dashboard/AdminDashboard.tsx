'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import {
  CalendarCheck,
  AlertTriangle,
  Factory,
  Wallet,
  Target,
  CalendarClock,
  CalendarRange,
  Users,
  PackageCheck,
  ArrowRight,
} from 'lucide-react'
import { cn, formatDOP } from '@/lib/utils'
import { KpiCard } from '@/components/ui/KpiCard'
import { Card } from '@/components/ui/Card'
import { Modal } from '@/components/ui/Modal'
import { Button } from '@/components/ui/Button'
import { EmptyState } from './EmptyState'
import { OrderCard } from './OrderCard'
import { staggerContainer } from '@/components/motion/variants'
import type { DashboardData, OrderSummary } from '@/lib/dashboard/data'

interface Destination {
  title: string
  where: string
}

export function AdminDashboard({
  firstName,
  data,
}: {
  firstName: string
  data: DashboardData
}) {
  const [dest, setDest] = useState<Destination | null>(null)
  const open = (title: string, where: string) => setDest({ title, where })

  const orderDest = (o: OrderSummary) =>
    open(`Orden de ${o.client}`, 'el detalle completo de esta orden')

  return (
    <div>
      {/* Greeting */}
      <div className="mb-6">
        <p className="text-sm text-muted-foreground">Sala de mando</p>
        <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">
          Hola, <span className="text-gold-gradient">{firstName}</span>
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Lo que hay que sacar hoy y lo que no se puede escapar.
        </p>
      </div>

      {/* KPI pulse */}
      <motion.div
        variants={staggerContainer}
        initial="hidden"
        animate="show"
        className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4"
      >
        <KpiCard
          label="Entregas de hoy"
          value={data.kpis.today}
          icon={CalendarCheck}
          hint="Ver entregas de hoy"
          onClick={() => open('Entregas de hoy', 'las órdenes que se entregan hoy')}
        />
        <KpiCard
          label="Vencidas"
          value={data.kpis.overdue}
          icon={AlertTriangle}
          accent="danger"
          pulse
          hint="Ver órdenes vencidas"
          onClick={() => open('Órdenes vencidas', 'las órdenes que ya pasaron su fecha de entrega')}
        />
        <KpiCard
          label="En producción"
          value={data.kpis.inProduction}
          icon={Factory}
          hint="Ver en producción"
          onClick={() => open('En producción', 'las órdenes que se están trabajando ahora')}
        />
        <KpiCard
          label="Por cobrar"
          value={data.kpis.receivable}
          currency
          icon={Wallet}
          hint="Ver balances pendientes"
          onClick={() => open('Por cobrar', 'los balances pendientes por cobrar')}
        />
      </motion.div>

      {/* THE HEART — workload by urgency */}
      <div className="mt-10 space-y-8">
        {/* Vencidas */}
        <UrgencySection
          title="Vencidas"
          accent="danger"
          count={data.overdue.length}
        >
          {data.overdue.length === 0 ? (
            <EmptyState
              icon={Target}
              tone="positive"
              title="Ninguna orden vencida. Vas al día. 🎯"
              subtitle="Cuando algo se pase de su fecha de entrega, aparecerá aquí de primero."
            />
          ) : (
            <CardGrid>
              {data.overdue.map((o) => (
                <OrderCard key={o.id} order={o} variant="overdue" onClick={() => orderDest(o)} />
              ))}
            </CardGrid>
          )}
        </UrgencySection>

        {/* Entregas de hoy */}
        <UrgencySection title="Entregas de hoy" accent="gold" count={data.today.length}>
          {data.today.length === 0 ? (
            <EmptyState
              icon={CalendarClock}
              title="No hay entregas para hoy."
              subtitle="Las órdenes con entrega hoy se mostrarán aquí."
            />
          ) : (
            <CardGrid>
              {data.today.map((o) => (
                <OrderCard key={o.id} order={o} variant="today" onClick={() => orderDest(o)} />
              ))}
            </CardGrid>
          )}
        </UrgencySection>

        {/* Esta semana */}
        <UrgencySection
          title="Esta semana"
          accent="gold"
          count={data.week.reduce((n, d) => n + d.orders.length, 0)}
        >
          {data.week.length === 0 ? (
            <EmptyState
              icon={CalendarRange}
              title="Semana despejada por ahora."
              subtitle="Lo que se entrega en los próximos 7 días aparecerá aquí, agrupado por día, para que prepares material."
            />
          ) : (
            <div className="space-y-5">
              {data.week.map((day) => (
                <div key={day.date}>
                  <p className="mb-2 text-sm font-semibold capitalize text-muted-foreground">
                    {day.label}
                  </p>
                  <CardGrid>
                    {day.orders.map((o) => (
                      <OrderCard key={o.id} order={o} onClick={() => orderDest(o)} />
                    ))}
                  </CardGrid>
                </div>
              ))}
            </div>
          )}
        </UrgencySection>
      </div>

      {/* Support block — month pulse (secondary) */}
      <MonthPulseBlock data={data} />

      {/* Destination modal — clicks are never dead buttons */}
      <Modal
        open={dest !== null}
        onClose={() => setDest(null)}
        title={dest?.title}
        description="Módulo Órdenes — próxima tanda"
      >
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Aquí verás <span className="font-medium text-foreground">{dest?.where}</span>.
            Esta vista se activa automáticamente cuando se construya el módulo{' '}
            <span className="font-medium text-foreground">Órdenes</span> — el
            dashboard ya está conectado y listo para llenarse solo.
          </p>
          <div className="flex justify-end">
            <Button variant="secondary" onClick={() => setDest(null)}>
              Entendido
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  )
}

function UrgencySection({
  title,
  count,
  accent,
  children,
}: {
  title: string
  count: number
  accent: 'danger' | 'gold'
  children: React.ReactNode
}) {
  return (
    <section>
      <div className="mb-3 flex items-center gap-2.5">
        <span
          className={cn(
            'h-6 w-1 rounded-full',
            accent === 'danger' ? 'bg-status-overdue' : 'bg-gold-gradient',
          )}
        />
        <h2 className="text-lg font-semibold tracking-tight">{title}</h2>
        <span
          className={cn(
            'tnum rounded-full px-2 py-0.5 text-xs font-semibold',
            accent === 'danger'
              ? 'bg-status-overdue/10 text-status-overdue'
              : 'bg-muted text-muted-foreground',
          )}
        >
          {count}
        </span>
      </div>
      {children}
    </section>
  )
}

function CardGrid({ children }: { children: React.ReactNode }) {
  return (
    <motion.div
      variants={staggerContainer}
      initial="hidden"
      animate="show"
      className="grid grid-cols-1 gap-3 md:grid-cols-2"
    >
      {children}
    </motion.div>
  )
}

function deltaPct(cur: number, prev: number): { text: string; positive: boolean } | null {
  if (prev === 0 && cur === 0) return null
  if (prev === 0) return { text: 'nuevo', positive: true }
  const pct = ((cur - prev) / prev) * 100
  return { text: `${Math.abs(pct).toFixed(0)}%`, positive: pct >= 0 }
}

function MonthPulseBlock({ data }: { data: DashboardData }) {
  const p = data.monthPulse
  const tiles = [
    { label: 'Ingresos del mes', value: formatDOP(p.revenue), delta: deltaPct(p.revenue, p.revenuePrev), icon: Wallet },
    { label: 'Órdenes completadas', value: String(p.completed), delta: deltaPct(p.completed, p.completedPrev), icon: PackageCheck },
    { label: 'Clientes nuevos', value: String(p.newClients), delta: deltaPct(p.newClients, p.newClientsPrev), icon: Users },
  ]

  return (
    <div className="mt-12">
      <div className="mb-3 flex items-center gap-2">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
          Pulso del mes
        </h2>
        <span className="text-xs text-muted-foreground/70">· dato de apoyo</span>
      </div>
      <Card className="p-4 sm:p-5">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          {tiles.map((t) => {
            const Icon = t.icon
            return (
              <div key={t.label} className="flex items-start gap-3">
                <span className="mt-0.5 grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-gold-gradient-soft text-gold-brand">
                  <Icon className="h-4 w-4" />
                </span>
                <div>
                  <p className="text-xs text-muted-foreground">{t.label}</p>
                  <p className="tnum text-xl font-bold tracking-tight text-foreground">
                    {t.value}
                  </p>
                  {t.delta ? (
                    <p
                      className={cn(
                        'tnum text-xs font-medium',
                        t.delta.positive ? 'text-status-ready' : 'text-status-overdue',
                      )}
                    >
                      {t.delta.positive ? '▲' : '▼'} {t.delta.text} vs. mes anterior
                    </p>
                  ) : (
                    <p className="text-xs text-muted-foreground/70">sin datos aún</p>
                  )}
                </div>
              </div>
            )
          })}
        </div>

        {!data.ordersReady && (
          <div className="mt-4 flex items-center gap-2 rounded-lg border border-dashed border-border bg-card/40 px-3.5 py-2.5 text-xs text-muted-foreground dark:border-white/[0.08]">
            <ArrowRight className="h-3.5 w-3.5 text-gold-brand" />
            El ritmo del taller y estos números se llenan solos cuando entren las
            primeras órdenes. Nada aquí es inventado.
          </div>
        )}
      </Card>
    </div>
  )
}
