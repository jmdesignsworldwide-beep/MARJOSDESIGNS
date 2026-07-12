/** Client-safe calendar types + helpers (no server-only deps). */
import type { OrderStage } from '@/lib/ordenes/format'

export type CalState = 'proceso' | 'lista' | 'entregada' | 'vencida'
export type CalKind = 'nota' | 'evento' | 'feriado'

export interface CalendarOrder {
  id: string
  number: number
  clientId: string | null
  clientName: string | null
  assignedName: string | null
  stage: OrderStage
  deliveryDate: string // YYYY-MM-DD
  total: number
  amountPaid: number
  balance: number
  summary: string
}

export interface CalendarNote {
  id: number
  noteDate: string
  kind: CalKind
  title: string
  body: string | null
}

/** Live color state of an order on the calendar (overdue overrides). */
export function orderCalState(stage: OrderStage, deliveryDate: string, todayISO: string): CalState {
  if (stage === 'entregada') return 'entregada'
  if (deliveryDate < todayISO) return 'vencida'
  if (stage === 'lista') return 'lista'
  return 'proceso'
}

export const calStateMeta: Record<
  CalState,
  { label: string; dot: string; chip: string; text: string; pulse: boolean }
> = {
  proceso: {
    label: 'En proceso',
    dot: 'bg-status-process',
    chip: 'border-status-process/30 bg-status-process/10 text-status-process',
    text: 'text-status-process',
    pulse: false,
  },
  lista: {
    label: 'Lista para entrega',
    dot: 'bg-status-ready',
    chip: 'border-status-ready/30 bg-status-ready/10 text-status-ready',
    text: 'text-status-ready',
    pulse: false,
  },
  vencida: {
    label: 'Vencida',
    dot: 'bg-status-overdue',
    chip: 'border-status-overdue/40 bg-status-overdue/10 text-status-overdue',
    text: 'text-status-overdue',
    pulse: true,
  },
  entregada: {
    label: 'Entregada',
    dot: 'bg-status-neutral',
    chip: 'border-status-neutral/30 bg-status-neutral/10 text-status-neutral',
    text: 'text-status-neutral',
    pulse: false,
  },
}

export const noteKindMeta: Record<CalKind, { label: string; emoji: string; chip: string }> = {
  nota: { label: 'Nota', emoji: '📝', chip: 'border-gold-mid/30 bg-gold-gradient-soft text-gold-brand' },
  evento: { label: 'Evento', emoji: '📌', chip: 'border-gold-mid/30 bg-gold-gradient-soft text-gold-brand' },
  feriado: { label: 'Feriado', emoji: '🎉', chip: 'border-gold-mid/30 bg-gold-gradient-soft text-gold-brand' },
}

/** A day with this many deliveries or more is "cargado"; heavier still warns hard. */
export const OVERLOAD_WARN = 5
export const OVERLOAD_HEAVY = 8
