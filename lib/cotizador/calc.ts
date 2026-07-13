/**
 * Cotizador — calculation engine (PURE, shared by the live UI and the
 * authoritative server recalculation). This is the money math: it must be
 * exact. All rounding is explicit and documented so manual checks match.
 *
 * MONEY ROUNDING (system-wide rule — must be identical in every module:
 * cotizador, órdenes, pagos, caja, reportes):
 *  - Every money amount is rounded to the WHOLE peso (no cents).
 *  - Area conversions (in² → ft²) keep FULL precision; rounding happens ONLY
 *    at the final price of each line, never in intermediate steps.
 *  - Each line subtotal is rounded to a whole peso.
 *  - Subtotal = sum of the already-rounded (whole-peso) line subtotals.
 *  - Discount is rounded to a whole peso and clamped to [0, subtotal].
 *  - Total = subtotal − discount. Deposit (50%) = round(total × 0.5).
 * Because every amount is a whole peso, totals never mismatch by a cent
 * between the item view, the order, the cash box and the report.
 */

export const SQIN_PER_SQFT = 144 // 12in × 12in
export const INCHES_PER_FOOT = 12

export type CalcType = 'area' | 'quantity'
export type DiscountType = 'none' | 'amount' | 'percent'
/** Unit used to CAPTURE a dimension. Storage is always inches (pulg default). */
export type LengthUnit = 'in' | 'ft'

/** Convert a captured length to inches. Feet is a convenience; inches is the
 *  canonical stored unit (144 in² = 1 ft²). */
export function toInches(value: number, unit: LengthUnit): number {
  const v = Math.max(0, Number(value) || 0)
  return unit === 'ft' ? v * INCHES_PER_FOOT : v
}

/** Round a MONEY amount to the whole peso (system-wide rule). */
export function roundMoney(n: number): number {
  if (!Number.isFinite(n)) return 0
  return Math.round(n)
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
    const subtotal = roundMoney((areaIn2 * price) / SQIN_PER_SQFT)
    return { areaIn2, sqft: round4(sqft), subtotal }
  }

  const qty = Math.max(0, Number(input.quantity) || 0)
  return { areaIn2: null, sqft: null, subtotal: roundMoney(qty * price) }
}

/** Suggested SELL price from a cost + margin % (whole peso). */
export function suggestedSell(unitCost: number, marginPct: number): number {
  const c = Math.max(0, Number(unitCost) || 0)
  const m = Math.max(0, Number(marginPct) || 0)
  return roundMoney(c * (1 + m / 100))
}

export interface LineMargin {
  cost: number
  profit: number
  marginPct: number | null // null when cost is 0 (can't compute %)
  belowCost: boolean
}

/** Margin of a line: what Marjos earns over her cost, for the whole line. */
export function computeMargin(unitPrice: number, unitCost: number, quantity: number): LineMargin {
  const price = Math.max(0, Number(unitPrice) || 0)
  const cost = Math.max(0, Number(unitCost) || 0)
  const qty = Math.max(0, Number(quantity) || 0)
  const totalCost = roundMoney(cost * qty)
  const totalSell = roundMoney(price * qty)
  return {
    cost: totalCost,
    profit: roundMoney(totalSell - totalCost),
    marginPct: cost > 0 ? Math.round(((price - cost) / cost) * 100) : null,
    belowCost: cost > 0 && price < cost,
  }
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
  const subtotal = roundMoney(lineSubtotals.reduce((s, x) => s + (Number(x) || 0), 0))

  let discountAmount = 0
  if (discount.type === 'amount') {
    discountAmount = roundMoney(Math.max(0, Number(discount.value) || 0))
  } else if (discount.type === 'percent') {
    const pct = Math.min(100, Math.max(0, Number(discount.value) || 0))
    discountAmount = roundMoney((subtotal * pct) / 100)
  }
  discountAmount = Math.min(discountAmount, subtotal)

  const total = roundMoney(subtotal - discountAmount)
  const deposit = roundMoney(total * 0.5)
  return { subtotal, discountAmount, total, deposit }
}

/** Human-friendly square-feet string: "6" or "4.17" (sqft is NOT money —
 *  it keeps 2 decimals for display; the price it produces is whole-peso). */
export function formatSqft(sqft: number | null): string {
  if (sqft === null) return ''
  const twoDec = Math.round((sqft + Number.EPSILON) * 100) / 100
  return Number.isInteger(twoDec) ? String(twoDec) : String(twoDec)
}
