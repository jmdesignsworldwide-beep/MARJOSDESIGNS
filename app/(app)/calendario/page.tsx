import { requireRole } from '@/lib/auth/guards'
import { listCalendarOrders, listCalendarNotes, listNoteOccurrenceStates, todayDR } from '@/lib/calendario/data'
import { listCategories } from '@/lib/gastos/data'
import { getSettings } from '@/lib/settings/data'
import { CalendarBoard } from '@/components/calendario/CalendarBoard'

export const dynamic = 'force-dynamic'

export default async function CalendarioPage() {
  await requireRole('super_admin')
  const [orders, notes, occurrenceStates, categories, settings] = await Promise.all([
    listCalendarOrders(),
    listCalendarNotes(),
    listNoteOccurrenceStates(),
    listCategories(),
    getSettings(),
  ])
  return (
    <CalendarBoard
      orders={orders}
      notes={notes}
      occurrenceStates={occurrenceStates}
      categories={categories}
      todayISO={todayDR()}
      overloadWarn={settings.overloadWarn}
    />
  )
}
