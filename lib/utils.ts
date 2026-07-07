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

/**
 * Build a wa.me link from a Dominican phone number. Strips formatting and
 * ensures the country code (RD = 1). Returns null if there's no usable
 * number. Optional prefilled message.
 */
export function whatsappLink(raw?: string | null, message?: string): string | null {
  if (!raw) return null
  let digits = raw.replace(/\D/g, '')
  if (digits.length === 10 && /^[89]/.test(digits)) digits = '1' + digits // 809/829/849
  if (digits.length < 10) return null
  const base = `https://wa.me/${digits}`
  return message ? `${base}?text=${encodeURIComponent(message)}` : base
}

/** Format a Dominican-style phone for display (809-555-1234). */
export function formatPhone(raw?: string | null): string {
  if (!raw) return '—'
  const d = raw.replace(/\D/g, '')
  if (d.length === 10) return `${d.slice(0, 3)}-${d.slice(3, 6)}-${d.slice(6)}`
  return raw
}
