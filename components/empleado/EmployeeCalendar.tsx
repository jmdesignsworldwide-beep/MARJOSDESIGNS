'use client'

import { useEffect, useMemo, useState } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { cn } from '@/lib/utils'
import { addDays, addMonths, monthYearLabel, weekRangeLabel, dayFull } from '@/lib/calendario/dates'
import type { CalendarOrder, CalendarNote } from '@/lib/calendario/types'
import { MonthView } from '@/components/calendario/MonthView'
import { WeekView } from '@/components/calendario/WeekView'
import { DayView } from '@/components/calendario/DayView'
import { EmployeeOrderPanel } from './EmployeeOrderPanel'

type View = 'mes' | 'semana' | 'dia'
const NO_NOTES = new Map<string, CalendarNote[]>()

export function EmployeeCalendar({ orders, todayISO }: { orders: CalendarOrder[]; todayISO: string }) {
  const [view, setView] = useState<View>('semana')
  const [anchor, setAnchor] = useState(todayISO)
  const [selected, setSelected] = useState<CalendarOrder | null>(null)

  useEffect(() => {
    const saved = typeof window !== 'undefined' ? localStorage.getItem('emp-cal-view') : null
    if (saved === 'mes' || saved === 'semana' || saved === 'dia') setView(saved)
  }, [])
  function changeView(v: View) { setView(v); localStorage.setItem('emp-cal-view', v) }

  const ordersByDate = useMemo(() => {
    const m = new Map<string, CalendarOrder[]>()
    for (const o of orders) {
      const arr = m.get(o.deliveryDate) ?? []
      arr.push(o)
      m.set(o.deliveryDate, arr)
    }
    return m
  }, [orders])

  function navigate(dir: number) {
    if (view === 'mes') setAnchor(addMonths(anchor, dir))
    else if (view === 'semana') setAnchor(addDays(anchor, dir * 7))
    else setAnchor(addDays(anchor, dir))
  }
  const title = view === 'mes' ? monthYearLabel(anchor) : view === 'semana' ? weekRangeLabel(anchor) : dayFull(anchor)
  const noop = () => {}

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">Mi Calendario</h1>
        <p className="mt-1 text-sm text-muted-foreground">Solo tus entregas asignadas, por fecha.</p>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-1.5">
          <button type="button" onClick={() => navigate(-1)} className="grid h-9 w-9 place-items-center rounded-xl border border-border hover:border-gold-mid/50" aria-label="Anterior"><ChevronLeft className="h-4 w-4" /></button>
          <button type="button" onClick={() => setAnchor(todayISO)} className="rounded-xl border border-border px-3 py-1.5 text-sm font-medium hover:border-gold-mid/50">Hoy</button>
          <button type="button" onClick={() => navigate(1)} className="grid h-9 w-9 place-items-center rounded-xl border border-border hover:border-gold-mid/50" aria-label="Siguiente"><ChevronRight className="h-4 w-4" /></button>
          <span className="ml-2 text-base font-semibold capitalize">{title}</span>
        </div>
        <div className="flex rounded-xl border border-border p-0.5">
          {(['mes', 'semana', 'dia'] as View[]).map((v) => (
            <button key={v} type="button" onClick={() => changeView(v)} className={cn('rounded-lg px-3 py-1.5 text-sm font-medium capitalize transition-colors', view === v ? 'bg-gold-gradient text-charcoal-900' : 'text-muted-foreground hover:text-foreground')}>{v}</button>
          ))}
        </div>
      </div>

      {view === 'mes' && <MonthView anchor={anchor} todayISO={todayISO} ordersByDate={ordersByDate} notesByDate={NO_NOTES} onSelectOrder={setSelected} onDayClick={(iso) => { setAnchor(iso); changeView('dia') }} onDropOrder={noop} canDrag={false} />}
      {view === 'semana' && <WeekView anchor={anchor} todayISO={todayISO} ordersByDate={ordersByDate} notesByDate={NO_NOTES} onSelectOrder={setSelected} onAddNote={noop} />}
      {view === 'dia' && <DayView anchor={anchor} todayISO={todayISO} orders={ordersByDate.get(anchor) ?? []} notes={[]} onSelectOrder={setSelected} onEditNote={noop} hideMoney />}

      <EmployeeOrderPanel order={selected} onClose={() => setSelected(null)} />
    </div>
  )
}
