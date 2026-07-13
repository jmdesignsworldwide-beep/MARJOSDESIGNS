'use client'

import { useEffect, useMemo, useState } from 'react'
import { useFormState } from 'react-dom'
import { ChevronLeft, ChevronRight, Plus, CalendarClock, AlarmClock, AlertTriangle, Banknote } from 'lucide-react'
import { cn, formatDOP } from '@/lib/utils'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Modal } from '@/components/ui/Modal'
import { useToast } from '@/components/ui/Toast'
import { addDays, addMonths, monthYearLabel, weekRangeLabel, dayFull } from '@/lib/calendario/dates'
import { orderCalState, noteKindMeta, type CalendarOrder, type CalendarNote, type CalendarOccurrence, type NoteOccurrenceState } from '@/lib/calendario/types'
import { occurrencesByDate, expandOccurrences } from '@/lib/calendario/recurrence'
import { rescheduleOrder, type CalState } from '@/lib/calendario/actions'
import type { ExpenseCategory } from '@/lib/gastos/types'
import { MonthView } from './MonthView'
import { WeekView } from './WeekView'
import { DayView } from './DayView'
import { OrderPanel } from './OrderPanel'
import { NoteModal } from './NoteModal'
import { OccurrencePanel } from './OccurrencePanel'
import { PayReminderModal } from './PayReminderModal'

type View = 'mes' | 'semana' | 'dia'
const initial: CalState = {}

