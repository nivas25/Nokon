import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { normalizeYoutubeHandle, parseHandleAndItemCode, parseSize } from './handles.ts'

describe('handles', () => {
  it('normalizes @SareeDidi', () => {
    assert.equal(normalizeYoutubeHandle('@SareeDidi'), 'sareedidi')
  })

  it('parses typed fallback @sareedidi 14', () => {
    const parsed = parseHandleAndItemCode('@sareedidi 14')
    assert.equal(parsed.youtubeHandle, 'sareedidi')
    assert.equal(parsed.itemCode, '14')
  })

  it('parses size M', () => {
    assert.equal(parseSize('M, max 1200'), 'M')
  })
})
