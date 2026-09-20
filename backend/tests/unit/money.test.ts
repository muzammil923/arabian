import { describe, expect, it } from 'vitest'
import {
  calculateOrderTotals,
  formatMoney,
  formatMoneySymbol,
  moneyLabel,
  toMinor,
  fromMinor,
  getCurrencyFractionDigits,
} from '../../src/utils/money'

describe('money unit helpers', () => {
  it('converts major to minor exactly', () => {
    expect(toMinor(450.5)).toBe(45050)
    expect(toMinor(0.01)).toBe(1)
    expect(toMinor(1000)).toBe(100000)
  })

  it('converts minor to major', () => {
    expect(fromMinor(45050)).toBe(450.5)
    expect(fromMinor(1)).toBe(0.01)
  })

  it('handles zero-fraction and three-fraction currencies', () => {
    expect(getCurrencyFractionDigits('JPY')).toBe(0)
    expect(getCurrencyFractionDigits('KWD')).toBe(3)
    expect(toMinor(5, 'JPY')).toBe(5)
    expect(fromMinor(5, 'JPY')).toBe(5)
    expect(fromMinor(123, 'KWD')).toBe(0.123)
  })

  it('formats money integer-safe and with symbol', () => {
    expect(formatMoney(45050, 'INR', 'en-IN')).toMatch(/₹/g)
    expect(formatMoneySymbol(1000, '₹')).toBe('₹10.00')
    expect(moneyLabel(2500, { symbol: '₹' })).toBe('₹25.00')
  })
})

describe('calculateOrderTotals (whole minors, round-half-up)', () => {
  const items = [{ unitPriceMinor: 400, quantity: 3 }] // subtotal 1200

  it('no discount, no tax', () => {
    const t = calculateOrderTotals({ items })
    expect(t).toEqual({ subtotalMinor: 1200, discountMinor: 0, taxMinor: 0, totalMinor: 1200 })
  })

  it('applies tax to the post-discount amount', () => {
    // 5% of 1200 = 60
    const t = calculateOrderTotals({ items, taxBp: 500 })
    expect(t.taxMinor).toBe(60)
    expect(t.totalMinor).toBe(1260)
  })

  it('fixed discount clamps at subtotal', () => {
    const t = calculateOrderTotals({ items, discountType: 'FIXED', discountValueMinor: 300, taxBp: 500 })
    expect(t.discountMinor).toBe(300)
    expect(t.subtotalMinor - t.discountMinor).toBe(900)
    expect(t.taxMinor).toBe(45)
    expect(t.totalMinor).toBe(945)
    const clamped = calculateOrderTotals({ items, discountType: 'FIXED', discountValueMinor: 99999 })
    expect(clamped.discountMinor).toBe(1200)
    expect(clamped.totalMinor).toBe(0)
  })

  it('percentage discount rounds half-up', () => {
    // 10% of 1200 = 120
    const t = calculateOrderTotals({ items, discountType: 'PERCENTAGE', discountPercentBp: 1000 })
    expect(t.discountMinor).toBe(120)
    expect(t.totalMinor).toBe(1080)
    // 12.5% of 4 -> 0.5 rounds up to 1
    const odd = calculateOrderTotals({ items: [{ unitPriceMinor: 4, quantity: 1 }], discountType: 'PERCENTAGE', discountPercentBp: 1250 })
    expect(odd.discountMinor).toBe(1)
  })

  it('clamps percentage discount to 100%', () => {
    const t = calculateOrderTotals({ items, discountType: 'PERCENTAGE', discountPercentBp: 20000 })
    expect(t.discountMinor).toBe(1200)
  })

  it('defaults discount to NONE when omitted', () => {
    const t = calculateOrderTotals({ items: [{ unitPriceMinor: 100, quantity: 2 }], taxBp: 1000 })
    expect(t.discountMinor).toBe(0)
    expect(t.totalMinor).toBe(220)
  })
})