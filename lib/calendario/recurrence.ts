/** Pure recurrence expansion — occurrences are COMPUTED, never duplicated. */
import { addDays } from './dates'
import type { CalendarNote, NoteOccurrenceState, CalendarOccurrence } from './types'

function daysInMonth(y: number, m0: number): number {
  return new Date(Date.UTC(y, m0 + 1, 0)).getUTCDate()
}

/** Dates (YYYY-MM-DD) on which a note occurs within [from, to] inclusive. */
export function expandDates(note: CalendarNote, from: string, to: string): string[] {
  const anchor = note.noteDate
  const hardEnd = note.recurrenceEnd && note.recurrenceEnd < to ? note.recurrenceEnd : to
  if (anchor > hardEnd) return []
  const out: string[] = []

  if (note.recurrence === 'once') {
    if (anchor >= from && anchor <= to) out.push(anchor)
    return out
  }

  if (note.recurrence === 'weekly') {
    // Step 7 days from the anchor; guard against runaway.
    let d = anchor
    for (let i = 0; i < 520 && d <= hardEnd; i++) {
      if (d >= from) out.push(d)
      d = addDays(d, 7)
    }
    return out
  }

  // monthly — same day-of-month each month, clamped to month length.
  const [ay, am, ad] = anchor.split('-').map(Number)
  const day = ad
  let y = ay
  let m0 = am - 1
  for (let i = 0; i < 240; i++) {
    const dim = daysInMonth(y, m0)
    const dd = Math.min(day, dim)
    const iso = `${y}-${String(m0 + 1).padStart(2, '0')}-${String(dd).padStart(2, '0')}`
    if (iso > hardEnd) break
    if (iso >= from && iso >= anchor) out.push(iso)
    m0 += 1
    if (m0 > 11) { m0 = 0; y += 1 }
  }
  return out
}

/** Expand a note into concrete occurrences within a range, applying state
 *  (skip hides it; done/override adjust it). */
export function expandOccurrences(
  note: CalendarNote,
  from: string,
  to: string,
  stateByDate: Map<string, NoteOccurrenceState>,
): CalendarOccurrence[] {
  return expandDates(note, from, to)
    .map((date) => {
      const st = stateByDate.get(date)
      if (st?.skipped) return null
      return {
        noteId: note.id,
        date,
        kind: note.kind,
        title: st?.overrideTitle ?? note.title,
        body: note.body,
        amount: st?.overrideAmount ?? note.amount,
        recurrence: note.recurrence,
        done: st?.done ?? false,
        expenseId: st?.expenseId ?? null,
      }
    })
    .filter((o): o is CalendarOccurrence => o !== null)
}

/** All occurrences of all notes within a range, grouped by date. */
export function occurrencesByDate(
  notes: CalendarNote[],
  states: NoteOccurrenceState[],
  from: string,
  to: string,
): Map<string, CalendarOccurrence[]> {
  const stateByNote = new Map<number, Map<string, NoteOccurrenceState>>()
  for (const s of states) {
    const m = stateByNote.get(s.noteId) ?? new Map<string, NoteOccurrenceState>()
    m.set(s.occurrenceDate, s)
    stateByNote.set(s.noteId, m)
  }
  const byDate = new Map<string, CalendarOccurrence[]>()
  for (const note of notes) {
    const occ = expandOccurrences(note, from, to, stateByNote.get(note.id) ?? new Map())
    for (const o of occ) {
      const arr = byDate.get(o.date) ?? []
      arr.push(o)
      byDate.set(o.date, arr)
    }
  }
  return byDate
}
