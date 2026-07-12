'use client'

import { useEffect, useMemo, useState } from 'react'
import { useFormState } from 'react-dom'
import { ChevronLeft, ChevronRight, Plus, CalendarClock, AlarmClock, AlertTriangle } from 'lucide-react'
import { cn, formatDOP } from '@/lib/utils'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Modal } from '@/components/ui/Modal'
import { useToast } from '@/components/ui/Toast'
import {
  addDays,
  addMonths,
  monthYearLabel,
  weekRangeLabel,
  dayFull,
} from '@/lib/calendario/dates'
import { orderCalState, type CalendarOrder, type CalendarNote } from '@/lib/calendario/types'
import { rescheduleOrder, type CalState } from '@/lib/calendario/actions'
import { MonthView } from './MonthView'
import { WeekView } from './WeekView'
import { DayView } from './DayView'
import { OrderPanel } from './OrderPanel'
import { NoteModal } from './NoteModal'

type View = 'mes' | 'semana' | 'dia'
const initial: CalState = {}

export function CalendarBoard({ orders, notes, todayISO }: { orders: CalendarOrder[]; notes: CalendarNote[]; todayISO: string }) {
  const [view, setView] = useState<View>('mes')
  const [anchor, setAnchor] = useState(todayISO)
  const [selected, setSelected] = useState<CalendarOrder | null>(null)
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
    for (const o of orders) {
      const arr = m.get(o.deliveryDate) ?? []
      arr.push(o)
      m.set(o.deliveryDate, arr)
    }
    return m
  }, [orders])

  const notesByDate = useMemo(() => {
    const m = new Map<string, CalendarNote[]>()
    for (const n of notes) {
      const arr = m.get(n.noteDate) ?? []
      arr.push(n)
      m.set(n.noteDate, arr)
    }
    return m
  }, [notes])

  const weekEnd = addDays(todayISO, 6)
  const hoy = orders.filter((o) => o.deliveryDate === todayISO && o.stage !== 'entregada')
  const semana = orders.filter((o) => o.deliveryDate >= todayISO && o.deliveryDate <= weekEnd && o.stage !== 'entregada')
  const vencidas = orders.filter((o) => orderCalState(o.stage, o.deliveryDate, todayISO) === 'vencida')

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

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">Calendario</h1>
        <p className="mt-1 text-sm text-muted-foreground">Tu semana de entregas — se alimenta solo de las órdenes.</p>
      </div>

      {/* Summary strip */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <button type="button" onClick={() => { setAnchor(todayISO); changeView('dia') }} className="text-left">
          <Card className="h-full transition-colors hover:border-gold-mid/40">
            <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground"><CalendarClock className="h-4 w-4 text-status-process" />Pendientes de hoy</div>
            <p className="tnum mt-1 text-2xl font-bold">{hoy.length}</p>
            <p className="truncate text-xs text-muted-foreground">{hoy.length ? hoy.map((o) => o.clientName ?? `#${o.number}`).slice(0, 3).join(' · ') : 'Nada para hoy'}</p>
          </Card>
        </button>
        <button type="button" onClick={() => { setAnchor(todayISO); changeView('semana') }} className="text-left">
          <Card className="h-full transition-colors hover:border-gold-mid/40">
            <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground"><AlarmClock className="h-4 w-4 text-gold-brand" />Vence esta semana</div>
            <p className="tnum mt-1 text-2xl font-bold">{semana.length}</p>
            <p className="text-xs text-muted-foreground">Próximos 7 días</p>
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
          <Button variant="secondary" size="sm" onClick={() => setNote({ open: true, date: view === 'mes' ? todayISO : anchor, editing: null })}><Plus className="h-4 w-4" />Nota</Button>
        </div>
      </div>

      {/* Active view */}
      {view === 'mes' && (
        <MonthView anchor={anchor} todayISO={todayISO} ordersByDate={ordersByDate} notesByDate={notesByDate} onSelectOrder={setSelected} onDayClick={(iso) => { setAnchor(iso); changeView('dia') }} onDropOrder={onDropOrder} canDrag={canDrag} />
      )}
      {view === 'semana' && (
        <WeekView anchor={anchor} todayISO={todayISO} ordersByDate={ordersByDate} notesByDate={notesByDate} onSelectOrder={setSelected} onAddNote={(iso) => setNote({ open: true, date: iso, editing: null })} />
      )}
      {view === 'dia' && (
        <DayView anchor={anchor} todayISO={todayISO} orders={ordersByDate.get(anchor) ?? []} notes={notesByDate.get(anchor) ?? []} onSelectOrder={setSelected} onEditNote={(n) => setNote({ open: true, date: n.noteDate, editing: n })} />
      )}

      <OrderPanel order={selected} todayISO={todayISO} onClose={() => setSelected(null)} />
      <NoteModal open={note.open} onClose={() => setNote((s) => ({ ...s, open: false }))} date={note.date} editing={note.editing} />

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
