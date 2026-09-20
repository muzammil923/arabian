/**
 * Monetary values are stored as INTEGER minor units everywhere in the database
 * (e.g. 45050 for 450.50). These helpers centralize conversions and formatting.
 */

export function getCurrencyFractionDigits(currency: string): number {
  const zeroOrThree = new Set(['JPY', 'KRW', 'VND', 'IDR'])
  if (zeroOrThree.has(currency)) return 0
  const three = new Set(['BHD', 'IQD', 'KWD', 'LYD', 'OMR', 'TND'])
  if (three.has(currency)) return 3
  return 2
}

export function toMinor(amountNumber: number, currency = 'INR'): number {
  const fractions = getCurrencyFractionDigits(currency)
  const factor = 10 ** fractions
  return Math.round((amountNumber + Number.EPSILON) * factor)
}

export function fromMinor(minor: number, currency = 'INR'): number {
  const fractions = getCurrencyFractionDigits(currency)
  return Number((minor / 10 ** fractions).toFixed(fractions))
}

export function formatMoney(minor: number, currency = 'INR', locale = 'en-US'): string {
  const fractions = getCurrencyFractionDigits(currency)
  const major = fromMinor(minor, currency)
  try {
    return new Intl.NumberFormat(locale, {
      style: 'currency',
      currency,
      minimumFractionDigits: fractions,
      maximumFractionDigits: fractions,
    }).format(major)
  } catch {
    return `${major.toFixed(fractions)} ${currency}`
  }
}

export function formatMoneySymbol(minor: number, symbol: string, currency = 'INR'): string {
  const fractions = getCurrencyFractionDigits(currency)
  const major = fromMinor(minor, currency).toFixed(fractions)
  return `${symbol || ''}${major}`.trim()
}

/**
 * Builds a human-friendly money label using a custom symbol when provided,
 * falling back to the Intl currency formatting otherwise.
 */
export function moneyLabel(minor: number, opts: { currency?: string; symbol?: string; locale?: string }): string {
  if (opts.symbol) return formatMoneySymbol(minor, opts.symbol, opts.currency)
  return formatMoney(minor, opts.currency, opts.locale)
}

export interface LineInput {
  unitPriceMinor: number
  quantity: number
}

export interface TotalsOptions {
  items: LineInput[]
  discountType?: 'NONE' | 'FIXED' | 'PERCENTAGE'
  discountValueMinor?: number
  discountPercentBp?: number
  taxBp?: number
}

export interface TotalsResult {
  subtotalMinor: number
  discountMinor: number
  taxMinor: number
  totalMinor: number
}

/**
 * Server-side order totals. Tax applies to the post-discount amount.
 * Quality "round-half-up" arithmetic on integers only.
 */
export function calculateOrderTotals(opts: TotalsOptions): TotalsResult {
  const subtotal = opts.items.reduce((sum, item) => sum + item.unitPriceMinor * item.quantity, 0)
  const discountType = opts.discountType ?? 'NONE'
  let discount = 0
  if (discountType === 'FIXED') {
    discount = Math.min(opts.discountValueMinor ?? 0, subtotal)
  } else if (discountType === 'PERCENTAGE') {
    const bp = Math.max(0, Math.min(opts.discountPercentBp ?? 0, 10000))
    discount = Math.round((subtotal * bp) / 10000)
  }
  const afterDiscount = subtotal - discount
  const taxBp = Math.max(0, opts.taxBp ?? 0)
  const tax = Math.round((afterDiscount * taxBp) / 10000)
  return {
    subtotalMinor: subtotal,
    discountMinor: discount,
    taxMinor: tax,
    totalMinor: afterDiscount + tax,
  }
}