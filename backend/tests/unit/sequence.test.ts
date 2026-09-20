import { describe, expect, it } from 'vitest'
import { formatSequenceNumber, stripPrefixClean } from '../../src/utils/sequence'

describe('formatSequenceNumber', () => {
  it('pads to the minimum digits', () => {
    expect(formatSequenceNumber('LND-', 1)).toBe('LND-0001')
    expect(formatSequenceNumber('LND-', 42)).toBe('LND-0042')
    expect(formatSequenceNumber('LND-', 12345)).toBe('LND-12345')
    expect(formatSequenceNumber('INV-', 7, 6)).toBe('INV-000007')
  })

  it('keeps prefix verbatim', () => {
    expect(formatSequenceNumber('DLY-', 3, 4)).toBe('DLY-0003')
  })
})

describe('stripPrefixClean', () => {
  it('removes characters unsafe in document numbers', () => {
    expect(stripPrefixClean('LND-2024/')).toBe('LND-2024')
  })
})