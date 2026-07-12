'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useFormState } from 'react-dom'
import { Plus, Printer, Tags, TrendingUp, TrendingDown, Wallet, Crown, Filter } from 'lucide-react'
import { cn, formatDOP } from '@/lib/utils'
import { Card, CardHeader } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { KpiCard } from '@/components/ui/KpiCard'
import { Modal } from '@/components/ui/Modal'
import { Textarea } from '@/components/ui/Field'
import { useToast } from '@/components/ui/Toast'
import {
  GROUPS,
  groupMeta,
  methodLabel,
  type Expense,
  type ExpenseCategory,
  type ExpenseFilters,
  type ExpenseGroup,
  type ExpensesOverview,
  type RecurringReminder,
} from '@/lib/gastos/types'
import { voidExpense, type GastoState } from '@/lib/gastos/actions'
import { ExpenseModal, type ExpensePrefill } from './ExpenseModal'
import { ExpensesList } from './ExpensesList'
import { CategoriesModal } from './CategoriesModal'
import { RecurringBanner } from './RecurringBanner'
import { GastosCharts } from './GastosCharts'

const initialVoid: GastoState = {}

export function GastosBoard({
  overview,
  categories,
  allCategories,
  expenses,
  reminders,
  filters,
  cajaOpen,
  products,
  currentMonth,
  today,
}: {
  overview: ExpensesOverview
  categories: ExpenseCategory[]
  allCategories: ExpenseCategory[]
  expenses: Expense[]
  reminders: RecurringReminder[]
  filters: ExpenseFilters
  cajaOpen: boolean
  products: { id: string; name: string }[]
  currentMonth: string
  today: string
}) {
  const router = useRouter()
  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState<Expense | null>(null)
  const [prefill, setPrefill] = useState<ExpensePrefill | null>(null)
  const [catsOpen, setCatsOpen] = useState(false)
  const [voiding, setVoiding] = useState<Expense | null>(null)
  const [voidState, voidAction] = useFormState(voidExpense, initialVoid)
  const { toast } = useToast()

  useEffect(() => {
    if (voidState.ok) { toast({ title: 'Gasto anulado', variant: 'success' }); setVoiding(null) }
    if (voidState.error) toast({ title: voidState.error, variant: 'error' })
  }, [voidState, toast])

  function openNew() {
    setEditing(null)
    setPrefill(null)
    setModalOpen(true)
  }
  function openEdit(e: Expense) {
    setEditing(e)
    setPrefill(null)
    setModalOpen(true)
  }
  function openFromReminder(r: RecurringReminder) {
    setEditing(null)
    setPrefill({ categoryId: r.categoryId, description: r.description, method: r.method, amount: r.lastAmount, vendor: r.vendor })
    setModalOpen(true)
  }

  function setFilter(patch: Partial<ExpenseFilters>) {
    const next = { ...filters, ...patch }
    const q = new URLSearchParams()
    for (const [k, v] of Object.entries(next)) if (v) q.set(k, v)
    router.push(`/gastos${q.toString() ? `?${q}` : ''}`)
  }

  const delta =
    overview.prevMonthTotal > 0
      ? Math.round(((overview.thisMonthTotal - overview.prevMonthTotal) / overview.prevMonthTotal) * 100)
      : overview.thisMonthTotal > 0
        ? null
        : 0
  const up = overview.thisMonthTotal >= overview.prevMonthTotal

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="no-print flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">Gastos</h1>
          <p className="mt-1 text-sm text-muted-foreground">Lo que sale. Toma foto del recibo y listo — el sistema te dice a dónde se va el dinero.</p>
        </div>
        <div className="flex gap-2">
          <Button variant="secondary" onClick={() => setCatsOpen(true)}><Tags className="h-4 w-4" />Categorías</Button>
          <Button variant="secondary" onClick={() => window.print()}><Printer className="h-4 w-4" />PDF</Button>
          <Button onClick={openNew}><Plus className="h-4 w-4" />Registrar gasto</Button>
        </div>
      </div>

      <RecurringBanner reminders={reminders} onPick={openFromReminder} />

      {/* KPIs */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <KpiCard
          label="Gastos de este mes"
          value={overview.thisMonthTotal}
          currency
          icon={Wallet}
          accent="danger"
          hint={
            delta === null
              ? 'Primer mes con gastos'
              : `${up ? '▲' : '▼'} ${Math.abs(delta)}% vs mes anterior (${formatDOP(overview.prevMonthTotal)})`
          }
        />
        <Card className="flex flex-col justify-center">
          <div className="flex items-center gap-2 text-sm text-muted-foreground"><Crown className="h-4 w-4 text-gold-brand" />Mayor gasto del mes</div>
          {overview.topCategory ? (
            <>
              <p className="mt-1 truncate text-lg font-bold">{overview.topCategory.name}</p>
              <p className="tnum text-sm text-muted-foreground">{formatDOP(overview.topCategory.total)}</p>
            </>
          ) : (
            <p className="mt-1 text-sm text-muted-foreground">Sin gastos aún</p>
          )}
        </Card>
        <Card className="flex flex-col justify-center">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            {up ? <TrendingUp className="h-4 w-4 text-status-overdue" /> : <TrendingDown className="h-4 w-4 text-status-ready" />}
            Comparado al mes anterior
          </div>
          <p className={cn('mt-1 text-lg font-bold', up ? 'text-status-overdue' : 'text-status-ready')}>
            {delta === null ? '—' : `${up ? '+' : ''}${delta}%`}
          </p>
          <p className="tnum text-sm text-muted-foreground">Mes anterior: {formatDOP(overview.prevMonthTotal)}</p>
        </Card>
      </div>

      <GastosCharts overview={overview} currentMonth={currentMonth} />

      {/* Filters */}
      <div className="no-print flex flex-wrap items-center gap-2">
        <div className="flex flex-wrap gap-1.5">
          <button
            type="button"
            onClick={() => setFilter({ group: undefined })}
            className={cn('rounded-full border px-3 py-1.5 text-sm font-medium transition-colors', !filters.group ? 'border-gold-mid/50 bg-gold-gradient-soft text-gold-brand' : 'border-border text-muted-foreground hover:border-gold-mid/30')}
          >
            Todos
          </button>
          {GROUPS.map((g) => (
            <button
              key={g}
              type="button"
              onClick={() => setFilter({ group: g })}
              className={cn('rounded-full border px-3 py-1.5 text-sm font-medium transition-colors', filters.group === g ? 'border-gold-mid/50 bg-gold-gradient-soft text-gold-brand' : 'border-border text-muted-foreground hover:border-gold-mid/30')}
            >
              {groupMeta[g].short}
            </button>
          ))}
        </div>
        <div className="ml-auto flex flex-wrap items-center gap-2">
          <Filter className="h-4 w-4 text-muted-foreground" />
          <select value={filters.categoryId ?? ''} onChange={(e) => setFilter({ categoryId: e.target.value || undefined })} className="h-9 rounded-xl border border-border bg-input/5 px-2.5 text-sm outline-none focus:border-gold-mid">
            <option value="">Categoría</option>
            {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
          <select value={filters.method ?? ''} onChange={(e) => setFilter({ method: (e.target.value || undefined) as ExpenseFilters['method'] })} className="h-9 rounded-xl border border-border bg-input/5 px-2.5 text-sm outline-none focus:border-gold-mid">
            <option value="">Método</option>
            {(['efectivo', 'transferencia', 'debito', 'credito'] as const).map((m) => <option key={m} value={m}>{methodLabel[m]}</option>)}
          </select>
          <input type="date" value={filters.from ?? ''} onChange={(e) => setFilter({ from: e.target.value || undefined })} className="tnum h-9 rounded-xl border border-border bg-input/5 px-2.5 text-sm outline-none focus:border-gold-mid" />
          <input type="date" value={filters.to ?? ''} onChange={(e) => setFilter({ to: e.target.value || undefined })} className="tnum h-9 rounded-xl border border-border bg-input/5 px-2.5 text-sm outline-none focus:border-gold-mid" />
          {(filters.group || filters.categoryId || filters.method || filters.from || filters.to) && (
            <button type="button" onClick={() => router.push('/gastos')} className="text-sm text-muted-foreground hover:text-foreground">Limpiar</button>
          )}
        </div>
      </div>

      {/* List */}
      <Card className="print-area">
        <CardHeader title="Historial de gastos" subtitle="Permanente e inviolable — las correcciones quedan auditadas" />
        <ExpensesList expenses={expenses} onEdit={openEdit} onVoid={setVoiding} />
      </Card>

      {/* Modals */}
      <ExpenseModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        categories={categories}
        products={products}
        cajaOpen={cajaOpen}
        today={today}
        editing={editing}
        prefill={prefill}
      />
      <CategoriesModal open={catsOpen} onClose={() => setCatsOpen(false)} categories={allCategories} />

      <Modal open={!!voiding} onClose={() => setVoiding(null)} title="Anular gasto" description="Queda en el historial (no se borra) y revierte en caja si aún está abierta.">
        <form action={voidAction} className="space-y-4">
          <input type="hidden" name="id" value={voiding?.id ?? ''} />
          <Textarea id="void-reason" name="reason" label="Motivo de anulación" placeholder="¿Por qué se anula?" error={voidState.error} required rows={2} />
          <div className="flex justify-end gap-3">
            <Button type="button" variant="ghost" onClick={() => setVoiding(null)}>Volver</Button>
            <Button type="submit" variant="danger">Anular gasto</Button>
          </div>
        </form>
      </Modal>
    </div>
  )
}
