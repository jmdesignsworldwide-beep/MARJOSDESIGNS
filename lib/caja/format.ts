/** Client-safe labels for caja (no server-only deps). */
import { Banknote, ArrowLeftRight, CreditCard, Landmark, type LucideIcon } from 'lucide-react'
import type { CashMethod } from './types'

export const methodLabel: Record<CashMethod, string> = {
  efectivo: 'Efectivo',
  transferencia: 'Transferencia',
  debito: 'Débito',
  credito: 'Crédito',
}

export const methodIcon: Record<CashMethod, LucideIcon> = {
  efectivo: Banknote,
  transferencia: ArrowLeftRight,
  debito: CreditCard,
  credito: Landmark,
}

export const sourceLabel: Record<string, string> = {
  order_payment: 'Pago de orden',
  order_reverso: 'Corrección de orden',
  pos_sale: 'Venta rápida',
  pos_void: 'Anulación de venta',
  manual: 'Movimiento manual',
  expense: 'Gasto en efectivo',
}

export function fmtDateLong(d: string): string {
  const date = d.length === 10 ? new Date(d + 'T00:00:00') : new Date(d)
  return date.toLocaleDateString('es-DO', { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' })
}

export function fmtTime(d: string): string {
  return new Date(d).toLocaleTimeString('es-DO', { hour: '2-digit', minute: '2-digit' })
}
