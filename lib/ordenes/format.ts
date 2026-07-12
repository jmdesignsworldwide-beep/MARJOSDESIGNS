/** Client-safe formatting for orders (no server-only deps). */

export type OrderStage =
  | 'recibida'
  | 'en_diseno'
  | 'en_produccion'
  | 'lista'
  | 'entregada'
  | 'cancelada'

/** #0001 */
export function orderCode(n: number): string {
  return `#${String(n).padStart(4, '0')}`
}

export const stageMeta: Record<
  OrderStage,
  { status: 'process' | 'ready' | 'overdue' | 'neutral'; label: string }
> = {
  recibida: { status: 'process', label: 'Recibida' },
  en_diseno: { status: 'process', label: 'En diseño' },
  en_produccion: { status: 'process', label: 'En producción' },
  lista: { status: 'ready', label: 'Lista para entrega' },
  entregada: { status: 'neutral', label: 'Entregada y pagada' },
  cancelada: { status: 'overdue', label: 'Cancelada' },
}

/** The forward flow (cancelada is out-of-band). */
export const STAGE_FLOW: OrderStage[] = [
  'recibida',
  'en_diseno',
  'en_produccion',
  'lista',
  'entregada',
]

/** Stages that count as "active" work (not delivered/cancelled). */
export const ACTIVE_STAGES: OrderStage[] = ['recibida', 'en_diseno', 'en_produccion', 'lista']

export type PaymentStatus = 'pendiente' | 'parcial' | 'pagado'

export function paymentStatus(total: number, paid: number): PaymentStatus {
  if (paid <= 0) return 'pendiente'
  if (paid < total) return 'parcial'
  return 'pagado'
}

export const paymentStatusMeta: Record<
  PaymentStatus,
  { status: 'process' | 'ready' | 'overdue' | 'neutral'; label: string }
> = {
  pendiente: { status: 'overdue', label: 'Pendiente de pago' },
  parcial: { status: 'process', label: 'Pago parcial' },
  pagado: { status: 'ready', label: 'Pagado' },
}

export const methodLabel: Record<string, string> = {
  efectivo: 'Efectivo',
  transferencia: 'Transferencia',
  debito: 'Débito',
  credito: 'Crédito',
}
