import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { canCreateRazorpayCharge, evaluateOrderGate } from './gates.ts'

const happy = {
  shopFound: true,
  itemFound: true,
  itemActive: true,
  catalogPricePaise: 99900,
  capPaise: 120000,
  stock: 2,
  size: 'M',
  sizes: ['S', 'M', 'L'],
  shippingName: 'Asha',
  shippingAddress: { city: 'Hyderabad', line1: '1 MG Road' },
}

describe('evaluateOrderGate', () => {
  it('passes the demo happy path', () => {
    const result = evaluateOrderGate(happy)
    assert.equal(result.ok, true)
    assert.equal(canCreateRazorpayCharge(happy), true)
  })

  it('blocks over cap and never allows a charge', () => {
    const result = evaluateOrderGate({ ...happy, capPaise: 50000 })
    assert.equal(result.ok, false)
    if (!result.ok) {
      assert.equal(result.reason, 'OVER_CAP')
      assert.equal(result.willCreateRazorpayCharge, false)
      assert.match(result.message, /I will not create a Razorpay charge/)
    }
  })

  it('blocks out of stock', () => {
    const result = evaluateOrderGate({ ...happy, stock: 0 })
    assert.equal(result.ok, false)
    if (!result.ok) {
      assert.equal(result.reason, 'OUT_OF_STOCK')
      assert.equal(result.willCreateRazorpayCharge, false)
    }
  })

  it('blocks unknown shop', () => {
    const result = evaluateOrderGate({ ...happy, shopFound: false })
    assert.equal(result.ok, false)
    if (!result.ok) assert.equal(result.reason, 'SHOP_NOT_FOUND')
  })

  it('ignores a prompt-injected cap of 1 rupee when catalog is 999', () => {
    const result = evaluateOrderGate({ ...happy, capPaise: 100 })
    assert.equal(result.ok, false)
    if (!result.ok) assert.equal(result.reason, 'OVER_CAP')
  })

  it('does not take catalog price from chat — missing item is ITEM_NOT_FOUND', () => {
    const result = evaluateOrderGate({
      ...happy,
      itemFound: false,
      catalogPricePaise: null,
    })
    assert.equal(result.ok, false)
    if (!result.ok) assert.equal(result.reason, 'ITEM_NOT_FOUND')
  })
})
