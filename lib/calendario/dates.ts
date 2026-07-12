/** Pure, timezone-safe date helpers for the calendar (YYYY-MM-DD strings). */

const WEEKDAYS = ['lun', 'mar', 'mié', 'jue', 'vie', 'sáb', 'dom']

function toDate(iso: string): Date {
  return new Date(iso + 'T00:00:00.000Z')
}
export function toISO(d: Date): string {
  return d.toISOString().slice(0, 10)
}
export function addDays(iso: string, n: number): string {
  const d = toDate(iso)
  d.setUTCDate(d.getUTCDate() + n)
  return toISO(d)
}
export function addMonths(iso: string, n: number): string {
  const d = toDate(iso)
  d.setUTCMonth(d.getUTCMonth() + n)
  return toISO(d)
}
/** Monday-first weekday index (0 = Monday … 6 = Sunday). */
function mondayIdx(iso: string): number {
  return (toDate(iso).getUTCDay() + 6) % 7
}
export function startOfWeek(iso: string): string {
  return addDays(iso, -mondayIdx(iso))
}
export function weekDates(iso: string): string[] {
  const start = startOfWeek(iso)
  return Array.from({ length: 7 }, (_, i) => addDays(start, i))
}
export function monthGrid(iso: string): string[][] {
  const d = toDate(iso)
  const first = `${iso.slice(0, 7)}-01`
  const gridStart = addDays(first, -mondayIdx(first))
  const weeks: string[][] = []
  for (let w = 0; w < 6; w++) {
    weeks.push(Array.from({ length: 7 }, (_, i) => addDays(gridStart, w * 7 + i)))
  }
  void d
  return weeks
}
export function sameMonth(iso: string, anchor: string): boolean {
  return iso.slice(0, 7) === anchor.slice(0, 7)
}
export const weekdayLabels = WEEKDAYS

export function monthYearLabel(iso: string): string {
  return toDate(iso).toLocaleDateString('es-DO', { month: 'long', year: 'numeric' })
}
export function dayNum(iso: string): number {
  return toDate(iso).getUTCDate()
}
export function weekdayLong(iso: string): string {
  return toDate(iso).toLocaleDateString('es-DO', { weekday: 'long' })
}
export function dayFull(iso: string): string {
  return toDate(iso).toLocaleDateString('es-DO', { weekday: 'long', day: 'numeric', month: 'long' })
}
export function weekRangeLabel(iso: string): string {
  const days = weekDates(iso)
  const a = toDate(days[0])
  const b = toDate(days[6])
  const fmt = (d: Date, withMonth: boolean) =>
    d.toLocaleDateString('es-DO', withMonth ? { day: 'numeric', month: 'short' } : { day: 'numeric' })
  const sameM = days[0].slice(0, 7) === days[6].slice(0, 7)
  return `${fmt(a, !sameM)} – ${fmt(b, true)}`
}
