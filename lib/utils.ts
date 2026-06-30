import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

/** Merge Tailwind classes with conflict resolution. */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/** Format a number as Dominican pesos (RD$). */
export function formatDOP(value: number, opts: { decimals?: boolean } = {}) {
  return new Intl.NumberFormat('es-DO', {
    style: 'currency',
    currency: 'DOP',
    minimumFractionDigits: opts.decimals ? 2 : 0,
    maximumFractionDigits: opts.decimals ? 2 : 0,
  }).format(value)
}

/** Format a plain number with thousands separators. */
export function formatNumber(value: number) {
  return new Intl.NumberFormat('es-DO').format(value)
}
