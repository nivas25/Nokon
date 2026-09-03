import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { verifyRazorpayWebhookSignature } from './verify.ts'

describe('verifyRazorpayWebhookSignature', () => {
  it('accepts the official Node SDK sample vector', () => {
    const body = '{"a":1,"b":2,"c":{"d":3}}'
    const signature = '2fe04e22977002e6c7cb553adab8b460cb9e2a4970d5953cb27a8472752e3bbc'
    const secret = '123456'
    assert.equal(verifyRazorpayWebhookSignature(body, signature, secret), true)
  })

  it('rejects a tampered body', () => {
    const body = '{"a":1}'
    const signature = '2fe04e22977002e6c7cb553adab8b460cb9e2a4970d5953cb27a8472752e3bbc'
    const secret = '123456'
    assert.equal(verifyRazorpayWebhookSignature(body, signature, secret), false)
  })
})
