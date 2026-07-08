/** Client-safe formatting helpers for the Cotizador (no server-only deps). */

/** Format a quote number as COT-0001. */
export function quoteCode(n: number): string {
  return `COT-${String(n).padStart(4, '0')}`
}
