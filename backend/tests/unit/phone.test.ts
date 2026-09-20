import { describe, expect, it } from 'vitest'
import { normalizePhone, formatAsYouType } from '../../src/utils/phone'

describe('normalizePhone', () => {
  it('parses Indian numbers', () => {
    const p = normalizePhone('9876543210', 'IN')
    expect(p).toEqual({ country: 'IN', countryCode: '91', national: '9876543210', e164: '+919876543210' })
  })

  it('parses international-prefixed input', () => {
    const p = normalizePhone('+971 50 123 4567', 'AE')
    expect(p.e164).toBe('+971501234567')
  })

  it('handles US/UK numbers', () => {
    expect(normalizePhone('2125550143', 'US').e164).toBe('+12125550143')
    expect(normalizePhone('02079460095', 'GB').e164).toBe('+442079460095')
  })

  it('rejects garbage and invalid lengths', () => {
    expect(() => normalizePhone('not-a-number', 'IN')).toThrow()
    expect(() => normalizePhone('12', 'US')).toThrow()
    expect(() => normalizePhone('', 'IN')).toThrow()
  })

  it('strips punctuation before parsing', () => {
    const p = normalizePhone('+91 (98765) 43210', 'IN')
    expect(p.e164).toBe('+919876543210')
  })
})

describe('formatAsYouType', () => {
  it('formats incrementally', () => {
    const out = formatAsYouType('9876543210', 'IN')
    expect(out.replace(/\s/g, '')).toContain('98765')
  })
})