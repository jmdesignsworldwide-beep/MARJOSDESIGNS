/**
 * Cotizador — calculation engine (PURE, shared by the live UI and the
 * authoritative server recalculation). This is the money math: it must be
 * exact. All rounding is explicit and documented so manual checks match.
 *
 * Rounding contract:
 *  - Each line subtotal is rounded to 2 decimals.
 *  - Quote subtotal = sum of the already-rounded line subtotals.
 *  - Discount is rounded to 2 decimals and clamped to [0, subtotal].
 *  - Total = subtotal − discount.
 *  - Deposit (50%) = total × 0.5, rounded to 2 decimals.
 */

export const SQIN_PER_SQFT = 144 // 12in × 12in

export type CalcType = 'area' | 'quantity'
export type DiscountType = 'none' | 'amount' | 'percent'

/** Round to 2 decimals, guarding against binary-float artifacts. */
export function round2(n: number): number {
  if (!Number.isFinite(n)) return 0
  return Math.round((n + Number.EPSILON) * 100) / 100
}

/** Round to 4 decimals (for square-feet display precision). */
export function round4(n: number): number {
  if (!Number.isFinite(n)) return 0
  return Math.round((n + Number.EPSILON) * 10000) / 10000
}

export interface LineInput {
  calcType: CalcType
  /** per ft² for area, per unit for quantity. */
  unitPrice: number
  widthIn?: number
  heightIn?: number
  quantity?: number
}

export interface LineResult {
  areaIn2: number | null
  sqft: number | null
  subtotal: number
}

/** Compute a single line's subtotal (and area breakdown when applicable). */
export function computeLine(input: LineInput): LineResult {
  const price = Math.max(0, Number(input.unitPrice) || 0)

  if (input.calcType === 'area') {
    const w = Math.max(0, Number(input.widthIn) || 0)
    const h = Math.max(0, Number(input.heightIn) || 0)
    const areaIn2 = w * h
    const sqft = areaIn2 / SQIN_PER_SQFT
    // Multiply before dividing to keep precision: (w*h*price)/144
    const subtotal = round2((areaIn2 * price) / SQIN_PER_SQFT)
    return { areaIn2, sqft: round4(sqft), subtotal }
  }

  const qty = Math.max(0, Number(input.quantity) || 0)
  return { areaIn2: null, sqft: null, subtotal: round2(qty * price) }
}

export interface QuoteTotals {
  subtotal: number
  discountAmount: number
  total: number
  deposit: number
}

/** Combine line subtotals with an optional manual discount. */
export function computeTotals(
  lineSubtotals: number[],
  discount: { type: DiscountType; value: number } = { type: 'none', value: 0 },
): QuoteTotals {
  const subtotal = round2(lineSubtotals.reduce((s, x) => s + (Number(x) || 0), 0))

  let discountAmount = 0
  if (discount.type === 'amount') {
    discountAmount = round2(Math.max(0, Number(discount.value) || 0))
  } else if (discount.type === 'percent') {
    const pct = Math.min(100, Math.max(0, Number(discount.value) || 0))
    discountAmount = round2((subtotal * pct) / 100)
  }
  discountAmount = Math.min(discountAmount, subtotal)

  const total = round2(subtotal - discountAmount)
  const deposit = round2(total * 0.5)
  return { subtotal, discountAmount, total, deposit }
}

/** Human-friendly square-feet string: "6" or "4.17". */
export function formatSqft(sqft: number | null): string {
  if (sqft === null) return ''
  return Number.isInteger(sqft) ? String(sqft) : String(round2(sqft))
}
