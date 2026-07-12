/** Client-safe formatting for orders (no server-only deps). */

export type OrderStage =
  | 'recibida'
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
  en_produccion: { status: 'process', label: 'En producción' },
  lista: { status: 'ready', label: 'Lista para entrega' },
  entregada: { status: 'neutral', label: 'Entregada' },
  cancelada: { status: 'overdue', label: 'Cancelada' },
}