export function CalendarBoard({
  orders,
  notes,
  occurrenceStates,
  categories,
  todayISO,
  overloadWarn,
}: {
  orders: CalendarOrder[]
  notes: CalendarNote[]
  occurrenceStates: NoteOccurrenceState[]
  categories: ExpenseCategory[]
  todayISO: string
  overloadWarn?: number
}) {
  const [view, setView] = useState<View>('mes')
  const [anchor, setAnchor] = useState(todayISO)
  const [selected, setSelected] = useState<CalendarOrder | null>(null)
  const [selectedOcc, setSelectedOcc] = useState<CalendarOccurrence | null>(null)
  const [payOcc, setPayOcc] = useState<CalendarOccurrence | null>(null)
  const [note, setNote] = useState<{ open: boolean; date: string; editing: CalendarNote | null }>({ open: false, date: todayISO, editing: null })
  const [drop, setDrop] = useState<{ order: CalendarOrder; newDate: string } | null>(null)
  const [canDrag, setCanDrag] = useState(false)
  const [rs, rescheduleAction] = useFormState(rescheduleOrder, initial)
  const { toast } = useToast()

  useEffect(() => {
    const saved = typeof window !== 'undefined' ? localStorage.getItem('cal-view') : null
    if (saved === 'mes' || saved === 'semana' || saved === 'dia') setView(saved)
    setCanDrag(window.matchMedia('(pointer: fine)').matches)
  }, [])
  function changeView(v: View) { setView(v); localStorage.setItem('cal-view', v) }

  useEffect(() => {
    if (rs.ok) { toast({ title: 'Entrega reprogramada', variant: 'success' }); setDrop(null) }
    if (rs.error) toast({ title: rs.error, variant: 'error' })
  }, [rs, toast])

  const ordersByDate = useMemo(() => {
    const m = new Map<string, CalendarOrder[]>()
    for (const o of orders) { const a = m.get(o.deliveryDate) ?? []; a.push(o); m.set(o.deliveryDate, a) }
    return m
  }, [orders])

  // Occurrences expanded for the visible neighborhood (recomputed as you navigate).
  const notesByDate = useMemo(
    () => occurrencesByDate(notes, occurrenceStates, addDays(anchor, -45), addDays(anchor, 75)),
    [notes, occurrenceStates, anchor],
  )

  const noteById = useMemo(() => new Map(notes.map((n) => [n.id, n])), [notes])
  const stateByNote = useMemo(() => {
    const m = new Map<number, Map<string, NoteOccurrenceState>>()
    for (const s of occurrenceStates) { const mm = m.get(s.noteId) ?? new Map(); mm.set(s.occurrenceDate, s); m.set(s.noteId, mm) }
    return m
  }, [occurrenceStates])

  const weekEnd = addDays(todayISO, 6)
  const hoyOrders = orders.filter((o) => o.deliveryDate === todayISO && o.stage !== 'entregada')
  const semana = orders.filter((o) => o.deliveryDate >= todayISO && o.deliveryDate <= weekEnd && o.stage !== 'entregada')
  const vencidas = orders.filter((o) => orderCalState(o.stage, o.deliveryDate, todayISO) === 'vencida')

  // Tasks/payments due today (not done), + upcoming fixed payments (next 7 days).
  const hoyNotes = useMemo(
    () => notes.flatMap((n) => expandOccurrences(n, todayISO, todayISO, stateByNote.get(n.id) ?? new Map())).filter((o) => !o.done && (o.kind === 'tarea' || o.kind === 'pago')),
    [notes, stateByNote, todayISO],
  )
  const upcomingPayments = useMemo(
    () => notes.flatMap((n) => expandOccurrences(n, todayISO, weekEnd, stateByNote.get(n.id) ?? new Map())).filter((o) => o.kind === 'pago' && !o.done),
    [notes, stateByNote, todayISO, weekEnd],
  )
  const upcomingTotal = upcomingPayments.reduce((s, o) => s + (o.amount ?? 0), 0)
  const hoyCount = hoyOrders.length + hoyNotes.length

  function navigate(dir: number) {
    if (view === 'mes') setAnchor(addMonths(anchor, dir))
    else if (view === 'semana') setAnchor(addDays(anchor, dir * 7))
    else setAnchor(addDays(anchor, dir))
  }
  const title = view === 'mes' ? monthYearLabel(anchor) : view === 'semana' ? weekRangeLabel(anchor) : dayFull(anchor)

  function onDropOrder(orderId: string, dateISO: string) {
    const o = orders.find((x) => x.id === orderId)
    if (o && o.deliveryDate !== dateISO) setDrop({ order: o, newDate: dateISO })
  }
  function selectNote(o: CalendarOccurrence) { setSelectedOcc(o) }

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">Calendario</h1>
        <p className="mt-1 text-sm text-muted-foreground">Entregas, pendientes y pagos fijos — todo en un lugar.</p>
      </div>

      {/* Fixed-payments nudge */}
      {upcomingPayments.length > 0 && (
        <div className="rounded-2xl border border-status-ready/30 bg-status-ready/[0.06] p-4">
          <p className="flex items-center gap-1.5 text-sm font-semibold text-status-ready"><Banknote className="h-4 w-4" />Pagos fijos de los próximos días</p>
          <div className="mt-2 flex flex-wrap gap-2">
            {upcomingPayments.slice(0, 4).map((o) => (
              <button key={`${o.noteId}-${o.date}`} onClick={() => selectNote(o)} className="inline-flex items-center gap-1.5 rounded-xl border border-status-ready/30 bg-card/70 px-3 py-1.5 text-sm hover:border-status-ready/60">
                <span className="font-medium">{o.title}</span>
                {o.amount != null && <span className="tnum text-xs text-status-ready">{formatDOP(o.amount)}</span>}
                <span className="text-xs text-muted-foreground">{o.date.slice(8)}/{o.date.slice(5, 7)}</span>
              </button>
            ))}
          </div>
          {upcomingTotal > 0 && <p className="mt-2 text-xs text-muted-foreground">Total pendiente: <span className="tnum font-semibold">{formatDOP(upcomingTotal)}</span></p>}
        </div>
      )}

      {/* Summary strip */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <button type="button" onClick={() => { setAnchor(todayISO); changeView('dia') }} className="text-left">
          <Card className="h-full transition-colors hover:border-gold-mid/40">
            <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground"><CalendarClock className="h-4 w-4 text-status-process" />Pendientes de hoy</div>
            <p className="tnum mt-1 text-2xl font-bold">{hoyCount}</p>
            <p className="truncate text-xs text-muted-foreground">
              {hoyCount ? [...hoyOrders.map((o) => o.clientName ?? `#${o.number}`), ...hoyNotes.map((n) => n.title)].slice(0, 3).join(' · ') : 'Nada para hoy'}
            </p>
          </Card>
        </button>
        <button type="button" onClick={() => { setAnchor(todayISO); changeView('semana') }} className="text-left">
          <Card className="h-full transition-colors hover:border-gold-mid/40">
            <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground"><AlarmClock className="h-4 w-4 text-gold-brand" />Vence esta semana</div>
            <p className="tnum mt-1 text-2xl font-bold">{semana.length}</p>
            <p className="text-xs text-muted-foreground">Entregas · próximos 7 días</p>
          </Card>
        </button>
        <Card className={cn('h-full', vencidas.length > 0 && 'border-status-overdue/40 bg-status-overdue/[0.05]')}>
          <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
            <AlertTriangle className={cn('h-4 w-4', vencidas.length > 0 ? 'text-status-overdue' : 'text-muted-foreground')} />Vencidas
          </div>
          <p className={cn('tnum mt-1 text-2xl font-bold', vencidas.length > 0 && 'text-status-overdue')}>{vencidas.length}</p>
          {vencidas.length > 0 ? (
            <div className="mt-0.5 flex flex-wrap gap-1">
              {vencidas.slice(0, 3).map((o) => (
                <button key={o.id} onClick={() => setSelected(o)} className="inline-flex items-center gap-1 rounded-full bg-status-overdue/10 px-2 py-0.5 text-[11px] font-medium text-status-overdue">
                  <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-status-overdue" />{o.clientName ?? `#${o.number}`}
                </button>
              ))}
            </div>
          ) : <p className="text-xs text-muted-foreground">Todo al día ✓</p>}
        </Card>
      </div>

      {/* Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-1.5">
          <button type="button" onClick={() => navigate(-1)} className="grid h-9 w-9 place-items-center rounded-xl border border-border hover:border-gold-mid/50" aria-label="Anterior"><ChevronLeft className="h-4 w-4" /></button>
          <button type="button" onClick={() => setAnchor(todayISO)} className="rounded-xl border border-border px-3 py-1.5 text-sm font-medium hover:border-gold-mid/50">Hoy</button>
          <button type="button" onClick={() => navigate(1)} className="grid h-9 w-9 place-items-center rounded-xl border border-border hover:border-gold-mid/50" aria-label="Siguiente"><ChevronRight className="h-4 w-4" /></button>
          <span className="ml-2 text-base font-semibold capitalize">{title}</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex rounded-xl border border-border p-0.5">
            {(['mes', 'semana', 'dia'] as View[]).map((v) => (
              <button key={v} type="button" onClick={() => changeView(v)} className={cn('rounded-lg px-3 py-1.5 text-sm font-medium capitalize transition-colors', view === v ? 'bg-gold-gradient text-charcoal-900' : 'text-muted-foreground hover:text-foreground')}>{v}</button>
            ))}
          </div>
          <Button variant="secondary" size="sm" onClick={() => setNote({ open: true, date: view === 'mes' ? todayISO : anchor, editing: null })}><Plus className="h-4 w-4" />Nota / tarea</Button>
        </div>
      </div>

      {/* Active view */}
      {view === 'mes' && (
        <MonthView anchor={anchor} todayISO={todayISO} overloadWarn={overloadWarn} ordersByDate={ordersByDate} notesByDate={notesByDate} onSelectOrder={setSelected} onSelectNote={selectNote} onDayClick={(iso) => { setAnchor(iso); changeView('dia') }} onDropOrder={onDropOrder} canDrag={canDrag} />
      )}
      {view === 'semana' && (
        <WeekView anchor={anchor} todayISO={todayISO} overloadWarn={overloadWarn} ordersByDate={ordersByDate} notesByDate={notesByDate} onSelectOrder={setSelected} onSelectNote={selectNote} onAddNote={(iso) => setNote({ open: true, date: iso, editing: null })} />
      )}
      {view === 'dia' && (
        <DayView anchor={anchor} todayISO={todayISO} orders={ordersByDate.get(anchor) ?? []} notes={notesByDate.get(anchor) ?? []} onSelectOrder={setSelected} onEditNote={selectNote} />
      )}

      <OrderPanel order={selected} todayISO={todayISO} onClose={() => setSelected(null)} />
      <NoteModal open={note.open} onClose={() => setNote((s) => ({ ...s, open: false }))} date={note.date} editing={note.editing} />
      <OccurrencePanel
        occurrence={selectedOcc}
        note={selectedOcc ? noteById.get(selectedOcc.noteId) ?? null : null}
        onClose={() => setSelectedOcc(null)}
        onEditSeries={(n) => { setSelectedOcc(null); setNote({ open: true, date: n.noteDate, editing: n }) }}
        onPay={(o) => { setSelectedOcc(null); setPayOcc(o) }}
      />
      <PayReminderModal occurrence={payOcc} categories={categories} onClose={() => setPayOcc(null)} />

      {/* Reschedule confirmation (drag & drop) */}
      <Modal open={!!drop} onClose={() => setDrop(null)} title="Reprogramar entrega" description="Confirma el cambio de fecha.">
        {drop && (
          <form action={rescheduleAction} className="space-y-4">
            <input type="hidden" name="orderId" value={drop.order.id} />
            <input type="hidden" name="deliveryDate" value={drop.newDate} />
            <p className="text-sm">
              ¿Mover la entrega de <span className="font-semibold">{drop.order.clientName ?? `#${drop.order.number}`}</span> al{' '}
              <span className="font-semibold capitalize">{dayFull(drop.newDate)}</span>?
            </p>
            {drop.order.balance > 0 && <p className="tnum text-xs text-status-overdue">Balance por cobrar: {formatDOP(drop.order.balance)}</p>}
            <div className="flex justify-end gap-3">
              <Button type="button" variant="ghost" onClick={() => setDrop(null)}>Cancelar</Button>
              <Button type="submit">Sí, mover</Button>
            </div>
          </form>
        )}
      </Modal>
    </div>
  )
}
