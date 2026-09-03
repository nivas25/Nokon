import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { parseMaxRupees, rupeesToPaise } from './money.ts'

describe('money', () => {
  it('maps ₹999 to 99900 paise', () => {
    assert.equal(rupeesToPaise(999), 99900)
  })

  it('parses max 1200 from buyer text', () => {
    assert.equal(parseMaxRupees('M, max 1200'), 120000)
  })

  it('parses max 500 as the fail-path cap', () => {
    assert.equal(parseMaxRupees('max 500'), 50000)
  })
})
